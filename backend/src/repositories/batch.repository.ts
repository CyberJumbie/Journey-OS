import type { SupabaseClient } from '@supabase/supabase-js';
import SupabaseClientSingleton from '../lib/SupabaseClient';

/**
 * Row shape for bulk_batches table.
 */
export interface BulkBatchRow {
  id: string;
  course_id: string;
  user_id: string;
  total_count: number;
  completed_count: number;
  failed_count: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  estimated_cost: number | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Row shape for bulk_batch_items table.
 */
export interface BulkBatchItemRow {
  id: string;
  batch_id: string;
  item_id: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

/**
 * Enriched batch item with assessment item excerpt data for UI display.
 */
export interface EnrichedBatchItemRow extends BulkBatchItemRow {
  stem_excerpt: string | null;
  bloom_level: number | null;
  usmle_system: string | null;
}

/**
 * Insert shape for creating a new batch.
 */
export interface BulkBatchInsert {
  course_id: string;
  user_id: string;
  total_count: number;
  estimated_cost: number | null;
}

/**
 * Insert shape for creating a batch item placeholder.
 */
export interface BulkBatchItemInsert {
  batch_id: string;
  status?: string;
}

/**
 * BatchRepository — all bulk_batches and bulk_batch_items DB queries.
 * Supabase only. No business logic.
 */
export class BatchRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  /**
   * Create a new batch row and return it.
   */
  async createBatch(insert: BulkBatchInsert): Promise<BulkBatchRow> {
    const { data, error } = await this.supabase
      .from('bulk_batches')
      .insert({
        course_id: insert.course_id,
        user_id: insert.user_id,
        total_count: insert.total_count,
        estimated_cost: insert.estimated_cost,
        status: 'pending',
        completed_count: 0,
        failed_count: 0,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create batch: ${error.message}`);
    }

    return data as BulkBatchRow;
  }

  /**
   * Create batch item placeholder rows (one per item to generate).
   */
  async createBatchItems(batchId: string, count: number): Promise<BulkBatchItemRow[]> {
    const rows = Array.from({ length: count }, () => ({
      batch_id: batchId,
      status: 'pending',
    }));

    const { data, error } = await this.supabase
      .from('bulk_batch_items')
      .insert(rows)
      .select('*');

    if (error) {
      throw new Error(`Failed to create batch items: ${error.message}`);
    }

    return (data ?? []) as BulkBatchItemRow[];
  }

  /**
   * Find a batch by ID.
   */
  async findById(batchId: string): Promise<BulkBatchRow | null> {
    const { data, error } = await this.supabase
      .from('bulk_batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(`Failed to fetch batch: ${error.message}`);
    }

    return data as BulkBatchRow;
  }

  /**
   * Find all items belonging to a batch.
   */
  async findItemsByBatchId(batchId: string): Promise<BulkBatchItemRow[]> {
    const { data, error } = await this.supabase
      .from('bulk_batch_items')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch batch items: ${error.message}`);
    }

    return (data ?? []) as BulkBatchItemRow[];
  }

  /**
   * Find all items belonging to a batch, enriched with assessment item data.
   * Uses a left join via Supabase's embedded resource syntax.
   */
  async findEnrichedItemsByBatchId(batchId: string): Promise<EnrichedBatchItemRow[]> {
    const { data, error } = await this.supabase
      .from('bulk_batch_items')
      .select('*, assessment_items(stem, bloom_level, usmle_system)')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch enriched batch items: ${error.message}`);
    }

    // Flatten the joined assessment_items into the row
    return (data ?? []).map((row: Record<string, unknown>) => {
      const assessmentItem = row['assessment_items'] as {
        stem: string | null;
        bloom_level: number | null;
        usmle_system: string | null;
      } | null;

      return {
        id: row['id'] as string,
        batch_id: row['batch_id'] as string,
        item_id: row['item_id'] as string | null,
        status: row['status'] as BulkBatchItemRow['status'],
        error_message: row['error_message'] as string | null,
        created_at: row['created_at'] as string,
        stem_excerpt: assessmentItem?.stem
          ? assessmentItem.stem.slice(0, 120)
          : null,
        bloom_level: assessmentItem?.bloom_level ?? null,
        usmle_system: assessmentItem?.usmle_system ?? null,
      };
    });
  }

  /**
   * Find a single batch item by ID.
   */
  async findBatchItemById(batchItemId: string): Promise<BulkBatchItemRow | null> {
    const { data, error } = await this.supabase
      .from('bulk_batch_items')
      .select('*')
      .eq('id', batchItemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch batch item: ${error.message}`);
    }

    return data as BulkBatchItemRow;
  }

  /**
   * List batches for a user, ordered by most recent first.
   */
  async findByUserId(userId: string): Promise<BulkBatchRow[]> {
    const { data, error } = await this.supabase
      .from('bulk_batches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list batches: ${error.message}`);
    }

    return (data ?? []) as BulkBatchRow[];
  }

  /**
   * Update batch status.
   */
  async updateBatchStatus(
    batchId: string,
    status: BulkBatchRow['status'],
  ): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed' || status === 'failed') {
      updates['completed_at'] = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('bulk_batches')
      .update(updates)
      .eq('id', batchId);

    if (error) {
      throw new Error(`Failed to update batch status: ${error.message}`);
    }
  }

  /**
   * Update a single batch item's status and optionally set item_id or error_message.
   */
  async updateBatchItem(
    batchItemId: string,
    updates: {
      status: BulkBatchItemRow['status'];
      item_id?: string;
      error_message?: string;
    },
  ): Promise<void> {
    const { error } = await this.supabase
      .from('bulk_batch_items')
      .update({
        status: updates.status,
        ...(updates.item_id !== undefined ? { item_id: updates.item_id } : {}),
        ...(updates.error_message !== undefined
          ? { error_message: updates.error_message }
          : {}),
      })
      .eq('id', batchItemId);

    if (error) {
      throw new Error(`Failed to update batch item: ${error.message}`);
    }
  }

  /**
   * Increment completed_count on a batch.
   */
  async incrementCompletedCount(batchId: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_batch_completed', {
      p_batch_id: batchId,
    });

    // If the RPC doesn't exist yet, fall back to read-modify-write
    if (error) {
      const batch = await this.findById(batchId);
      if (batch) {
        await this.supabase
          .from('bulk_batches')
          .update({ completed_count: batch.completed_count + 1 })
          .eq('id', batchId);
      }
    }
  }

  /**
   * Decrement failed_count on a batch (used when retrying a failed item).
   */
  async decrementFailedCount(batchId: string): Promise<void> {
    const batch = await this.findById(batchId);
    if (batch && batch.failed_count > 0) {
      const { error } = await this.supabase
        .from('bulk_batches')
        .update({ failed_count: batch.failed_count - 1 })
        .eq('id', batchId);

      if (error) {
        throw new Error(`Failed to decrement failed count: ${error.message}`);
      }
    }
  }

  /**
   * Increment failed_count on a batch.
   */
  async incrementFailedCount(batchId: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_batch_failed', {
      p_batch_id: batchId,
    });

    // Fallback to read-modify-write if RPC doesn't exist
    if (error) {
      const batch = await this.findById(batchId);
      if (batch) {
        await this.supabase
          .from('bulk_batches')
          .update({ failed_count: batch.failed_count + 1 })
          .eq('id', batchId);
      }
    }
  }
}
