/**
 * NotificationPreferenceService — manages per-type, per-channel notification preferences.
 * [STORY-F-16] Stored in user_preferences table as JSONB.
 * Direct Supabase queries (no repository layer) — consistent with GlobalUserService pattern.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  NotificationPreferenceType,
  NotificationPreferenceMatrix,
  NotificationChannelPreference,
  UpdateNotificationPreferencesRequest,
} from "@journey-os/types";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_PREFERENCE_TYPES,
} from "@journey-os/types";
import { PreferenceValidationError } from "../../errors";

const VALID_TYPES_SET = new Set<string>(NOTIFICATION_PREFERENCE_TYPES);

export class NotificationPreferenceService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  /**
   * Get notification preferences for a user.
   * Creates a default row if none exists (upsert pattern).
   */
  async getForUser(userId: string): Promise<NotificationPreferenceMatrix> {
    const { data, error } = await this.#supabaseClient
      .from("user_preferences")
      .select("notification_preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.notification_preferences) {
      return data.notification_preferences as NotificationPreferenceMatrix;
    }

    // No row exists — create with defaults
    const { data: inserted, error: insertError } = await this.#supabaseClient
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
        },
        { onConflict: "user_id" },
      )
      .select("notification_preferences")
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted.notification_preferences as NotificationPreferenceMatrix;
  }

  /**
   * Deep-merge partial update into existing preferences.
   * Validates notification type names and channel values.
   */
  async updateForUser(
    userId: string,
    request: UpdateNotificationPreferencesRequest,
  ): Promise<NotificationPreferenceMatrix> {
    this.#validate(request);

    // Get current (or create defaults)
    const current = await this.getForUser(userId);

    // Deep merge
    const merged = { ...current };
    for (const [typeKey, channels] of Object.entries(request.preferences)) {
      const key = typeKey as NotificationPreferenceType;
      const existing = merged[key];
      merged[key] = {
        in_app: channels?.in_app ?? existing.in_app,
        email: channels?.email ?? existing.email,
      };
    }

    const { data, error } = await this.#supabaseClient
      .from("user_preferences")
      .update({
        notification_preferences: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("notification_preferences")
      .single();

    if (error) {
      throw error;
    }

    return data.notification_preferences as NotificationPreferenceMatrix;
  }

  /**
   * Reset all preferences to defaults.
   */
  async resetForUser(userId: string): Promise<NotificationPreferenceMatrix> {
    const { data, error } = await this.#supabaseClient
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          notification_preferences: DEFAULT_NOTIFICATION_PREFERENCES,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("notification_preferences")
      .single();

    if (error) {
      throw error;
    }

    return data.notification_preferences as NotificationPreferenceMatrix;
  }

  /**
   * Validate the update request: known types only, boolean channel values only.
   */
  #validate(request: UpdateNotificationPreferencesRequest): void {
    if (!request.preferences || typeof request.preferences !== "object") {
      throw new PreferenceValidationError(
        "Request body must contain a 'preferences' object",
      );
    }

    for (const [typeKey, channels] of Object.entries(request.preferences)) {
      if (!VALID_TYPES_SET.has(typeKey)) {
        throw new PreferenceValidationError(
          `Unknown notification type: "${typeKey}". Valid types: ${NOTIFICATION_PREFERENCE_TYPES.join(", ")}`,
        );
      }

      if (channels && typeof channels === "object") {
        for (const [channelKey, value] of Object.entries(
          channels as Record<string, unknown>,
        )) {
          if (channelKey !== "in_app" && channelKey !== "email") {
            throw new PreferenceValidationError(
              `Unknown channel: "${channelKey}". Valid channels: in_app, email`,
            );
          }
          if (typeof value !== "boolean") {
            throw new PreferenceValidationError(
              `Channel "${channelKey}" for type "${typeKey}" must be a boolean, got ${typeof value}`,
            );
          }
        }
      }
    }
  }
}
