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
  'dedup_detector',
  'validator',
  'graph_writer',
  'critic_agent',
  'tagger',
  'toulmin_generator',
  'review_router',
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

// ── Phase 2 Data Shapes ──────────────────────────────────────────────────────

export const CriticMetricSchema = z.enum([
  'clinical_accuracy',
  'vignette_realism',
  'distractor_quality',
  'bloom_alignment',
  'nbme_compliance',
  'educational_value',
]);
export type CriticMetric = z.infer<typeof CriticMetricSchema>;

export const CriticScoreSchema = z.object({
  metric: CriticMetricSchema,
  score: z.number().min(1).max(5),
});
export type CriticScore = z.infer<typeof CriticScoreSchema>;

export const ItemTagsSchema = z.object({
  bloom_level: z.number().int().min(1).max(6),
  usmle_system: z.string(),
  usmle_discipline: z.string(),
  difficulty: z.number().int().min(1).max(5),
  acgme_domain: z.string().nullable(),
  epa_number: z.string().nullable(),
});
export type ItemTags = z.infer<typeof ItemTagsSchema>;

export const ToulminArgumentSchema = z.object({
  claim: z.string(),
  data: z.string(),
  warrant: z.string(),
  backing: z.string(),
  rebuttal: z.string(),
  qualifier: z.string(),
});
export type ToulminArgument = z.infer<typeof ToulminArgumentSchema>;

export const AutoRouteSchema = z.enum(['auto_approve', 'auto_reject', 'faculty_review']);
export type AutoRoute = z.infer<typeof AutoRouteSchema>;

// ── WorkbenchState (AG-UI streaming contract) ──────────────────────────────────

export const WorkbenchStateSchema = z.object({
  // Phase 1 fields
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
  sourceChunkIds: z.array(z.string()),

  // Phase 2 fields
  tags: ItemTagsSchema.nullable(),
  criticScores: z.array(CriticScoreSchema).nullable(),
  criticComposite: z.number().nullable(),
  toulmin: ToulminArgumentSchema.nullable(),
  autoRoute: AutoRouteSchema.nullable(),
  retryCount: z.number().int(),
  isDuplicate: z.boolean(),
  dupSimilarity: z.number().nullable(),
  dupItemId: z.string().nullable(),
  taskShellId: z.string().nullable(),
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
