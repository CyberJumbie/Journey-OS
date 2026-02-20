/**
 * Global user directory types.
 * [STORY-SA-2] SuperAdmin cross-institution user management.
 * [UF-06 § Cross-Institution User Management]
 */

import { AuthRole } from "../auth/roles.types";

/** Sort fields for user directory */
export type GlobalUserSortField =
  | "full_name"
  | "email"
  | "role"
  | "is_active"
  | "last_login_at"
  | "created_at";

export type SortDirection = "asc" | "desc";

/** Query parameters for the global user list endpoint */
export interface GlobalUserListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: GlobalUserSortField;
  readonly sort_dir?: SortDirection;
  readonly search?: string;
  readonly role?: AuthRole;
  readonly institution_id?: string;
  readonly is_active?: boolean;
}

/** Single user row in the directory */
export interface GlobalUserListItem {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly is_active: boolean;
  readonly institution_id: string | null;
  readonly institution_name: string | null;
  readonly last_login_at: string | null;
  readonly created_at: string;
}

/** Paginated response for the global user list */
export interface GlobalUserListResponse {
  readonly users: readonly GlobalUserListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
