# STORY-F-39 Brief: Inngest Batch Pipeline

## 0. Lane & Priority

```yaml
story_id: STORY-F-39
old_id: S-F-20-1
lane: faculty
lane_priority: 3
within_lane_order: 39
sprint: 14
size: L
depends_on:
  - STORY-F-33 (faculty) — Pipeline Scaffold (generation pipeline must exist)
blocks:
  - STORY-F-45 — Batch Configuration Form
  - STORY-F-46 — Batch Progress UI
  - STORY-F-47 — Batch Controls
personas_served: [faculty]
epic: E-20 (Bulk Generation)
feature: F-09 (AI Generation)
user_flow: UF-20 (Bulk Generation)
```

## 1. Summary

Build an **Inngest-powered batch generation pipeline** that enables faculty to generate large numbers of questions in parallel with configurable concurrency control. The orchestrator function `batch.generate` accepts a batch config, fans out N `batch.item.generate` events (each invoking the LangGraph.js pipeline independently), tracks progress in a `batch_jobs` table, retries failed items up to 2 times, enforces LLM rate limits with a token bucket pattern, and fires a `batch.complete` event when finished.

Key constraints:
- **Inngest fan-out pattern** — orchestrator emits N item events, each processed independently
- Concurrency managed via Inngest's `concurrency` option (default: 5 simultaneous)
- Batch status transitions: `pending` -> `running` -> `completed` | `completed_with_errors` | `failed`
- Idempotency: re-running a batch skips already-completed items
- Custom error classes: `BatchPipelineError`, `BatchItemError`, `ConcurrencyLimitError`
- Each generated item still goes through validation and critic pipelines

## 2. Task Breakdown

1. **Types** — Create `BatchJob`, `BatchItem`, `BatchConfig`, `BatchStatus`, `BatchItemStatus`, `BatchEvent` in `packages/types/src/generation/batch.types.ts`
2. **Error classes** — `BatchPipelineError`, `BatchItemError`, `ConcurrencyLimitError` in `apps/server/src/errors/batch.errors.ts`
3. **Model** — `BatchJobModel` with field mapping and validation in `apps/server/src/models/batch-job.model.ts`
4. **Repository** — `BatchJobRepository` with CRUD for `batch_jobs` and `batch_items` tables in `apps/server/src/repositories/batch-job.repository.ts`
5. **Inngest Events** — `batch.generate`, `batch.item.generate`, `batch.item.complete`, `batch.item.failed`, `batch.complete` event schemas in `apps/server/src/inngest/events/batch.events.ts`
6. **Inngest Functions** — `batchGenerate` orchestrator and `batchItemGenerate` worker in `apps/server/src/inngest/functions/`
7. **Batch Pipeline Service** — `BatchPipelineService` with `createBatch()`, `getBatchStatus()`, `retryFailedItems()` methods
8. **Batch Orchestrator Service** — `BatchOrchestratorService` with token bucket rate limiting and concurrency coordination
9. **Migration** — `batch_jobs` and `batch_items` tables via Supabase MCP
10. **API tests** — 14 tests covering batch creation, concurrency, retry, completion, idempotency, rate limiting

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/batch.types.ts

/** Batch job status transitions */
export type BatchStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "completed_with_errors"
  | "failed"
  | "cancelled";

/** Individual batch item status */
export type BatchItemStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

/** Batch job configuration */
export interface BatchConfig {
  readonly targetCount: number;          // 1-100
  readonly courseId: string;
  readonly conceptScope: string[];       // Concept IDs or "all"
  readonly sloScope: string[];           // SLO IDs or "all"
  readonly questionType: string;
  readonly difficultyDistribution: DifficultyDistribution;
  readonly bloomLevels?: string[];
  readonly concurrencyLimit?: number;    // Default: 5
  readonly templateId?: string;
}

/** Difficulty distribution (must sum to 100) */
export interface DifficultyDistribution {
  readonly easy: number;
  readonly medium: number;
  readonly hard: number;
}

/** Batch job record */
export interface BatchJob {
  readonly id: string;
  readonly userId: string;
  readonly institutionId: string;
  readonly courseId: string;
  readonly config: BatchConfig;
  readonly status: BatchStatus;
  readonly totalItems: number;
  readonly completedItems: number;
  readonly failedItems: number;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Individual batch item record */
export interface BatchItem {
  readonly id: string;
  readonly batchId: string;
  readonly itemIndex: number;
  readonly status: BatchItemStatus;
  readonly generationId: string | null;  // Links to generated question
  readonly retryCount: number;
  readonly errorMessage: string | null;
  readonly parameters: Record<string, unknown>;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly createdAt: string;
}

/** Inngest event payloads */
export interface BatchGenerateEvent {
  readonly batchId: string;
  readonly config: BatchConfig;
  readonly userId: string;
}

export interface BatchItemGenerateEvent {
  readonly batchId: string;
  readonly itemId: string;
  readonly itemIndex: number;
  readonly parameters: Record<string, unknown>;
}

export interface BatchCompleteEvent {
  readonly batchId: string;
  readonly status: BatchStatus;
  readonly completedItems: number;
  readonly failedItems: number;
  readonly totalDurationMs: number;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_batch_jobs_and_items

CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  course_id UUID NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'paused', 'completed', 'completed_with_errors', 'failed', 'cancelled')),
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  item_index INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  generation_id UUID,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  parameters JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch_id, item_index)
);

