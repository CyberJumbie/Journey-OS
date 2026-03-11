import SupabaseClientSingleton from '../lib/SupabaseClient';
import type { AdminPermissions } from '@journey-os/shared-types';

export interface KaizenLintRunRow {
  id: string;
  run_id: string;
  run_at: string;
  rule_id: string;
  result: string;
  count: number;
  threshold: number;
  passed: boolean;
  details: Record<string, unknown> | null;
  remediation_applied: boolean;
}

export interface GoldenDatasetItemRow {
  id: string;
  item_id: string;
  added_by: string | null;
  added_at: string;
  notes: string | null;
  target_critic_min: number;
  assessment_items: Array<{
    id: string;
    stem: string | null;
    status: string;
    bloom_level: string | null;
    critic_composite_score: number | null;
    critic_clinical_accuracy: number | null;
    critic_vignette_realism: number | null;
    critic_distractor_quality: number | null;
    critic_bloom_alignment: number | null;
    critic_nbme_compliance: number | null;
    critic_educational_value: number | null;
  }>;
}

export interface SuperAdminRow {
  id: string;
  email: string | null;
  display_name: string | null;
  is_main_admin: boolean;
}

export class AdminRepository {
  private readonly supabase = SupabaseClientSingleton.getInstance();

  async getActiveMainAdminCount(excludeUserId?: string): Promise<number> {
    let query = this.supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'superadmin')
      .eq('is_main_admin', true);

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  async getPermissions(userId: string): Promise<AdminPermissions | null> {
    const { data, error } = await this.supabase
      .from('admin_permissions')
      .select('*')
      .eq('user_id', userId)
      .single();

    // PGRST116 = row not found — not an error, just means no permissions row
    if (error && error.code !== 'PGRST116') throw error;
    return data as AdminPermissions | null;
  }

  async upsertPermissions(
    userId: string,
    permissions: Partial<Omit<AdminPermissions, 'user_id' | 'updated_at'>>,
    grantedBy: string,
  ): Promise<AdminPermissions> {
    const { data, error } = await this.supabase
      .from('admin_permissions')
      .upsert({
        user_id: userId,
        ...permissions,
        granted_by: grantedBy,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as AdminPermissions;
  }

  async setMainAdminStatus(userId: string, isMainAdmin: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .update({ is_main_admin: isMainAdmin })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Fetch the latest lint run results, ordered by run_at descending.
   */
  async getLintResults(limit: number): Promise<KaizenLintRunRow[]> {
    const { data, error } = await this.supabase
      .from('kaizen_lint_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to query kaizen_lint_runs: ${error.message}`);
    }

    return (data ?? []) as KaizenLintRunRow[];
  }

  /**
   * Fetch golden dataset items joined with their latest assessment_item data.
   */
  async getGoldenDataset(): Promise<GoldenDatasetItemRow[]> {
    const { data, error } = await this.supabase
      .from('golden_dataset')
      .select(`
        id,
        item_id,
        added_by,
        added_at,
        notes,
        target_critic_min,
        assessment_items (
          id,
          stem,
          status,
          bloom_level,
          critic_composite_score,
          critic_clinical_accuracy,
          critic_vignette_realism,
          critic_distractor_quality,
          critic_bloom_alignment,
          critic_nbme_compliance,
          critic_educational_value
        )
      `)
      .order('added_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to query golden_dataset: ${error.message}`);
    }

    return (data ?? []) as GoldenDatasetItemRow[];
  }

  /**
   * Fetch the latest golden regression result from kaizen_lint_runs.
   */
  async getLatestGoldenRegressionResult(): Promise<KaizenLintRunRow | null> {
    const { data, error } = await this.supabase
      .from('kaizen_lint_runs')
      .select('*')
      .eq('rule_id', 'golden_regression')
      .order('run_at', { ascending: false })
      .limit(1)
      .single();

    // PGRST116 = no rows found
    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to query golden regression result: ${error.message}`);
    }

    return (data as KaizenLintRunRow) ?? null;
  }

  async getSuperAdmins(): Promise<SuperAdminRow[]> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, email, display_name, is_main_admin')
      .eq('role', 'superadmin')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []) as SuperAdminRow[];
  }
}
