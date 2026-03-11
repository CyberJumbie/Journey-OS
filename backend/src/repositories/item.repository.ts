import type { SupabaseClient } from '@supabase/supabase-js';
import type { AssessmentItemRow, ItemStatus, OptionRow, GeneratedOption } from '@journey-os/shared-types';
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

/** Insert shape for assessment_item_versions table. */
export interface ItemVersionInsert {
  item_id: string;
  vignette: string | null;
  stem: string | null;
  options: GeneratedOption[];
  edit_instruction: string | null;
  edited_by: string | null;
}

/** Row shape for assessment_item_versions table. */
export interface ItemVersionRow {
  id: string;
  item_id: string;
  vignette: string | null;
  stem: string | null;
  options: GeneratedOption[];
  edit_instruction: string | null;
  edited_by: string | null;
  created_at: string;
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

  /**
   * Find an assessment item by ID with its options joined.
   * Returns null if not found.
   */
  async findByIdWithOptions(id: string): Promise<ItemWithOptions | null> {
    const { data, error } = await this.supabase
      .from('assessment_items')
      .select('*, options:options(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to fetch item with options ${id}: ${error.message}`);
    }

    return data as ItemWithOptions;
  }

  /**
   * Create a version snapshot of an assessment item before editing.
   * Rule 27: Item editor always versions.
   * Creates a row in assessment_item_versions BEFORE modifying the item.
   */
  async createVersion(version: ItemVersionInsert): Promise<ItemVersionRow> {
    const { data, error } = await this.supabase
      .from('assessment_item_versions')
      .insert({
        item_id: version.item_id,
        vignette: version.vignette,
        stem: version.stem,
        options: version.options,
        edit_instruction: version.edit_instruction,
        edited_by: version.edited_by,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create item version for ${version.item_id}: ${error.message}`);
    }

    return data as ItemVersionRow;
  }

  /**
   * Update the vignette, stem, and options of an assessment item after editing.
   * Used by the review mode pipeline after apply_edit.
   */
  async updateContent(id: string, data: {
    vignette: string;
    stem: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from('assessment_items')
      .update({
        vignette: data.vignette,
        stem: data.stem,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update item content ${id}: ${error.message}`);
    }
  }

  /**
   * Replace all options for an assessment item.
   * Deletes existing options and inserts new ones.
   */
  async replaceOptions(itemId: string, options: GeneratedOption[]): Promise<void> {
    // Delete existing options
    const { error: deleteError } = await this.supabase
      .from('options')
      .delete()
      .eq('item_id', itemId);

    if (deleteError) {
      throw new Error(`Failed to delete existing options for ${itemId}: ${deleteError.message}`);
    }

    // Insert new options
    const optionInserts = options.map((opt) => ({
      item_id: itemId,
      label: opt.label,
      option_text: opt.text,
      is_correct: opt.is_correct,
      distractor_rationale: opt.rationale,
      misconception_targeted: opt.misconception_targeted ?? undefined,
    }));

    const { error: insertError } = await this.supabase
      .from('options')
      .insert(optionInserts);

    if (insertError) {
      throw new Error(`Failed to insert new options for ${itemId}: ${insertError.message}`);
    }
  }

  /**
   * Find all version snapshots for an assessment item, ordered by created_at DESC.
   * Used by the review mode version history panel.
   */
  async findVersionsByItemId(itemId: string): Promise<ItemVersionRow[]> {
    const { data, error } = await this.supabase
      .from('assessment_item_versions')
      .select('*')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch versions for item ${itemId}: ${error.message}`);
    }

    return (data ?? []) as ItemVersionRow[];
  }
}
