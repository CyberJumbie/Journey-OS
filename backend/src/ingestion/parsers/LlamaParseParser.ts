import type { IPdfParser, ParsedDocument } from './IPdfParser.interface';

/**
 * LlamaParseParser — preferred parser.
 * Uses LlamaParse API to extract Markdown natively from PDFs.
 * Best at preserving table structure and formatting.
 */
export class LlamaParseParser implements IPdfParser {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.cloud.llamaindex.ai/api/parsing';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parse(fileBuffer: Buffer, filename: string): Promise<ParsedDocument> {
    // Step 1: Upload file to LlamaParse
    const uploadResponse = await this.uploadFile(fileBuffer, filename);
    const jobId = uploadResponse.id;

    // Step 2: Poll for completion
    const result = await this.pollForResult(jobId);

    // Step 3: Get markdown result
    const markdown = await this.getMarkdownResult(jobId);

    const hasTablesPipe = markdown.includes('|');

    return {
      markdown,
      page_count: result.num_pages ?? this.estimatePageCount(markdown),
      extraction_method: 'llamaparse',
      has_tables: hasTablesPipe,
    };
  }

  private async uploadFile(fileBuffer: Buffer, filename: string): Promise<{ id: string }> {
    const formData = new FormData();
    const blob = new Blob([fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) as ArrayBuffer], { type: 'application/pdf' });
    formData.append('file', blob, filename);
    formData.append('result_type', 'markdown');

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LlamaParse upload failed (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<{ id: string }>;
  }

  private async pollForResult(
    jobId: string,
    maxAttempts = 60,
    intervalMs = 2000,
  ): Promise<{ status: string; num_pages?: number }> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/job/${jobId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      if (!response.ok) {
        throw new Error(`LlamaParse poll failed (${response.status})`);
      }

      const result = (await response.json()) as { status: string; num_pages?: number };

      if (result.status === 'SUCCESS') {
        return result;
      }

      if (result.status === 'ERROR') {
        throw new Error('LlamaParse job failed');
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error('LlamaParse job timed out');
  }

  private async getMarkdownResult(jobId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/job/${jobId}/result/markdown`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`LlamaParse result fetch failed (${response.status})`);
    }

    const result = (await response.json()) as { markdown: string };
    return result.markdown;
  }

  private estimatePageCount(markdown: string): number {
    // Rough estimate: ~3000 chars per page
    return Math.max(1, Math.ceil(markdown.length / 3000));
  }
}
