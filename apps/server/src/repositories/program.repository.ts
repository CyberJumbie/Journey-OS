/**
 * Program Repository — Supabase query layer.
 * [STORY-F-11] Institution-scoped program CRUD.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Program,
  CreateProgramRequest,
  UpdateProgramRequest,
} from "@journey-os/types";
import { HierarchyNotFoundError } from "../errors";

const TABLE = "programs";

export class ProgramRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: CreateProgramRequest): Promise<Program> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        institution_id: data.institution_id,
        name: data.name,
        code: data.code,
        description: data.description ?? "",
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new HierarchyNotFoundError(
        `Failed to create program: ${error?.message ?? "No data returned"}`,
      );
    }

    return row as Program;
  }

  async findById(id: string): Promise<Program | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to find program: ${error.message}`,
      );
    }

    return data as Program | null;
  }

  async findByInstitutionId(institutionId: string): Promise<Program[]> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to list programs: ${error.message}`,
      );
    }

    return (data ?? []) as Program[];
  }

  async update(id: string, data: UpdateProgramRequest): Promise<Program> {
    const updateFields: Record<string, unknown> = {};
    if (data.name !== undefined) updateFields.name = data.name;
    if (data.code !== undefined) updateFields.code = data.code;
    if (data.description !== undefined)
      updateFields.description = data.description;
    if (data.is_active !== undefined) updateFields.is_active = data.is_active;
    updateFields.updated_at = new Date().toISOString();

    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !row) {
      throw new HierarchyNotFoundError(`Program not found: ${id}`);
    }

    return row as Program;
  }

  async existsByCode(institutionId: string, code: string): Promise<boolean> {
    const { data } = await this.#supabaseClient
      .from(TABLE)
      .select("id")
      .eq("institution_id", institutionId)
      .eq("code", code)
      .maybeSingle();

    return data !== null;
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
        `[ProgramRepository] Failed to update sync_status for ${id}:`,
        error.message,
      );
    }
  }
}
