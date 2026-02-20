# STORY-F-57 Brief: Import Pipeline

## 0. Lane & Priority

```yaml
story_id: STORY-F-57
old_id: S-F-24-3
lane: faculty
lane_priority: 3
within_lane_order: 57
sprint: 17
size: L
depends_on:
  - STORY-F-3 (faculty) — File parsers exist
  - STORY-F-54 (faculty) — Auto-Tagging Service exists
blocks: []
personas_served: [faculty]
epic: E-24 (Legacy Import Pipeline)
feature: F-11 (Content Import)
```

## 1. Summary

Build an **end-to-end import pipeline** that processes legacy questions through 5 stages: parse, validate, auto-tag, embed, and dual-write. The parse stage applies field mappings to convert raw data to `ParsedQuestion[]`. The validate stage runs the validation engine (STORY-F-48). The auto-tag stage applies framework, Bloom, and difficulty tagging (STORY-F-54). The embed stage generates 1024-dim Voyage AI embeddings. The dual-write stage persists to both Supabase `questions` table and Neo4j `Question` nodes with relationships. Batch processing uses Inngest for async handling of large imports. Progress is tracked per-item with SSE updates. Failed items are logged with reasons while successful items are committed. An import report is generated on completion with accepted/rejected/skipped counts. Imported questions enter as `draft` status and still go through the critic/review pipeline.

Key constraints:
- Reuses validation engine (STORY-F-48) and auto-tagging (STORY-F-54) -- DRY
- 1024-dim Voyage AI embeddings, batch API (up to 128 texts per call)
- DualWriteService: Supabase first, Neo4j second, sync_status = 'synced'
- Neo4j: `(Question)-[:IMPORTED_FROM]->(ImportJob)`, `(Question)-[:IN_COURSE]->(Course)`
- Inngest function for async batch processing
- SSE progress per-item
- Custom error classes: `ImportPipelineError`, `ImportItemError`
- OOP with JS `#private` fields, constructor DI

## 2. Task Breakdown

1. **Types** -- Create `ImportJob`, `ImportItem`, `ImportStage`, `ImportReport`, `ParsedQuestion` in `packages/types/src/import/`
2. **Error classes** -- `ImportPipelineError`, `ImportItemError` in `apps/server/src/errors/import-pipeline.errors.ts`
3. **Import job model** -- `ImportJobModel` in `apps/server/src/models/import-job.model.ts`
4. **Import job repository** -- `ImportJobRepository` for job and item persistence
5. **Import pipeline service** -- `ImportPipelineService` orchestrates the 5-stage pipeline per item
6. **Import orchestrator** -- `ImportOrchestratorService` manages batch processing, progress, reporting
7. **Inngest function** -- `import-pipeline.fn.ts` for async batch processing
8. **API tests** -- 12-18 tests covering full pipeline, each stage, partial failure, batch, dual-write
9. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/import/pipeline.types.ts

/** Import job status */
export type ImportJobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

/** Import item status */
export type ImportItemStatus = "pending" | "parsing" | "validating" | "tagging" | "embedding" | "writing" | "accepted" | "rejected" | "skipped" | "error";

/** Import pipeline stage */
export type ImportStage = "parse" | "validate" | "auto_tag" | "embed" | "dual_write";

/** Import job record */
export interface ImportJob {
  readonly id: string;
  readonly user_id: string;
  readonly institution_id: string;
  readonly course_id: string;
  readonly file_name: string;
  readonly file_type: string;
  readonly total_items: number;
  readonly accepted_count: number;
  readonly rejected_count: number;
  readonly skipped_count: number;
  readonly error_count: number;
  readonly status: ImportJobStatus;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly created_at: string;
}

