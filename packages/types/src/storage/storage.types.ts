/**
 * Storage types for Supabase Storage integration (STORY-F-18).
 * Content-category document types (not to be confused with content/upload.types.ts
 * which defines file-format types like "pdf" | "docx").
 */

/**
 * Content-category document type for uploaded files.
 * Distinct from content/upload.types.ts DocumentType which tracks file format.
 */
export type StorageDocumentType =
  | "exam_export"
  | "syllabus"
  | "lecture_notes"
  | "reference_material"
  | "curriculum_map"
  | "other";

/**
 * Allowed MIME types for storage uploads.
 * Broader than the batch-upload AcceptedMimeType (which only allows PDF/PPTX/DOCX).
 */
export const STORAGE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "application/xml",
  "text/xml",
  "application/zip",
] as const;

export type StorageMimeType = (typeof STORAGE_ALLOWED_MIME_TYPES)[number];

/**
 * Maximum file size in bytes for storage uploads (50MB).
 */
export const STORAGE_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Presigned URL expiry in seconds (1 hour).
 */
export const PRESIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Upload record from the uploads table (full row).
 */
export interface StorageUpload {
  readonly id: string;
  readonly institution_id: string;
  readonly uploaded_by: string;
  readonly course_id: string | null;
  readonly filename: string;
  readonly content_type: StorageMimeType;
  readonly size_bytes: number;
  readonly storage_path: string;
  readonly document_type: StorageDocumentType;
  readonly parse_status: "pending" | "processing" | "completed" | "failed";
  readonly checksum_sha256: string;
  readonly metadata: StorageUploadMetadata;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Upload metadata JSONB structure.
 */
export interface StorageUploadMetadata {
  readonly original_filename: string;
  readonly upload_source: "dropzone" | "api";
  readonly malware_scan_status: "passed" | "skipped" | "failed";
  readonly malware_scan_at: string | null;
  readonly [key: string]: unknown;
}

/**
 * Response after successful upload to storage.
 */
export interface StorageUploadResponse {
  readonly id: string;
  readonly filename: string;
  readonly storage_path: string;
  readonly size_bytes: number;
  readonly content_type: StorageMimeType;
  readonly checksum_sha256: string;
  readonly document_type: StorageDocumentType;
  readonly parse_status: string;
  readonly created_at: string;
}

/**
 * Response for presigned URL request.
 */
export interface PresignedUrlResponse {
  readonly url: string;
  readonly expires_at: string;
}

/**
 * Storage key builder parts.
 * Key format: {institutionId}/{courseId}/{fileId}/{filename}
 */
export interface StorageKeyParts {
  readonly institutionId: string;
  readonly courseId: string;
  readonly fileId: string;
  readonly filename: string;
}

/**
 * Malware scan result (shared; the interface itself lives in server).
 */
export interface MalwareScanResult {
  readonly clean: boolean;
  readonly scanDurationMs: number;
  readonly engine: string;
  readonly threat: string | null;
}

/**
 * Storage configuration.
 */
export interface StorageConfig {
  readonly bucketName: string;
  readonly maxFileSizeBytes: number;
  readonly allowedMimeTypes: readonly string[];
  readonly presignedUrlExpirySeconds: number;
}

/**
 * Upload list query params.
 */
export interface StorageUploadListParams {
  readonly course_id?: string;
  readonly document_type?: StorageDocumentType;
  readonly parse_status?: "pending" | "processing" | "completed" | "failed";
  readonly page?: number;
  readonly limit?: number;
}
