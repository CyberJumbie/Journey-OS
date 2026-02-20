# STORY-F-36: Dedup Service (Extraction)

**Epic:** E-12 (AI Concept Extraction)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-12-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need duplicate SubConcepts automatically merged so that the concept graph stays clean without redundant entries.

## Acceptance Criteria
- [ ] `ConceptDedupService` computes cosine similarity between SubConcept embeddings
- [ ] Dedup threshold: 0.92 cosine similarity triggers merge candidate
- [ ] Merge strategy: keep the SubConcept with higher confidence score, redirect relationships from duplicate
- [ ] Embedding for SubConcepts generated using Voyage AI (same 1024-dim as content chunks)
- [ ] pgvector query: find nearest neighbors above 0.92 threshold
- [ ] Merge audit: record which SubConcepts were merged and why
- [ ] Batch dedup: run after extraction completes for a content record
- [ ] 10-12 API tests covering dedup detection, merge execution, audit trail, threshold boundary cases
- [ ] TypeScript strict, named exports only

## Reference Screens
No UI screens. Backend dedup service only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/dedup.types.ts` |
| Repository | apps/server | `src/repositories/concept/dedup.repository.ts` |
| Service | apps/server | `src/services/concept/concept-dedup.service.ts` |
| Tests | apps/server | `src/services/concept/__tests__/concept-dedup.service.test.ts` |

## Database Schema
Merge audit trail table:
```sql
CREATE TABLE subconcept_merges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survivor_id UUID NOT NULL REFERENCES subconcepts(id),
  duplicate_id UUID NOT NULL,  -- no FK since duplicate is soft-deleted
  similarity_score NUMERIC(5,4) NOT NULL,
  merge_reason TEXT NOT NULL,
  merged_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subconcept_merges_survivor ON subconcept_merges(survivor_id);
```

Uses existing `subconcepts.embedding` column (`vector(1024)`) with HNSW index.

## API Endpoints
No REST endpoints. Called internally by the extraction pipeline as a post-extraction step.

## Dependencies
- **Blocked by:** STORY-F-31 (SubConcepts must exist to dedup)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 10-12 API tests: exact duplicate detection (>= 0.92), near-miss below threshold (< 0.92 no merge), merge keeps higher confidence survivor, relationship redirection from duplicate to survivor, merge audit record creation, batch dedup across multiple chunks, Neo4j node deletion + edge re-link, Supabase soft-delete of duplicate, pgvector distance query, empty subconcept set handling, idempotent re-run
- 0 E2E tests

## Implementation Notes
- Cosine similarity threshold of 0.92 is intentionally high to avoid false positive merges.
- pgvector query: `SELECT * FROM subconcepts WHERE embedding <=> $1 < 0.08` (1 - 0.92 = 0.08 distance).
- Merge redirects all relationships (`MAPPED_TO`, `TEACHES`, source chunk references) from duplicate to survivor.
- Neo4j merge: delete duplicate node, redirect all edges to survivor node via `DETACH DELETE` + re-link.
- DualWriteService handles merge in both stores: Supabase soft-delete duplicate, Neo4j `DETACH DELETE` + re-link.
- Dedup runs within the same Inngest pipeline as extraction, as a post-extraction step.
- Constructor DI with `#supabaseClient`, `#neo4jClient` private fields.
- This is distinct from STORY-F-32 (question dedup) — this deduplicates SubConcepts during extraction.
