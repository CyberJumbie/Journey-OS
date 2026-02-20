/**
 * Institution-scoped user list and invitation types.
 * [STORY-IA-1] InstitutionalAdmin user management within their institution.
 */

import { AuthRole } from "../auth/roles.types";
import type { SortDirection } from "./global-user.types";

/** Status of a user row in the institution user list */
export type InstitutionUserStatus = "active" | "inactive" | "pending";

/** Sortable columns for the institution user list */
export type InstitutionUserSortField =
  | "full_name"
  | "email"
  | "role"
  | "status"
  | "last_login_at"
  | "created_at";

/** Query parameters for the institution user list endpoint */
export interface InstitutionUserListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: InstitutionUserSortField;
  readonly sort_dir?: SortDirection;
  readonly search?: string;
  readonly role?: AuthRole;
  readonly status?: InstitutionUserStatus;
}

/** Single row in the institution user list (registered user or pending invitation) */
export interface InstitutionUserListItem {
  readonly id: string;
  readonly email: string;
  readonly full_name: string | null;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly is_active: boolean;
  readonly status: InstitutionUserStatus;
  readonly last_login_at: string | null;
  readonly created_at: string;
}

/** Paginated response for the institution user list */
export interface InstitutionUserListResponse {
  readonly users: readonly InstitutionUserListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/** Request body for inviting a user to the institution */
export interface InviteUserRequest {
  readonly email: string;
  readonly role: AuthRole.FACULTY | AuthRole.STUDENT | AuthRole.ADVISOR;
  readonly is_course_director?: boolean;
}

/** Response after successfully creating an invitation */
export interface InviteUserResponse {
  readonly invitation_id: string;
  readonly email: string;
  readonly role: string;
  readonly expires_at: string;
}
