import { PDFParse } from 'pdf-parse';
import type { IPdfParser, ParsedDocument } from './IPdfParser.interface';

/**
 * PdfParseParser — last resort parser.
 * Uses the pdf-parse npm package for raw text extraction.
 * WARNING: No table preservation. If source has tables and this parser is used,
 * the caller should warn the user about degraded quality.
 */
export class PdfParseParser implements IPdfParser {
  async parse(fileBuffer: Buffer, _filename: string): Promise<ParsedDocument> {
    const uint8 = new Uint8Array(fileBuffer.buffer, fileBuffer.byteOffset, fileBuffer.byteLength);
    const parser = new PDFParse(uint8);
    const result = await parser.getText();

    // Combine all page texts
    const fullText = result.pages.map((page) => page.text).join('\n\n');
    const markdown = this.rawTextToMarkdown(fullText);
    const hasTables = markdown.includes('|');

    return {
      markdown,
      page_count: result.pages.length,
      extraction_method: 'pdf-parse',
      has_tables: hasTables,
    };
  }

  /**
   * Convert raw text to minimal markdown structure.
   * Attempts to detect headers and paragraph boundaries.
   */
  private rawTextToMarkdown(text: string): string {
    const lines = text.split('\n');
    const markdownLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        markdownLines.push('');
        continue;
      }

      // Heuristic: ALL CAPS short lines are likely headers
      if (
        trimmed.length < 80 &&
        trimmed === trimmed.toUpperCase() &&
        /[A-Z]/.test(trimmed)
      ) {
        markdownLines.push(`## ${this.toTitleCase(trimmed)}`);
        continue;
      }

      markdownLines.push(trimmed);
    }

    return markdownLines.join('\n');
  }

  private toTitleCase(text: string): string {
    return text
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
