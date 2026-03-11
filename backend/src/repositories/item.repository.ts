import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssessmentItemRow, ItemStatus, OptionRow } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient';

/** Filter parameters for querying assessment items. */
export interface ItemFilters {
  courseId?: string;
  status?: ItemStatus;
  institutionId?: string | null;
  page: number;
  limit: number;
}

/** An assessment item with its options joined. */
export interface ItemWithOptions extends AssessmentItemRow {
  options: OptionRow[];
}

/**
 * ItemRepository — all assessment_items DB queries live here.
 * Supabase only. No business logic.
 */
export class ItemRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  /**
   * Find a single assessment item by ID.
   * Returns null if not found.
   */
  async findById(id: string): Promise<AssessmentItemRow | null> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Row not found
      throw new Error(`Failed to fetch item ${id}: ${error.message}`);
    }

    return data as AssessmentItemRow;
  }

  /**
   * Find assessment items matching filters, with options joined.
   * Returns paginated results ordered by created_at DESC.
   */
  async findByFilters(filters: ItemFilters): Promise<ItemWithOptions[]> {
    let query = this.supabase
      .from('assessment_items')
      .select('*, options:options(*)')
      .order('created_at', { ascending: false });

    if (filters.institutionId) {
      query = query.eq('institution_id', filters.institutionId);
    }
    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const offset = (filters.page - 1) * filters.limit;
    query = query.range(offset, offset + filters.limit - 1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch items: ${error.message}`);
    }

    return (data ?? []) as ItemWithOptions[];
  }

  /**
   * Count assessment items matching filters (for pagination total).
   */
  async countByFilters(filters: ItemFilters): Promise<number> {
    let query = this.supabase
      .from('assessment_items')
      .select('id', { count: 'exact', head: true });

    if (filters.institutionId) {
      query = query.eq('institution_id', filters.institutionId);
    }
    if (filters.courseId) {
      query = query.eq('course_id', filters.courseId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count items: ${error.message}`);
    }

    return count ?? 0;
  }

  /**
   * Update the status and updated_at timestamp of an assessment item.
   * Returns the updated row.
   */
  async updateStatus(id: string, status: ItemStatus): Promise<AssessmentItemRow> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update item ${id} status: ${error.message}`);
    }

    return data as AssessmentItemRow;
  }

  /**
   * Update taxonomy tags on an assessment item (TaggerNode writes).
   */
  async updateTags(id: string, tags: {
    bloom_level: number;
    usmle_system: string;
    usmle_discipline: string;
    difficulty: number;
    acgme_domain: string | null;
    epa_number: string | null;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('assessment_items')
      .update({
        ...tags,
        tags_generated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update tags for item ${id}: ${error.message}`);
    }
  }

  /**
   * Update critic scores on an assessment item (CriticAgentNode writes).
   */
  async updateCriticScores(id: string, data: {
    critic_clinical_accuracy: number | null;
    critic_vignette_realism: number | null;
    critic_distractor_quality: number | null;
    critic_bloom_alignment: number | null;
    critic_nbme_compliance: number | null;
    critic_educational_value: number | null;
    critic_composite_score: number;
    critic_reasoning: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('assessment_items')
      .update(data)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update critic scores for item ${id}: ${error.message}`);
    }
  }

  /**
   * Update route decision on an assessment item (ReviewRouterNode writes).
   */
  async updateRoute(id: string, data: {
    auto_route: string;
    status: string;
    rejection_reason?: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('assessment_items')
      .update({
        auto_route: data.auto_route,
        status: data.status,
        rejection_reason: data.rejection_reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update route for item ${id}: ${error.message}`);
    }
  }
}
