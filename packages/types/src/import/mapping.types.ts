/**
 * Types for field mapping UI and import wizard.
 * Extends the parser types from STORY-F-3.
 */

/** Target fields that source columns can be mapped to */
export const IMPORT_TARGET_FIELDS = [
  "stem",
  "vignette",
  "answer_choice_a",
  "answer_choice_b",
  "answer_choice_c",
  "answer_choice_d",
  "answer_choice_e",
  "correct_answer",
  "rationale",
  "difficulty",
  "tags",
  "course",
  "bloom_level",
  "topic",
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number];

/** Required target fields that must be mapped for import to proceed */
export const REQUIRED_TARGET_FIELDS: readonly ImportTargetField[] = [
  "stem",
  "answer_choice_a",
  "answer_choice_b",
  "answer_choice_c",
  "answer_choice_d",
  "correct_answer",
] as const;

/** A single column-to-field mapping */
export interface FieldMapping {
  /** Column name/index from the source file */
  readonly source_column: string;
  /** Target field in Journey OS schema */
  readonly target_field: ImportTargetField;
  /** Confidence score from auto-mapping (0.0-1.0), null if manually set */
  readonly confidence: number | null;
}

/** Complete mapping configuration for an import */
export interface ImportMappingConfig {
  /** All field mappings */
  readonly mappings: readonly FieldMapping[];
  /** Source columns that are not mapped (go to rawMetadata) */
  readonly unmapped_columns: readonly string[];
  /** Whether all required fields are mapped */
  readonly is_complete: boolean;
  /** Validation errors for incomplete mappings */
  readonly validation_errors: readonly string[];
}

/** Saved mapping preset for reuse */
export interface MappingPreset {
  readonly id: string;
  readonly user_id: string;
  readonly name: string;
  readonly description: string;
  readonly mappings: readonly FieldMapping[];
  readonly source_format: "csv" | "qti" | "text";
  readonly created_at: string;
  readonly updated_at: string;
}

/** Input for creating a mapping preset */
export interface MappingPresetCreateInput {
  readonly name: string;
  readonly description?: string;
  readonly mappings: readonly FieldMapping[];
  readonly source_format: "csv" | "qti" | "text";
}

/** Preview of parsed file data (first N rows) */
export interface ImportPreview {
  /** Detected file format */
  readonly format: "csv" | "qti" | "text";
  /** Column headers from the source file */
  readonly columns: readonly string[];
  /** First N rows of data as arrays of strings */
  readonly preview_rows: readonly (readonly string[])[];
  /** Total row count in the file */
  readonly total_rows: number;
  /** Auto-suggested field mappings based on column headers */
  readonly suggested_mappings: readonly FieldMapping[];
  /** File metadata */
  readonly file_info: {
    readonly filename: string;
    readonly size_bytes: number;
    readonly upload_id: string;
  };
}

/** Import confirmation summary before execution */
export interface ImportConfirmation {
  readonly upload_id: string;
  readonly filename: string;
  readonly format: "csv" | "qti" | "text";
  readonly total_rows: number;
  readonly mapped_fields: readonly FieldMapping[];
  readonly unmapped_columns: readonly string[];
  readonly validation_warnings: readonly string[];
  readonly estimated_duration_seconds: number;
}

/** Import job status (placeholder for STORY-F-57) */
export interface ImportJobStatus {
  readonly job_id: string;
  readonly status: "queued" | "processing" | "completed" | "failed";
  readonly progress_percent: number;
  readonly rows_processed: number;
  readonly rows_total: number;
  readonly errors: readonly string[];
  readonly created_at: string;
}

/** File upload response */
export interface FileUploadResponse {
  readonly upload_id: string;
  readonly filename: string;
  readonly size_bytes: number;
  readonly storage_path: string;
}
