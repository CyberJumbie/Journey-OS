# STORY-F-32: Dedup Service (Validation)

**Epic:** E-21 (Validation & Dedup Engine)
**Feature:** F-10 (Question Review & Quality)
**Sprint:** 12
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-21-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a deduplication service that detects semantically similar questions using pgvector so that the item bank does not accumulate redundant content.

## Acceptance Criteria
- [ ] pgvector HNSW index on question embeddings (1024-dim Voyage AI)
- [ ] Similarity search with configurable thresholds: 0.85 flag for review, 0.95 auto-reject
- [ ] Dedup check runs automatically after validation passes
- [ ] Returns `DedupResult` with similar items, similarity scores, and recommended action
- [ ] Auto-reject at >= 0.95 writes rejection reason and links to duplicate source
- [ ] Flag at >= 0.85 adds `potential_duplicate` tag with reference to similar item(s)
- [ ] Scope filtering: dedup within same course, cross-course, or institution-wide (configurable)
- [ ] Custom error class: `DedupServiceError`
- [ ] 10-14 API tests: exact match, near-duplicate flag, auto-reject, below threshold pass, scope filtering, empty bank
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend dedup service only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/validation/dedup.types.ts` |
| Repository | apps/server | `src/repositories/validation/dedup.repository.ts` |
| Service | apps/server | `src/services/validation/dedup.service.ts` |
| Migration | supabase | HNSW index on question embeddings |
| Errors | apps/server | `src/errors/dedup.errors.ts` |
| Tests | apps/server | `src/services/validation/__tests__/dedup.service.test.ts`, `src/repositories/validation/__tests__/dedup.repository.test.ts` |

## Database Schema
Add HNSW index to existing questions table:
```sql
-- HNSW index for cosine similarity search on question embeddings
CREATE INDEX idx_questions_embedding_hnsw ON questions
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);
```

## API Endpoints
No REST endpoints. Called internally by the validation pipeline after question validation passes.

## Dependencies
- **Blocked by:** STORY-F-29 (embeddings exist for similarity — Voyage AI integration)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 10-14 API tests: exact match detection (>= 0.95 auto-reject), near-duplicate flag (>= 0.85), below threshold pass (< 0.85), course-scope filtering, cross-course scope, institution-wide scope, empty question bank returns no matches, DedupResult structure validation, rejection reason written, potential_duplicate tag applied, DedupServiceError on database failure
- 0 E2E tests

## Implementation Notes
- HNSW index params: `ef_construction=128`, `m=16` — good balance of recall and build speed.
- Embedding model: Voyage AI `voyage-3-large` (1024-dim) — must match existing embeddings.
- Cosine similarity via pgvector `<=>` operator (returns distance; convert to similarity: `1 - distance`).
- Repository uses Supabase client with raw SQL for pgvector operations.
- Consider batch dedup for bulk import scenarios (STORY-F-39 / E-24).
- Constructor DI with `#supabaseClient` private field.
- Escape `%`, `_`, `,`, `.` in user input for PostgREST `.or()` filters.
