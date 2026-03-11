import type { IPdfParser } from './parsers/IPdfParser.interface';
import { LlamaParseParser } from './parsers/LlamaParseParser';
import { PdfplumberParser } from './parsers/PdfplumberParser';
import { PdfParseParser } from './parsers/PdfParseParser';

export interface PdfParserConfig {
  llamaparse_key?: string;
  use_python_service?: boolean;
  python_service_url?: string;
}

/**
 * PdfParserFactory — Factory pattern for PDF parser selection.
 *
 * Priority:
 * 1. LlamaParse (preferred) — requires API key
 * 2. Pdfplumber (fallback) — requires Python service running
 * 3. PdfParse (last resort) — npm package, no external deps, but no table support
 *
 * Callers NEVER import individual parsers. Always use:
 *   const parser = PdfParserFactory.create(config);
 */
export class PdfParserFactory {
  static create(config: PdfParserConfig): IPdfParser {
    if (config.llamaparse_key) {
      return new LlamaParseParser(config.llamaparse_key);
    }

    if (config.use_python_service) {
      return new PdfplumberParser(config.python_service_url);
    }

    return new PdfParseParser();
  }

  /**
   * Create parser with automatic fallback chain.
   * Tries each parser in priority order; returns first successful result.
   */
  static createWithFallback(config: PdfParserConfig): IPdfParser {
    const parsers: IPdfParser[] = [];

    if (config.llamaparse_key) {
      parsers.push(new LlamaParseParser(config.llamaparse_key));
    }

    if (config.use_python_service) {
      parsers.push(new PdfplumberParser(config.python_service_url));
    }

    parsers.push(new PdfParseParser());

    return new FallbackParser(parsers);
  }
}

/**
 * FallbackParser — tries parsers in order, falling back on failure.
 */
class FallbackParser implements IPdfParser {
  constructor(private readonly parsers: IPdfParser[]) {}

  async parse(fileBuffer: Buffer, filename: string): ReturnType<IPdfParser['parse']> {
    let lastError: Error | null = null;

    for (const parser of this.parsers) {
      try {
        return await parser.parse(fileBuffer, filename);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[PdfParserFactory] Parser failed, trying next:`,
          lastError.message,
        );
      }
    }

    throw lastError ?? new Error('All parsers failed');
  }
}
