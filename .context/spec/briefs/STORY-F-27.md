# STORY-F-27: Inngest Content Pipeline

**Epic:** E-11 (Content Processing Pipeline)
**Feature:** F-05 (Content Upload & Processing)
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-11-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need uploaded content automatically processed through a parse-clean-chunk-embed pipeline so that course materials are ready for AI concept extraction.

## Acceptance Criteria
- [ ] Inngest function triggered when content record status changes to `pending`
- [ ] Parse step: extract text from PDF (pdf-parse), PPTX (pptx-parser), DOCX (mammoth)
- [ ] Clean step: normalize whitespace, remove headers/footers, strip non-content elements
- [ ] Chunk step: 800-token chunks with 100-token overlap using tiktoken (cl100k_base encoding)
- [ ] Embed step: generate 1024-dim embeddings via Voyage AI (voyage-3-large)
- [ ] Pipeline stages update content status: `pending` -> `processing` -> `completed` | `error`
- [ ] Error handling: retry up to 3 times for transient failures, mark as `error` after exhaustion
- [ ] Each step logs to structured pipeline log for debugging
- [ ] Custom error classes: `ParseError`, `ChunkError`, `EmbedError`, `PipelineStageError`
- [ ] 12-15 API tests covering each pipeline stage, error handling, retry logic, status transitions
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend pipeline only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/content/pipeline.types.ts` |
| Pipeline | apps/server | `src/pipelines/content.pipeline.ts` |
| Service - Parse | apps/server | `src/services/content/parse.service.ts` |
| Service - Clean | apps/server | `src/services/content/clean.service.ts` |
| Service - Chunk | apps/server | `src/services/content/chunk.service.ts` |
| Service - Embed | apps/server | `src/services/content/embed.service.ts` |
| Inngest Config | apps/server | `src/inngest/functions/content-pipeline.fn.ts` |
| Errors | apps/server | `src/errors/pipeline.errors.ts` |
| Tests | apps/server | `src/services/content/__tests__/parse.service.test.ts`, `src/services/content/__tests__/chunk.service.test.ts`, `src/pipelines/__tests__/content.pipeline.test.ts` |

## Database Schema
Uses existing `contents` table with `status` column. No new tables for the pipeline itself.

Status transitions tracked on `contents`:
```sql
-- contents.status enum values
'pending' | 'processing' | 'completed' | 'error'
```

Pipeline log entries stored in `pipeline_logs`:
```sql
CREATE TABLE pipeline_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES contents(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,          -- 'parse' | 'clean' | 'chunk' | 'embed'
  status TEXT NOT NULL,         -- 'started' | 'completed' | 'error'
  duration_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## API Endpoints
No REST endpoints. Inngest event-driven:

| Inngest Event | Trigger | Description |
|---------------|---------|-------------|
| `content/process.requested` | Content upload completes | Starts pipeline |
| `content/stage.completed` | Internal step completion | Advances to next stage |

## Dependencies
- **Blocked by:** STORY-F-10 (content records must exist — S-F-10-3)
- **Blocks:** STORY-F-28, STORY-F-29, STORY-F-30, STORY-F-31
- **Cross-lane:** none

## Testing Requirements
- 12-15 API tests: PDF parse extraction, PPTX parse extraction, DOCX parse extraction, unsupported MIME type rejection, clean step whitespace normalization, chunk step 800-token sizing, chunk overlap verification, embed step dimension validation, status transitions (pending->processing->completed), retry on transient error, max retry exhaustion marks error, structured log creation, pipeline idempotency
- 0 E2E tests

## Implementation Notes
- Inngest provides durable execution with built-in retry and step functions.
- Chunking: 800 tokens measured by tiktoken (cl100k_base), 100-token overlap for context continuity.
- All embeddings are 1024-dim per architecture rules (Voyage AI voyage-3-large).
- Pipeline stages are idempotent: re-running a step on the same content produces the same result.
- Parse service uses factory pattern to select parser by MIME type.
- Each chunk stores: `content_id`, `chunk_index`, `text`, `token_count`, `embedding` vector.
- Store Voyage API key in environment variable `VOYAGE_API_KEY`, validated at service instantiation (not global zod schema).
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
