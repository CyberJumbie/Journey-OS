/**
 * Template Repository — Supabase query layer with dual-write support.
 * [STORY-F-4] CRUD + list with pagination/filters. Institution-scoped.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TemplateRow,
  TemplateDTO,
  TemplateVersionRow,
  TemplateVersionDTO,
  TemplateListQuery,
  TemplateListResponse,
  TemplateSharingLevel,
  TemplateQuestionType,
} from "@journey-os/types";
import { TemplateNotFoundError } from "../errors";

const TABLE = "templates";
const VERSIONS_TABLE = "template_versions";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class TemplateRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: {
    institution_id: string;
    owner_id: string;
    name: string;
    description: string;
    question_type: string;
    difficulty_distribution: Record<string, number>;
    bloom_levels: number[];
    scope_config: Record<string, unknown>;
    prompt_overrides: Record<string, unknown>;
    metadata: Record<string, unknown>;
    sharing_level: string;
  }): Promise<TemplateDTO> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert(data)
      .select("*")
      .single();

    if (error || !row) {
      throw new TemplateNotFoundError(
        `Failed to create template: ${error?.message ?? "No data returned"}`,
      );
    }

    return this.#toDTO(row as unknown as TemplateRow);
  }

  async findById(id: string): Promise<TemplateDTO | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new TemplateNotFoundError(id);
    }

    return data ? this.#toDTO(data as unknown as TemplateRow) : null;
  }

  async list(
    query: TemplateListQuery,
    userId: string,
    userInstitutionId: string,
  ): Promise<TemplateListResponse> {
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

    if (query.owner_only) {
      dataQuery = dataQuery.eq("owner_id", userId);
      countQuery = countQuery.eq("owner_id", userId);
    } else {
      // Show own templates + shared from institution + public
      const filter = `owner_id.eq.${userId},and(sharing_level.eq.shared_institution,institution_id.eq.${userInstitutionId}),sharing_level.eq.public`;
      dataQuery = dataQuery.or(filter);
      countQuery = countQuery.or(filter);
    }

    if (query.sharing_level) {
      dataQuery = dataQuery.eq("sharing_level", query.sharing_level);
      countQuery = countQuery.eq("sharing_level", query.sharing_level);
    }

    if (query.question_type) {
      dataQuery = dataQuery.eq("question_type", query.question_type);
      countQuery = countQuery.eq("question_type", query.question_type);
    }

    if (query.course_id) {
      dataQuery = dataQuery.contains("scope_config", {
        course_id: query.course_id,
      });
      countQuery = countQuery.contains("scope_config", {
        course_id: query.course_id,
      });
    }

    if (query.search) {
      const term = `%${query.search.trim()}%`;
      const searchFilter = `name.ilike.${term},description.ilike.${term}`;
      dataQuery = dataQuery.or(searchFilter);
      countQuery = countQuery.or(searchFilter);
    }

    const [dataResult, countResult] = await Promise.all([
      dataQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1),
      countQuery,
    ]);

    if (dataResult.error) {
      throw new TemplateNotFoundError(
        `Failed to fetch templates: ${dataResult.error.message}`,
      );
    }

    const total = countResult.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    const templates = (dataResult.data ?? []).map(
      (row: Record<string, unknown>) =>
        this.#toDTO(row as unknown as TemplateRow),
    );

    return {
      templates,
      meta: { page, limit, total, total_pages: totalPages },
    };
  }

  async update(
    id: string,
    data: Record<string, unknown>,
  ): Promise<TemplateDTO> {
    const updateFields = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !row) {
      throw new TemplateNotFoundError(id);
    }

    return this.#toDTO(row as unknown as TemplateRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.#supabaseClient
      .from(TABLE)
      .delete()
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      throw new TemplateNotFoundError(id);
    }
  }

  async createVersion(version: TemplateVersionDTO): Promise<void> {
    const { error } = await this.#supabaseClient
      .from(VERSIONS_TABLE)
      .insert({
        id: version.id,
        template_id: version.template_id,
        version_number: version.version_number,
        name: version.name,
        description: version.description,
        question_type: version.question_type,
        difficulty_distribution: version.difficulty_distribution,
        bloom_levels: version.bloom_levels,
        scope_config: version.scope_config,
        prompt_overrides: version.prompt_overrides,
        metadata: version.metadata,
        sharing_level: version.sharing_level,
        created_by: version.created_by,
      })
      .select("id")
      .single();

    if (error) {
      console.warn(
        `[TemplateRepository] Failed to create version: ${error.message}`,
      );
    }
  }

  async findVersions(templateId: string): Promise<TemplateVersionDTO[]> {
    const { data, error } = await this.#supabaseClient
      .from(VERSIONS_TABLE)
      .select("*")
      .eq("template_id", templateId)
      .order("version_number", { ascending: false });

    if (error) {
      return [];
    }

    return (data ?? []).map((row: Record<string, unknown>) =>
      this.#toVersionDTO(row as unknown as TemplateVersionRow),
    );
  }

  async updateSyncStatus(
    id: string,
    graphNodeId: string | null,
    syncStatus: "pending" | "synced" | "failed",
  ): Promise<void> {
    const updateFields: Record<string, unknown> = {
      sync_status: syncStatus,
      updated_at: new Date().toISOString(),
    };
    if (graphNodeId) {
      updateFields.graph_node_id = graphNodeId;
    }

    await this.#supabaseClient.from(TABLE).update(updateFields).eq("id", id);
  }

  #toDTO(row: TemplateRow): TemplateDTO {
    return {
      id: row.id,
      institution_id: row.institution_id,
      owner_id: row.owner_id,
      name: row.name,
      description: row.description ?? "",
      question_type: row.question_type as TemplateQuestionType,
      difficulty_distribution: row.difficulty_distribution as {
        easy: number;
        medium: number;
        hard: number;
      },
      bloom_levels: row.bloom_levels,
      scope_config: row.scope_config as TemplateDTO["scope_config"],
      prompt_overrides: row.prompt_overrides as TemplateDTO["prompt_overrides"],
      metadata: row.metadata as TemplateDTO["metadata"],
      sharing_level: row.sharing_level as TemplateSharingLevel,
      current_version: row.current_version,
      graph_node_id: row.graph_node_id ?? null,
      sync_status:
        (row.sync_status as "pending" | "synced" | "failed") ?? "pending",
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  #toVersionDTO(row: TemplateVersionRow): TemplateVersionDTO {
    return {
      id: row.id,
      template_id: row.template_id,
      version_number: row.version_number,
      name: row.name,
      description: row.description ?? "",
      question_type: row.question_type as TemplateQuestionType,
      difficulty_distribution: row.difficulty_distribution as {
        easy: number;
        medium: number;
        hard: number;
      },
      bloom_levels: row.bloom_levels,
      scope_config: row.scope_config as TemplateVersionDTO["scope_config"],
      prompt_overrides:
        row.prompt_overrides as TemplateVersionDTO["prompt_overrides"],
      metadata: row.metadata as TemplateVersionDTO["metadata"],
      sharing_level: row.sharing_level as TemplateSharingLevel,
      created_by: row.created_by,
      created_at: row.created_at,
    };
  }
}
