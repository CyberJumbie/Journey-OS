/**
 * Application review queue types.
 * [STORY-SA-3] SuperAdmin review queue for waitlist applications.
 */

import type { ApplicationStatus, InstitutionType } from "./application.types";
import type { SortDirection } from "../user/global-user.types";

/** Sort fields for the application review queue */
export type ApplicationReviewSortField = "created_at" | "institution_name";

/** Query parameters for the application review list endpoint */
export interface ApplicationReviewQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: ApplicationReviewSortField;
  readonly sort_dir?: SortDirection;
  readonly status?: ApplicationStatus | "all";
}

/** Single application row in the review queue */
export interface ApplicationReviewItem {
  readonly id: string;
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly status: ApplicationStatus;
  readonly created_at: string;
}

/** Full application detail (returned by GET /:id) */
export interface ApplicationDetail {
  readonly id: string;
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly accreditation_body: string;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly student_count: number;
  readonly website_url: string;
  readonly reason: string;
  readonly status: ApplicationStatus;
  readonly submitted_ip: string;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly rejection_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Paginated response for the application review list */
export interface ApplicationReviewResponse {
  readonly applications: readonly ApplicationReviewItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
