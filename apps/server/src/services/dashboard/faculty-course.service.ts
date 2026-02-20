/**
 * FacultyCourseService — fetches course card data for the faculty dashboard.
 * [STORY-F-12] Uses RPC functions to compute aggregates (question_count, term).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CourseCardData,
  FacultyCourseListResponse,
} from "@journey-os/types";

export class FacultyCourseService {
  readonly #supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.#supabase = supabase;
  }

  async listForFaculty(
    facultyId: string,
    isCourseDirector: boolean,
  ): Promise<FacultyCourseListResponse> {
    const rpcName = isCourseDirector
      ? "get_director_courses"
      : "get_faculty_courses";
    const paramName = isCourseDirector ? "p_director_id" : "p_faculty_id";

    const { data, error } = await this.#supabase.rpc(rpcName, {
      [paramName]: facultyId,
    });

    if (error) {
      throw new Error(`Failed to fetch faculty courses: ${error.message}`);
    }

    const courses: CourseCardData[] = (data ?? []).map(
      (row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        code: row.code as string,
        term: (row.term as string) || "—",
        status: row.status as CourseCardData["status"],
        question_count: Number(row.question_count ?? 0),
        coverage_percent: Number(row.coverage_percent ?? 0),
        last_activity_at: (row.last_activity_at as string) ?? null,
        program_id: (row.program_id as string) ?? null,
        program_name: (row.program_name as string) ?? null,
      }),
    );

    return { courses };
  }
}
