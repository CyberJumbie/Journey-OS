# STORY-F-41 Brief: Verification Workflow

## 0. Lane & Priority

```yaml
story_id: STORY-F-41
old_id: S-F-13-2
lane: faculty
lane_priority: 3
within_lane_order: 41
sprint: 5
size: M
depends_on:
  - STORY-F-34 (faculty) — TEACHES Relationships (must exist to swap)
blocks: []
personas_served: [faculty, institutional_admin]
epic: E-13 (Concept Review & Verification)
feature: F-06 (Concept Management)
user_flow: UF-13 (Concept Review)
```

## 1. Summary

Build a **verification workflow service** that transitions approved concepts from `TEACHES` to `TEACHES_VERIFIED` relationships in Neo4j with a full audit trail in Supabase. On approval, the `TEACHES` relationship is replaced with `TEACHES_VERIFIED` and the SubConcept status is updated to `verified`. On rejection, the `TEACHES` relationship is removed and the SubConcept status is set to `rejected`. Every review action creates an append-only audit record in the `concept_reviews` table. The DualWriteService pattern ensures Neo4j and Supabase stay in sync with rollback on partial failure.

Key constraints:
- **DualWriteService pattern** — Supabase first, Neo4j second, rollback on Neo4j failure
- Neo4j relationship type swap in a single transaction (DELETE TEACHES, CREATE TEACHES_VERIFIED)
- TEACHES_VERIFIED carries properties: `verified_by`, `verified_at`, plus original `source_content_id`, `created_at`
- Audit trail is append-only: never update or delete review records
- Verification is idempotent: approving already-verified concept is a no-op
- Custom error class: `ConceptAlreadyReviewedError`

## 2. Task Breakdown

1. **Types** — Create `ReviewAction`, `ReviewRecord`, `VerificationResult`, `TeachesVerifiedProperties` in `packages/types/src/concept/review.types.ts`
2. **Error classes** — `ConceptAlreadyReviewedError` in `apps/server/src/errors/concept.errors.ts`
3. **Migration** — `concept_reviews` audit trail table via Supabase MCP
4. **Repository** — `ConceptReviewRepository` with `createReviewRecord()`, `findByConceptId()`, `updateConceptStatus()` methods
5. **Service** — `VerificationService` with `approveConcept()`, `rejectConcept()`, `getReviewHistory()` methods implementing DualWriteService pattern
6. **Neo4j queries** — Relationship type swap (DELETE TEACHES, CREATE TEACHES_VERIFIED) in a single transaction
7. **API tests** — 11 tests covering approve flow, reject flow, audit trail, rollback, idempotency

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/concept/review.types.ts (extend from F-40)

/** Review action stored in audit trail */
export interface ReviewRecord {
  readonly id: string;
  readonly conceptId: string;
  readonly reviewerId: string;
  readonly action: "approve" | "reject" | "edit";
  readonly reason: string | null;
  readonly previousState: ConceptPreviousState;
  readonly createdAt: string;
}

/** Snapshot of concept state before review action */
export interface ConceptPreviousState {
  readonly status: string;
  readonly name: string;
  readonly description: string;
}

/** Result of a verification operation */
export interface VerificationResult {
  readonly conceptId: string;
  readonly action: "approve" | "reject";
  readonly newStatus: "verified" | "rejected";
  readonly reviewRecordId: string;
  readonly neo4jSynced: boolean;
}

/** TEACHES_VERIFIED relationship properties in Neo4j */
export interface TeachesVerifiedProperties {
  readonly verified_by: string;
  readonly verified_at: string;
  readonly source_content_id: string;
  readonly original_created_at: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_concept_reviews_table

CREATE TABLE concept_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'edit')),
  reason TEXT,
  previous_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only: no UPDATE or DELETE policies
