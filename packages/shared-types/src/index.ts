// @journey-os/shared-types
// Source of truth for all TypeScript interfaces shared between frontend and backend

export type SyncStatus = 'pending' | 'synced' | 'failed' | 'orphaned';
export type ItemStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'retired';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type GenerationMode = 'single' | 'bulk' | 'review';
export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed';
export type UserRole = 'faculty' | 'institutional_admin' | 'student' | 'advisor' | 'superadmin';

export interface WorkbenchState {
  mode: GenerationMode;
  courseId: string;
  userMessage: string;
  targetConcepts: string[];
  context: string;
  vignette: string;
  stem: string;
  options: GeneratedOption[];
  validationResults: ValidationResult[];
  pipelineStatus: PipelineStatus;
  generationLogId: string;
  itemId: string;
}

export interface GeneratedOption {
  label: string;
  text: string;
  is_correct: boolean;
  rationale: string;
  misconception_targeted?: string;
}

export interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
}

export interface ParsedDocument {
  markdown: string;
  page_count: number;
  extraction_method: 'llamaparse' | 'pdfplumber' | 'pdf-parse';
  has_tables: boolean;
  noise_ratio?: number;
}

export interface ContentChunkInput {
  content: string;
  chunk_index: number;
  token_count: number;
  source_type: 'syllabus' | 'lecture_slide' | 'textbook' | 'other';
  source_page?: number;
  chunk_type?: 'academic' | 'noise' | 'borderline';
}
