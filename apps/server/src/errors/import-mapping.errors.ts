import { JourneyOSError } from "./base.errors";

export class UploadNotFoundError extends JourneyOSError {
  constructor(uploadId: string) {
    super(`Upload '${uploadId}' not found or expired`, "UPLOAD_NOT_FOUND");
  }
}

export class MappingIncompleteError extends JourneyOSError {
  constructor(missingFields: readonly string[]) {
    super(
      `Required fields not mapped: ${missingFields.join(", ")}`,
      "MAPPING_INCOMPLETE",
    );
  }
}

export class FileTypeForbiddenError extends JourneyOSError {
  constructor(mimeType: string) {
    super(
      `File type '${mimeType}' is not supported. Allowed: CSV, XML (QTI), TXT`,
      "FILE_TYPE_FORBIDDEN",
    );
  }
}
