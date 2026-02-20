import type {
  IParser,
  ImportFormat,
  ParseResult,
  ParserOptions,
} from "@journey-os/types";
import {
  UnsupportedFormatError,
  FileSizeLimitError,
} from "../../errors/import.errors";
import { CsvParser } from "./parsers/csv-parser";
import { QtiParser } from "./parsers/qti-parser";
import { TextParser } from "./parsers/text-parser";

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class ParserFactory {
  readonly #parsers: readonly IParser[];

  constructor() {
    this.#parsers = [new CsvParser(), new QtiParser(), new TextParser()];
  }

  detectFormat(buffer: Uint8Array, filename: string): ImportFormat {
    for (const parser of this.#parsers) {
      if (parser.canParse(buffer, filename)) {
        return parser.format;
      }
    }
    throw new UnsupportedFormatError(filename);
  }

  getParser(filename: string, buffer: Uint8Array): IParser {
    const format = this.detectFormat(buffer, filename);
    const parser = this.#parsers.find((p) => p.format === format);
    if (!parser) {
      throw new UnsupportedFormatError(filename);
    }
    return parser;
  }

  async parse(
    buffer: Uint8Array,
    filename: string,
    options?: Partial<ParserOptions>,
  ): Promise<ParseResult> {
    const maxSize = options?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE;

    if (buffer.byteLength > maxSize) {
      throw new FileSizeLimitError(buffer.byteLength, maxSize);
    }

    const fullOptions: ParserOptions = {
      maxFileSizeBytes: maxSize,
      columnMapping: options?.columnMapping,
      strictMode: options?.strictMode,
    };

    const parser = this.getParser(filename, buffer);
    return parser.parse(buffer, filename, fullOptions);
  }
}
