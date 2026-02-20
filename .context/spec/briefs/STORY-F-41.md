# STORY-F-41: Verification Workflow

**Epic:** E-13 (Concept Review & Verification)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-13-2

---

## User Story
As a **Faculty member (Dr. Amara Osei, Course Director)**, I need approved concepts to transition from TEACHES to TEACHES_VERIFIED with a full audit trail so that verified curriculum mappings are distinguished from unverified extractions.

## Acceptance Criteria
- [ ] On approval: `TEACHES` relationship replaced with `TEACHES_VERIFIED` in Neo4j
- [ ] SubConcept status updated to `verified` in Supabase
- [ ] On rejection: `TEACHES` relationship removed, SubConcept status set to `rejected`
- [ ] Audit trail record: `reviewer_id`, `action` (approve/reject/edit), `timestamp`, `reason` (for reject), `previous_state`
- [ ] Audit trail stored in Supabase `concept_reviews` table
- [ ] DualWriteService: Neo4j relationship type swap + Supabase status update
- [ ] Rollback on partial failure: if Neo4j update fails, Supabase status reverts
- [ ] Verification is idempotent: approving an already-verified concept is a no-op
- [ ] Custom error class: `ConceptAlreadyReviewedError`
- [ ] 10-12 API tests for approve flow, reject flow, audit trail creation, rollback, idempotency
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/SubConceptDetail.tsx` (verify/reject actions) | `apps/web/src/components/concepts/concept-detail-panel.tsx` | Verify/reject buttons are part of the detail panel from STORY-F-40; ensure action handlers call verification API |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/verification.types.ts` |
| Service | apps/server | `src/services/concept/verification.service.ts` |
| Repository | apps/server | `src/repositories/concept/concept-review.repository.ts` |
| Errors | apps/server | `src/errors/verification.errors.ts` |
| Tests | apps/server | `src/services/concept/__tests__/verification.service.test.ts` |

## Database Schema
```sql
CREATE TABLE concept_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subconcept_id UUID NOT NULL REFERENCES subconcepts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,          -- 'approve' | 'reject' | 'edit'
  reason TEXT,                   -- required for 'reject'
  previous_state JSONB NOT NULL, -- snapshot of subconcept before change
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_concept_reviews_subconcept ON concept_reviews(subconcept_id);
CREATE INDEX idx_concept_reviews_reviewer ON concept_reviews(reviewer_id);
```

## API Endpoints
Uses PATCH `/api/v1/concepts/:conceptId/review` from STORY-F-40. This story implements the backend service logic.

## Dependencies
- **Blocked by:** STORY-F-34 (TEACHES relationships must exist)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 10-12 API tests: approve flow (TEACHES -> TEACHES_VERIFIED), reject flow (TEACHES removed, status=rejected), audit trail creation with reviewer_id, reject requires reason, edit updates name/description, rollback on Neo4j failure (Supabase status reverts), idempotent approve (no-op), ConceptAlreadyReviewedError on double-review, DualWriteService sync_status, previous_state snapshot correctness
- 0 E2E tests (covered in STORY-F-40 E2E)

## Implementation Notes
- Neo4j relationship type swap: DELETE `(Course)-[:TEACHES]->(SubConcept)`, CREATE `(Course)-[:TEACHES_VERIFIED]->(SubConcept)` in a single transaction.
- `TEACHES_VERIFIED` carries properties: `verified_by`, `verified_at`, from original TEACHES: `source_content_id`, `created_at`.
- Audit trail is append-only: never update or delete review records.
- Use Postgres RPC function via `supabase.rpc()` for atomic multi-table writes (subconcept status update + concept_reviews insert). See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- Constructor DI with `#supabaseClient`, `#neo4jClient` private fields.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
