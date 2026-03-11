// packages/shared-types/src/api.ts
// Request/response types for all Phase 1 API endpoints.
// These define the contract between frontend TanStack Query hooks and Express controllers.

import { z } from 'zod';
import {
  CourseRowSchema,
  UploadRowSchema,
  ContentChunkRowSchema,
  AssessmentItemRowSchema,
  OptionRowSchema,
  GenerationLogRowSchema,
  ItemStatusSchema,
} from './database';

// ── Generic Response Wrappers ──────────────────────────────────────────────────

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number().int(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// ── Health ─────────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  neo4j: z.boolean(),
  supabase: z.boolean(),
  version: z.string(),
  timestamp: z.string(),
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// ── Courses ────────────────────────────────────────────────────────────────────

export const ListCoursesResponseSchema = z.object({
  data: z.array(CourseRowSchema),
  meta: PaginationMetaSchema,
});
export type ListCoursesResponse = z.infer<typeof ListCoursesResponseSchema>;

export const GetCourseResponseSchema = z.object({
  data: CourseRowSchema,
});
export type GetCourseResponse = z.infer<typeof GetCourseResponseSchema>;

// ── Uploads ────────────────────────────────────────────────────────────────────

export const CreateUploadRequestSchema = z.object({
  course_id: z.string().uuid(),
  original_filename: z.string(),
  mime_type: z.string(),
  file_size_bytes: z.number().int(),
});
export type CreateUploadRequest = z.infer<typeof CreateUploadRequestSchema>;

export const CreateUploadResponseSchema = z.object({
  data: UploadRowSchema,
  upload_url: z.string(),
});
export type CreateUploadResponse = z.infer<typeof CreateUploadResponseSchema>;

export const ListUploadsResponseSchema = z.object({
  data: z.array(UploadRowSchema),
  meta: PaginationMetaSchema,
});
export type ListUploadsResponse = z.infer<typeof ListUploadsResponseSchema>;

// ── Content Chunks ─────────────────────────────────────────────────────────────

export const ListChunksResponseSchema = z.object({
  data: z.array(ContentChunkRowSchema),
  meta: PaginationMetaSchema,
});
export type ListChunksResponse = z.infer<typeof ListChunksResponseSchema>;

export const GetChunkResponseSchema = z.object({
  data: ContentChunkRowSchema,
});
export type GetChunkResponse = z.infer<typeof GetChunkResponseSchema>;

// ── Assessment Items ───────────────────────────────────────────────────────────

export const ListItemsQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  status: ItemStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListItemsQuery = z.infer<typeof ListItemsQuerySchema>;

export const ItemWithOptionsSchema = AssessmentItemRowSchema.extend({
  options: z.array(OptionRowSchema),
});
export type ItemWithOptions = z.infer<typeof ItemWithOptionsSchema>;

export const ListItemsResponseSchema = z.object({
  data: z.array(ItemWithOptionsSchema),
  meta: PaginationMetaSchema,
});
export type ListItemsResponse = z.infer<typeof ListItemsResponseSchema>;

export const GetItemResponseSchema = z.object({
  data: ItemWithOptionsSchema,
});
export type GetItemResponse = z.infer<typeof GetItemResponseSchema>;

export const UpdateItemStatusRequestSchema = z.object({
  status: ItemStatusSchema,
});
export type UpdateItemStatusRequest = z.infer<typeof UpdateItemStatusRequestSchema>;

// ── Generation ─────────────────────────────────────────────────────────────────

export const GenerateRequestSchema = z.object({
  courseId: z.string().uuid(),
  message: z.string(),
  targetConcepts: z.array(z.string()).optional(),
});
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;

export const GenerationLogResponseSchema = z.object({
  data: GenerationLogRowSchema,
});
export type GenerationLogResponse = z.infer<typeof GenerationLogResponseSchema>;

// ── Generation History (P2-021) ───────────────────────────────────────────────

export const GenerationHistoryRowSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid().nullable(),
  courseName: z.string().nullable(),
  userMessage: z.string().nullable(),
  autoRoute: z.enum(['auto_approve', 'auto_reject', 'faculty_review']).nullable(),
  criticComposite: z.number().nullable(),
  retryCount: z.number().int(),
  durationMs: z.number().int().nullable(),
  costUsd: z.number().nullable(),
  createdAt: z.string(),
  itemStatus: z.enum(['approved', 'rejected', 'draft', 'pending_review', 'retired']).nullable(),
  itemId: z.string().uuid().nullable(),
});
export type GenerationHistoryRow = z.infer<typeof GenerationHistoryRowSchema>;

export const GenerationStatsSchema = z.object({
  period: z.literal('month'),
  totalGenerated: z.number().int(),
  totalApproved: z.number().int(),
  approvalRate: z.number(),
  avgCriticScore: z.number().nullable(),
  avgCostUsd: z.number().nullable(),
});
export type GenerationStats = z.infer<typeof GenerationStatsSchema>;

export const GenerationHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  courseId: z.string().uuid().optional(),
  autoRoute: z.enum(['auto_approve', 'auto_reject', 'faculty_review']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type GenerationHistoryQuery = z.infer<typeof GenerationHistoryQuerySchema>;

export const GenerationHistoryResponseSchema = z.object({
  data: z.array(GenerationHistoryRowSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  stats: GenerationStatsSchema,
});
export type GenerationHistoryResponse = z.infer<typeof GenerationHistoryResponseSchema>;
