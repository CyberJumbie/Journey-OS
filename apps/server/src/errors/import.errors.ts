import { JourneyOSError } from "./base.errors";
import type { ImportFormat } from "@journey-os/types";

export class ImportError extends JourneyOSError {
  constructor(message: string, code: string = "IMPORT_ERROR") {
    super(message, code);
  }
}

export class ParseError extends ImportError {
  readonly format: ImportFormat;
  readonly filename: string;
  readonly line: number | null;
  readonly details: string | null;

  constructor(opts: {
    message: string;
    format: ImportFormat;
    filename: string;
    line?: number;
    details?: string;
  }) {
    super(opts.message, "PARSE_ERROR");
    this.format = opts.format;
    this.filename = opts.filename;
    this.line = opts.line ?? null;
    this.details = opts.details ?? null;
  }
}

export class UnsupportedFormatError extends ImportError {
  readonly filename: string;
  readonly detectedType: string | null;

  constructor(filename: string, detectedType?: string) {
    super(
      `Unsupported file format: "${filename}"${detectedType ? ` (detected: ${detectedType})` : ""}`,
      "UNSUPPORTED_FORMAT",
    );
    this.filename = filename;
    this.detectedType = detectedType ?? null;
  }
}

export class FileSizeLimitError extends ImportError {
  readonly fileSize: number;
  readonly maxSize: number;

  constructor(fileSize: number, maxSize: number) {
    super(
      `File size ${fileSize} bytes exceeds limit of ${maxSize} bytes`,
      "FILE_SIZE_LIMIT",
    );
    this.fileSize = fileSize;
    this.maxSize = maxSize;
  }
}
