/**
 * Institution monitoring types.
 * [STORY-SA-7] SuperAdmin institution list dashboard.
 */

import type { SortDirection } from "../user/global-user.types";

/** Display status for institutions (mapped from DB values) */
export type InstitutionMonitoringStatus =
  | "active"
  | "pending"
  | "suspended"
  | "archived";

/** Sortable fields for institution list */
export type InstitutionListSortField =
  | "name"
  | "status"
  | "user_count"
  | "course_count"
  | "last_activity"
  | "created_at";

/** Query parameters for the institution list endpoint */
export interface InstitutionListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: InstitutionListSortField;
  readonly sort_dir?: SortDirection;
  readonly search?: string;
  readonly status?: InstitutionMonitoringStatus;
}

/** Single institution row in the list */
export interface InstitutionListItem {
  readonly id: string;
  readonly name: string;
  readonly status: InstitutionMonitoringStatus;
  readonly user_count: number;
  readonly course_count: number;
  readonly last_activity: string | null;
  readonly created_at: string;
}

/** Paginated response for the institution list */
export interface InstitutionListResponse {
  readonly institutions: readonly InstitutionListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
