/**
 * SLO Repository — Supabase query layer.
 * [STORY-IA-2] All queries filter by scope='session' to exclude ILOs.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SLO,
  CreateSLORequest,
  UpdateSLORequest,
  SLOListQuery,
  SLOListResponse,
} from "@journey-os/types";
import { ObjectiveNotFoundError } from "../errors";

const TABLE = "student_learning_objectives";
const SCOPE = "session";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export class SLORepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(
    data: CreateSLORequest,
    createdBy: string,
    institutionId: string,
  ): Promise<SLO> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        code: data.code,
        title: data.title,
        description: data.description,
        bloom_level: data.bloom_level,
        scope: SCOPE,
        course_id: data.course_id,
        institution_id: institutionId,
        created_by: createdBy,
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new ObjectiveNotFoundError(
        `Failed to create SLO: ${error?.message ?? "No data returned"}`,
      );
    }

    return row as unknown as SLO;
  }

  async findById(id: string): Promise<SLO | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("scope", SCOPE)
      .maybeSingle();

    if (error) {
      throw new ObjectiveNotFoundError(id);
    }

    return (data as unknown as SLO) ?? null;
  }

  async findByCourseId(query: SLOListQuery): Promise<SLOListResponse> {
    const page = Math.max(query.page ?? DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(query.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const offset = (page - 1) * limit;

    let dataQuery = this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("course_id", query.course_id)
      .eq("scope", SCOPE)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    let countQuery = this.#supabaseClient
      .from(TABLE)
      .select("id", { count: "exact", head: true })
      .eq("course_id", query.course_id)
      .eq("scope", SCOPE);

    if (query.status) {
      dataQuery = dataQuery.eq("status", query.status);
      countQuery = countQuery.eq("status", query.status);
    }

    if (query.bloom_level) {
      dataQuery = dataQuery.eq("bloom_level", query.bloom_level);
      countQuery = countQuery.eq("bloom_level", query.bloom_level);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery,
      countQuery,
    ]);

    if (dataResult.error) {
      throw new ObjectiveNotFoundError(
        `Failed to fetch SLOs: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const objectives = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) =>
        ({
          id: row.id as string,
          course_id: row.course_id as string,
          institution_id: row.institution_id as string,
          code: row.code as string,
          title: row.title as string,
          description: (row.description as string) ?? "",
          bloom_level: row.bloom_level,
          status: row.status,
          created_by: row.created_by as string,
          graph_node_id: (row.graph_node_id as string) ?? null,
          sync_status: row.sync_status,
          created_at: row.created_at as string,
          updated_at: row.updated_at as string,
        }) as SLO,
    );

    return {
      objectives,
      meta: { page, limit, total, total_pages: totalPages },
    };
  }

  async update(id: string, data: UpdateSLORequest): Promise<SLO> {
    const updateFields: Record<string, unknown> = {};
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.description !== undefined)
      updateFields.description = data.description;
    if (data.bloom_level !== undefined)
      updateFields.bloom_level = data.bloom_level;
    if (data.status !== undefined) updateFields.status = data.status;
    updateFields.updated_at = new Date().toISOString();

    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .eq("scope", SCOPE)
      .select("*")
      .single();

    if (error || !row) {
      throw new ObjectiveNotFoundError(id);
    }

    return row as unknown as SLO;
  }

  async archive(id: string): Promise<void> {
    const { error } = await this.#supabaseClient
      .from(TABLE)
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("scope", SCOPE)
      .select("id")
      .single();

    if (error) {
      throw new ObjectiveNotFoundError(id);
    }
  }

  async updateSyncStatus(
    id: string,
    syncStatus: "synced" | "failed",
    graphNodeId: string | null,
  ): Promise<void> {
    const updateFields: Record<string, unknown> = {
      sync_status: syncStatus,
      updated_at: new Date().toISOString(),
    };
    if (graphNodeId) {
      updateFields.graph_node_id = graphNodeId;
    }

    await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .eq("scope", SCOPE)
      .select("id")
      .single();
  }

  async existsByCode(code: string, courseId: string): Promise<boolean> {
    const { data } = await this.#supabaseClient
      .from(TABLE)
      .select("id")
      .eq("code", code)
      .eq("course_id", courseId)
      .eq("scope", SCOPE)
      .maybeSingle();

    return data !== null;
  }
}