CREATE INDEX idx_batch_jobs_user_id ON batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_jobs_course_id ON batch_jobs(course_id);
CREATE INDEX idx_batch_items_batch_id ON batch_items(batch_id);
CREATE INDEX idx_batch_items_status ON batch_items(status);

-- RLS policies
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own batch jobs"
  ON batch_jobs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own batch jobs"
  ON batch_jobs FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own batch jobs"
  ON batch_jobs FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can view items of own batches"
  ON batch_items FOR SELECT
  USING (batch_id IN (SELECT id FROM batch_jobs WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage all batch items"
  ON batch_items FOR ALL
  USING (true)
  WITH CHECK (true);
```

## 5. API Contract (complete request/response)

### POST /api/v1/generation/batch (Auth: Faculty)

**Request Body:**
```json
{
  "targetCount": 20,
  "courseId": "course-uuid-1",
  "conceptScope": ["concept-uuid-1", "concept-uuid-2"],
  "sloScope": ["slo-uuid-1"],
  "questionType": "single-best-answer",
  "difficultyDistribution": { "easy": 30, "medium": 50, "hard": 20 },
  "bloomLevels": ["application", "analysis"],
  "concurrencyLimit": 5
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "batch-uuid-1",
    "status": "pending",
    "totalItems": 20,
    "completedItems": 0,
    "failedItems": 0,
    "config": { "...same as request..." },
    "createdAt": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/generation/batch/:batchId (Auth: Faculty, owner only)

**Success Response (200):**
```json
{
  "data": {
    "id": "batch-uuid-1",
    "status": "running",
    "totalItems": 20,
    "completedItems": 12,
    "failedItems": 1,
    "config": { "..." },
    "startedAt": "2026-02-19T12:00:05Z",
    "completedAt": null,
    "createdAt": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/generation/batch/:batchId/items (Auth: Faculty, owner only)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | `all` | Filter: `pending`, `running`, `completed`, `failed`, `all` |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

**Success Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "item-uuid-1",
        "itemIndex": 0,
        "status": "completed",
        "generationId": "gen-uuid-1",
        "retryCount": 0,
        "completedAt": "2026-02-19T12:01:00Z"
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 20, "total_pages": 1 }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role or not batch owner |
| 400 | `VALIDATION_ERROR` | Invalid config (target > 100, distribution != 100%) |
| 404 | `NOT_FOUND` | Batch ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

No frontend components in this story. UI is handled by downstream stories:
- STORY-F-45 — Batch Configuration Form
- STORY-F-46 — Batch Progress UI
- STORY-F-47 — Batch Controls

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/batch.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Edit (add batch export) |
| 3 | Supabase migration via MCP (`batch_jobs`, `batch_items` tables) | Database | Apply |
| 4 | `apps/server/src/errors/batch.errors.ts` | Errors | Create |
| 5 | `apps/server/src/models/batch-job.model.ts` | Model | Create |
| 6 | `apps/server/src/repositories/batch-job.repository.ts` | Repository | Create |
| 7 | `apps/server/src/inngest/events/batch.events.ts` | Events | Create |
| 8 | `apps/server/src/inngest/functions/batch-generate.fn.ts` | Inngest | Create |
| 9 | `apps/server/src/inngest/functions/batch-item.fn.ts` | Inngest | Create |
| 10 | `apps/server/src/services/generation/batch-pipeline.service.ts` | Service | Create |
| 11 | `apps/server/src/services/generation/batch-orchestrator.service.ts` | Service | Create |
| 12 | `apps/server/src/controllers/generation/batch.controller.ts` | Controller | Create |
| 13 | `apps/server/src/index.ts` | Routes | Edit (add batch routes) |
| 14 | `apps/server/src/__tests__/generation/batch-pipeline.test.ts` | Tests | Create |
| 15 | `apps/server/src/__tests__/generation/batch-orchestrator.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-33 | faculty | NOT STARTED | Generation pipeline must exist for each batch item to invoke |
| STORY-U-3 | universal | **DONE** | Auth middleware for JWT validation |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role enforcement |

### NPM Packages (to install)
- `inngest` — Batch orchestration framework (must be installed)
- `express` — Server framework (already installed)
- `vitest` — Testing (already installed)

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/services/generation/` — Pipeline scaffold from F-33

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "dr.jones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock batch config
export const MOCK_BATCH_CONFIG = {
  targetCount: 10,
  courseId: "course-uuid-1",
  conceptScope: ["concept-uuid-1"],
  sloScope: ["slo-uuid-1"],
  questionType: "single-best-answer",
  difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
  bloomLevels: ["application"],
  concurrencyLimit: 5,
};

// Mock batch job
export const MOCK_BATCH_JOB = {
  id: "batch-uuid-1",
  user_id: "faculty-uuid-1",
  institution_id: "inst-uuid-1",
  course_id: "course-uuid-1",
  config: MOCK_BATCH_CONFIG,
  status: "pending",
  total_items: 10,
  completed_items: 0,
  failed_items: 0,
  started_at: null,
  completed_at: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Mock batch items (mixed statuses)
export const MOCK_BATCH_ITEMS = [
  { id: "item-1", batch_id: "batch-uuid-1", item_index: 0, status: "completed", generation_id: "gen-1", retry_count: 0, error_message: null },
  { id: "item-2", batch_id: "batch-uuid-1", item_index: 1, status: "completed", generation_id: "gen-2", retry_count: 0, error_message: null },
  { id: "item-3", batch_id: "batch-uuid-1", item_index: 2, status: "failed", generation_id: null, retry_count: 2, error_message: "LLM timeout" },
  { id: "item-4", batch_id: "batch-uuid-1", item_index: 3, status: "pending", generation_id: null, retry_count: 0, error_message: null },
];

// Mock Inngest step helpers
export const mockInngestStep = {
  run: vi.fn().mockResolvedValue(undefined),
  sendEvent: vi.fn().mockResolvedValue(undefined),
  waitForEvent: vi.fn().mockResolvedValue(undefined),
  sleep: vi.fn().mockResolvedValue(undefined),
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/generation/batch-pipeline.test.ts`

```
describe("BatchPipelineService")
  describe("createBatch")
    ✓ creates batch job in Supabase with pending status
    ✓ creates N batch items matching targetCount
    ✓ distributes difficulty according to difficultyDistribution
    ✓ validates targetCount is 1-100 (throws BatchPipelineError)
    ✓ validates difficultyDistribution sums to 100
    ✓ sends batch.generate Inngest event after creation

  describe("getBatchStatus")
    ✓ returns batch job with current counts
    ✓ throws NotFoundError for non-existent batch

  describe("retryFailedItems")
    ✓ resets failed items to pending with incremented retry_count
    ✓ skips items that exceeded max retry count (2)
```

**File:** `apps/server/src/__tests__/generation/batch-orchestrator.test.ts`

```
describe("BatchOrchestratorService")
  describe("batchGenerate (Inngest function)")
    ✓ updates batch status to running on start
    ✓ emits batch.item.generate events for each pending item
    ✓ respects concurrency limit (5 simultaneous max)
    ✓ emits batch.complete event when all items finish

  describe("batchItemGenerate (Inngest function)")
    ✓ invokes LangGraph.js pipeline for the item
    ✓ updates item status to completed on success
    ✓ retries failed item up to 2 times
    ✓ marks item as failed after max retries exceeded
    ✓ skips already-completed items (idempotency)

  describe("token bucket rate limiting")
    ✓ delays dispatch when LLM rate limit approached
    ✓ allows dispatch when tokens available
```

**Total: ~21 tests** (10 pipeline + 11 orchestrator)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when Batch Configuration Form (F-45) + Batch Progress UI (F-46) are complete.

## 12. Acceptance Criteria

1. `batch.generate` Inngest function accepts batch config and fans out item events
2. Parallel execution with configurable concurrency limit (default: 5)
3. Each item invokes the LangGraph.js pipeline independently
4. Batch state tracked in `batch_jobs` table with status, progress, error counts
5. Individual item results linked to batch via `batch_id` foreign key
6. Failed items retried up to 2 times before marking as `batch_item_failed`
7. Batch completion triggers `batch.complete` event
8. Rate limiting respects LLM provider limits with token bucket pattern
9. Idempotency: re-running a batch skips already-completed items
10. Status transitions: `pending` -> `running` -> `completed` | `completed_with_errors` | `failed`
11. All ~21 API tests pass
12. TypeScript strict, named exports only, custom error classes

## 13. Source References

| Claim | Source |
|-------|--------|
| Inngest for batch orchestration | ARCHITECTURE_DECISIONS: "Inngest for batch orchestration" |
| Fan-out pattern | S-F-20-1 § Notes: "batch.generate emits N batch.item.generate events" |
| Concurrency via Inngest option | S-F-20-1 § Notes: "Concurrency managed via Inngest's concurrency option" |
| Token bucket rate limiting | S-F-20-1 § Notes: "Token bucket for LLM rate limiting" |
| Batch status transitions | S-F-20-1 § Notes: "pending → running → completed | completed_with_errors | failed" |
| Items go through validation/critic | S-F-20-1 § Notes: "Each generated item still goes through validation and critic pipelines" |

## 14. Environment Prerequisites

- **Supabase:** Project running with `profiles` and `institutions` tables (for FK references)
- **Inngest:** Inngest dev server running locally (`npx inngest-cli@latest dev`)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Pipeline scaffold (F-33):** LangGraph.js generation graph must be implemented
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No UI components in this story — backend batch pipeline infrastructure only. Frontend is deferred to STORY-F-45 (config form), STORY-F-46 (progress UI), and STORY-F-47 (controls).
