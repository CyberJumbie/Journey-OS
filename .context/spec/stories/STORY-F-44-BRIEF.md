# STORY-F-44 Brief: Batch Operations

## 0. Lane & Priority

```yaml
story_id: STORY-F-44
old_id: S-F-13-3
lane: faculty
lane_priority: 3
within_lane_order: 44
sprint: 5
size: S
depends_on:
  - STORY-F-40 (faculty) — Concept Review Queue UI (review queue must exist)
blocks: []
personas_served: [faculty, institutional_admin]
epic: E-13 (Concept Review & Verification)
feature: F-06 (Concept Management)
user_flow: UF-13 (Concept Review)
```

## 1. Summary

Add **batch approve and batch reject** capabilities to the existing concept review queue (STORY-F-40). Faculty can multi-select concepts via checkboxes, then batch approve all selected or batch reject all selected with a shared reason. The batch operation is all-or-nothing (transactional) using Neo4j UNWIND for batch relationship swaps and Supabase `.in('id', conceptIds)` for batch status updates. A sticky `BatchActionBar` appears when 1+ concepts are selected. Maximum batch size is 200 concepts per request.

Key constraints:
- **Extends existing** `ConceptReviewController` and `ConceptReviewService` (no new route files)
- Reuses `VerificationService` from STORY-F-41 in a loop within a transaction
- Neo4j UNWIND for batch relationship type swaps in a single query
- All-or-nothing: if one fails, none are committed
- Progress indicator for large batches (50+ concepts)
- Custom error class: `BatchOperationError` with partial results detail
- Maximum batch size: 200 concepts per request

## 2. Task Breakdown

1. **Types** — Create `BatchReviewRequest`, `BatchReviewResponse`, `BatchOperationProgress` in `packages/types/src/concept/review.types.ts` (extend)
2. **Error classes** — `BatchOperationError` in `apps/server/src/errors/concept.errors.ts` (extend)
3. **Service** — Extend `ConceptReviewService` with `batchReview()` method
4. **Controller** — Extend `ConceptReviewController` with `handleBatchReview()` method
5. **Route** — Add `POST /api/v1/courses/:courseId/concepts/batch-review` to existing routes
6. **Frontend** — `BatchActionBar` (molecule), extend `ConceptReviewQueue` with multi-select checkboxes
7. **API tests** — 7 tests for batch approve, batch reject, rollback, empty selection, max size

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/concept/review.types.ts (extend)

/** Batch review request payload */
export interface BatchReviewRequest {
  readonly conceptIds: readonly string[];
  readonly action: "approve" | "reject";
  readonly reason?: string;               // Required for reject
}

/** Batch review response */
export interface BatchReviewResponse {
  readonly processedCount: number;
  readonly action: "approve" | "reject";
  readonly conceptIds: readonly string[];
}

/** Batch operation progress (for large batches) */
export interface BatchOperationProgress {
  readonly total: number;
  readonly processed: number;
  readonly status: "processing" | "completed" | "failed";
}

