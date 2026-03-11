import SupabaseClientSingleton from '../lib/SupabaseClient';
import type { UserRole } from '@journey-os/shared-types';

export interface UserProfileRow {
  id: string;
  email: string;
  role: UserRole;
  institution_id: string | null;
  is_course_director: boolean;
  display_name: string | null;
  onboarding_completed: boolean;
  onboarding_step: number;
}

export interface UpsertProfileData {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  is_course_director: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
}

export class UserProfileRepository {
  private readonly supabase = SupabaseClientSingleton.getInstance();

  async findById(userId: string): Promise<UserProfileRow | null> {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, email, role, institution_id, is_course_director, display_name, onboarding_completed, onboarding_step')
      .eq('id', userId)
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
}
