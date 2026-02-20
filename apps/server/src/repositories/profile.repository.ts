/**
 * Profile Repository — Supabase query layer for user profiles.
 * [STORY-F-5] Profile page — read/update profile, avatar URL management.
 *
 * DB table is `profiles` with `full_name` column (mapped to `display_name` in API).
 * Email and institution_name come from profiles + institutions join.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileResponse, UpdateProfileRequest } from "@journey-os/types";
import { ProfileNotFoundError } from "../errors";

const TABLE = "profiles";

export class ProfileRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async findByUserId(userId: string): Promise<ProfileResponse> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select("*, institutions(name)")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) {
      throw new ProfileNotFoundError(userId);
    }

    return this.#toProfileResponse(data);
  }

  async update(
    userId: string,
    request: UpdateProfileRequest,
  ): Promise<ProfileResponse> {
    const updateFields: Record<string, unknown> = {};

    if (request.display_name !== undefined) {
      updateFields.full_name = request.display_name.trim();
    }
    if (request.bio !== undefined) {
      updateFields.bio = request.bio.trim() || null;
    }
    if (request.department !== undefined) {
      updateFields.department = request.department.trim() || null;
    }
    if (request.title !== undefined) {
      updateFields.title = request.title.trim() || null;
    }

    updateFields.updated_at = new Date().toISOString();

    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .update(updateFields)
      .eq("id", userId)
      .select("*, institutions(name)")
      .single();

    if (error || !data) {
      throw new ProfileNotFoundError(userId);
    }

    return this.#toProfileResponse(data);
  }

  async updateAvatarUrl(
    userId: string,
    avatarUrl: string | null,
  ): Promise<void> {
    const { error } = await this.#supabaseClient
      .from(TABLE)
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select("id")
      .single();

    if (error) {
      throw new ProfileNotFoundError(userId);
    }
  }

  #toProfileResponse(row: Record<string, unknown>): ProfileResponse {
    const institution = row.institutions as { name: string } | null;

    return {
      id: row.id as string,
      email: row.email as string,
      display_name: (row.full_name as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      title: (row.title as string | null) ?? null,
      department: (row.department as string | null) ?? null,
      avatar_url: (row.avatar_url as string | null) ?? null,
      role: row.role as string,
      institution_id: row.institution_id as string,
      institution_name: institution?.name ?? "",
      is_course_director: (row.is_course_director as boolean) ?? false,
      onboarding_complete: (row.onboarding_complete as boolean) ?? false,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  }
}
