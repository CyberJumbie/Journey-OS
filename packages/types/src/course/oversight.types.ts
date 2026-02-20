/**
 * Course oversight dashboard types.
 * [STORY-IA-8] Read-only aggregation view for institutional admins.
 */

import type { CourseStatus } from "./course.types";

/**
 * Status filter for course overview — excludes "draft" from the oversight view.
 */
export type CourseOverviewStatusFilter = "active" | "archived";

/**
 * Processing status derived from content uploads.
 */
export type CourseProcessingStatus = "idle" | "processing" | "complete";

/**
 * A single course summary item for the oversight dashboard.
 * Read-only — this is a computed view, not a mutable entity.
 */
export interface CourseOverviewItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly director_name: string | null;
  readonly slo_count: number;
  readonly fulfills_coverage_pct: number;
  readonly upload_count: number;
  readonly processing_status: CourseProcessingStatus;
  readonly program_name: string | null;
  readonly academic_year: string | null;
  readonly status: CourseStatus;
  readonly updated_at: string;
}

/**
 * Valid sort fields for course overview listing.
 */
export type CourseOverviewSortField =
  | "name"
  | "fulfills_coverage_pct"
  | "updated_at";

/**
 * Query parameters for GET /api/v1/institution/courses/overview.
 */
export interface CourseOverviewQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: CourseOverviewSortField;
  readonly sort_dir?: "asc" | "desc";
  readonly program_id?: string;
  readonly academic_year?: string;
  readonly status?: CourseOverviewStatusFilter;
}

/**
 * Paginated response for course overview.
 */
export interface CourseOverviewResponse {
  readonly courses: readonly CourseOverviewItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
