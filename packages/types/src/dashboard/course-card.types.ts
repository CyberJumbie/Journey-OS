/**
 * Course card types for the faculty dashboard.
 * [STORY-F-12] Maps to actual DB schema with computed aggregates.
 */

import type { CourseStatus } from "../course/course.types";

/** Sort options for course cards */
export type CourseCardSort =
  | "recent_activity"
  | "alphabetical"
  | "coverage_asc";

/** Query parameters for faculty course list endpoint */
export interface FacultyCourseListQuery {
  readonly faculty_id: string;
}

/** Data shape for a single course card (returned by RPC) */
export interface CourseCardData {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly term: string;
  readonly status: CourseStatus;
  readonly question_count: number;
  readonly coverage_percent: number;
  readonly last_activity_at: string | null;
  readonly program_id: string | null;
  readonly program_name: string | null;
}

/** Response from faculty courses endpoint */
export interface FacultyCourseListResponse {
  readonly courses: readonly CourseCardData[];
}

/** Quick action route targets */
export interface CourseQuickActions {
  readonly generate: string;
  readonly review: string;
  readonly coverage: string;
}
