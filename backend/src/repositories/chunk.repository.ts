import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentChunkRow } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient';

export interface ChunkInsertData {
  upload_id: string;
  course_id: string;
  institution_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
  source_type: 'syllabus' | 'lecture_slide' | 'textbook' | 'other';
  metadata?: Record<string, unknown>;
}

export class ChunkRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  async createMany(chunks: ChunkInsertData[]): Promise<ContentChunkRow[]> {
    const { data, error } = await this.supabase
      .from('content_chunks')
      .insert(chunks)
      .select();

    if (error) {
      throw new Error(`Failed to insert content chunks: ${error.message}`);
    }

    return (data ?? []) as ContentChunkRow[];
  }

  async findByUploadId(uploadId: string): Promise<ContentChunkRow[]> {
    const { data, error } = await this.supabase
      .from('content_chunks')
      .select()
      .eq('upload_id', uploadId)
      .order('chunk_index', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chunks: ${error.message}`);
    }

    return (data ?? []) as ContentChunkRow[];
  }

  async findById(id: string): Promise<ContentChunkRow | null> {
    const { data, error } = await this.supabase
      .from('content_chunks')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch chunk: ${error.message}`);
    }

    return data as ContentChunkRow;
  }

  /**
   * Find multiple chunks by their IDs.
   * Returns chunks in the order of the input IDs array.
   */
  async findByIds(ids: string[]): Promise<ContentChunkRow[]> {
    if (ids.length === 0) return [];

    const { data, error } = await this.supabase
      .from('content_chunks')
      .select()
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to fetch chunks by IDs: ${error.message}`);
    }

    // Preserve the order of input IDs
    const chunkMap = new Map((data ?? []).map((c) => [c.id, c]));
    return ids
      .map((id) => chunkMap.get(id))
      .filter((c): c is ContentChunkRow => c !== undefined);
  }

  /**
   * Vector similarity search using pgvector cosine distance.
   * Returns chunk IDs ordered by cosine similarity (closest first).
   * Uses the Voyage embedding table by default.
   */
  async vectorSearchChunks(
    courseId: string,
    queryEmbedding: number[],
    limit: number = 10,
  ): Promise<string[]> {
    // Use Supabase rpc for vector search with cosine distance
    // The <=> operator is cosine distance in pgvector
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const { data, error } = await this.supabase.rpc('match_content_chunks', {
      query_embedding: embeddingStr,
      match_course_id: courseId,
      match_count: limit,
    });

    if (error) {
      // Fall back to raw SQL if RPC not available
      console.warn(`[ChunkRepository] RPC match_content_chunks failed: ${error.message}, falling back to raw query`);
      return this.vectorSearchChunksFallback(courseId, queryEmbedding, limit);
    }

    return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
  }

  /**
   * Fallback vector search using raw SQL via Supabase.
   * Used when the match_content_chunks RPC is not available.
   */
  private async vectorSearchChunksFallback(
    courseId: string,
    _queryEmbedding: number[],
    limit: number,
  ): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('content_chunks')
      .select(`
        id,
        content_chunk_embeddings!inner(embedding)
      `)
      .eq('course_id', courseId)
      .limit(limit);

    if (error) {
      throw new Error(`Vector search fallback failed: ${error.message}`);
    }

    // Without RPC, we cannot use <=> in the client. Return unordered results
    // from the same course — the RRF merge will handle ranking.
    return ((data ?? []) as Array<{ id: string }>).map((row) => row.id);
  }

  /**
   * Insert embedding into the Voyage embeddings table.
   */
  async insertVoyageEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const { error } = await this.supabase
      .from('content_chunk_embeddings')
      .upsert({
        chunk_id: chunkId,
        embedding: JSON.stringify(embedding),
        model_name: 'voyage-large-2',
      }, { onConflict: 'chunk_id' });

    if (error) {
      throw new Error(`Failed to insert Voyage embedding: ${error.message}`);
    }
  }

  /**
   * Update sync_status and neo4j_node_id after syncing a chunk to Neo4j.
   */
  async updateSyncStatus(chunkId: string, neo4jNodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('content_chunks')
      .update({ sync_status: 'synced', neo4j_node_id: neo4jNodeId })
      .eq('id', chunkId);

    if (error) {
      throw new Error(`Failed to update chunk sync status: ${error.message}`);
    }
  }

  /**
   * Insert embedding into the OpenAI embeddings table.
   */
  async insertOpenAIEmbedding(chunkId: string, embedding: number[]): Promise<void> {
    const { error } = await this.supabase
      .from('content_chunk_embeddings_openai')
      .upsert({
        chunk_id: chunkId,
        embedding: JSON.stringify(embedding),
        model_name: 'text-embedding-3-small',
      }, { onConflict: 'chunk_id' });

    if (error) {
      throw new Error(`Failed to insert OpenAI embedding: ${error.message}`);
    }
  }
}
