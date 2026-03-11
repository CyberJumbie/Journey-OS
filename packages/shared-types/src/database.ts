// packages/shared-types/src/database.ts
// Types matching Supabase table schemas from Phase 1 migration (P1-004).
// Row types = what you SELECT. Insert types = what you INSERT (optional fields have defaults).

import { z } from 'zod';

// ── Shared Enums ───────────────────────────────────────────────────────────────

export const SyncStatusSchema = z.enum(['pending', 'synced', 'failed', 'orphaned']);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

export const ItemStatusSchema = z.enum(['draft', 'pending_review', 'approved', 'rejected', 'retired']);
export type ItemStatus = z.infer<typeof ItemStatusSchema>;

export const UploadStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export type UploadStatus = z.infer<typeof UploadStatusSchema>;

export const UserRoleSchema = z.enum(['faculty', 'institutional_admin', 'student', 'advisor', 'superadmin']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const SourceTypeSchema = z.enum(['syllabus', 'lecture_slide', 'textbook', 'other']);
export type SourceType = z.infer<typeof SourceTypeSchema>;

export const GenerationLogStatusSchema = z.enum(['running', 'completed', 'failed', 'cancelled']);
export type GenerationLogStatus = z.infer<typeof GenerationLogStatusSchema>;

// ── Institution ────────────────────────────────────────────────────────────────

export const InstitutionRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type InstitutionRow = z.infer<typeof InstitutionRowSchema>;

export const InstitutionInsertSchema = z.object({
  name: z.string(),
  slug: z.string(),
});
export type InstitutionInsert = z.infer<typeof InstitutionInsertSchema>;

// ── User Profile ───────────────────────────────────────────────────────────────

export const UserProfileRowSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid().nullable(),
  role: UserRoleSchema,
  display_name: z.string().nullable(),
  email: z.string().nullable(),
  is_course_director: z.boolean(),
  onboarding_completed: z.boolean(),
  onboarding_step: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type UserProfileRow = z.infer<typeof UserProfileRowSchema>;

export const UserProfileInsertSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid().optional(),
  role: UserRoleSchema,
  display_name: z.string().optional(),
  email: z.string().optional(),
  is_course_director: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
  onboarding_step: z.number().int().optional(),
});
export type UserProfileInsert = z.infer<typeof UserProfileInsertSchema>;

// ── Course ─────────────────────────────────────────────────────────────────────

export const CourseRowSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid().nullable(),
  code: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  academic_year: z.string().nullable(),
  phase: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type CourseRow = z.infer<typeof CourseRowSchema>;

export const CourseInsertSchema = z.object({
  institution_id: z.string().uuid().optional(),
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  academic_year: z.string().optional(),
  phase: z.string().optional(),
});
export type CourseInsert = z.infer<typeof CourseInsertSchema>;

// ── Upload ─────────────────────────────────────────────────────────────────────

export const UploadRowSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid().nullable(),
  course_id: z.string().uuid().nullable(),
  uploaded_by: z.string().uuid().nullable(),
  storage_path: z.string(),
  original_filename: z.string().nullable(),
  mime_type: z.string().nullable(),
  file_size_bytes: z.number().nullable(),
  status: UploadStatusSchema,
  created_at: z.string(),
});
export type UploadRow = z.infer<typeof UploadRowSchema>;

export const UploadInsertSchema = z.object({
  institution_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  uploaded_by: z.string().uuid().optional(),
  storage_path: z.string(),
  original_filename: z.string().optional(),
  mime_type: z.string().optional(),
  file_size_bytes: z.number().optional(),
});
export type UploadInsert = z.infer<typeof UploadInsertSchema>;

// ── Content Chunk ──────────────────────────────────────────────────────────────

export const ContentChunkRowSchema = z.object({
  id: z.string().uuid(),
  upload_id: z.string().uuid().nullable(),
  course_id: z.string().uuid().nullable(),
  institution_id: z.string().uuid().nullable(),
  chunk_index: z.number().int().nullable(),
  content: z.string().nullable(),
  token_count: z.number().int().nullable(),
  source_type: SourceTypeSchema.nullable(),
  source_page: z.number().int().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  neo4j_node_id: z.string().nullable(),
  sync_status: SyncStatusSchema,
  created_at: z.string(),
});
export type ContentChunkRow = z.infer<typeof ContentChunkRowSchema>;

