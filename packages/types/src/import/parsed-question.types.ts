/**
 * Format-agnostic parsed question output.
 * All three parsers (CSV, QTI, text) produce this same shape.
 * Downstream pipeline (STORY-F-57) consumes only this type.
 *
 * Fields map to assessment_items table columns:
 *   stem -> assessment_items.stem
 *   vignette -> assessment_items.vignette
 *   options -> options table rows
 *   bloomLevel -> assessment_items.bloom_level
 *   difficulty -> assessment_items.difficulty
 */
export interface ParsedQuestionOption {
  /** Answer choice letter (A-E) */
  readonly letter: string;
  /** Answer choice text */
  readonly text: string;
  /** Whether this is the correct answer */
  readonly correct: boolean;
}

export interface ParsedQuestion {
  /** 1-based index of this question in the source file */
  readonly sourceIndex: number;
  /** Line number or XML path in original file (for error reporting) */
  readonly sourceLocation: string;
  /** Clinical vignette / lead-in text (may be empty for simple formats) */
  readonly vignette: string;
  /** Question stem */
  readonly stem: string;
  /** Answer options (typically 4-5) */
  readonly options: readonly ParsedQuestionOption[];
  /** Correct answer letter (e.g., "C") — derived from options for quick access */
  readonly correctAnswer: string;
  /** Bloom level if available in source (1-6), null if not specified */
  readonly bloomLevel: number | null;
  /** Difficulty rating if available in source, null if not specified */
  readonly difficulty: number | null;
  /** Topic/category/tag from source system, null if not specified */
  readonly topic: string | null;
  /** Explanation or rationale from source, null if not provided */
  readonly explanation: string | null;
  /** Raw metadata from the source format (column values, XML attributes, etc.) */
  readonly rawMetadata: Record<string, unknown>;
}
