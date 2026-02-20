/**
 * GenerationPreferenceService — manages generation automation preferences.
 * [STORY-F-17] Stored in user_preferences.generation_preferences JSONB.
 * Direct Supabase queries (no repository layer) — consistent with NotificationPreferenceService.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  AutomationLevel,
  GenerationPreferences,
  GenerationPreferencesResponse,
  UpdateGenerationPreferencesRequest,
  DifficultyDistribution,
} from "@journey-os/types";
import {
  AUTOMATION_STRICTNESS,
  DEFAULT_GENERATION_PREFERENCES,
  AUTOMATION_LEVELS,
} from "@journey-os/types";
import { PreferenceValidationError } from "../../errors";

const VALID_LEVELS_SET = new Set<string>(AUTOMATION_LEVELS);

/**
 * Compute the effective automation level as max(institution, user) by strictness.
 * Pure function, independently testable.
 */
export function computeEffectiveLevel(
  userLevel: AutomationLevel,
  institutionMinimum: AutomationLevel | null,
): AutomationLevel {
  if (institutionMinimum === null) return userLevel;
  const userStrictness = AUTOMATION_STRICTNESS[userLevel];
  const instStrictness = AUTOMATION_STRICTNESS[institutionMinimum];
  return userStrictness >= instStrictness ? userLevel : institutionMinimum;
}

export class GenerationPreferenceService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  /**
   * Get generation preferences for a user, including institution override.
   * Creates a default row if none exists (upsert pattern).
   */
  async getForUser(userId: string): Promise<GenerationPreferencesResponse> {
    const [preferences, institutionMinimum] = await Promise.all([
      this.#getUserPreferences(userId),
      this.#getInstitutionMinimum(userId),
    ]);

    return {
      preferences,
      institution_minimum: institutionMinimum,
      effective_automation_level: computeEffectiveLevel(
        preferences.automation_level,
        institutionMinimum,
      ),
    };
  }

  /**
   * Partial update of generation preferences. Merges with existing values.
   */
  async updateForUser(
    userId: string,
    request: UpdateGenerationPreferencesRequest,
  ): Promise<GenerationPreferencesResponse> {
    this.#validate(request);

    const current = await this.#getUserPreferences(userId);

    const merged: GenerationPreferences = {
      automation_level: request.automation_level ?? current.automation_level,
      pause_before_critic:
        request.pause_before_critic ?? current.pause_before_critic,
      difficulty_distribution:
        request.difficulty_distribution ?? current.difficulty_distribution,
      bloom_focus: request.bloom_focus ?? current.bloom_focus,
    };

    const { data, error } = await this.#supabaseClient
      .from("user_preferences")
      .update({
        generation_preferences: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select("generation_preferences")
      .single();

    if (error) {
      throw error;
    }

    const saved = data.generation_preferences as GenerationPreferences;
    const institutionMinimum = await this.#getInstitutionMinimum(userId);

    return {
      preferences: saved,
      institution_minimum: institutionMinimum,
      effective_automation_level: computeEffectiveLevel(
        saved.automation_level,
        institutionMinimum,
      ),
    };
  }

  /**
   * Get the user's generation preferences, creating defaults if needed.
   */
  async #getUserPreferences(userId: string): Promise<GenerationPreferences> {
    const { data, error } = await this.#supabaseClient
      .from("user_preferences")
      .select("generation_preferences")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.generation_preferences) {
      return data.generation_preferences as GenerationPreferences;
    }

    // No row or null column — upsert with defaults
    const { data: inserted, error: insertError } = await this.#supabaseClient
      .from("user_preferences")
      .upsert(
        {
          user_id: userId,
          generation_preferences: DEFAULT_GENERATION_PREFERENCES,
        },
        { onConflict: "user_id" },
      )
      .select("generation_preferences")
      .single();

    if (insertError) {
      throw insertError;
    }

    return inserted.generation_preferences as GenerationPreferences;
  }

  /**
   * Look up the institution's minimum automation level via the user's profile.
   * Returns null if no override is set.
   */
  async #getInstitutionMinimum(
    userId: string,
  ): Promise<AutomationLevel | null> {
    const { data: profile, error: profileError } = await this.#supabaseClient
      .from("profiles")
      .select("institution_id")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile?.institution_id) {
      return null;
    }

    const { data: institution, error: instError } = await this.#supabaseClient
      .from("institutions")
      .select("settings")
      .eq("id", profile.institution_id)
      .maybeSingle();

    if (instError || !institution?.settings) {
      return null;
    }

    const settings = institution.settings as Record<string, unknown>;
    const minLevel = settings.min_automation_level;

    if (typeof minLevel === "string" && VALID_LEVELS_SET.has(minLevel)) {
      return minLevel as AutomationLevel;
    }

    return null;
  }

  /**
   * Validate the update request fields.
   */
  #validate(request: UpdateGenerationPreferencesRequest): void {
    if (
      request.automation_level !== undefined &&
      !VALID_LEVELS_SET.has(request.automation_level)
    ) {
      throw new PreferenceValidationError(
        `Invalid automation level: "${request.automation_level}". Valid levels: ${AUTOMATION_LEVELS.join(", ")}`,
      );
    }

    if (request.pause_before_critic !== undefined) {
      if (typeof request.pause_before_critic !== "boolean") {
        throw new PreferenceValidationError(
          "pause_before_critic must be a boolean",
        );
      }
    }

    if (request.difficulty_distribution !== undefined) {
      this.#validateDifficultyDistribution(request.difficulty_distribution);
    }

    if (request.bloom_focus !== undefined) {
      this.#validateBloomFocus(request.bloom_focus);
    }
  }

  #validateDifficultyDistribution(dist: DifficultyDistribution): void {
    const { easy, medium, hard } = dist;

    if (
      typeof easy !== "number" ||
      typeof medium !== "number" ||
      typeof hard !== "number"
    ) {
      throw new PreferenceValidationError(
        "Difficulty distribution values must be numbers",
      );
    }

    if (easy < 0 || medium < 0 || hard < 0) {
      throw new PreferenceValidationError(
        "Difficulty distribution values must be non-negative",
      );
    }

    if (
      !Number.isInteger(easy) ||
      !Number.isInteger(medium) ||
      !Number.isInteger(hard)
    ) {
      throw new PreferenceValidationError(
        "Difficulty distribution values must be integers",
      );
    }

    const sum = easy + medium + hard;
    if (sum !== 100) {
      throw new PreferenceValidationError(
        `Difficulty distribution must sum to 100, got ${sum}`,
      );
    }
  }

  #validateBloomFocus(levels: readonly number[]): void {
    if (!Array.isArray(levels)) {
      throw new PreferenceValidationError("bloom_focus must be an array");
    }

    if (levels.length === 0) {
      throw new PreferenceValidationError(
        "bloom_focus must contain at least one level",
      );
    }

    const seen = new Set<number>();
    for (const level of levels) {
      if (!Number.isInteger(level) || level < 1 || level > 6) {
        throw new PreferenceValidationError(
          `Invalid Bloom level: ${level}. Must be an integer between 1 and 6`,
        );
      }
      if (seen.has(level)) {
        throw new PreferenceValidationError(`Duplicate Bloom level: ${level}`);
      }
      seen.add(level);
    }
  }
}
