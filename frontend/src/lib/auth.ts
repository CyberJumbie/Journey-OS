import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from './supabase-server';
import type { UserRole } from '@journey-os/shared-types';

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

export async function requireRole(allowedRoles: UserRole[]): Promise<UserProfile> {
  if (isSmokeTest()) return SMOKE_TEST_PROFILE;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, institution_id, display_name, email, is_course_director, onboarding_completed, onboarding_step')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/role-selection');
  }

  const typedProfile: UserProfile = {
    id: profile.id,
    role: profile.role as UserRole,
    institution_id: profile.institution_id,
    display_name: profile.display_name,
    email: profile.email ?? user.email ?? null,
    is_course_director: profile.is_course_director ?? false,
    onboarding_completed: profile.onboarding_completed ?? false,
    onboarding_step: profile.onboarding_step ?? 0,
  };

  if (!allowedRoles.includes(typedProfile.role)) {
    redirect('/unauthorized');
  }

  return typedProfile;
}

export async function requireAuth(): Promise<UserProfile> {
  if (isSmokeTest()) return SMOKE_TEST_PROFILE;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, institution_id, display_name, email, is_course_director, onboarding_completed, onboarding_step')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/role-selection');
  }

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

export async function getCurrentUser(): Promise<UserProfile | null> {
  if (isSmokeTest()) return SMOKE_TEST_PROFILE;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

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

const POST_LOGIN_REDIRECTS: Record<UserRole, string> = {
  student: '/student-dashboard',
  faculty: '/dashboard',
  institutional_admin: '/institution/dashboard',
  superadmin: '/admin',
  advisor: '/advisor/cohort',
};

export function getPostLoginRedirect(profile: UserProfile): string {
  if (!profile.onboarding_completed) {
    const onboardingRoutes: Record<UserRole, string> = {
      faculty: '/onboarding',
      student: '/onboarding/student',
      institutional_admin: '/onboarding/admin',
      superadmin: '/onboarding/admin',
      advisor: '/onboarding',
    };
    return onboardingRoutes[profile.role] ?? '/onboarding';
  }

  return POST_LOGIN_REDIRECTS[profile.role] ?? '/dashboard';
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
