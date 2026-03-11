/**
 * ChunkerService — Markdown-aware text chunker.
 *
 * Split strategy:
 * 1. Split on ## headers first
 * 2. Then split on \n\n (paragraph boundaries)
 * 3. Respect 800-token target per chunk
 * 4. NEVER split inside a Markdown table row (| ... |)
 * 5. NEVER split mid-sentence
 */

export interface ChunkOutput {
  content: string;
  chunk_index: number;
  token_count: number;
  source_type: 'syllabus' | 'lecture_slide' | 'textbook' | 'other';
}

const TARGET_TOKENS = 800;
const MAX_TOKENS = 1200; // Allow some overflow to avoid splitting sentences

export class ChunkerService {
  /**
   * Chunk markdown into content pieces respecting structure and token limits.
   */
  chunk(markdown: string, sourceType: 'syllabus' | 'lecture_slide' | 'textbook' | 'other' = 'syllabus'): ChunkOutput[] {
    // Step 1: Split on ## headers
    const sections = this.splitOnHeaders(markdown);

    // Step 2: For each section, split on paragraphs if too large
    const rawChunks: string[] = [];
    for (const section of sections) {
      if (this.estimateTokens(section) <= MAX_TOKENS) {
        rawChunks.push(section);
      } else {
        const subChunks = this.splitSection(section);
        rawChunks.push(...subChunks);
      }
    }

    // Step 3: Filter empty chunks and build output
    return rawChunks
      .map((content) => content.trim())
      .filter((content) => content.length > 0)
      .map((content, index) => ({
        content,
        chunk_index: index,
        token_count: this.estimateTokens(content),
        source_type: sourceType,
      }));
  }

  /**
   * Split markdown on header boundaries (# or ##).
   * Keeps the header with its content.
   */
  private splitOnHeaders(markdown: string): string[] {
    // Split before any line starting with # or ##
    const parts = markdown.split(/(?=^#{1,2} )/m);
    return parts.filter((p) => p.trim().length > 0);
  }

  /**
   * Split a section that exceeds the token limit.
   * Respects table boundaries and sentence boundaries.
   */
  private splitSection(section: string): string[] {
    // If the section is a table block, keep it whole
    if (this.isTableBlock(section)) {
      return [section];
    }

    // Split on paragraph boundaries (\n\n)
    const paragraphs = section.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) continue;

      // If this paragraph is a table, never split it
      if (this.isTableBlock(trimmed)) {
        // Flush current chunk
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        chunks.push(trimmed);
        continue;
      }

      const combined = currentChunk ? `${currentChunk}\n\n${trimmed}` : trimmed;

      if (this.estimateTokens(combined) <= TARGET_TOKENS) {
        currentChunk = combined;
      } else if (this.estimateTokens(currentChunk) === 0) {
        // Single paragraph exceeds target — try sentence splitting
        if (this.estimateTokens(trimmed) > MAX_TOKENS) {
          const sentenceChunks = this.splitOnSentences(trimmed);
          chunks.push(...sentenceChunks);
        } else {
          chunks.push(trimmed);
        }
      } else {
        // Flush current chunk, start new one with this paragraph
        chunks.push(currentChunk.trim());
        currentChunk = trimmed;
      }
    }

    // Flush remaining
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split text on sentence boundaries as last resort.
   * Used when a single paragraph exceeds MAX_TOKENS.
   */
  private splitOnSentences(text: string): string[] {
    // Split on sentence-ending punctuation followed by space
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const combined = currentChunk ? `${currentChunk} ${sentence}` : sentence;

      if (this.estimateTokens(combined) <= TARGET_TOKENS) {
        currentChunk = combined;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Detect if a text block contains Markdown table rows.
   */
  private isTableBlock(text: string): boolean {
    const lines = text.split('\n');
    const tableLines = lines.filter((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('|') && trimmed.endsWith('|');
    });
    // A table block has at least 2 table lines (header + separator or data)
    return tableLines.length >= 2;
  }

  /**
   * Estimate token count from text.
   * Rough heuristic: ~4 characters per token (GPT-style tokenization).
   */
  private estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
}
