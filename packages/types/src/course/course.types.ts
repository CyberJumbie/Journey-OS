/**
 * Course domain types.
 * [STORY-F-1] Matches actual `courses` table (migration 20260218215335).
 */

export type CourseStatus = "draft" | "active" | "archived";

export type CourseType =
  | "lecture"
  | "lab"
  | "clinical"
  | "seminar"
  | "elective"
  | "integrated";

export const VALID_COURSE_TYPES: readonly CourseType[] = [
  "lecture",
  "lab",
  "clinical",
  "seminar",
  "elective",
  "integrated",
] as const;

export const VALID_COURSE_STATUSES: readonly CourseStatus[] = [
  "draft",
  "active",
  "archived",
] as const;

export interface CourseRow {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly department: string | null;
  readonly course_director_id: string | null;
  readonly academic_year: string | null;
  readonly semester: string | null;
  readonly credit_hours: number | null;
  readonly course_type: string | null;
  readonly neo4j_id: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CourseDTO {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly department: string | null;
  readonly course_director_id: string | null;
  readonly academic_year: string | null;
  readonly semester: string | null;
  readonly credit_hours: number | null;
  readonly course_type: CourseType | null;
  readonly neo4j_id: string | null;
  readonly status: CourseStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface CreateCourseRequest {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly department?: string;
  readonly course_director_id?: string;
  readonly academic_year?: string;
  readonly semester?: string;
  readonly credit_hours?: number;
  readonly course_type?: CourseType;
}

export interface UpdateCourseRequest {
  readonly name?: string;
  readonly description?: string;
  readonly department?: string;
  readonly course_director_id?: string;
  readonly academic_year?: string;
  readonly semester?: string;
  readonly credit_hours?: number;
  readonly course_type?: CourseType;
  readonly status?: CourseStatus;
}

export interface CourseListQuery {
  readonly status?: CourseStatus;
  readonly course_type?: CourseType;
  readonly department?: string;
  readonly search?: string;
  readonly page?: number;
  readonly limit?: number;
}

export interface CourseListResponse {
  readonly courses: readonly CourseDTO[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
