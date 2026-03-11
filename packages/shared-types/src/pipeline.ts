// packages/shared-types/src/pipeline.ts
// Pipeline types shared between LangGraph.js backend and CopilotKit frontend.
// Source of truth for WorkbenchState — the AG-UI streaming contract.

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────────

export const GenerationModeSchema = z.enum(['single', 'bulk', 'review']);
export type GenerationMode = z.infer<typeof GenerationModeSchema>;

export const PipelineNodeSchema = z.enum([
  'init',
  'context_compiler',
  'vignette_builder',
  'stem_writer',
  'distractor_generator',
  'validator',
  'graph_writer',
]);
export type PipelineNode = z.infer<typeof PipelineNodeSchema>;

export const PipelineStatusSchema = z.enum(['idle', 'running', 'completed', 'failed']);
export type PipelineStatus = z.infer<typeof PipelineStatusSchema>;

// ── Pipeline Data Shapes ───────────────────────────────────────────────────────

export const GeneratedOptionSchema = z.object({
  label: z.string(),
  text: z.string(),
  is_correct: z.boolean(),
  rationale: z.string(),
  misconception_targeted: z.string().optional(),
});
export type GeneratedOption = z.infer<typeof GeneratedOptionSchema>;

export const ValidationResultSchema = z.object({
  rule: z.string(),
  passed: z.boolean(),
  message: z.string(),
});
export type ValidationResult = z.infer<typeof ValidationResultSchema>;

// ── WorkbenchState (AG-UI streaming contract) ──────────────────────────────────

export const WorkbenchStateSchema = z.object({
  mode: GenerationModeSchema,
  courseId: z.string(),
  userMessage: z.string(),
  targetConcepts: z.array(z.string()),
  context: z.string(),
  vignette: z.string(),
  stem: z.string(),
  options: z.array(GeneratedOptionSchema),
  validationResults: z.array(ValidationResultSchema),
  pipelineStatus: PipelineStatusSchema,
  generationLogId: z.string(),
  itemId: z.string(),
});
export type WorkbenchState = z.infer<typeof WorkbenchStateSchema>;

// ── Ingestion Types ────────────────────────────────────────────────────────────

export const ParsedDocumentSchema = z.object({
  markdown: z.string(),
  page_count: z.number().int(),
  extraction_method: z.enum(['llamaparse', 'pdfplumber', 'pdf-parse']),
  has_tables: z.boolean(),
  noise_ratio: z.number().optional(),
});
export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;

export const ContentChunkInputSchema = z.object({
  content: z.string(),
  chunk_index: z.number().int(),
  token_count: z.number().int(),
  source_type: z.enum(['syllabus', 'lecture_slide', 'textbook', 'other']),
  source_page: z.number().int().optional(),
  chunk_type: z.enum(['academic', 'noise', 'borderline']).optional(),
});
export type ContentChunkInput = z.infer<typeof ContentChunkInputSchema>;
