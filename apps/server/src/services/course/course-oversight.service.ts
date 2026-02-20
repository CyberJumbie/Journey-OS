/**
 * CourseOversightService — read-only aggregation for institutional admin dashboard.
 * [STORY-IA-8] Follows admin-paginated-list-pattern.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CourseOverviewQuery,
  CourseOverviewResponse,
  CourseOverviewItem,
  CourseOverviewSortField,
  CourseProcessingStatus,
} from "@journey-os/types";
import { CourseOverviewValidationError } from "../../errors";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const ALLOWED_SORT_FIELDS = new Set<CourseOverviewSortField>([
  "name",
  "fulfills_coverage_pct",
  "updated_at",
]);

export class CourseOversightService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async getOverview(
    query: CourseOverviewQuery,
    institutionId: string,
  ): Promise<CourseOverviewResponse> {
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const sortBy = query.sort_by ?? "name";
    const sortDir = query.sort_dir ?? "asc";

    if (!ALLOWED_SORT_FIELDS.has(sortBy)) {
      throw new CourseOverviewValidationError(
        `Invalid sort_by value. Must be one of: name, fulfills_coverage_pct, updated_at`,
      );
    }

    const offset = (page - 1) * limit;

    // Build base queries with institution scoping
    let dataQuery = this.#supabaseClient
      .from("courses")
      .select(
        "id, code, name, course_director_id, academic_year, status, updated_at, program_id",
      )
      .eq("institution_id", institutionId);

    let countQuery = this.#supabaseClient
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("institution_id", institutionId);

    // Apply identical filters to BOTH queries before finalizing
    if (query.program_id) {
      dataQuery = dataQuery.eq("program_id", query.program_id);
      countQuery = countQuery.eq("program_id", query.program_id);
    }

    if (query.academic_year) {
      dataQuery = dataQuery.eq("academic_year", query.academic_year);
      countQuery = countQuery.eq("academic_year", query.academic_year);
    }

    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    // Apply ordering and pagination last
    const [dataResult, countResult] = await Promise.all([
      dataQuery
        .order(sortBy, { ascending: sortDir === "asc" })
        .range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (dataResult.error) {
      throw new CourseOverviewValidationError(
        `Failed to fetch courses: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const courses = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) => this.#toOverviewItem(row),
    );

    return {
      courses,
      meta: {
        page,
        limit,
        total,
        total_pages: totalPages,
      },
    };
  }

  #toOverviewItem(row: Record<string, unknown>): CourseOverviewItem {
    // Compute processing status from available data
    const uploadCount = (row.upload_count as number) ?? 0;
    const processingCount = (row.processing_count as number) ?? 0;
    let processingStatus: CourseProcessingStatus = "idle";
    if (uploadCount > 0) {
      processingStatus = processingCount > 0 ? "processing" : "complete";
    }

    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      director_name: (row.director_name as string) ?? null,
      slo_count: (row.slo_count as number) ?? 0,
      fulfills_coverage_pct: (row.fulfills_coverage_pct as number) ?? 0,
      upload_count: uploadCount,
      processing_status: processingStatus,
      program_name: (row.program_name as string) ?? null,
      academic_year: (row.academic_year as string) ?? null,
      status: (row.status as CourseOverviewItem["status"]) ?? "active",
      updated_at: row.updated_at as string,
    };
  }
}
