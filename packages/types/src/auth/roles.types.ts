/**
 * The five platform roles. Stored in `app_metadata.role` on auth.users.
 * "Course Director" is a permission flag (is_course_director) on Faculty, NOT a separate role.
 * [ARCHITECTURE v10 SS 4.1]
 */
export enum AuthRole {
  SUPERADMIN = "superadmin",
  INSTITUTIONAL_ADMIN = "institutional_admin",
  FACULTY = "faculty",
  ADVISOR = "advisor",
  STUDENT = "student",
}

/**
 * Role hierarchy: higher index = more permissive.
 * SuperAdmin > InstitutionalAdmin > Faculty > Advisor > Student.
 */
export const ROLE_HIERARCHY: Record<AuthRole, number> = {
  [AuthRole.SUPERADMIN]: 100,
  [AuthRole.INSTITUTIONAL_ADMIN]: 80,
  [AuthRole.FACULTY]: 60,
  [AuthRole.ADVISOR]: 40,
  [AuthRole.STUDENT]: 20,
};

/**
 * Type guard: checks if a string is a valid AuthRole.
 */
export function isValidRole(value: string): value is AuthRole {
  return Object.values(AuthRole).includes(value as AuthRole);
}
