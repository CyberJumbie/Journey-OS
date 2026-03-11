import type { SupabaseClient } from '@supabase/supabase-js';
import SupabaseClientSingleton from '../lib/SupabaseClient';

/**
 * DualWriteService — the ONLY path for cross-database writes.
 *
 * Contract:
 * 1. Write Supabase first (source of truth). If it fails, throw — do NOT write Neo4j.
 * 2. Write Neo4j second. If it fails, mark sync_status='failed' in Supabase, log, don't throw.
 * 3. On Neo4j success, update sync_status='synced' and store neo4j_node_id.
 *
 * sync_status states: pending | synced | failed | orphaned
 */
export class DualWriteService {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  /**
   * Execute a dual-write: Supabase first, then Neo4j.
   *
   * @param supabaseWrite - Function that writes to Supabase, returns the result (must include `id` and a table name)
   * @param neo4jWrite - Function that writes to Neo4j, receives the Supabase result. Should return the Neo4j node ID.
   * @param table - The Supabase table name (for sync_status updates)
   * @returns The Supabase write result
   */
  async dualWrite<T extends { id: string }>(
    supabaseWrite: () => Promise<T>,
    neo4jWrite: (result: T) => Promise<string>,
    table: string,
  ): Promise<T> {
    // Step 1: Write Supabase (throw on failure — do NOT proceed to Neo4j)
    const result = await supabaseWrite();

    // Step 2: Write Neo4j (on failure: update sync_status='failed', log, don't throw)
    try {
      const neo4jNodeId = await neo4jWrite(result);

      // Step 3: Mark synced and store neo4j_node_id
      await this.markSynced(table, result.id, neo4jNodeId);
    } catch (err) {
      await this.markFailed(table, result.id);
      console.error(`[DualWriteService] Neo4j write failed for ${table}/${result.id}:`, err);
    }

    return result;
  }

  /**
   * Batch dual-write: writes multiple records to Supabase, then syncs each to Neo4j.
   */
  async dualWriteBatch<T extends { id: string }>(
    supabaseWrite: () => Promise<T[]>,
    neo4jWriteEach: (item: T) => Promise<string>,
    table: string,
  ): Promise<T[]> {
    // Step 1: Write all to Supabase
    const results = await supabaseWrite();

    // Step 2: Write each to Neo4j sequentially (avoid rate limits)
    for (const item of results) {
      try {
        const neo4jNodeId = await neo4jWriteEach(item);
        await this.markSynced(table, item.id, neo4jNodeId);
      } catch (err) {
        await this.markFailed(table, item.id);
        console.error(`[DualWriteService] Neo4j write failed for ${table}/${item.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Reconcile all failed sync records for a given table.
   * Retries the Neo4j write for each failed record.
   */
  async reconcileFailures(
    table: string,
    retryNeo4jWrite: (record: Record<string, unknown>) => Promise<string>,
  ): Promise<{ reconciled: number; stillFailed: number }> {
    const { data: failedRecords, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('sync_status', 'failed');

    if (error) {
      throw new Error(`Failed to query failed records from ${table}: ${error.message}`);
    }

    if (!failedRecords || failedRecords.length === 0) {
      return { reconciled: 0, stillFailed: 0 };
    }

    let reconciled = 0;
    let stillFailed = 0;

    for (const record of failedRecords) {
      try {
        const neo4jNodeId = await retryNeo4jWrite(record as Record<string, unknown>);
        await this.markSynced(table, record.id as string, neo4jNodeId);
        reconciled++;
      } catch (err) {
        stillFailed++;
        console.error(`[DualWriteService] Reconcile retry failed for ${table}/${record.id}:`, err);
      }
    }

    return { reconciled, stillFailed };
  }

  private async markSynced(table: string, id: string, neo4jNodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .update({
        sync_status: 'synced',
        neo4j_node_id: neo4jNodeId,
      })
      .eq('id', id);

    if (error) {
      console.error(`[DualWriteService] Failed to mark ${table}/${id} as synced:`, error.message);
    }
  }

  private async markFailed(table: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .update({ sync_status: 'failed' })
      .eq('id', id);

    if (error) {
      console.error(`[DualWriteService] Failed to mark ${table}/${id} as failed:`, error.message);
    }
  }
}
