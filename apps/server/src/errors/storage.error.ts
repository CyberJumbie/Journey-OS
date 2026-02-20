import { JourneyOSError } from "./base.errors";

export class StorageError extends JourneyOSError {
  constructor(message: string) {
    super(message, "STORAGE_ERROR");
  }
}

export class FileTooLargeError extends JourneyOSError {
  constructor(sizeBytes: number, maxBytes: number) {
    super(
      `File size ${sizeBytes} bytes exceeds maximum of ${maxBytes} bytes`,
      "FILE_TOO_LARGE",
    );
  }
}

export class UnsupportedFileTypeError extends JourneyOSError {
  constructor(mimeType: string, allowedTypes: readonly string[]) {
    super(
      `MIME type '${mimeType}' is not supported. Allowed: ${allowedTypes.join(", ")}`,
      "UNSUPPORTED_FILE_TYPE",
    );
  }
}

export class MalwareDetectedError extends JourneyOSError {
  constructor(filename: string, threat: string | null) {
    super(
      `Malware detected in file '${filename}'${threat ? `: ${threat}` : ""}`,
      "MALWARE_DETECTED",
    );
  }
}

export class ChecksumMismatchError extends JourneyOSError {
  constructor(expected: string, actual: string) {
    super(
      `Checksum mismatch: expected ${expected}, got ${actual}`,
      "CHECKSUM_MISMATCH",
    );
  }
}

export class StorageUploadNotFoundError extends JourneyOSError {
  constructor(uploadId: string) {
    super(`Upload '${uploadId}' not found`, "NOT_FOUND");
  }
}
