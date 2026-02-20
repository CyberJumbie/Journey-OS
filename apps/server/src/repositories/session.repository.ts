/**
 * Session Repository — Supabase query layer.
 * [STORY-F-11] Section-scoped session CRUD with scheduling.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Session,
  CreateSessionRequest,
  UpdateSessionRequest,
} from "@journey-os/types";
import { HierarchyNotFoundError } from "../errors";

const TABLE = "sessions";

export class SessionRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(data: CreateSessionRequest): Promise<Session> {
    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .insert({
        section_id: data.section_id,
        title: data.title,
        description: data.description ?? "",
        week_number: data.week_number,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new HierarchyNotFoundError(
        `Failed to create session: ${error?.message ?? "No data returned"}`,
      );
    }

    return row as Session;
  }

  async findById(id: string): Promise<Session | null> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to find session: ${error.message}`,
      );
    }

    return data as Session | null;
  }

  async findBySectionId(sectionId: string): Promise<Session[]> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*")
      .eq("section_id", sectionId)
      .order("week_number", { ascending: true });

    if (error) {
      throw new HierarchyNotFoundError(
        `Failed to list sessions: ${error.message}`,
      );
    }

    return (data ?? []) as Session[];
  }

  async update(id: string, data: UpdateSessionRequest): Promise<Session> {
    const updateFields: Record<string, unknown> = {};
    if (data.title !== undefined) updateFields.title = data.title;
    if (data.description !== undefined)
      updateFields.description = data.description;
    if (data.week_number !== undefined)
      updateFields.week_number = data.week_number;
    if (data.day_of_week !== undefined)
      updateFields.day_of_week = data.day_of_week;
    if (data.start_time !== undefined)
      updateFields.start_time = data.start_time;
    if (data.end_time !== undefined) updateFields.end_time = data.end_time;
    if (data.is_active !== undefined) updateFields.is_active = data.is_active;
    updateFields.updated_at = new Date().toISOString();

    const { data: row, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", id)
      .select("*")
      .single();

    if (error || !row) {
      throw new HierarchyNotFoundError(`Session not found: ${id}`);
    }

    return row as Session;
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
        `[SessionRepository] Failed to update sync_status for ${id}:`,
        error.message,
      );
    }
  }
}
