/**
 * Generation preferences — automation level and default generation parameters.
 * [STORY-F-17] Stored in user_preferences.generation_preferences JSONB.
 */

/**
 * Automation level for the generation pipeline.
 * Strictness order: manual > checkpoints > full_auto.
 * effectiveLevel = max(institutionLevel, userLevel).
 */
export type AutomationLevel = "full_auto" | "checkpoints" | "manual";

/**
 * Strictness ranking: higher number = stricter.
 * Used to compute effectiveLevel = max(institution, user).
 */
export const AUTOMATION_STRICTNESS: Readonly<Record<AutomationLevel, number>> =
  {
    full_auto: 0,
    checkpoints: 1,
    manual: 2,
  };

/**
 * Re-export DifficultyDistribution from template types.
 * In generation preferences context, values are percentages (0-100) summing to 100.
 * In template context, values are 0.0-1.0. Same shape, different scale.
 */
export type { DifficultyDistribution } from "../template/template.types";
import type { DifficultyDistribution } from "../template/template.types";

/**
 * Generation preferences stored in user_preferences.generation_preferences JSONB.
 */
export interface GenerationPreferences {
  /** User's selected automation level */
  readonly automation_level: AutomationLevel;
  /** Extra checkpoint: pause before critic scoring step */
  readonly pause_before_critic: boolean;
  /** Default difficulty distribution for generated items (percentages, must sum to 100) */
  readonly difficulty_distribution: DifficultyDistribution;
  /** Default Bloom's taxonomy focus levels (array of 1-6) */
  readonly bloom_focus: readonly number[];
}

/**
 * Default generation preferences.
 */
export const DEFAULT_GENERATION_PREFERENCES: GenerationPreferences = {
  automation_level: "checkpoints",
  pause_before_critic: false,
  difficulty_distribution: { easy: 30, medium: 50, hard: 20 },
  bloom_focus: [2, 3, 4],
};

/**
 * All valid automation levels for validation.
 */
export const AUTOMATION_LEVELS: readonly AutomationLevel[] = [
  "full_auto",
  "checkpoints",
  "manual",
] as const;

/**
 * GET /api/v1/settings/generation response payload.
 */
export interface GenerationPreferencesResponse {
  readonly preferences: GenerationPreferences;
  /** Institution minimum automation level, null if no override */
  readonly institution_minimum: AutomationLevel | null;
  /** Effective level after institution override applied */
  readonly effective_automation_level: AutomationLevel;
}

/**
 * PUT /api/v1/settings/generation request body.
 * Partial update: only include fields being changed.
 */
export interface UpdateGenerationPreferencesRequest {
  readonly automation_level?: AutomationLevel;
  readonly pause_before_critic?: boolean;
  readonly difficulty_distribution?: DifficultyDistribution;
  readonly bloom_focus?: readonly number[];
}
