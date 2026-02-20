/**
 * Weekly schedule types for course session calendar view.
 * [STORY-IA-7] Read-only weekly calendar of sessions.
 */

import type { DayOfWeek } from "./hierarchy.types";

/** Material readiness status for a session (stubbed until session_materials table exists) */
export type MaterialStatus = "empty" | "pending" | "processed";

/** A single session mapped for the weekly schedule view */
export interface ScheduleSession {
  readonly id: string;
  readonly title: string;
  readonly day_of_week: DayOfWeek;
  readonly start_time: string;
  readonly end_time: string;
  readonly week_number: number;
  readonly section_name: string;
  readonly material_count: number;
  readonly material_status: MaterialStatus;
}

/** Aggregate response for one week of a course's schedule */
export interface WeeklySchedule {
  readonly course_id: string;
  readonly week_number: number;
  readonly total_weeks: number;
  readonly sessions: ReadonlyArray<ScheduleSession>;
}
