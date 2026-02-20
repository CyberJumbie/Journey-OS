import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StorageUpload,
  StorageUploadResponse,
  PresignedUrlResponse,
  StorageKeyParts,
  StorageConfig,
  StorageMimeType,
  StorageDocumentType,
  StorageUploadListParams,
  StorageUploadMetadata,
} from "@journey-os/types";
import {
  STORAGE_ALLOWED_MIME_TYPES,
  STORAGE_MAX_FILE_SIZE_BYTES,
  PRESIGNED_URL_EXPIRY_SECONDS,
} from "@journey-os/types";
import type { IMalwareScanService } from "./malware-scan.stub";
import {
  StorageError,
  FileTooLargeError,
  UnsupportedFileTypeError,
  MalwareDetectedError,
  StorageUploadNotFoundError,
} from "../../errors/storage.error";
import { ForbiddenError } from "../../errors/forbidden.error";

const TABLE = "uploads";

export class StorageService {
  readonly #supabaseClient: SupabaseClient;
  readonly #malwareScanner: IMalwareScanService;
  readonly #config: StorageConfig;

  constructor(
    supabaseClient: SupabaseClient,
    malwareScanner: IMalwareScanService,
    config?: Partial<StorageConfig>,
  ) {
    this.#supabaseClient = supabaseClient;
    this.#malwareScanner = malwareScanner;
    this.#config = {
      bucketName: config?.bucketName ?? "content-originals",
      maxFileSizeBytes: config?.maxFileSizeBytes ?? STORAGE_MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: config?.allowedMimeTypes ?? [
        ...STORAGE_ALLOWED_MIME_TYPES,
      ],
      presignedUrlExpirySeconds:
        config?.presignedUrlExpirySeconds ?? PRESIGNED_URL_EXPIRY_SECONDS,
    };
  }

  buildStorageKey(parts: StorageKeyParts): string {
    const courseSegment = parts.courseId || "uncategorized";
    return `${parts.institutionId}/${courseSegment}/${parts.fileId}/${parts.filename}`;
  }

  computeChecksum(buffer: Uint8Array): string {
    return createHash("sha256").update(buffer).digest("hex");
  }

  validateFile(mimeType: string, sizeBytes: number): void {
    if (!this.#config.allowedMimeTypes.includes(mimeType)) {
      throw new UnsupportedFileTypeError(
        mimeType,
        this.#config.allowedMimeTypes,
      );
    }
    if (sizeBytes > this.#config.maxFileSizeBytes) {
      throw new FileTooLargeError(sizeBytes, this.#config.maxFileSizeBytes);
    }
  }

  async upload(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    userId: string,
    institutionId: string,
    documentType: StorageDocumentType,
    courseId: string | null,
  ): Promise<StorageUploadResponse> {
    this.validateFile(file.mimetype, file.size);

    const scanResult = await this.#malwareScanner.scan(
      file.buffer,
      file.originalname,
    );
    if (!scanResult.clean) {
      throw new MalwareDetectedError(file.originalname, scanResult.threat);
    }

    const fileId = randomUUID();
    const checksum = this.computeChecksum(file.buffer);
    const storageKey = this.buildStorageKey({
      institutionId,
      courseId: courseId ?? "",
      fileId,
      filename: file.originalname,
    });

    const { error: uploadError } = await this.#supabaseClient.storage
      .from(this.#config.bucketName)
      .upload(storageKey, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new StorageError(
        `Failed to upload file to storage: ${uploadError.message}`,
      );
    }

    const metadata: StorageUploadMetadata = {
      original_filename: file.originalname,
      upload_source: "api",
      malware_scan_status: scanResult.clean ? "passed" : "failed",
      malware_scan_at: new Date().toISOString(),
    };

    const { data, error: dbError } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        institution_id: institutionId,
        uploaded_by: userId,
        course_id: courseId,
        filename: file.originalname,
        content_type: file.mimetype,
        size_bytes: file.size,
        storage_path: storageKey,
        document_type: documentType,
        parse_status: "pending",
        checksum_sha256: checksum,
        metadata,
      })
      .select(
        "id, filename, storage_path, size_bytes, content_type, checksum_sha256, document_type, parse_status, created_at",
      )
      .single();

    if (dbError || !data) {
      throw new StorageError(
        `Failed to create upload record: ${dbError?.message ?? "unknown"}`,
      );
    }

    return data as unknown as StorageUploadResponse;
  }

  async getPresignedUrl(
    uploadId: string,
    institutionId: string,
  ): Promise<PresignedUrlResponse> {
    const upload = await this.#findActiveUpload(uploadId);

    if (upload.institution_id !== institutionId) {
      throw new ForbiddenError("Upload belongs to a different institution");
    }

    const { data, error } = await this.#supabaseClient.storage
      .from(this.#config.bucketName)
      .createSignedUrl(
        upload.storage_path,
        this.#config.presignedUrlExpirySeconds,
      );

    if (error || !data) {
      throw new StorageError(
        `Failed to create presigned URL: ${error?.message ?? "unknown"}`,
      );
    }

    const expiresAt = new Date(
      Date.now() + this.#config.presignedUrlExpirySeconds * 1000,
    ).toISOString();

    return {
      url: data.signedUrl,
      expires_at: expiresAt,
    };
  }

  async softDelete(
    uploadId: string,
    userId: string,
  ): Promise<{ id: string; deleted_at: string }> {
    const upload = await this.#findActiveUpload(uploadId);

    if (upload.uploaded_by !== userId) {
      throw new ForbiddenError("Only the upload owner can delete this file");
    }

    const deletedAt = new Date().toISOString();
    const { error } = await this.#supabaseClient
      .from(TABLE)
      .update({ deleted_at: deletedAt })
      .eq("id", uploadId)
      .select("id")
      .single();

    if (error) {
      throw new StorageError(`Failed to soft-delete upload: ${error.message}`);
    }

    return { id: uploadId, deleted_at: deletedAt };
  }

  async listUploads(
    institutionId: string,
    params: StorageUploadListParams,
  ): Promise<{
    uploads: StorageUploadResponse[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const page = params.page ?? 1;
    const limit = params.limit ?? 25;
    const offset = (page - 1) * limit;

    let query = this.#supabaseClient
      .from(TABLE)
      .select(
        "id, filename, storage_path, size_bytes, content_type, checksum_sha256, document_type, parse_status, created_at",
        { count: "exact" },
      )
      .eq("institution_id", institutionId)
      .is("deleted_at", null);

    if (params.course_id) {
      query = query.eq("course_id", params.course_id);
    }
    if (params.document_type) {
      query = query.eq("document_type", params.document_type);
    }
    if (params.parse_status) {
      query = query.eq("parse_status", params.parse_status);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new StorageError(`Failed to list uploads: ${error.message}`);
    }

    const total = count ?? 0;

    return {
      uploads: (data ?? []) as unknown as StorageUploadResponse[],
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async #findActiveUpload(uploadId: string): Promise<StorageUpload> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", uploadId)
      .is("deleted_at", null)
      .single();

    if (error || !data) {
      throw new StorageUploadNotFoundError(uploadId);
    }

    return data as unknown as StorageUpload;
  }
}
