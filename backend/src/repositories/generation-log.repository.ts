import type { SupabaseClient } from '@supabase/supabase-js';
import type { GenerationLogRow, GenerationLogInsert } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient.js';

/**
 * GenerationLogRepository — all generation_logs Supabase queries.
 * NO business logic. Returns typed data only.
 */
export class GenerationLogRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  /**
   * Create a generation log entry with status='running'.
   * Returns the inserted row (including server-generated id).
   */
  async create(insert: GenerationLogInsert): Promise<GenerationLogRow> {
    const { data, error } = await this.supabase
      .from('generation_logs')
      .insert(insert)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create generation log: ${error.message}`);
    }

    return data as GenerationLogRow;
  }

  /**
   * Find a generation log by ID.
   */
  async findById(id: string): Promise<GenerationLogRow | null> {
    const { data, error } = await this.supabase
      .from('generation_logs')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch generation log: ${error.message}`);
    }

    return data as GenerationLogRow;
  }

  /**
   * Update a generation log (e.g., mark completed/failed, set cost fields).
   */
  async update(
    id: string,
    fields: Partial<Pick<GenerationLogRow, 'status' | 'pipeline_state' | 'model_calls' | 'total_tokens_in' | 'total_tokens_out' | 'total_cost_usd' | 'duration_ms' | 'completed_at'>>,
  ): Promise<GenerationLogRow> {
    const { data, error } = await this.supabase
      .from('generation_logs')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update generation log: ${error.message}`);
    }

    return data as GenerationLogRow;
  }
}
