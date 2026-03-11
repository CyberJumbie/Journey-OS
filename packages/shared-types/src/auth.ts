// packages/shared-types/src/auth.ts
// Single source of truth for auth types — imported by both frontend and backend.

import type { UserRole } from './database';

/**
 * Shape of the authenticated user, derived from JWT app_metadata.
 * Used in frontend (getSession, requireRole) and backend (req.user).
 */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  institutionId: string | null;
  isCourseDirector: boolean;
  onboardingCompleted: boolean;
}

/**
 * Post-login redirect targets per role.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  faculty: '/dashboard',
  institutional_admin: '/institution/dashboard',
  superadmin: '/admin',
  student: '/student-dashboard',
  advisor: '/advisor/cohort',
};

/**
 * Onboarding entry points per role.
 * Roles not in this map skip onboarding entirely.
 */
export const ONBOARDING_ROUTE: Partial<Record<UserRole, string>> = {
  faculty: '/onboarding',
  institutional_admin: '/onboarding/admin',
  student: '/onboarding/student',
};

/** Roles that have an onboarding flow. */
export const HAS_ONBOARDING = new Set<UserRole>(['faculty', 'institutional_admin', 'student']);

/** Convenience: is this user a Course Director? */
export function isCourseDirector(user: AuthUser): boolean {
  return user.role === 'faculty' && user.isCourseDirector;
}
