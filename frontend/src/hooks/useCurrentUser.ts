'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase';
import type { UserRole } from '@journey-os/shared-types';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  role: UserRole;
  institutionId: string | null;
  /** Human-readable role label, e.g. "Faculty", "Institutional Admin" */
  roleLabel: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin',
  institutional_admin: 'Institutional Admin',
  faculty: 'Faculty',
  student: 'Student',
  advisor: 'Advisor',
};

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map(w => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '??';
}

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const meta = user.app_metadata as Record<string, unknown> | undefined;

  // Primary: JWT claims (populated by sync_jwt_claims trigger)
  if (meta?.role) {
    const displayName = (meta.display_name as string) ?? null;
    const email = user.email ?? null;
    const role = meta.role as UserRole;

    return {
      id: user.id,
      email: email ?? '',
      displayName: displayName ?? email ?? 'User',
      initials: getInitials(displayName, email),
      role,
      institutionId: (meta.institution_id as string) ?? null,
      roleLabel: ROLE_LABELS[role] ?? role,
    };
  }

  // Fallback: query user_profiles table
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, role, institution_id, display_name, email')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  const displayName = profile.display_name ?? null;
  const email = profile.email ?? user.email ?? null;
  const role = profile.role as UserRole;

  return {
    id: profile.id,
    email: email ?? '',
    displayName: displayName ?? email ?? 'User',
    initials: getInitials(displayName, email),
    role,
    institutionId: profile.institution_id ?? null,
    roleLabel: ROLE_LABELS[role] ?? role,
  };
}

/**
 * Client-side hook to get the current authenticated user's profile.
 * Reads from Supabase auth session + JWT app_metadata (no extra API call).
 * Use in organisms and pages only — never in atoms or molecules.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 min — auth data rarely changes mid-session
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
