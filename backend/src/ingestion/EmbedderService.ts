import type { ContentChunkRow } from '@journey-os/shared-types';
import { EmbeddingProviderFactory } from './EmbeddingProviderFactory';
import type { IEmbeddingProvider } from './providers/IEmbeddingProvider.interface';
import { ChunkRepository } from '../repositories/chunk.repository';
import { config } from '../config/config';
import SupabaseClientSingleton from '../lib/SupabaseClient';

/**
 * EmbedderService — orchestrates embedding generation across providers.
 *
 * At ingest: runs ALL configured providers SEQUENTIALLY (avoid rate-limit collisions).
 * At search: uses ONE provider (config-controlled).
 *
 * Uses TWO SEPARATE TABLES:
 * - content_chunk_embeddings (Voyage, 1024-dim)
 * - content_chunk_embeddings_openai (OpenAI, 1536-dim)
 */
export class EmbedderService {
  private readonly chunkRepository: ChunkRepository;

  constructor() {
    this.chunkRepository = new ChunkRepository();
  }

  /**
   * Embed all chunks using ALL configured ingest providers.
   * Runs providers sequentially to avoid rate-limit collisions.
   */
  async embedChunks(chunks: ContentChunkRow[]): Promise<void> {
    if (chunks.length === 0) return;

    const providers = EmbeddingProviderFactory.getIngestProviders(config);
    const texts = chunks.map((c) => c.content ?? '');

    // Run providers SEQUENTIALLY (not parallel) to avoid rate-limit collisions
    for (const provider of providers) {
      try {
        console.log(`[EmbedderService] Embedding ${texts.length} chunks with ${provider.name} (${provider.model})`);
        const embeddings = await provider.embed(texts);

        // Store each embedding in the appropriate table
        await this.storeEmbeddings(chunks, embeddings, provider);

        console.log(`[EmbedderService] ${provider.name} embeddings stored successfully`);
      } catch (err) {
        console.error(`[EmbedderService] ${provider.name} embedding failed:`, err);
        // Continue to next provider — don't block the pipeline
        // The missing embeddings can be backfilled later
      }
    }
  }

  /**
   * Search for similar chunks using the configured search provider.
   */
  async searchChunks(
    query: string,
    courseId: string,
    limit = 10,
    overrideProvider?: 'voyage' | 'openai',
  ): Promise<Array<{ chunk_id: string; similarity: number; content: string }>> {
    const providerName = overrideProvider ?? config.EMBEDDING_SEARCH_PROVIDER;
    const provider = overrideProvider
      ? this.getProviderByName(providerName)
      : EmbeddingProviderFactory.getSearchProvider(config);

    // Embed the query
    const [queryEmbedding] = await provider.embed([query]);

    // Call the appropriate RPC function based on provider
    const rpcName = providerName === 'voyage' ? 'search_chunks_voyage' : 'search_chunks_openai';

    const supabase = SupabaseClientSingleton.getInstance();

    const { data, error } = await supabase.rpc(rpcName, {
      query_embedding: JSON.stringify(queryEmbedding),
      course_id: courseId,
      match_count: limit,
    });

    if (error) {
      throw new Error(`Vector search failed: ${error.message}`);
    }

    return (data ?? []) as Array<{ chunk_id: string; similarity: number; content: string }>;
  }

  private async storeEmbeddings(
    chunks: ContentChunkRow[],
    embeddings: number[][],
    provider: IEmbeddingProvider,
  ): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];

      if (provider.name === 'voyage') {
        await this.chunkRepository.insertVoyageEmbedding(chunk.id, embedding);
      } else if (provider.name === 'openai') {
        await this.chunkRepository.insertOpenAIEmbedding(chunk.id, embedding);
      }
    }
  }

  /**
   * Embed a single stem string using the configured search provider.
   * Returns the raw embedding vector for use by DedupDetectorNode.
   */
  async embedStem(stem: string): Promise<number[]> {
    const provider = EmbeddingProviderFactory.getSearchProvider(config);
    const [embedding] = await provider.embed([stem]);
    return embedding;
  }

  private getProviderByName(name: string): IEmbeddingProvider {
    const providers = EmbeddingProviderFactory.getIngestProviders(config);
    const provider = providers.find((p) => p.name === name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found in configured providers`);
    }
    return provider;
  }
}
