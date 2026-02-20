# STORY-F-39: Inngest Batch Pipeline

**Epic:** E-20 (Bulk Generation)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 14
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-20-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need an Inngest-powered batch generation pipeline with concurrency control so that I can generate large numbers of questions in parallel without overloading the system.

## Acceptance Criteria
- [ ] Inngest function `batch.generate` accepts batch config (target count, scope, parameters)
- [ ] Parallel execution with configurable concurrency limit (default: 5 simultaneous generations)
- [ ] Each item invokes the LangGraph.js pipeline (STORY-F-33) independently
- [ ] Batch state tracked in Supabase: `batch_jobs` table with status, progress, error counts
- [ ] Individual item results linked to batch via `batch_id` foreign key
- [ ] Failed items retried up to 2 times before marking as `batch_item_failed`
- [ ] Batch completion triggers `batch.complete` event for downstream consumers
- [ ] Rate limiting: respect LLM provider rate limits with token bucket pattern
- [ ] Idempotency: re-running a batch skips already-completed items
- [ ] Custom error classes: `BatchPipelineError`, `BatchItemError`, `ConcurrencyLimitError`
- [ ] 12-18 API tests: batch creation, concurrency control, item retry, completion event, idempotency, rate limiting
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend batch pipeline only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/batch.types.ts` |
| Model | apps/server | `src/models/batch-job.model.ts` |
| Repository | apps/server | `src/repositories/batch-job.repository.ts` |
| Service | apps/server | `src/services/generation/batch-pipeline.service.ts`, `src/services/generation/batch-orchestrator.service.ts` |
| Inngest | apps/server | `src/inngest/functions/batch-generate.fn.ts`, `src/inngest/functions/batch-item.fn.ts` |
| Events | apps/server | `src/inngest/events/batch.events.ts` |
| Errors | apps/server | `src/errors/batch.errors.ts` |
| Tests | apps/server | `src/services/generation/__tests__/batch-pipeline.test.ts`, `src/services/generation/__tests__/batch-orchestrator.test.ts` |

## Database Schema
```sql
CREATE TABLE batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  config JSONB NOT NULL,          -- target_count, scope, difficulty_distribution, etc.
  status TEXT NOT NULL DEFAULT 'pending',
  total_items INTEGER NOT NULL,
  completed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  status TEXT NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_batch_jobs_user ON batch_jobs(user_id);
CREATE INDEX idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX idx_batch_items_batch ON batch_items(batch_id);
CREATE INDEX idx_batch_items_status ON batch_items(status);
```

## API Endpoints

### POST /api/v1/generation/batch
**Auth:** JWT required (faculty role)
**Request:**
```json
{
  "courseId": "uuid",
  "targetCount": 20,
  "scope": { "sloIds": ["uuid"], "conceptIds": ["uuid"] },
  "questionType": "single_best_answer",
  "difficultyDistribution": { "easy": 30, "medium": 50, "hard": 20 },
  "templateId": "uuid (optional)"
}
```
**Success Response (201):**
```json
{ "data": { "batchId": "uuid", "status": "pending", "totalItems": 20 }, "error": null }
```

### GET /api/v1/generation/batch/:batchId
**Auth:** JWT required (batch owner)
**Response:** Batch status with item counts.

## Dependencies
- **Blocked by:** STORY-F-33 (generation pipeline exists)
- **Blocks:** STORY-F-45, STORY-F-46, STORY-F-47
- **Cross-lane:** STORY-F-33 (Sprint 6 pipeline)

## Testing Requirements
- 12-18 API tests: batch job creation, config validation, concurrency limit enforcement, item dispatch to pipeline, item retry on failure (max 2), batch completion event, idempotent re-run skips completed, rate limit token bucket, status transitions (pending->running->completed), completed_with_errors status, batch cancellation preserves completed, BatchPipelineError, BatchItemError, ConcurrencyLimitError
- 0 E2E tests

## Implementation Notes
- Inngest fan-out pattern: `batch.generate` emits N `batch.item.generate` events, each processed independently.
- Concurrency managed via Inngest's `concurrency` option on the step function.
- Batch status transitions: `pending` -> `running` -> `completed` | `completed_with_errors` | `failed`.
- Token bucket for LLM rate limiting: shared across all concurrent items in a batch.
- Consider Inngest's `step.waitForEvent` for coordinating batch completion.
- Each generated item still goes through validation (STORY-F-48) and review pipelines.
- Use `supabase.rpc()` for atomic multi-table writes (batch_jobs + batch_items).
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
