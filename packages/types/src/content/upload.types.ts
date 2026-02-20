/** Supported upload document types */
export type DocumentType = "pdf" | "pptx" | "docx";

/** MIME types accepted for upload */
export type AcceptedMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Parse status of an uploaded document */
export type ParseStatus = "pending" | "processing" | "completed" | "failed";

/** Upload configuration constants */
export interface UploadConfig {
  readonly maxFileSizeBytes: number;
  readonly maxFilesPerBatch: number;
  readonly acceptedMimeTypes: readonly AcceptedMimeType[];
  readonly acceptedExtensions: readonly string[];
}

/** Client-side upload status */
export type UploadFileStatus = "pending" | "uploading" | "success" | "error";

/** Server response for a single uploaded file */
export interface UploadedFileRecord {
  readonly id: string;
  readonly filename: string;
  readonly content_type: string;
  readonly size_bytes: number;
  readonly storage_path: string;
  readonly document_type: DocumentType;
  readonly parse_status: ParseStatus;
  readonly created_at: string;
}

/** Response envelope for upload endpoint */
export interface UploadResponse {
  readonly files: readonly UploadedFileRecord[];
  readonly errors: readonly UploadFileError[];
}

/** Per-file error in upload response */
export interface UploadFileError {
  readonly filename: string;
  readonly code: "INVALID_FILE_TYPE" | "FILE_SIZE_LIMIT" | "UPLOAD_FAILED";
  readonly message: string;
}

/** Upload constants */
export const UPLOAD_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
export const UPLOAD_MAX_FILES_PER_BATCH = 10;

export const ACCEPTED_MIME_TYPES: readonly AcceptedMimeType[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const ACCEPTED_EXTENSIONS: readonly string[] = [
  ".pdf",
  ".pptx",
  ".docx",
] as const;

/** MIME type to document type mapping */
export const MIME_TO_DOCUMENT_TYPE: Record<AcceptedMimeType, DocumentType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

/** Default upload configuration */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSizeBytes: UPLOAD_MAX_FILE_SIZE_BYTES,
  maxFilesPerBatch: UPLOAD_MAX_FILES_PER_BATCH,
  acceptedMimeTypes: ACCEPTED_MIME_TYPES,
  acceptedExtensions: ACCEPTED_EXTENSIONS,
};
