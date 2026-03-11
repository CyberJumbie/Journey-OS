import type { IEmbeddingProvider } from './IEmbeddingProvider.interface';

/**
 * VoyageEmbeddingProvider — Voyage AI voyage-large-2 model.
 * 1024-dim vectors, batch max 128, 300 RPM.
 */
export class VoyageEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'voyage';
  readonly model = 'voyage-large-2';
  readonly dimensions = 1024;
  readonly maxBatchSize = 128;

  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.voyageai.com/v1/embeddings';

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
        input_type: 'document',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Voyage API failed (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };

    return result.data.map((d) => d.embedding);
  }
}
