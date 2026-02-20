/**
 * Course Repository — Supabase query layer.
 * [STORY-F-1] CRUD + list with pagination/filters. No institution scoping (table has no institution_id).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CourseRow,
  CourseDTO,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseListQuery,
  CourseListResponse,
  CourseListItem,
  CourseListViewResponse,
  CourseType,
  CourseStatus,
} from "@journey-os/types";
import { CourseNotFoundError } from "../errors";

const TABLE = "courses";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class CourseRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: CreateCourseRequest): Promise<CourseDTO> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        department: data.department ?? null,
        course_director_id: data.course_director_id ?? null,
        academic_year: data.academic_year ?? null,
        semester: data.semester ?? null,
        credit_hours: data.credit_hours ?? null,
        course_type: data.course_type ?? null,
        program_id: data.program_id ?? null,
        max_enrollment: data.max_enrollment ?? null,
        is_required: data.is_required ?? false,
        prerequisites: data.prerequisites ?? [],
        learning_objectives: data.learning_objectives ?? [],
        tags: data.tags ?? [],
        ...(data.status ? { status: data.status } : {}),
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new CourseNotFoundError(
        `Failed to create course: ${error?.message ?? "No data returned"}`,
      );
    }

    return this.#toDTO(row as unknown as CourseRow);
  }

  async findById(id: string): Promise<CourseDTO | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new CourseNotFoundError(id);
    }

    return data ? this.#toDTO(data as unknown as CourseRow) : null;
  }

  async findByCode(code: string): Promise<CourseDTO | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (error) {
      throw new CourseNotFoundError(code);
    }

    return data ? this.#toDTO(data as unknown as CourseRow) : null;
  }

  async list(query: CourseListQuery): Promise<CourseListResponse> {
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    let dataQuery = this.#supabaseClient.from(TABLE).select("*");

    let countQuery = this.#supabaseClient
      .from(TABLE)
      .select("id", { count: "exact", head: true });

    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    if (query.course_type) {
      dataQuery = dataQuery.eq("course_type", query.course_type);
      countQuery = countQuery.eq("course_type", query.course_type);
    }

    if (query.department) {
      dataQuery = dataQuery.eq("department", query.department);
      countQuery = countQuery.eq("department", query.department);
    }

    if (query.search) {
      const escaped = this.#escapeSearch(query.search);
      const term = `%${escaped}%`;
      const filter = `name.ilike.${term},code.ilike.${term}`;
      dataQuery = dataQuery.or(filter);
      countQuery = countQuery.or(filter);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (dataResult.error) {
      throw new CourseNotFoundError(
        `Failed to fetch courses: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const courses = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) =>
        this.#toDTO(row as unknown as CourseRow),
    );

    return {
      courses,
      meta: { page, limit, total, total_pages: totalPages },
    };
  }

  async update(id: string, data: UpdateCourseRequest): Promise<CourseDTO> {
    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.description !== undefined)
      updateFields.description = data.description;
    if (data.department !== undefined)
      updateFields.department = data.department;
    if (data.course_director_id !== undefined)
      updateFields.course_director_id = data.course_director_id;
    if (data.academic_year !== undefined)
      updateFields.academic_year = data.academic_year;
    if (data.semester !== undefined) updateFields.semester = data.semester;
    if (data.credit_hours !== undefined)
      updateFields.credit_hours = data.credit_hours;
    if (data.course_type !== undefined)
      updateFields.course_type = data.course_type;
    if (data.status !== undefined) updateFields.status = data.status;
    updateFields.updated_at = new Date().toISOString();

    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !row) {
      throw new CourseNotFoundError(id);
    }

    return this.#toDTO(row as unknown as CourseRow);
  }

  async archive(id: string): Promise<void> {
    const { error } = await this.#supabaseClient
      .from(TABLE)
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      throw new CourseNotFoundError(id);
    }
  }

  async updateNeo4jId(id: string, neo4jId: string | null): Promise<void> {
    const updateFields: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (neo4jId) {
      updateFields.neo4j_id = neo4jId;
    }

    await this.#supabaseClient.from(TABLE).update(updateFields).eq("id", id);
  }

  async existsByCode(code: string): Promise<boolean> {
    const { data } = await this.#supabaseClient
      .from(TABLE)
      .select("id")
      .eq("code", code)
      .maybeSingle();

    return data !== null;
  }

  /**
   * [STORY-F-13] Enriched list with joined program name + director name + counts.
   */
  async listEnriched(query: CourseListQuery): Promise<CourseListViewResponse> {
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    let dataQuery = this.#supabaseClient
      .from(TABLE)
      .select(
        "id, code, name, department, program_id, status, academic_year, course_director_id, updated_at, program:programs(name), director:profiles!courses_course_director_id_fkey(full_name)",
      );

    let countQuery = this.#supabaseClient
      .from(TABLE)
      .select("id", { count: "exact", head: true });

    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    if (query.course_type) {
      dataQuery = dataQuery.eq("course_type", query.course_type);
      countQuery = countQuery.eq("course_type", query.course_type);
    }

    if (query.department) {
      dataQuery = dataQuery.eq("department", query.department);
      countQuery = countQuery.eq("department", query.department);
    }

    if (query.search) {
      const escaped = this.#escapeSearch(query.search);
      const term = `%${escaped}%`;
      const filter = `name.ilike.${term},code.ilike.${term}`;
      dataQuery = dataQuery.or(filter);
      countQuery = countQuery.or(filter);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery
        .order("name", { ascending: true })
        .range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (dataResult.error) {
      throw new CourseNotFoundError(
        `Failed to fetch courses: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const courseIds = (dataResult.data ?? []).map(
      (r: Record<string, unknown>) => r.id as string,
    );

    const [sectionCounts, sessionCounts] =
      courseIds.length > 0
        ? await Promise.all([
            this.#countSectionsByCourseIds(courseIds),
            this.#countSessionsByCourseIds(courseIds),
          ])
        : [new Map<string, number>(), new Map<string, number>()];

    const courses: CourseListItem[] = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) => {
        const program = row.program as { name: string } | null;
        const director = row.director as { full_name: string } | null;
        const id = row.id as string;
        return {
          id,
          code: row.code as string,
          name: row.name as string,
          department: (row.department as string) ?? null,
          program_id: (row.program_id as string) ?? null,
          program_name: program?.name ?? null,
          course_director_id: (row.course_director_id as string) ?? null,
          course_director_name: director?.full_name ?? null,
          status: (row.status as CourseStatus) ?? "active",
          academic_year: (row.academic_year as string) ?? null,
          section_count: sectionCounts.get(id) ?? 0,
          session_count: sessionCounts.get(id) ?? 0,
          updated_at: row.updated_at as string,
        };
      },
    );

    return {
      courses,
      meta: { page, limit, total, total_pages: totalPages },
    };
  }

  /**
   * [STORY-F-13] Enriched findById with program name + director info.
   */
  async findByIdEnriched(id: string): Promise<{
    course: Record<string, unknown>;
    program_name: string | null;
    director: { id: string; full_name: string; email: string } | null;
  } | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select(
        "*, program:programs(name), director:profiles!courses_course_director_id_fkey(id, full_name, email)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new CourseNotFoundError(id);
    }

    if (!data) return null;

    const row = data as Record<string, unknown>;
    const program = row.program as { name: string } | null;
    const director = row.director as {
      id: string;
      full_name: string;
      email: string;
    } | null;

    return {
      course: row,
      program_name: program?.name ?? null,
      director,
    };
  }

  async #countSectionsByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, number>> {
    const { data } = await this.#supabaseClient
      .from("sections")
      .select("course_id")
      .in("course_id", courseIds);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const cid = (row as Record<string, unknown>).course_id as string;
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
    }
    return counts;
  }

  async #countSessionsByCourseIds(
    courseIds: string[],
  ): Promise<Map<string, number>> {
    // Query from sections (which has course_id) and count nested sessions
    const { data } = await this.#supabaseClient
      .from("sections")
      .select("course_id, sessions(id)")
      .in("course_id", courseIds);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const courseId = r.course_id as string;
      const sessions = r.sessions as unknown[];
      counts.set(courseId, (counts.get(courseId) ?? 0) + sessions.length);
    }
    return counts;
  }

  /** Escape PostgREST LIKE wildcards and commas/dots in user search input. */
  #escapeSearch(raw: string): string {
    return raw
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/,/g, "\\,")
      .replace(/\./g, "\\.");
  }

  #toDTO(row: CourseRow): CourseDTO {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? null,
      department: row.department ?? null,
      course_director_id: row.course_director_id ?? null,
      academic_year: row.academic_year ?? null,
      semester: row.semester ?? null,
      credit_hours: row.credit_hours ?? null,
      course_type: (row.course_type as CourseType) ?? null,
      neo4j_id: row.neo4j_id ?? null,
      status: (row.status as CourseStatus) ?? "active",
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