CREATE INDEX idx_concept_reviews_concept_id ON concept_reviews(concept_id);
CREATE INDEX idx_concept_reviews_reviewer_id ON concept_reviews(reviewer_id);
CREATE INDEX idx_concept_reviews_created_at ON concept_reviews(created_at DESC);

-- RLS policies
ALTER TABLE concept_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view concept reviews"
  ON concept_reviews FOR SELECT
  USING (true);

CREATE POLICY "Faculty can insert concept reviews"
  ON concept_reviews FOR INSERT
  WITH CHECK (reviewer_id = auth.uid());

-- No UPDATE or DELETE policies (append-only audit trail)
```

## 5. API Contract (complete request/response)

No new API endpoints in this story. The `VerificationService` is called internally by `ConceptReviewController.handleReview()` from STORY-F-40. The controller delegates to `VerificationService.approveConcept()` or `VerificationService.rejectConcept()` based on the review action.

**Internal Service Interface:**

```typescript
interface IVerificationService {
  approveConcept(conceptId: string, reviewerId: string): Promise<VerificationResult>;
  rejectConcept(conceptId: string, reviewerId: string, reason: string): Promise<VerificationResult>;
  getReviewHistory(conceptId: string): Promise<readonly ReviewRecord[]>;
}
```

**DualWrite Flow (approve):**
1. Check concept is not already reviewed (throw `ConceptAlreadyReviewedError` if so)
2. Supabase: Update `sub_concepts.status` to `verified`
3. Supabase: Insert audit record into `concept_reviews`
4. Neo4j: In single transaction — DELETE `(Course)-[:TEACHES]->(SubConcept)`, CREATE `(Course)-[:TEACHES_VERIFIED {verified_by, verified_at, source_content_id, original_created_at}]->(SubConcept)`
5. If Neo4j fails: Rollback Supabase status to previous state
6. Return `VerificationResult` with `neo4jSynced: true`

**DualWrite Flow (reject):**
1. Check concept is not already reviewed
2. Supabase: Update `sub_concepts.status` to `rejected`
3. Supabase: Insert audit record into `concept_reviews`
4. Neo4j: DELETE `(Course)-[:TEACHES]->(SubConcept)` (no replacement)
5. If Neo4j fails: Rollback Supabase status
6. Return `VerificationResult` with `neo4jSynced: true`

## 6. Frontend Spec

No frontend components in this story. The verification service is consumed by the review queue UI in STORY-F-40 and batch operations in STORY-F-44.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/concept/review.types.ts` | Types | Edit (add review record types, extend from F-40) |
| 2 | Supabase migration via MCP (`concept_reviews` table) | Database | Apply |
| 3 | `apps/server/src/errors/concept.errors.ts` | Errors | Edit (add `ConceptAlreadyReviewedError`) |
| 4 | `apps/server/src/repositories/concept-review.repository.ts` | Repository | Create |
| 5 | `apps/server/src/services/concept/verification.service.ts` | Service | Create |
| 6 | `apps/server/src/__tests__/concept/verification.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-34 | faculty | NOT STARTED | TEACHES relationships must exist to swap to TEACHES_VERIFIED |
| STORY-U-3 | universal | **DONE** | Auth middleware |
| STORY-U-4 | universal | **DONE** | Neo4j client config for graph queries |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `neo4j-driver` — Neo4j driver
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig` for graph operations
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`

## 9. Test Fixtures (inline)

```typescript
// Mock Course Director user
export const REVIEWER_USER = {
  sub: "cd-uuid-1",
  email: "dr.jones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
};

// Mock unverified concept
export const MOCK_UNVERIFIED_CONCEPT = {
  id: "concept-uuid-1",
  name: "Myocardial Infarction Pathophysiology",
  description: "Mechanisms of cardiac cell death",
  status: "unverified",
  course_id: "course-uuid-1",
  source_content_id: "content-uuid-1",
  created_at: "2026-02-19T12:00:00Z",
};

