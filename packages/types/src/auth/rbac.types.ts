import { AuthRole } from "./roles.types";

/**
 * A resource in the permission matrix.
 * Each resource maps to a top-level API domain (e.g., "institutions", "courses").
 */
export type Resource =
  | "waitlist"
  | "institutions"
  | "users"
  | "courses"
  | "frameworks"
  | "content"
  | "generation"
  | "notifications"
  | "students"
  | "advisors"
  | "analytics"
  | "settings";

/**
 * CRUD + custom actions on a resource.
 */
export type ResourceAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "list"
  | "approve"
  | "bulk_generate"
  | "manage";

/**
 * A single permission entry: resource + action + allowed roles.
 * If `requireCourseDirector` is true, Faculty must also have `is_course_director`.
 */
export interface Permission {
  readonly resource: Resource;
  readonly action: ResourceAction;
  readonly roles: readonly AuthRole[];
  readonly requireCourseDirector?: boolean;
}

/**
 * Result of a permission check.
 */
export interface PermissionCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
}

/**
 * Options for the require() middleware factory.
 */
export interface RequireRoleOptions {
  /** Roles that can access this route. SuperAdmin always included implicitly. */
  readonly roles: readonly AuthRole[];
  /** If true, also verify req.user.institution_id matches req.params.institutionId. */
  readonly institutionScoped?: boolean;
  /** If true, require is_course_director flag on Faculty role. */
  readonly requireCourseDirector?: boolean;
}
