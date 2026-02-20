/**
 * Course hierarchy types: Program, Section, Session.
 * [STORY-F-11] Institution > Program > Course > Section > Session.
 */

import type { SyncStatus } from "../objective/objective-common.types";

/** Days of the week for session scheduling */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const VALID_DAYS_OF_WEEK: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** Program: institution-scoped container for courses */
export interface Program {
  readonly id: string;
  readonly institution_id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly is_active: boolean;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Section: course-scoped, ordered container for sessions */
export interface Section {
  readonly id: string;
  readonly course_id: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly is_active: boolean;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Session: section-scoped, scheduled teaching unit */
export interface Session {
  readonly id: string;
  readonly section_id: string;
  readonly title: string;
  readonly description: string;
  readonly week_number: number;
  readonly day_of_week: DayOfWeek;
  readonly start_time: string;
  readonly end_time: string;
  readonly is_active: boolean;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Create DTOs */
export interface CreateProgramRequest {
  readonly institution_id: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
}

export interface CreateSectionRequest {
  readonly course_id: string;
  readonly title: string;
  readonly description?: string;
  readonly position?: number;
}

export interface CreateSessionRequest {
  readonly section_id: string;
  readonly title: string;
  readonly description?: string;
  readonly week_number: number;
  readonly day_of_week: DayOfWeek;
  readonly start_time: string;
  readonly end_time: string;
}

/** Update DTOs (all fields optional) */
export interface UpdateProgramRequest {
  readonly name?: string;
  readonly code?: string;
  readonly description?: string;
  readonly is_active?: boolean;
}

export interface UpdateSectionRequest {
  readonly title?: string;
  readonly description?: string;
  readonly position?: number;
  readonly is_active?: boolean;
}

export interface UpdateSessionRequest {
  readonly title?: string;
  readonly description?: string;
  readonly week_number?: number;
  readonly day_of_week?: DayOfWeek;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly is_active?: boolean;
}

/** Nested hierarchy response (cascading read) */
export interface CourseHierarchy {
  readonly course_id: string;
  readonly course_name: string;
  readonly course_code: string;
  readonly sections: ReadonlyArray<SectionWithSessions>;
}

export interface SectionWithSessions {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly sessions: ReadonlyArray<Session>;
}

/** Reorder sections request */
export interface ReorderSectionsRequest {
  readonly section_ids: ReadonlyArray<string>;
}
