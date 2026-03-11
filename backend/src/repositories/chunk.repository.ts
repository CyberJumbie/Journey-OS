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