/** Batch size limits */
export const BATCH_LIMITS = {
  MAX_BATCH_SIZE: 200,
} as const;
```

## 4. Database Schema (inline, complete)

No new tables needed. Batch operations use existing `sub_concepts` and `concept_reviews` tables (from F-40 and F-41).

```sql
-- No migration required for this story.
-- Uses existing:
--   sub_concepts (status updates via batch)
--   concept_reviews (audit trail entries via batch)
-- Neo4j UNWIND used for batch relationship swaps.
```

## 5. API Contract (complete request/response)

### POST /api/v1/courses/:courseId/concepts/batch-review (Auth: Course Director, Institutional Admin)

**Request Body:**
```json
{
  "conceptIds": ["concept-uuid-1", "concept-uuid-2", "concept-uuid-3"],
  "action": "approve"
}
```
or
```json
{
  "conceptIds": ["concept-uuid-4", "concept-uuid-5"],
  "action": "reject",
  "reason": "Incorrect extraction — not relevant to course objectives"
}
```

**Success Response (200):**
```json
{
  "data": {
    "processedCount": 3,
    "action": "approve",
    "conceptIds": ["concept-uuid-1", "concept-uuid-2", "concept-uuid-3"]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-Course Director / non-Institutional Admin |
| 400 | `VALIDATION_ERROR` | Empty conceptIds, missing reason for reject, batch > 200 |
| 400 | `BATCH_TOO_LARGE` | More than 200 concepts in single request |
| 409 | `BATCH_OPERATION_ERROR` | Transaction failed (all-or-nothing rollback) |

## 6. Frontend Spec

### Component Updates

**Extend `ConceptReviewQueue` (organism):**
```
ConceptReviewQueue (organism, extended)
  ├── SelectAll checkbox (header)
  ├── ConceptReviewCard (molecule, extended with checkbox)
  │     └── Checkbox (left side of card)
  └── BatchActionBar (molecule — sticky bottom bar)
        ├── Selected count: "3 concepts selected"
        ├── Batch Approve button (Green #69a338)
        ├── Batch Reject button (Red) — opens reason modal
        └── Deselect All button
```

**New: `BatchActionBar` (molecule):**
- Sticky bottom bar, appears when 1+ concepts selected
- Background: Navy Deep (#002c76) with white text
- Height: 56px
- Slide-up animation on appear
- Shows selected count, approve/reject buttons, deselect all

**States:**
1. **No selection** — BatchActionBar hidden
2. **Partial selection** — BatchActionBar visible with count and actions
3. **All selected** — "Select All" checkbox checked, BatchActionBar visible
4. **Processing** — Progress indicator in BatchActionBar (for 50+ concepts)
5. **Reject modal** — Text input for shared rejection reason

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/review.types.ts` | Types | Edit (add batch types) |
| 2 | `apps/server/src/errors/concept.errors.ts` | Errors | Edit (add `BatchOperationError`) |
| 3 | `apps/server/src/services/concept/concept-review.service.ts` | Service | Edit (add `batchReview()`) |
| 4 | `apps/server/src/controllers/concept/concept-review.controller.ts` | Controller | Edit (add `handleBatchReview()`) |
| 5 | `apps/server/src/routes/concept-review.routes.ts` | Routes | Edit (add batch-review route) |
| 6 | `apps/web/src/components/molecules/BatchActionBar.tsx` | Molecule | Create |
| 7 | `apps/web/src/components/organisms/ConceptReviewQueue/ConceptReviewQueue.tsx` | Organism | Edit (add multi-select) |
| 8 | `apps/server/src/__tests__/concept/concept-review.batch.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-40 | faculty | NOT STARTED | Review queue UI must exist to extend |
| STORY-F-41 | faculty | NOT STARTED | VerificationService reused for each concept in batch |
| STORY-U-6 | universal | **DONE** | RBAC middleware |

### NPM Packages (already installed)
- All packages already installed from F-40 dependencies

### Existing Files Needed
- `apps/server/src/services/concept/concept-review.service.ts` — Service to extend (from F-40)
- `apps/server/src/controllers/concept/concept-review.controller.ts` — Controller to extend (from F-40)
- `apps/server/src/services/concept/verification.service.ts` — Reused per-concept (from F-41)
- `apps/server/src/routes/concept-review.routes.ts` — Routes to extend (from F-40)
- `apps/web/src/components/organisms/ConceptReviewQueue/ConceptReviewQueue.tsx` — Queue to extend (from F-40)

## 9. Test Fixtures (inline)

```typescript
// Mock Course Director user
export const COURSE_DIRECTOR_USER = {
  sub: "cd-uuid-1",
  email: "dr.jones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock batch approve request
export const MOCK_BATCH_APPROVE = {
  conceptIds: ["concept-1", "concept-2", "concept-3"],
  action: "approve" as const,
};

// Mock batch reject request
export const MOCK_BATCH_REJECT = {
  conceptIds: ["concept-4", "concept-5"],
  action: "reject" as const,
  reason: "Not relevant to course objectives",
};

// Mock empty batch (validation error)
export const MOCK_EMPTY_BATCH = {
  conceptIds: [],
  action: "approve" as const,
};

// Mock oversized batch (validation error)
export const MOCK_OVERSIZED_BATCH = {
  conceptIds: Array.from({ length: 201 }, (_, i) => `concept-${i}`),
  action: "approve" as const,
};

// Mock partial failure scenario
export const MOCK_CONCEPTS_WITH_ALREADY_REVIEWED = [
  { id: "concept-1", status: "unverified" },
  { id: "concept-2", status: "verified" }, // Already reviewed — causes rollback
  { id: "concept-3", status: "unverified" },
];
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/concept/concept-review.batch.test.ts`

```
describe("ConceptReviewController — Batch Operations")
  describe("handleBatchReview")
    ✓ batch approves multiple concepts in single transaction (200)
    ✓ batch rejects multiple concepts with shared reason (200)
    ✓ returns 400 for empty conceptIds array
    ✓ returns 400 when batch size exceeds 200
    ✓ returns 400 when reject action missing reason
    ✓ rolls back all changes when one concept fails (all-or-nothing)
    ✓ rejects non-Course Director roles (403 FORBIDDEN)

describe("ConceptReviewService — batchReview")
  ✓ uses Neo4j UNWIND for batch relationship swaps
  ✓ uses Supabase .in() filter for batch status updates
  ✓ creates audit records for each concept in batch
```

**Total: ~10 tests** (7 controller + 3 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage handled by F-40's concept review flow test.

## 12. Acceptance Criteria

1. Multi-select checkbox on concept review cards
2. "Select All" / "Deselect All" toggle for current filtered view
3. Batch Approve button approves all selected concepts in a single operation
4. Batch Reject button rejects all selected with a shared reason prompt
5. `POST /api/v1/courses/:courseId/concepts/batch-review` with array of concept IDs and action
6. Transaction: all-or-nothing batch operation
7. Progress indicator for large batches (50+ concepts)
8. Maximum batch size: 200 concepts per request
9. All ~10 API tests pass
10. Named exports only, TypeScript strict

## 13. Source References

| Claim | Source |
|-------|--------|
| Batch approve/reject | S-F-13-3 § Acceptance Criteria |
| Neo4j UNWIND for batch | S-F-13-3 § Notes: "use UNWIND for batch relationship type swaps" |
| Supabase .in() filter | S-F-13-3 § Notes: "batch update using .in('id', conceptIds)" |
| BatchActionBar molecule | S-F-13-3 § Notes: "sticky bottom bar" |
| Max batch size 200 | S-F-13-3 § Notes: "Maximum batch size: 200 concepts" |
| BatchOperationError | S-F-13-3 § Notes: "Custom error class" |
| Reuses VerificationService | S-F-13-3 § Notes: "reuses VerificationService from S-F-13-2" |
| All-or-nothing | S-F-13-3 § Acceptance Criteria: "if one fails, none are committed" |

## 14. Environment Prerequisites

- **Supabase:** Project running with concept tables (from F-31/F-34/F-40)
- **Neo4j:** Running with SubConcept nodes and TEACHES relationships
- **Express:** Server running on port 3001 with auth + RBAC middleware
- **Next.js:** Web app running on port 3000 with concept review queue (from F-40)

## 15. Figma / Make Prototype

**BatchActionBar (sticky bottom):**
```
┌─────────────────────────────────────────────────────────┐
│ ✓ 3 concepts selected    [Approve All] [Reject All] [✕] │
│ Navy Deep (#002c76) bg    Green btn     Red btn          │
└─────────────────────────────────────────────────────────┘
```

- Sticky to bottom of viewport
- Slides up on first selection, slides down when deselected all
- Approve button: Green (#69a338), Reject button: Red, Deselect: icon-only (X)
- Progress bar replaces buttons during processing (50+ concepts)
