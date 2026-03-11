/**
 * IEmbeddingProvider — Strategy interface for embedding providers.
 *
 * Both Voyage and OpenAI implement this interface.
 * At ingest time, both providers run. At search time, one is used (config-controlled).
 */
export interface IEmbeddingProvider {
  /** Provider name (e.g., 'voyage', 'openai') */
  readonly name: string;
  /** Model identifier */
  readonly model: string;
  /** Vector dimensions */
  readonly dimensions: number;
  /** Maximum batch size per API call */
  readonly maxBatchSize: number;

  /**
   * Embed an array of texts into vectors.
   * Returns one vector per input text.
   */
  embed(texts: string[]): Promise<number[][]>;
}
