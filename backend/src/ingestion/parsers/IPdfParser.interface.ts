/**
 * IPdfParser — Strategy interface for PDF parsing.
 *
 * All parser implementations must conform to this interface.
 * Callers never instantiate parsers directly — always use PdfParserFactory.
 */
export interface ParsedDocument {
  /** Markdown-formatted content extracted from the PDF */
  markdown: string;
  /** Number of pages in the source PDF */
  page_count: number;
  /** Which parser was used */
  extraction_method: 'llamaparse' | 'pdfplumber' | 'pdf-parse';
  /** Whether the document contained tables (detected by pipe characters) */
  has_tables: boolean;
}

export interface IPdfParser {
  /** Parse a PDF file (buffer or path) and return structured markdown */
  parse(fileBuffer: Buffer, filename: string): Promise<ParsedDocument>;
}
