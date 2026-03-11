import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from './supabase-server';
import type { UserRole } from '@journey-os/shared-types';
import { ROLE_HOME, ONBOARDING_ROUTE, HAS_ONBOARDING } from '@journey-os/shared-types';

export interface UserProfile {
  id: string;
  role: UserRole;
  institution_id: string | null;
  display_name: string | null;
  email: string | null;
  is_course_director: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
}

const SMOKE_TEST_PROFILE: UserProfile = {
  id: 'smoke-test-user',
  role: 'superadmin',
  institution_id: null,
  display_name: 'Smoke Test',
  email: 'smoke@test.local',
  is_course_director: true,
  onboarding_completed: true,
  onboarding_step: 99,
};

function isSmokeTest(): boolean {
  return process.env.SMOKE_TEST === 'true';
}

/**
 * Extract UserProfile from Supabase auth user.
 * Primary source: JWT app_metadata (populated by sync_jwt_claims trigger).
 * Fallback: query user_profiles table (for users whose JWT hasn't refreshed yet).
 */
async function resolveProfile(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const meta = user.app_metadata as Record<string, unknown> | undefined;

  // Primary path: read from JWT claims (no DB query, no RLS issues)
  if (meta?.role) {
    return {
      id: user.id,
      role: meta.role as UserRole,
      institution_id: (meta.institution_id as string) ?? null,
      display_name: (meta.display_name as string) ?? null,
      email: user.email ?? null,
      is_course_director: (meta.is_course_director as boolean) ?? false,
      onboarding_completed: (meta.onboarding_completed as boolean) ?? false,
      onboarding_step: (meta.onboarding_step as number) ?? 0,
    };
  }

  // Fallback: query DB (for users created before JWT trigger was added)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, institution_id, display_name, email, is_course_director, onboarding_completed, onboarding_step')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role as UserRole,
    institution_id: profile.institution_id,
    display_name: profile.display_name,
    email: profile.email ?? user.email ?? null,
    is_course_director: profile.is_course_director ?? false,
    onboarding_completed: profile.onboarding_completed ?? false,
    onboarding_step: profile.onboarding_step ?? 0,
  };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  if (isSmokeTest()) return SMOKE_TEST_PROFILE;

  const supabase = await createServerSupabaseClient();
  const profile = await resolveProfile(supabase);

  if (!profile) {
    redirect('/login');
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect('/unauthorized');
  }

  return profile;
}

export async function requireAuth(): Promise<UserProfile> {
  if (isSmokeTest()) return SMOKE_TEST_PROFILE;

  const supabase = await createServerSupabaseClient();
  const profile = await resolveProfile(supabase);

  if (!profile) {
    redirect('/login');
  }

  return profile;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isSmokeTest()) return SMOKE_TEST_PROFILE;

  const supabase = await createServerSupabaseClient();
  return resolveProfile(supabase);
}

export function getPostLoginRedirect(profile: UserProfile): string {
  if (!profile.onboarding_completed && HAS_ONBOARDING.has(profile.role)) {
    return ONBOARDING_ROUTE[profile.role] ?? '/onboarding';
  }

  return ROLE_HOME[profile.role] ?? '/dashboard';
}

export function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
