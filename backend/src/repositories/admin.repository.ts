import SupabaseClientSingleton from '../lib/SupabaseClient';
import type { AdminPermissions } from '@journey-os/shared-types';

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
