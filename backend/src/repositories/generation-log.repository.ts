import type { SupabaseClient } from '@supabase/supabase-js';
import type { GenerationLogRow, GenerationLogInsert } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient';

/** Raw row shape from the paginated history query (snake_case from DB). */
export interface GenerationHistoryDbRow {
  id: string;
  course_id: string | null;
  course_title: string | null;
  input_message: string | null;
  auto_route: string | null;
  critic_composite_score: number | null;
  retry_count: number;
  duration_ms: number | null;
  total_cost_usd: number | null;
  created_at: string;
  item_status: string | null;
  item_id: string | null;
}

/** Raw shape for monthly stats aggregate. */
export interface GenerationStatsDbRow {
  total_generated: number;
  total_approved: number;
  avg_critic_score: number | null;
  avg_cost_usd: number | null;
}

/** Params for paginated history query. */
export interface GenerationHistoryParams {
  userId: string;
  page: number;
  limit: number;
  courseId?: string;
  autoRoute?: string;
  dateFrom?: string;
  dateTo?: string;
}

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

  /**
   * Paginated generation history for a specific user.
   * Joins generation_logs with courses (for name) and assessment_items (for status/route).
   * Returns rows + total count for pagination.
   */
  async findPaginated(
    params: GenerationHistoryParams,
  ): Promise<{ rows: GenerationHistoryDbRow[]; total: number }> {
    const { userId, page, limit, courseId, autoRoute, dateFrom, dateTo } = params;
    const offset = (page - 1) * limit;

    // Build the query: generation_logs joined with courses and first assessment_item
    let query = this.supabase
      .from('generation_logs')
      .select(
        'id, course_id, input_message, retry_count, duration_ms, total_cost_usd, created_at, courses(title), assessment_items(id, status, auto_route, critic_composite_score)',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch generation history: ${error.message}`);
    }

    // Transform the nested Supabase response into flat rows
    const rows: GenerationHistoryDbRow[] = (data ?? []).map((row: Record<string, unknown>) => {
      const courses = row.courses as { title: string } | null;
      // assessment_items is an array; take the first item if present
      const items = row.assessment_items as Array<{
        id: string;
        status: string;
        auto_route: string | null;
        critic_composite_score: number | null;
      }> | null;
      const firstItem = items?.[0] ?? null;

      return {
        id: row.id as string,
        course_id: row.course_id as string | null,
        course_title: courses?.title ?? null,
        input_message: row.input_message as string | null,
        auto_route: firstItem?.auto_route ?? null,
        critic_composite_score: firstItem?.critic_composite_score ?? null,
        retry_count: (row.retry_count as number) ?? 0,
        duration_ms: row.duration_ms as number | null,
        total_cost_usd: row.total_cost_usd as number | null,
        created_at: row.created_at as string,
        item_status: firstItem?.status ?? null,
        item_id: firstItem?.id ?? null,
      };
    });

    // If autoRoute filter is specified, filter after join (Supabase can't filter nested)
    const filteredRows = autoRoute
      ? rows.filter((r) => r.auto_route === autoRoute)
      : rows;

    return {
      rows: filteredRows,
      total: autoRoute ? filteredRows.length : (count ?? 0),
    };
  }

  /**
   * Monthly stats aggregate for a specific user (current month).
   * Returns total generated, total approved, avg critic score, avg cost.
   */
  async getMonthlyStats(userId: string): Promise<GenerationStatsDbRow> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Count total generation logs this month
    const { count: totalGenerated, error: countError } = await this.supabase
      .from('generation_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);

    if (countError) {
      throw new Error(`Failed to count generation logs: ${countError.message}`);
    }

    // Get items generated this month with their statuses and scores
    const { data: logs, error: logsError } = await this.supabase
      .from('generation_logs')
      .select('id, total_cost_usd, assessment_items(status, critic_composite_score)')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);

    if (logsError) {
      throw new Error(`Failed to fetch generation stats: ${logsError.message}`);
    }

    let totalApproved = 0;
    let criticSum = 0;
    let criticCount = 0;
    let costSum = 0;
    let costCount = 0;

    for (const log of logs ?? []) {
      const items = log.assessment_items as Array<{
        status: string;
        critic_composite_score: number | null;
      }> | null;

      if (items) {
        for (const item of items) {
          if (item.status === 'approved') totalApproved++;
          if (item.critic_composite_score != null) {
            criticSum += item.critic_composite_score;
            criticCount++;
          }
        }
      }

      if (log.total_cost_usd != null) {
        costSum += Number(log.total_cost_usd);
        costCount++;
      }
    }

    return {
      total_generated: totalGenerated ?? 0,
      total_approved: totalApproved,
      avg_critic_score: criticCount > 0 ? criticSum / criticCount : null,
      avg_cost_usd: costCount > 0 ? costSum / costCount : null,
    };
  }
}