// Mock already-verified concept
export const MOCK_VERIFIED_CONCEPT = {
  ...MOCK_UNVERIFIED_CONCEPT,
  id: "concept-uuid-2",
  status: "verified",
};

// Mock review record
export const MOCK_REVIEW_RECORD = {
  id: "review-uuid-1",
  concept_id: "concept-uuid-1",
  reviewer_id: "cd-uuid-1",
  action: "approve",
  reason: null,
  previous_state: {
    status: "unverified",
    name: "Myocardial Infarction Pathophysiology",
    description: "Mechanisms of cardiac cell death",
  },
  created_at: "2026-02-19T12:05:00Z",
};

// Mock Neo4j session for transaction tests
export const mockNeo4jSession = {
  executeWrite: vi.fn(),
  close: vi.fn(),
};

// Mock Supabase responses
export const mockSupabaseUpdate = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: MOCK_UNVERIFIED_CONCEPT, error: null }),
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/concept/verification.service.test.ts`

```
describe("VerificationService")
  describe("approveConcept")
    ✓ updates SubConcept status to verified in Supabase
    ✓ creates audit record with action=approve and previous_state snapshot
    ✓ swaps TEACHES to TEACHES_VERIFIED in Neo4j with correct properties
    ✓ rolls back Supabase status if Neo4j transaction fails
    ✓ throws ConceptAlreadyReviewedError for already-verified concept (idempotent)
    ✓ TEACHES_VERIFIED carries verified_by, verified_at, source_content_id, original_created_at

  describe("rejectConcept")
    ✓ updates SubConcept status to rejected in Supabase
    ✓ creates audit record with action=reject, reason, and previous_state
    ✓ deletes TEACHES relationship in Neo4j (no replacement)
    ✓ rolls back Supabase status if Neo4j deletion fails
    ✓ throws ConceptAlreadyReviewedError for already-rejected concept

  describe("getReviewHistory")
    ✓ returns all review records for a concept in chronological order
```

**Total: ~12 tests**

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage is handled by STORY-F-40's concept review flow test.

## 12. Acceptance Criteria

1. On approval: TEACHES relationship replaced with TEACHES_VERIFIED in Neo4j
2. SubConcept status updated to `verified` in Supabase
3. On rejection: TEACHES relationship removed, SubConcept status set to `rejected`
4. Audit trail record created: reviewer_id, action, timestamp, reason, previous_state
5. Audit trail stored in `concept_reviews` table (append-only)
6. DualWriteService pattern: Neo4j swap + Supabase update coordinated
7. Rollback on partial failure: if Neo4j update fails, Supabase status reverts
8. Verification is idempotent: approving already-verified concept is a no-op
9. Custom error class `ConceptAlreadyReviewedError` for double-review attempts
10. All ~12 API tests pass
11. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| TEACHES to TEACHES_VERIFIED swap | S-F-13-2 § Acceptance Criteria |
| DualWriteService pattern | ARCHITECTURE_DECISIONS: "Supabase first → Neo4j second → sync_status" |
| Audit trail append-only | S-F-13-2 § Notes: "Audit trail is append-only" |
| TEACHES_VERIFIED properties | S-F-13-2 § Notes: "verified_by, verified_at, source_content_id, created_at" |
| Idempotent verification | S-F-13-2 § Notes: "Verification is idempotent" |
| ConceptAlreadyReviewedError | S-F-13-2 § Notes: "Custom error class" |
| Rollback on partial failure | S-F-13-2 § Acceptance Criteria: "if Neo4j update fails, Supabase status reverts" |

## 14. Environment Prerequisites

- **Supabase:** Project running with `profiles` table and concept tables (from F-31/F-34)
- **Neo4j:** Running with SubConcept nodes and TEACHES relationships (from F-34)
- **Express:** Server running on port 3001

## 15. Figma / Make Prototype

No UI components in this story — service layer only. The verification workflow is consumed by the review queue UI in STORY-F-40 and batch operations in STORY-F-44.