/** Import item record (per question) */
export interface ImportItem {
  readonly id: string;
  readonly job_id: string;
  readonly item_index: number;
  readonly raw_data: Record<string, unknown>;
  readonly parsed_question: ParsedQuestion | null;
  readonly status: ImportItemStatus;
  readonly current_stage: ImportStage | null;
  readonly validation_errors: readonly string[];
  readonly error_message: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Parsed question from import source */
export interface ParsedQuestion {
  readonly vignette: string;
  readonly stem: string;
  readonly options: readonly { key: string; text: string }[];
  readonly correct_answer: string;
  readonly rationale: string;
  readonly source_metadata: Record<string, unknown>;
}

/** Import report generated on completion */
export interface ImportReport {
  readonly job_id: string;
  readonly total_items: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly skipped: number;
  readonly errors: number;
  readonly duration_ms: number;
  readonly stage_breakdown: readonly StageBreakdown[];
  readonly rejected_items: readonly RejectedItemSummary[];
  readonly generated_at: string;
}

/** Per-stage timing and counts */
export interface StageBreakdown {
  readonly stage: ImportStage;
  readonly processed: number;
  readonly passed: number;
  readonly failed: number;
  readonly avg_duration_ms: number;
}

/** Summary of a rejected item */
export interface RejectedItemSummary {
  readonly item_index: number;
  readonly reason: string;
  readonly stage: ImportStage;
  readonly validation_errors: readonly string[];
}

/** Import progress event (sent via SSE) */
export interface ImportProgressEvent {
  readonly job_id: string;
  readonly item_index: number;
  readonly total_items: number;
  readonly current_stage: ImportStage;
  readonly status: ImportItemStatus;
  readonly percentage: number;
}

/** Field mapping for source format conversion */
export interface FieldMapping {
  readonly source_field: string;
  readonly target_field: string;
  readonly transform: string | null; // e.g., "split_options", "trim", "parse_html"
}

/** Import configuration */
export interface ImportConfig {
  readonly field_mappings: readonly FieldMapping[];
  readonly skip_validation: boolean;
  readonly skip_dedup: boolean;
  readonly default_course_id: string;
  readonly default_bloom_level: string | null;
  readonly default_difficulty: string | null;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_import_tables

CREATE TABLE import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE import_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  parsed_question JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsing', 'validating', 'tagging', 'embedding', 'writing', 'accepted', 'rejected', 'skipped', 'error')),
  current_stage TEXT,
  validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  question_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, item_index)
);

-- Indexes
CREATE INDEX idx_import_jobs_user_id ON import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON import_jobs(status);
CREATE INDEX idx_import_items_job_id ON import_items(job_id);
CREATE INDEX idx_import_items_status ON import_items(status);

-- RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import jobs"
  ON import_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create import jobs"
  ON import_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view items for own jobs"
  ON import_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM import_jobs j
      WHERE j.id = import_items.job_id
      AND j.user_id = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/import/jobs (Auth: faculty)

Creates an import job and starts processing.

**Request Body (multipart/form-data):**
```
file: <uploaded file>
course_id: "course-uuid-1"
config: { "field_mappings": [...], "skip_validation": false, "skip_dedup": false }
```

**Success Response (201):**
```json
{
  "data": {
    "id": "job-uuid-1",
    "user_id": "faculty-uuid-1",
    "institution_id": "inst-uuid-1",
    "course_id": "course-uuid-1",
    "file_name": "legacy_questions.csv",
    "file_type": "text/csv",
    "total_items": 50,
    "accepted_count": 0,
    "rejected_count": 0,
    "skipped_count": 0,
    "error_count": 0,
    "status": "pending",
    "started_at": null,
    "completed_at": null,
    "created_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/import/jobs/:jobId (Auth: faculty, owner)

Get import job status and counts.

**Success Response (200):**
```json
{
  "data": {
    "id": "job-uuid-1",
    "status": "processing",
    "total_items": 50,
    "accepted_count": 30,
    "rejected_count": 5,
    "skipped_count": 2,
    "error_count": 3,
    "started_at": "2026-02-19T10:00:05Z",
    "completed_at": null
  },
  "error": null
}
```

### GET /api/v1/import/jobs/:jobId/progress (Auth: faculty, owner) -- SSE

Server-Sent Events stream for real-time progress.

**SSE Events:**
```
event: progress
data: {"job_id":"job-uuid-1","item_index":15,"total_items":50,"current_stage":"validate","status":"validating","percentage":30}

event: item_complete
data: {"job_id":"job-uuid-1","item_index":15,"status":"accepted"}

event: item_error
data: {"job_id":"job-uuid-1","item_index":16,"status":"rejected","error":"Validation failed: stem contains negation"}

