/**
 * Section Repository — Supabase query layer.
 * [STORY-F-11] Course-scoped section CRUD with position ordering.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Section,
  CreateSectionRequest,
  UpdateSectionRequest,
} from "@journey-os/types";
import { HierarchyNotFoundError } from "../errors";

const TABLE = "sections";

export class SectionRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(
    data: CreateSectionRequest & { position: number },
  ): Promise<Section> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        course_id: data.course_id,
        title: data.title,
        description: data.description ?? "",
        position: data.position,
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new HierarchyNotFoundError(
        `Failed to create section: ${error?.message ?? "No data returned"}`,
      );
    }

    return row as Section;
  }

  async findById(id: string): Promise<Section | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to find section: ${error.message}`,
      );
    }

    return data as Section | null;
  }

  async findByCourseId(courseId: string): Promise<Section[]> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("course_id", courseId)
      .order("position", { ascending: true });

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to list sections: ${error.message}`,
      );
    }

    return (data ?? []) as Section[];
  }

  async update(id: string, data: UpdateSectionRequest): Promise<Section> {
    const updateFields: Record<string, unknown> = {};
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.description !== undefined)
      updateFields.description = data.description;
    if (data.position !== undefined) updateFields.position = data.position;
    if (data.is_active !== undefined) updateFields.is_active = data.is_active;
    updateFields.updated_at = new Date().toISOString();

    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !row) {
      throw new HierarchyNotFoundError(`Section not found: ${id}`);
    }

    return row as Section;
  }

  async getMaxPosition(courseId: string): Promise<number> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("position")
      .eq("course_id", courseId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return -1;
    }

    return data ? (data as { position: number }).position : -1;
  }

  async reorderSections(
    courseId: string,
    sectionIds: string[],
  ): Promise<number> {
    const { data, error } = await this.#supabaseClient.rpc("reorder_sections", {
      p_course_id: courseId,
      p_section_ids: sectionIds,
    });

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to reorder sections: ${error.message}`,
      );
    }

    return (data as number) ?? 0;
  }

  async updateSyncStatus(id: string, syncStatus: string): Promise<void> {
    const { error } = await this.#supabaseClient
      .from(TABLE)
      .update({ sync_status: syncStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .single();

    if (error) {
      console.warn(
        `[SectionRepository] Failed to update sync_status for ${id}:`,
        error.message,
      );
    }
  }
}
