import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AcceptedMimeType,
  UploadedFileRecord,
  UploadFileError,
  UploadResponse,
} from "@journey-os/types";
import {
  ACCEPTED_MIME_TYPES,
  MIME_TO_DOCUMENT_TYPE,
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILES_PER_BATCH,
} from "@journey-os/types";
import { UploadRepository } from "../../repositories/upload.repository";
import {
  BatchLimitError,
  InvalidFileTypeError,
  UploadFileSizeLimitError,
} from "../../errors/upload.error";
import { CourseNotFoundError } from "../../errors/course.error";

interface UploadContext {
  courseId: string;
  institutionId: string;
  userId: string;
}

export class UploadService {
  readonly #repository: UploadRepository;
  readonly #supabaseClient: SupabaseClient;

  constructor(repository: UploadRepository, supabaseClient: SupabaseClient) {
    this.#repository = repository;
    this.#supabaseClient = supabaseClient;
  }

  async processUpload(
    files: Express.Multer.File[],
    context: UploadContext,
  ): Promise<UploadResponse> {
    if (files.length > UPLOAD_MAX_FILES_PER_BATCH) {
      throw new BatchLimitError(files.length, UPLOAD_MAX_FILES_PER_BATCH);
    }

    await this.#verifyCourseExists(context.courseId);

    const uploaded: UploadedFileRecord[] = [];
    const errors: UploadFileError[] = [];

    for (const file of files) {
      try {
        const record = await this.#processFile(file, context);
        uploaded.push(record);
      } catch (err) {
        if (err instanceof InvalidFileTypeError) {
          errors.push({
            filename: file.originalname,
            code: "INVALID_FILE_TYPE",
            message: err.message,
          });
        } else if (err instanceof UploadFileSizeLimitError) {
          errors.push({
            filename: file.originalname,
            code: "FILE_SIZE_LIMIT",
            message: err.message,
          });
        } else {
          errors.push({
            filename: file.originalname,
            code: "UPLOAD_FAILED",
            message: "An unexpected error occurred during upload",
          });
        }
      }
    }

    return { files: uploaded, errors };
  }

  async #processFile(
    file: Express.Multer.File,
    context: UploadContext,
  ): Promise<UploadedFileRecord> {
    if (!ACCEPTED_MIME_TYPES.includes(file.mimetype as AcceptedMimeType)) {
      throw new InvalidFileTypeError(
        file.originalname,
        file.mimetype,
        ACCEPTED_MIME_TYPES,
      );
    }

    if (file.size > UPLOAD_MAX_FILE_SIZE_BYTES) {
      throw new UploadFileSizeLimitError(
        file.originalname,
        file.size,
        UPLOAD_MAX_FILE_SIZE_BYTES,
      );
    }

    const documentType =
      MIME_TO_DOCUMENT_TYPE[file.mimetype as AcceptedMimeType];
    const uploadId = crypto.randomUUID();
    const ext = documentType;
    const storagePath = `uploads/${context.institutionId}/${context.courseId}/${uploadId}.${ext}`;

    const record = await this.#repository.create({
      institution_id: context.institutionId,
      course_id: context.courseId,
      uploaded_by: context.userId,
      filename: file.originalname,
      content_type: file.mimetype,
      size_bytes: file.size,
      storage_path: storagePath,
      document_type: documentType,
      parse_status: "pending",
    });

    return record;
  }

  async #verifyCourseExists(courseId: string): Promise<void> {
    const { data, error } = await this.#supabaseClient
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .maybeSingle();

    if (error || !data) {
      throw new CourseNotFoundError(courseId);
    }
  }
}
