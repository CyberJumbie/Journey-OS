import { JourneyOSError } from "./base.errors";

export class UploadError extends JourneyOSError {
  constructor(message: string, code: string = "UPLOAD_ERROR") {
    super(message, code);
  }
}

export class InvalidFileTypeError extends UploadError {
  readonly filename: string;
  readonly mimeType: string;
  readonly acceptedTypes: readonly string[];

  constructor(
    filename: string,
    mimeType: string,
    acceptedTypes: readonly string[],
  ) {
    super(
      `File type ${mimeType} is not supported. Accepted types: PDF, PPTX, DOCX`,
      "INVALID_FILE_TYPE",
    );
    this.filename = filename;
    this.mimeType = mimeType;
    this.acceptedTypes = acceptedTypes;
  }
}

export class UploadFileSizeLimitError extends UploadError {
  readonly filename: string;
  readonly fileSize: number;
  readonly maxSize: number;

  constructor(filename: string, fileSize: number, maxSize: number) {
    super(
      `File "${filename}" (${fileSize} bytes) exceeds the maximum size of ${maxSize} bytes`,
      "FILE_SIZE_LIMIT",
    );
    this.filename = filename;
    this.fileSize = fileSize;
    this.maxSize = maxSize;
  }
}

export class BatchLimitError extends UploadError {
  readonly fileCount: number;
  readonly maxFiles: number;

  constructor(fileCount: number, maxFiles: number) {
    super(
      `Batch of ${fileCount} files exceeds the maximum of ${maxFiles} files per upload`,
      "BATCH_LIMIT",
    );
    this.fileCount = fileCount;
    this.maxFiles = maxFiles;
  }
}