event: complete
data: {"job_id":"job-uuid-1","status":"completed","accepted":42,"rejected":5,"skipped":0,"errors":3}
```

### GET /api/v1/import/jobs/:jobId/report (Auth: faculty, owner)

Get the final import report.

**Success Response (200):**
```json
{
  "data": {
    "job_id": "job-uuid-1",
    "total_items": 50,
    "accepted": 42,
    "rejected": 5,
    "skipped": 0,
    "errors": 3,
    "duration_ms": 45000,
    "stage_breakdown": [
      { "stage": "parse", "processed": 50, "passed": 50, "failed": 0, "avg_duration_ms": 10 },
      { "stage": "validate", "processed": 50, "passed": 47, "failed": 3, "avg_duration_ms": 50 },
      { "stage": "auto_tag", "processed": 47, "passed": 45, "failed": 2, "avg_duration_ms": 200 },
      { "stage": "embed", "processed": 45, "passed": 45, "failed": 0, "avg_duration_ms": 100 },
      { "stage": "dual_write", "processed": 45, "passed": 42, "failed": 3, "avg_duration_ms": 80 }
    ],
    "rejected_items": [
      { "item_index": 5, "reason": "Validation error: stem clarity", "stage": "validate", "validation_errors": ["nbme_stem_clarity"] }
    ],
    "generated_at": "2026-02-19T10:00:50Z"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not job owner |
| 404 | `NOT_FOUND` | Job not found |
| 413 | `PAYLOAD_TOO_LARGE` | File exceeds size limit |
| 500 | `IMPORT_PIPELINE_ERROR` | Pipeline failure |

## 6. Frontend Spec

No frontend components in this story. The import UI is a separate story. This story focuses on the server-side pipeline and API endpoints.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/import/pipeline.types.ts` | Types | Create |
| 2 | `packages/types/src/import/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add import export) |
| 4 | `apps/server/src/errors/import-pipeline.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 6 | Supabase migration: `import_jobs` and `import_items` tables | Database | Apply via MCP |
| 7 | `apps/server/src/models/import-job.model.ts` | Model | Create |
| 8 | `apps/server/src/repositories/import-job.repository.ts` | Repository | Create |
| 9 | `apps/server/src/services/import/import-pipeline.service.ts` | Service | Create |
| 10 | `apps/server/src/services/import/import-orchestrator.service.ts` | Service | Create |
| 11 | `apps/server/src/inngest/functions/import-pipeline.fn.ts` | Inngest | Create |
| 12 | `apps/server/src/controllers/import.controller.ts` | Controller | Create |
| 13 | `apps/server/src/routes/import.routes.ts` | Routes | Create |
| 14 | `apps/server/src/__tests__/import/import-pipeline.test.ts` | Tests | Create |
| 15 | `apps/server/src/__tests__/import/import-orchestrator.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-3 | faculty | Pending | File parsers for CSV, XLSX, QTI formats |
| STORY-F-54 | faculty | Pending | Auto-tagging service for framework, Bloom, difficulty |
| STORY-F-48 | faculty | Pending | Validation engine for question validation |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |
| STORY-U-7 | universal | **DONE** | USMLE seed data for tagging targets |

### NPM Packages (to install)
- `inngest` -- Inngest SDK for async job processing (may already be installed)
- `voyageai` -- Voyage AI SDK for embedding generation (or use existing HTTP client)

### Existing Files Needed
- `apps/server/src/services/validation/validation-engine.service.ts` -- Validation (from STORY-F-48)
- `apps/server/src/services/validation/auto-tagging.service.ts` -- Auto-tagging (from STORY-F-54)
- `apps/server/src/services/import/` -- File parsers (from STORY-F-3)
- `apps/server/src/config/supabase.config.ts` -- Supabase client
- `apps/server/src/config/neo4j.config.ts` -- Neo4j client for dual-write
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class

## 9. Test Fixtures (inline)

```typescript
import type { ImportJob, ImportItem, ImportReport, ParsedQuestion, ImportConfig } from "@journey-os/types";

// Mock import config
export const DEFAULT_IMPORT_CONFIG: ImportConfig = {
  field_mappings: [
    { source_field: "question_text", target_field: "stem", transform: "trim" },
    { source_field: "scenario", target_field: "vignette", transform: "trim" },
    { source_field: "answer_choices", target_field: "options", transform: "split_options" },
    { source_field: "correct", target_field: "correct_answer", transform: null },
    { source_field: "explanation", target_field: "rationale", transform: "trim" },
  ],
  skip_validation: false,
  skip_dedup: false,
  default_course_id: "course-uuid-1",
  default_bloom_level: null,
  default_difficulty: null,
};

// Mock raw imported data
export const RAW_IMPORT_ROW = {
  question_text: "Which of the following is the most appropriate treatment?",
  scenario: "A 45-year-old male presents with acute chest pain radiating to the left arm.",
  answer_choices: "A. Aspirin and PCI|B. CT scan|C. Antibiotics|D. Follow-up|E. Observation",
  correct: "A",
  explanation: "STEMI requires immediate intervention with aspirin and primary PCI.",
};

// Mock parsed question
export const PARSED_QUESTION: ParsedQuestion = {
  vignette: "A 45-year-old male presents with acute chest pain radiating to the left arm.",
  stem: "Which of the following is the most appropriate treatment?",
  options: [
    { key: "A", text: "Aspirin and PCI" },
    { key: "B", text: "CT scan" },
    { key: "C", text: "Antibiotics" },
    { key: "D", text: "Follow-up" },
    { key: "E", text: "Observation" },
  ],
  correct_answer: "A",
  rationale: "STEMI requires immediate intervention with aspirin and primary PCI.",
  source_metadata: { row_number: 1, file: "legacy_questions.csv" },
};

// Mock import job
export const MOCK_IMPORT_JOB: ImportJob = {
  id: "job-uuid-1",
  user_id: "faculty-uuid-1",
  institution_id: "inst-uuid-1",
  course_id: "course-uuid-1",
  file_name: "legacy_questions.csv",
  file_type: "text/csv",
  total_items: 50,
  accepted_count: 0,
  rejected_count: 0,
  skipped_count: 0,
  error_count: 0,
  status: "pending",
  started_at: null,
  completed_at: null,
  created_at: "2026-02-19T10:00:00Z",
};

// Mock completed job
export const COMPLETED_IMPORT_JOB: ImportJob = {
  ...MOCK_IMPORT_JOB,
  status: "completed",
  accepted_count: 42,
  rejected_count: 5,
  skipped_count: 0,
  error_count: 3,
  started_at: "2026-02-19T10:00:05Z",
  completed_at: "2026-02-19T10:00:50Z",
};

// Mock import item
export const ACCEPTED_ITEM: ImportItem = {
  id: "item-uuid-1",
  job_id: "job-uuid-1",
  item_index: 0,
  raw_data: RAW_IMPORT_ROW,
  parsed_question: PARSED_QUESTION,
  status: "accepted",
  current_stage: null,
  validation_errors: [],
  error_message: null,
  created_at: "2026-02-19T10:00:05Z",
  updated_at: "2026-02-19T10:00:10Z",
};

export const REJECTED_ITEM: ImportItem = {
  id: "item-uuid-2",
  job_id: "job-uuid-1",
  item_index: 5,
  raw_data: { question_text: "Bad question", scenario: "" },
  parsed_question: null,
  status: "rejected",
  current_stage: "validate",
  validation_errors: ["nbme_stem_clarity", "ext_vignette_relevance"],
  error_message: "Validation failed: 2 errors",
  created_at: "2026-02-19T10:00:05Z",
  updated_at: "2026-02-19T10:00:08Z",
};

// Mock import report
export const MOCK_IMPORT_REPORT: ImportReport = {
  job_id: "job-uuid-1",
  total_items: 50,
  accepted: 42,
  rejected: 5,
  skipped: 0,
  errors: 3,
  duration_ms: 45000,
  stage_breakdown: [
    { stage: "parse", processed: 50, passed: 50, failed: 0, avg_duration_ms: 10 },
    { stage: "validate", processed: 50, passed: 47, failed: 3, avg_duration_ms: 50 },
    { stage: "auto_tag", processed: 47, passed: 45, failed: 2, avg_duration_ms: 200 },
    { stage: "embed", processed: 45, passed: 45, failed: 0, avg_duration_ms: 100 },
    { stage: "dual_write", processed: 45, passed: 42, failed: 3, avg_duration_ms: 80 },
  ],
  rejected_items: [
    { item_index: 5, reason: "Validation error", stage: "validate", validation_errors: ["nbme_stem_clarity"] },
  ],
  generated_at: "2026-02-19T10:00:50Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/import/import-pipeline.test.ts`

```
describe("ImportPipelineService")
  describe("processItem")
    > processes a valid item through all 5 stages successfully
    > marks item as rejected when validation fails
    > marks item as error when parse fails
    > marks item as rejected when auto-tag fails with low confidence
    > generates 1024-dim embedding via Voyage AI
    > dual-writes to Supabase and Neo4j with sync_status synced
    > sets sync_status to supabase_only when Neo4j write fails
    > creates IMPORTED_FROM and IN_COURSE relationships in Neo4j
    > imported questions enter with draft status

  describe("batch embedding")
    > batches up to 128 texts per Voyage AI call
    > handles partial batch on final group
```

**File:** `apps/server/src/__tests__/import/import-orchestrator.test.ts`

```
describe("ImportOrchestratorService")
  describe("processJob")
    > processes all items in a job sequentially
    > updates job counts (accepted, rejected, skipped, error) during processing
    > generates import report on completion
    > marks job as completed when all items processed
    > marks job as failed when critical error occurs
    > emits SSE progress events per item
    > handles partial failure (some items fail, others succeed)
    > logs failed items with reason in import report

  describe("report generation")
    > includes stage breakdown with timing
    > includes rejected item summaries
```

**Total: ~20 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The import pipeline is a server-side service. E2E coverage will be added with the import UI story.

## 12. Acceptance Criteria

1. Pipeline stages execute in order: parse, validate, auto-tag, embed, dual-write
2. Parse applies field mappings to convert raw data to `ParsedQuestion[]`
3. Validate runs validation engine (STORY-F-48) on each parsed question
4. Auto-tag applies framework, Bloom, difficulty tagging (STORY-F-54)
5. Embed generates 1024-dim Voyage AI embeddings (batch up to 128 per call)
6. Dual-write persists to Supabase `questions` + Neo4j `Question` node with relationships
7. Inngest function handles async batch processing
8. SSE progress tracking per item
9. Failed items logged with reason; successful items committed
10. Import report generated with accepted/rejected/skipped/error counts and stage breakdown
11. Imported questions enter as `draft` status
12. `ImportPipelineError` and `ImportItemError` extend `JourneyOSError`
13. All 20 API tests pass
14. TypeScript strict, named exports only, OOP with constructor DI and JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| 5 pipeline stages | S-F-24-3 Acceptance Criteria |
| Reuse validation and auto-tagging | S-F-24-3 Notes: "reuses validation engine and auto-tagging from E-21" |
| Voyage AI batch 128 texts | S-F-24-3 Notes: "batch API call to Voyage AI for efficiency (up to 128 texts per call)" |
| DualWriteService pattern | S-F-24-3 Notes: "Supabase first, Neo4j second, sync_status = synced" |
| Neo4j relationships | S-F-24-3 Notes: "(Question)-[:IMPORTED_FROM]->(ImportJob), (Question)-[:IN_COURSE]->(Course)" |
| Inngest for async | S-F-24-3 Acceptance Criteria: "Inngest function for async processing" |
| SSE progress | S-F-24-3 Acceptance Criteria: "per-item status with SSE updates" |
| Draft status for imports | S-F-24-3 Notes: "enter as draft status -- still go through critic/review pipeline" |
| 1024-dim embeddings | CLAUDE.md Architecture Rules |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions`, `courses`, `profiles`, `institutions` tables exist
- **Neo4j:** Running with USMLE seed data and course nodes
- **Express:** Server running on port 3001
- **Inngest:** Inngest dev server running (`npx inngest-cli dev`)
- **Voyage AI API key:** `VOYAGE_API_KEY` env var configured
- **Anthropic API key:** For LLM classification in auto-tagging
- **File parsers:** STORY-F-3 implemented (CSV, XLSX, QTI parsers)

## 15. Implementation Notes

- **ImportPipelineService:** OOP class with `#validationEngine`, `#autoTaggingService`, `#voyageClient`, `#supabaseClient`, `#neo4jClient` injected via constructor DI. `processItem(item, config)` method runs 5 stages sequentially, updating item status at each stage. Returns processed item with final status.
- **ImportOrchestratorService:** OOP class with `#pipelineService`, `#importJobRepo`, `#sseEmitter` injected via constructor. `processJob(jobId)` loads all items, iterates through pipeline, updates counters, emits progress, generates report.
- **Inngest function:** Registered as `import/pipeline.process`. Triggered when import job is created. Calls `orchestrator.processJob(jobId)`. Uses Inngest step functions for retryability.
- **Embedding batch:** Accumulate question texts until batch reaches 128 or end of items. Call Voyage AI `/embeddings` endpoint with batch. Map results back to individual items. Use `voyage-3-large` model for 1024-dim vectors.
- **Dual-write for imports:** (1) Insert into Supabase `questions` with `status: 'draft'`, `source: 'import'`, `import_job_id`. (2) Create Neo4j `Question` node with properties. (3) Create `(Question)-[:IMPORTED_FROM]->(ImportJob)` and `(Question)-[:IN_COURSE]->(Course)` relationships. (4) Update `import_items.question_id` with created question UUID.
- **SSE progress:** Use existing SSE infrastructure. Endpoint `/api/v1/import/jobs/:jobId/progress`. Emit `progress`, `item_complete`, `item_error`, `complete` events.
- **Error isolation:** Each item is processed independently. If one item fails, others continue. Use try/catch per item. Track error in `import_items` table.
- **vi.hoisted() for mocks:** Supabase, Neo4j, Voyage AI, and Inngest mocks must use `vi.hoisted()`.
- **No default exports:** All services, repositories, models, types, and error classes use named exports only.
