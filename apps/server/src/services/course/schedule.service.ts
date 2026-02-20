/**
 * ScheduleService — read-only weekly schedule of course sessions.
 * [STORY-IA-7] Joins sessions through sections to filter by course_id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WeeklySchedule,
  ScheduleSession,
  MaterialStatus,
} from "@journey-os/types";
import { CourseNotFoundError } from "../../errors";

export class ScheduleService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getWeeklySchedule(
    courseId: string,
    weekNumber: number,
  ): Promise<WeeklySchedule> {
    // Step 1: Verify course exists
    const { data: course, error: courseError } = await this.#supabaseClient
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .single();

    if (courseError || !course) {
      throw new CourseNotFoundError(courseId);
    }

    // Step 2: Get total_weeks (max week_number across all sessions for this course)
    const { data: maxWeekRow, error: maxWeekError } = await this.#supabaseClient
      .from("sessions")
      .select("week_number, section:sections!inner(course_id)")
      .eq("sections.course_id", courseId)
      .order("week_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const totalWeeks =
      !maxWeekError && maxWeekRow ? (maxWeekRow.week_number as number) : 0;

    // Step 3: Get sessions for the requested week
    const { data: sessionRows, error: sessionsError } =
      await this.#supabaseClient
        .from("sessions")
        .select(
          "id, title, day_of_week, start_time, end_time, week_number, section:sections!inner(title, course_id)",
        )
        .eq("sections.course_id", courseId)
        .eq("week_number", weekNumber);

    if (sessionsError) {
      return {
        course_id: courseId,
        week_number: weekNumber,
        total_weeks: totalWeeks,
        sessions: [],
      };
    }

    const sessions: ScheduleSession[] = (sessionRows ?? []).map(
      (row: Record<string, unknown>) => this.#mapSession(row),
    );

    return {
      course_id: courseId,
      week_number: weekNumber,
      total_weeks: totalWeeks,
      sessions,
    };
  }

  #mapSession(row: Record<string, unknown>): ScheduleSession {
    const section = row.section as Record<string, unknown> | null;
    const startTime = this.#formatTime(row.start_time as string);
    const endTime = this.#formatTime(row.end_time as string);

    return {
      id: row.id as string,
      title: row.title as string,
      day_of_week: row.day_of_week as ScheduleSession["day_of_week"],
      start_time: startTime,
      end_time: endTime,
      week_number: row.week_number as number,
      section_name: (section?.title as string) ?? "Unknown Section",
      // TODO: Stub until session_materials table is created
      material_count: 0,
      material_status: this.#aggregateMaterialStatus(0),
    };
  }

  /** Truncate "HH:MM:SS" to "HH:mm" */
  #formatTime(time: string): string {
    if (!time) return "";
    const parts = time.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  }

  /** Compute aggregate material status — stubbed for now */
  #aggregateMaterialStatus(_materialCount: number): MaterialStatus {
    // TODO: When session_materials table exists, compute from actual data
    return "empty";
  }
}
