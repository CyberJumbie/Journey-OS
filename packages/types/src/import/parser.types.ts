import type { ParsedQuestion } from "./parsed-question.types";

/**
 * Supported import file formats.
 * Extensible for future formats (GIFT, Aiken, Moodle XML, etc.)
 */
export type ImportFormat = "csv" | "qti" | "text";

/**
 * Non-fatal error detail collected during parsing.
 * Parsing continues; errors are reported in ParseResult.
 */
export interface ParseErrorDetail {
  /** 1-based row/item index in the source file */
  readonly index: number;
  /** Line number in original file (for user-facing error messages) */
  readonly line: number;
  /** Human-readable error message */
  readonly message: string;
  /** Error severity: 'warning' continues parsing, 'error' skips the item */
  readonly severity: "warning" | "error";
  /** Which field caused the issue */
  readonly field: string | null;
}

/**
 * CSV column mapping configuration.
 * Maps CSV header names to ParsedQuestion fields.
 * All fields are optional — unmapped columns go to rawMetadata.
 */
export interface CsvColumnMapping {
  readonly stem?: string;
  readonly vignette?: string;
  readonly optionA?: string;
  readonly optionB?: string;
  readonly optionC?: string;
  readonly optionD?: string;
  readonly optionE?: string;
  readonly correctAnswer?: string;
  readonly bloomLevel?: string;
  readonly difficulty?: string;
  readonly topic?: string;
  readonly explanation?: string;
}

/**
 * Parser configuration options.
 * Passed to all parsers via constructor DI or per-parse call.
 */
export interface ParserOptions {
  /** Maximum file size in bytes. Default: 10 * 1024 * 1024 (10MB) */
  readonly maxFileSizeBytes: number;
  /** For CSV: column name -> ParsedQuestion field mapping */
  readonly columnMapping?: Readonly<CsvColumnMapping>;
  /** Whether to skip rows/items that have any error (default: false — include partial) */
  readonly strictMode?: boolean;
}

/**
 * Result of a parse operation.
 * Contains both successfully parsed questions and collected errors.
 */
export interface ParseResult {
  /** Successfully parsed questions */
  readonly questions: readonly ParsedQuestion[];
  /** Non-fatal errors encountered during parsing */
  readonly errors: readonly ParseErrorDetail[];
  /** Total items found in source (including errored items) */
  readonly totalFound: number;
  /** Count of successfully parsed items */
  readonly successCount: number;
  /** Count of items skipped due to errors */
  readonly errorCount: number;
  /** Detected or specified format */
  readonly format: ImportFormat;
  /** Original filename */
  readonly filename: string;
  /** Parse duration in milliseconds */
  readonly durationMs: number;
}

/**
 * Parser interface — all format-specific parsers implement this.
 * OOP pattern: interface for DI, concrete classes per format.
 */
export interface IParser {
  /** The format this parser handles */
  readonly format: ImportFormat;
  /** Parse a file buffer into standardized questions */
  parse(
    buffer: Uint8Array,
    filename: string,
    options: ParserOptions,
  ): Promise<ParseResult>;
  /** Check if this parser can handle the given content (content sniffing) */
  canParse(buffer: Uint8Array, filename: string): boolean;
}
