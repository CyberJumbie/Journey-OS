// packages/shared-types/src/auth.ts
// Single source of truth for auth types — imported by both frontend and backend.

import { z } from 'zod';
import type { UserRole, UserType } from './database';
import { UserRoleSchema } from './database';

// ─── Role definitions ──────────────────────────────────────────────────────

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
  isMainAdmin: boolean;
  additionalRoles: UserRole[];
  userType: UserType;
}

/**
 * Additional role combinations allowed per primary role.
 * Example: institutional_admin can also be faculty or advisor.
 */
export const ADDITIONAL_ROLE_COMBINATIONS: Partial<Record<UserRole, UserRole[]>> = {
  institutional_admin: ['faculty', 'advisor'],
  faculty: [],
  student: [],
  advisor: [],
  superadmin: [],
};

// ─── JWT claims ────────────────────────────────────────────────────────────

export interface JWTClaims {
  sub: string;
  email: string;
  role: UserRole;
  additional_roles: UserRole[];
  institution_id: string | null;
  is_main_admin: boolean;
  is_course_director: boolean;
  user_type: UserType;
  onboarding_completed: boolean;
}

// ─── Admin permissions ─────────────────────────────────────────────────────

export interface AdminPermissions {
  user_id: string;
  can_manage_super_admins: boolean;
  can_approve_applications: boolean;
  can_manage_institutions: boolean;
  can_manage_frameworks: boolean;
  can_manage_platform_health: boolean;
  granted_by: string | null;
  updated_at: string;
}

export const DEFAULT_MAIN_ADMIN_PERMISSIONS: Omit<AdminPermissions, 'user_id' | 'granted_by' | 'updated_at'> = {
  can_manage_super_admins: true,
  can_approve_applications: true,
  can_manage_institutions: true,
  can_manage_frameworks: true,
  can_manage_platform_health: true,
};

export const DEFAULT_NON_MAIN_ADMIN_PERMISSIONS: Omit<AdminPermissions, 'user_id' | 'granted_by' | 'updated_at'> = {
  can_manage_super_admins: false,
  can_approve_applications: true,
  can_manage_institutions: false,
  can_manage_frameworks: false,
  can_manage_platform_health: true,
};

// ─── Invite payload ────────────────────────────────────────────────────────

export const InviteUserSchema = z.object({
  email: z.string().email(),
  primary_role: UserRoleSchema,
  additional_roles: z.array(UserRoleSchema).default([]),
  institution_id: z.string().uuid().optional(),
  course_ids: z.array(z.string().uuid()).optional(),
  message: z.string().max(500).optional(),
  is_main_admin: z.boolean().optional().default(false),
  permissions: z.object({
    can_manage_super_admins: z.boolean(),
    can_approve_applications: z.boolean(),
    can_manage_institutions: z.boolean(),
    can_manage_frameworks: z.boolean(),
    can_manage_platform_health: z.boolean(),
  }).optional(),
});

export type InviteUserPayload = z.infer<typeof InviteUserSchema>;

// ─── Onboarding ────────────────────────────────────────────────────────────

export const OnboardingUpdateSchema = z.object({
  step: z.number().int().min(0).max(10),
  data: z.record(z.unknown()).optional(),
  completed: z.boolean().optional(),
});

export type OnboardingUpdate = z.infer<typeof OnboardingUpdateSchema>;

// ─── Route helpers ─────────────────────────────────────────────────────────

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
 */
export const ONBOARDING_ROUTE: Record<UserRole, string> = {
  faculty: '/onboarding/faculty',
  institutional_admin: '/onboarding/admin',
  superadmin: '/onboarding/super-admin',
  student: '/onboarding/student',
  advisor: '/onboarding/advisor',
};

/** Roles that have an onboarding flow. */
export const HAS_ONBOARDING = new Set<UserRole>([
  'faculty',
  'institutional_admin',
  'superadmin',
  'student',
  'advisor',
]);

// ─── Role helpers (used in middleware + UI) ────────────────────────────────

export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.role === role || user.additionalRoles.includes(role);
}

export function canAccessRoute(user: AuthUser, requiredRoles: UserRole[]): boolean {
  return requiredRoles.some(role => hasRole(user, role));
}

export function isMainAdmin(user: AuthUser): boolean {
  return user.role === 'superadmin' && user.isMainAdmin;
}

/** Convenience: is this user a Course Director? */
export function isCourseDirector(user: AuthUser): boolean {
  return user.role === 'faculty' && user.isCourseDirector;
}

/**
 * Returns the onboarding route for a given primary role.
 */
export function getOnboardingRoute(role: UserRole): string {
  return ONBOARDING_ROUTE[role] ?? '/onboarding';
}

/**
 * Returns the post-onboarding dashboard for a given primary role.
 */
export function getDashboardRoute(role: UserRole): string {
  return ROLE_HOME[role] ?? '/dashboard';
}
