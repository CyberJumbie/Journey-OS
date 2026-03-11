import SupabaseClientSingleton from '../lib/SupabaseClient';
import type { UserRole } from '@journey-os/shared-types';

export interface UserProfileRow {
  id: string;
  email: string;
  role: UserRole;
  institution_id: string | null;
  is_course_director: boolean;
  is_main_admin: boolean;
  additional_roles: UserRole[];
  user_type: string;
  display_name: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
  onboarding_data: Record<string, unknown>;
}

export interface UpsertProfileData {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_course_director?: boolean;
  is_main_admin?: boolean;
  additional_roles?: UserRole[];
  user_type?: string;
  institution_id?: string | null;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  onboarding_data?: Record<string, unknown>;
}

const PROFILE_FIELDS = 'id, email, role, institution_id, is_course_director, is_main_admin, additional_roles, user_type, display_name, onboarding_completed, onboarding_step, onboarding_data';

export class UserProfileRepository {
  private readonly supabase = SupabaseClientSingleton.getInstance();

  async findById(userId: string): Promise<UserProfileRow | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(PROFILE_FIELDS)
      .eq('id', userId)
      .single();

    if (error) return null;
    return data as UserProfileRow;
  }

  async findByEmail(email: string): Promise<UserProfileRow | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(PROFILE_FIELDS)
      .eq('email', email)
      .single();

    if (error) return null;
    return data as UserProfileRow;
  }

  async upsert(profile: UpsertProfileData): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .upsert(profile);

    if (error) {
      console.error('Profile upsert error:', error);
    }
  }

  async updateFields(userId: string, fields: Partial<Omit<UserProfileRow, 'id'>>): Promise<void> {
    const { error } = await this.supabase
      .from('user_profiles')
      .update(fields)
      .eq('id', userId);

    if (error) throw error;
  }
}
