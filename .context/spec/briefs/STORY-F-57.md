# STORY-F-57: Import Pipeline

**Epic:** E-24 (Legacy Import Pipeline)
**Feature:** F-11 (Legacy Import)
**Sprint:** 17
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-24-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need an end-to-end import pipeline that parses, validates, tags, embeds, and dual-writes legacy questions so that imported items are fully integrated into the knowledge graph and item bank.

## Acceptance Criteria
- [ ] Pipeline stages: parse -> validate -> auto-tag -> embed -> dual-write
- [ ] Parse: apply field mapping to convert raw data to `ParsedQuestion[]`
- [ ] Validate: run validation engine (E-21) on each parsed question
- [ ] Auto-tag: apply auto-tagging service (E-21) for framework, Bloom, difficulty
- [ ] Embed: generate 1024-dim Voyage AI embeddings for each question
- [ ] Dual-write: Supabase `questions` table + Neo4j `Question` node with relationships
- [ ] Batch processing: Inngest function for async processing of large imports
- [ ] Progress tracking: per-item status with SSE updates
- [ ] Error handling: failed items logged with reason, successful items committed
- [ ] Import report generated on completion with accepted/rejected/skipped counts
- [ ] Custom error classes: `ImportPipelineError`, `ImportItemError`
- [ ] 12-18 API tests: full pipeline, each stage, partial failure, batch processing, dual-write sync
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/uploads/FacultyQuestionUpload.tsx` | `apps/web/src/app/(protected)/import/page.tsx` | Replace inline styles with Tailwind design tokens; convert `export default` to named export (except page.tsx); replace simulated `setTimeout` processing with real SSE progress stream; connect file upload to actual import API endpoint; replace mock quality report with real pipeline results; convert react-router `useNavigate` to Next.js `useRouter`; extract upload dropzone, job type selector, and processing state into separate atomic components |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/import/pipeline.types.ts` |
| Model | apps/server | `src/models/import-job.model.ts` |
| Repository | apps/server | `src/repositories/import-job.repository.ts` |
| Service | apps/server | `src/services/import/import-pipeline.service.ts`, `src/services/import/import-orchestrator.service.ts` |
| Inngest | apps/server | `src/inngest/functions/import-pipeline.fn.ts` |
| Controller | apps/server | `src/controllers/import/import-pipeline.controller.ts` |
| Errors | apps/server | `src/errors/import-pipeline.errors.ts` |
| View | apps/web | `src/app/(protected)/import/page.tsx`, `src/components/import/upload-dropzone.tsx`, `src/components/import/import-progress.tsx` |
| Hooks | apps/web | `src/hooks/use-import-progress.ts` |
| Tests | apps/server | `src/services/import/__tests__/import-pipeline.test.ts`, `src/services/import/__tests__/import-orchestrator.test.ts` |

## Database Schema

### Supabase -- `import_jobs` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK -> auth.users |
| `course_id` | uuid | NOT NULL, FK -> courses |
| `file_name` | varchar(255) | NOT NULL |
| `file_type` | varchar(50) | NOT NULL |
| `file_size` | integer | NOT NULL |
| `job_type` | varchar(20) | NOT NULL, CHECK IN ('validate', 'convert', 'import') |
| `status` | varchar(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'processing', 'completed', 'failed') |
| `total_items` | integer | NOT NULL, DEFAULT 0 |
| `accepted_count` | integer | NOT NULL, DEFAULT 0 |
| `rejected_count` | integer | NOT NULL, DEFAULT 0 |
| `skipped_count` | integer | NOT NULL, DEFAULT 0 |
| `report_summary` | jsonb | NULL |
| `field_mapping` | jsonb | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Supabase -- `import_items` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `import_job_id` | uuid | NOT NULL, FK -> import_jobs |
| `source_row` | integer | NOT NULL |
| `status` | varchar(20) | NOT NULL, CHECK IN ('pending', 'accepted', 'rejected', 'skipped') |
| `question_id` | uuid | NULL, FK -> questions |
| `error_reason` | text | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j Relationships
```
(Question)-[:IMPORTED_FROM]->(ImportJob {id: uuid})
(Question)-[:IN_COURSE]->(Course)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/import/upload` | Faculty+ | Upload file and start import job |
| GET | `/api/v1/import/:jobId/progress` | Faculty+ | SSE stream import progress |
| GET | `/api/v1/import/:jobId` | Faculty+ | Get import job status and summary |
| GET | `/api/v1/import` | Faculty+ | List import jobs for user |

## Dependencies
- **Blocks:** STORY-F-59 (Import report depends on pipeline data)
- **Blocked by:** STORY-F-45 (Parsers exist), STORY-F-54 (Auto-tagging exists)
- **Cross-epic:** STORY-F-54 (Sprint 12 auto-tagging), STORY-F-37 (Sprint 12 validation)

## Testing Requirements
### API Tests (12-18)
1. Full pipeline: parse -> validate -> auto-tag -> embed -> dual-write succeeds
2. Parse stage converts raw CSV data to `ParsedQuestion[]`
3. Validate stage catches format violations
4. Auto-tag stage assigns framework and Bloom tags
5. Embed stage generates 1024-dim embeddings
6. Dual-write creates Supabase record and Neo4j node
7. Partial failure: 3/5 items succeed, 2 fail with reasons logged
8. Failed items do not prevent successful items from committing
9. Import report summary counts are accurate
10. Inngest function processes large batch asynchronously
11. SSE progress events fire for each item processed
12. Import job status transitions: pending -> processing -> completed
13. Rejected item includes source row number and error reason
14. DualWriteService sets sync_status = 'synced' for each imported question
15. Throws `ImportPipelineError` on configuration errors
16. Throws `ImportItemError` with source row context

## Implementation Notes
- Import pipeline reuses validation engine and auto-tagging from E-21 -- DRY principle.
- Embedding generation: batch API call to Voyage AI for efficiency (up to 128 texts per call).
- DualWriteService pattern: Supabase first -> Neo4j second -> sync_status = 'synced'.
- Neo4j relationships: `(Question)-[:IMPORTED_FROM]->(ImportJob)`, `(Question)-[:IN_COURSE]->(Course)`.
- Imported questions enter as `draft` status -- still go through critic/review pipeline.
- Consider dedup check (E-21) as optional pipeline stage for imports.
- Inngest function for async batch processing; SSE controller subscribes to Redis pub/sub for progress.
- Upload uses multer with `limits.fileSize` set to prevent unbounded memory allocation.
- OOP with `#private` fields; constructor DI for all service dependencies.
- Use `.select().single()` on ALL Supabase write operations.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
