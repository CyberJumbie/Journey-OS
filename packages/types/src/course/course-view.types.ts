/**
 * Course view types — enriched DTOs for list and detail views.
 * [STORY-F-13] Read-only view types with joined program/director data.
 */

import type { CourseStatus } from "./course.types";
import type { SectionWithSessions } from "./hierarchy.types";

/** Enriched course list item with joined program + director names */
export interface CourseListItem {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly department: string | null;
  readonly program_id: string | null;
  readonly program_name: string | null;
  readonly course_director_id: string | null;
  readonly course_director_name: string | null;
  readonly status: CourseStatus;
  readonly academic_year: string | null;
  readonly section_count: number;
  readonly session_count: number;
  readonly updated_at: string;
}

/** Response for enriched course list endpoint */
export interface CourseListViewResponse {
  readonly courses: readonly CourseListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/** Enriched course detail with hierarchy + director info */
export interface CourseDetailView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly department: string | null;
  readonly program_id: string | null;
  readonly program_name: string | null;
  readonly course_director: {
    readonly id: string;
    readonly full_name: string;
    readonly email: string;
  } | null;
  readonly status: CourseStatus;
  readonly academic_year: string | null;
  readonly semester: string | null;
  readonly credit_hours: number | null;
  readonly course_type: string | null;
  readonly hierarchy: readonly SectionWithSessions[];
  readonly slo_count: number;
  readonly neo4j_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}
