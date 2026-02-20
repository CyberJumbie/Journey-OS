/**
 * Template types — generation template model for faculty question generation configs.
 * Tables: templates, template_versions
 */

/** Sharing levels control who can read a template */
export const TEMPLATE_SHARING_LEVELS = [
  "private",
  "shared_course",
  "shared_institution",
  "public",
] as const;

export type TemplateSharingLevel = (typeof TEMPLATE_SHARING_LEVELS)[number];

/** Question types supported by the generation pipeline */
export const TEMPLATE_QUESTION_TYPES = [
  "single_best_answer",
  "extended_matching",
  "sequential_item_set",
] as const;

export type TemplateQuestionType = (typeof TEMPLATE_QUESTION_TYPES)[number];

/**
 * Difficulty distribution across Bloom levels.
 * Values are percentage weights (must sum to 1.0).
 */
export interface DifficultyDistribution {
  readonly easy: number; // 0.0-1.0  (Bloom 1-2)
  readonly medium: number; // 0.0-1.0  (Bloom 3-4)
  readonly hard: number; // 0.0-1.0  (Bloom 5-6)
}

/**
 * Bloom level targeting configuration.
 * Array of Bloom levels (1-6) to include in generation.
 */
export type BloomLevelConfig = readonly number[];

/**
 * Scope configuration: which content to draw from.
 */
export interface TemplateScopeConfig {
  readonly course_id?: string;
  readonly session_ids?: readonly string[];
  readonly subconcept_ids?: readonly string[];
  readonly usmle_systems?: readonly string[];
  readonly usmle_disciplines?: readonly string[];
}

/**
 * Prompt overrides allow faculty to customize generation behavior.
 */
export interface TemplatePromptOverrides {
  readonly vignette_instructions?: string;
  readonly stem_instructions?: string;
  readonly distractor_instructions?: string;
  readonly clinical_setting?: string;
  readonly patient_demographics?: string;
}

/**
 * Template metadata for categorization and search.
 */
export interface TemplateMetadata {
  readonly category?: string;
  readonly tags?: readonly string[];
  readonly notes?: string;
}

/** Raw DB row shape */
export interface TemplateRow {
  readonly id: string;
  readonly institution_id: string;
  readonly owner_id: string;
  readonly name: string;
  readonly description: string;
  readonly question_type: string;
  readonly difficulty_distribution: Record<string, number>;
  readonly bloom_levels: number[];
  readonly scope_config: Record<string, unknown>;
  readonly prompt_overrides: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly sharing_level: string;
  readonly current_version: number;
  readonly graph_node_id: string | null;
  readonly sync_status: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** API-safe output */
export interface TemplateDTO {
  readonly id: string;
  readonly institution_id: string;
  readonly owner_id: string;
  readonly name: string;
  readonly description: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: BloomLevelConfig;
  readonly scope_config: TemplateScopeConfig;
  readonly prompt_overrides: TemplatePromptOverrides;
  readonly metadata: TemplateMetadata;
  readonly sharing_level: TemplateSharingLevel;
  readonly current_version: number;
  readonly graph_node_id: string | null;
  readonly sync_status: "pending" | "synced" | "failed";
  readonly created_at: string;
  readonly updated_at: string;
}

/** Immutable snapshot of a template at a point in time */
export interface TemplateVersionDTO {
  readonly id: string;
  readonly template_id: string;
  readonly version_number: number;
  readonly name: string;
  readonly description: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: BloomLevelConfig;
  readonly scope_config: TemplateScopeConfig;
  readonly prompt_overrides: TemplatePromptOverrides;
  readonly metadata: TemplateMetadata;
  readonly sharing_level: TemplateSharingLevel;
  readonly created_by: string;
  readonly created_at: string;
}

/** Raw DB row shape for template versions */
export interface TemplateVersionRow {
  readonly id: string;
  readonly template_id: string;
  readonly version_number: number;
  readonly name: string;
  readonly description: string;
  readonly question_type: string;
  readonly difficulty_distribution: Record<string, number>;
  readonly bloom_levels: number[];
  readonly scope_config: Record<string, unknown>;
  readonly prompt_overrides: Record<string, unknown>;
  readonly metadata: Record<string, unknown>;
  readonly sharing_level: string;
  readonly created_by: string;
  readonly created_at: string;
}

/** Input for creating a new template */
export interface CreateTemplateRequest {
  readonly name: string;
  readonly description?: string;
  readonly question_type: TemplateQuestionType;
  readonly difficulty_distribution: DifficultyDistribution;
  readonly bloom_levels: BloomLevelConfig;
  readonly scope_config?: TemplateScopeConfig;
  readonly prompt_overrides?: TemplatePromptOverrides;
  readonly metadata?: TemplateMetadata;
  readonly sharing_level?: TemplateSharingLevel;
}

/** Input for updating an existing template. All fields optional (partial update). */
export interface UpdateTemplateRequest {
  readonly name?: string;
  readonly description?: string;
  readonly question_type?: TemplateQuestionType;
  readonly difficulty_distribution?: DifficultyDistribution;
  readonly bloom_levels?: BloomLevelConfig;
  readonly scope_config?: TemplateScopeConfig;
  readonly prompt_overrides?: TemplatePromptOverrides;
  readonly metadata?: TemplateMetadata;
  readonly sharing_level?: TemplateSharingLevel;
}

/** Input for duplicating a template */
export interface DuplicateTemplateRequest {
  readonly new_name?: string;
}

/** Query parameters for listing templates */
export interface TemplateListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sharing_level?: TemplateSharingLevel;
  readonly question_type?: TemplateQuestionType;
  readonly course_id?: string;
  readonly search?: string;
  readonly owner_only?: boolean;
}

/** Paginated response wrapper */
export interface TemplateListResponse {
  readonly templates: readonly TemplateDTO[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