export const ContentChunkInsertSchema = z.object({
  upload_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  institution_id: z.string().uuid().optional(),
  chunk_index: z.number().int().optional(),
  content: z.string().optional(),
  token_count: z.number().int().optional(),
  source_type: SourceTypeSchema.optional(),
  source_page: z.number().int().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ContentChunkInsert = z.infer<typeof ContentChunkInsertSchema>;

// ── Assessment Item ────────────────────────────────────────────────────────────

export const AssessmentItemRowSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid().nullable(),
  course_id: z.string().uuid().nullable(),
  created_by: z.string().uuid().nullable(),
  vignette: z.string().nullable(),
  stem: z.string().nullable(),
  explanation: z.string().nullable(),
  bloom_level: z.number().int().nullable(),
  usmle_system: z.string().nullable(),
  usmle_discipline: z.string().nullable(),
  difficulty_estimate: z.number().nullable(),
  status: ItemStatusSchema,
  toulmin: z.record(z.unknown()).nullable(),
  generation_log_id: z.string().uuid().nullable(),
  neo4j_node_id: z.string().nullable(),
  sync_status: SyncStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type AssessmentItemRow = z.infer<typeof AssessmentItemRowSchema>;

export const AssessmentItemInsertSchema = z.object({
  institution_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(),
  vignette: z.string().optional(),
  stem: z.string().optional(),
  explanation: z.string().optional(),
  bloom_level: z.number().int().optional(),
  usmle_system: z.string().optional(),
  usmle_discipline: z.string().optional(),
  difficulty_estimate: z.number().optional(),
  status: ItemStatusSchema.optional(),
  toulmin: z.record(z.unknown()).optional(),
  generation_log_id: z.string().uuid().optional(),
});
export type AssessmentItemInsert = z.infer<typeof AssessmentItemInsertSchema>;

// ── Option ─────────────────────────────────────────────────────────────────────

export const OptionRowSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid().nullable(),
  label: z.string(),
  option_text: z.string().nullable(),
  is_correct: z.boolean(),
  distractor_rationale: z.string().nullable(),
  misconception_targeted: z.string().nullable(),
  created_at: z.string(),
});
export type OptionRow = z.infer<typeof OptionRowSchema>;

export const OptionInsertSchema = z.object({
  item_id: z.string().uuid(),
  label: z.string(),
  option_text: z.string().optional(),
  is_correct: z.boolean().optional(),
  distractor_rationale: z.string().optional(),
  misconception_targeted: z.string().optional(),
});
export type OptionInsert = z.infer<typeof OptionInsertSchema>;

// ── Generation Log ─────────────────────────────────────────────────────────────

export const GenerationLogRowSchema = z.object({
  id: z.string().uuid(),
  institution_id: z.string().uuid().nullable(),
  course_id: z.string().uuid().nullable(),
  user_id: z.string().uuid().nullable(),
  mode: z.enum(['single', 'bulk', 'review']).nullable(),
  input_message: z.string().nullable(),
  pipeline_state: z.record(z.unknown()).nullable(),
  model_calls: z.record(z.unknown()).nullable(),
  total_tokens_in: z.number().int().nullable(),
  total_tokens_out: z.number().int().nullable(),
  total_cost_usd: z.number().nullable(),
  duration_ms: z.number().int().nullable(),
  status: GenerationLogStatusSchema,
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type GenerationLogRow = z.infer<typeof GenerationLogRowSchema>;

export const GenerationLogInsertSchema = z.object({
  institution_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  mode: z.enum(['single', 'bulk', 'review']).optional(),
  input_message: z.string().optional(),
});
export type GenerationLogInsert = z.infer<typeof GenerationLogInsertSchema>;

// ── Bulk Batch ────────────────────────────────────────────────────────────────

export const BulkBatchStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type BulkBatchStatus = z.infer<typeof BulkBatchStatusSchema>;

export const BulkBatchRowSchema = z.object({
  id: z.string().uuid(),
  course_id: z.string().uuid(),
  user_id: z.string().uuid(),
  total_count: z.number().int(),
  completed_count: z.number().int(),
  failed_count: z.number().int(),
  status: BulkBatchStatusSchema,
  estimated_cost: z.number().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
});
export type BulkBatchRow = z.infer<typeof BulkBatchRowSchema>;

export const BulkBatchItemStatusSchema = z.enum(['pending', 'running', 'completed', 'failed']);
export type BulkBatchItemStatus = z.infer<typeof BulkBatchItemStatusSchema>;

export const BulkBatchItemRowSchema = z.object({
  id: z.string().uuid(),
  batch_id: z.string().uuid(),
  item_id: z.string().uuid().nullable(),
  status: BulkBatchItemStatusSchema,
  error_message: z.string().nullable(),
  created_at: z.string(),
});
export type BulkBatchItemRow = z.infer<typeof BulkBatchItemRowSchema>;
