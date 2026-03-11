import type { IEmbeddingProvider } from './IEmbeddingProvider.interface';

/**
 * OpenAIEmbeddingProvider — OpenAI text-embedding-3-small model.
 * 1536-dim vectors, batch max 100, 3000 RPM.
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'openai';
  readonly model = 'text-embedding-3-small';
  readonly dimensions = 1536;
  readonly maxBatchSize = 100;

  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openai.com/v1/embeddings';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const allEmbeddings: number[][] = [];

    // Process in batches to respect batch limit
    for (let i = 0; i < texts.length; i += this.maxBatchSize) {
      const batch = texts.slice(i, i + this.maxBatchSize);
      const batchEmbeddings = await this.embedBatch(batch);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Embedding API failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return result.data.map((d) => d.embedding);
  }
}
