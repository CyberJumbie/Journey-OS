import type { IPdfParser, ParsedDocument } from './IPdfParser.interface';

/**
 * PdfplumberParser — fallback parser.
 * Calls the python/pdf-parser service (pdfplumber-based) for Markdown extraction.
 * Better table handling than pdf-parse but requires Python service to be running.
 */
export class PdfplumberParser implements IPdfParser {
  private readonly serviceUrl: string;

  constructor(serviceUrl = 'http://localhost:8002') {
    this.serviceUrl = serviceUrl;
  }

  async parse(fileBuffer: Buffer, filename: string): Promise<ParsedDocument> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer], { type: 'application/pdf' });
    formData.append('file', blob, filename);

    const response = await fetch(`${this.serviceUrl}/parse`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pdfplumber service failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      markdown: string;
      page_count: number;
      has_tables: boolean;
    };

    return {
      markdown: result.markdown,
      page_count: result.page_count,
      extraction_method: 'pdfplumber',
      has_tables: result.has_tables,
    };
  }
}
