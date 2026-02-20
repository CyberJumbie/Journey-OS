# STORY-F-44: Batch Operations

**Epic:** E-13 (Concept Review & Verification)
**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Sprint:** 5
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-13-3

---

## User Story
As a **Faculty member (Dr. Amara Osei, Course Director)**, I need to batch approve or reject multiple concepts at once so that reviewing large extraction results is efficient.

## Acceptance Criteria
- [ ] Multi-select checkbox on concept review cards
- [ ] "Select All" / "Deselect All" toggle for current filtered view
- [ ] Batch Approve button: approves all selected concepts in a single operation
- [ ] Batch Reject button: rejects all selected with a shared reason prompt
- [ ] Controller endpoint: `POST /api/v1/courses/:courseId/concepts/batch-review` with array of concept IDs and action
- [ ] Transaction: all-or-nothing batch operation (if one fails, none are committed)
- [ ] Progress indicator for large batches (50+ concepts)
- [ ] Maximum batch size: 200 concepts per request
- [ ] Custom error class: `BatchOperationError`
- [ ] 5-8 API tests for batch approve, batch reject, partial failure rollback, empty selection
- [ ] TypeScript strict, named exports only

## Reference Screens
> Part of SubConceptReviewQueue.tsx (bulk select/approve).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/SubConceptReviewQueue.tsx` (bulk select/approve) | `apps/web/src/components/concepts/batch-action-bar.tsx` | Extract BatchActionBar molecule (sticky bottom bar); replace inline styles with Tailwind design tokens |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/concept/batch-review.types.ts` |
| Controller | apps/server | `src/controllers/concept/concept-review.controller.ts` (extend with batch endpoint) |
| Service | apps/server | `src/services/concept/concept-review.service.ts` (extend with batch method) |
| View | apps/web | `src/components/concepts/concept-review-queue.tsx` (extend with batch controls) |
| View - Batch Bar | apps/web | `src/components/concepts/batch-action-bar.tsx` |
| Errors | apps/server | `src/errors/batch-operation.errors.ts` |
| Tests | apps/server | `src/controllers/concept/__tests__/concept-review.batch.test.ts` |

## Database Schema
No new tables. Uses existing `subconcepts`, `course_subconcepts`, `concept_reviews` tables.

Batch operation uses Postgres RPC function for atomicity:
```sql
CREATE OR REPLACE FUNCTION batch_review_concepts(
  p_concept_ids UUID[],
  p_action TEXT,
  p_reviewer_id UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
-- Atomic batch update of subconcept statuses + audit trail inserts
$$ LANGUAGE plpgsql;
```

## API Endpoints

### POST /api/v1/courses/:courseId/concepts/batch-review
**Auth:** JWT required (course_director or institutional_admin)
**Request:**
```json
{
  "conceptIds": ["uuid", "uuid", "..."],
  "action": "approve" | "reject",
  "reason": "string (required for reject)"
}
```
**Success Response (200):**
```json
{ "data": { "processed": 15, "action": "approve" }, "error": null }
```
**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Empty conceptIds array or > 200 items |
| 400 | `BATCH_OPERATION_ERROR` | Transaction failure |
| 403 | `FORBIDDEN` | Non-director role |

## Dependencies
- **Blocked by:** STORY-F-40 (review queue UI must exist)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 5-8 API tests: batch approve (multiple concepts), batch reject with reason, empty selection rejected, max batch size (200) enforcement, transaction rollback on failure, RBAC enforcement, audit trail creation for each item
- 0 E2E tests

## Implementation Notes
- Batch operation reuses `VerificationService` from STORY-F-41 in a loop within a transaction.
- Neo4j: use `UNWIND` for batch relationship type swaps in a single query.
- Supabase: use `supabase.rpc()` with Postgres function for atomic batch write. See `docs/solutions/supabase-transactional-rpc-pattern.md`.
- `BatchActionBar` is a Molecule that appears when 1+ concepts are selected (sticky bottom bar).
- Maximum batch size: 200 concepts per request to avoid timeout.
- When adding imports AND usage in controller, add BOTH in a single Edit call to avoid linter stripping.
