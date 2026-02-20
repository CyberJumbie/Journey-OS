# STORY-IA-14 Brief: FULFILLS Workflow

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-14
old_id: S-IA-15-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 14
sprint: 5
size: M
depends_on:
  - STORY-IA-4 (institutional_admin) — ILO Model & Repository (ILOs must exist)
  - STORY-IA-2 (institutional_admin) — SLO Model & Repository (SLOs must exist)
blocks:
  - STORY-IA-25 — Coverage Matrix Link Count
  - STORY-IA-26 — Alignment Report Export
personas_served: [institutional_admin, faculty]
epic: E-15 (Objective Mapping & Framework Linking)
feature: F-07 (Learning Objectives)
user_flow: UF-11 (ILO Management & Framework Mapping)
```

---

## 1. Summary

Build a **2-step FULFILLS approval workflow** for SLO-to-ILO alignment proposals. A Course Director (faculty with CD flag) proposes a FULFILLS link from an SLO to an ILO with justification text. An Institutional Admin then reviews and approves or rejects. Approved relationships are created in Neo4j as `(SLO)-[:FULFILLS {status: 'approved'}]->(ILO)`. Rejected proposals can be re-submitted with updated justification.

This extends STORY-IA-22 (basic SLO-to-ILO linking from E-09) by adding a formal draft state, 2-step approval chain, justification text, and re-proposal capability. The notification interface is defined here but actual notification delivery is out of scope (deferred to E-34).

Key constraints:
- **Proposal states:** draft, proposed, approved, rejected
- **2-step gate:** Step 1 = Course Director proposes, Step 2 = Institutional Admin approves/rejects
- **DualWrite:** Approved FULFILLS written to Supabase first, then Neo4j
- **Re-proposal:** Rejected proposals can be re-submitted with updated justification
- Custom error classes: `FulfillsAlreadyProposedError`, `FulfillsNotInReviewableStateError`

---

## 2. Task Breakdown

Implementation order follows: **Types -> Errors -> Repository -> Service -> Controller -> Routes -> Tests**

### Task 1: Create FULFILLS workflow types
- **File:** `packages/types/src/objective/fulfills-workflow.types.ts`
- **Action:** Export `FulfillsProposalStatus`, `FulfillsProposal`, `CreateFulfillsProposalRequest`, `ReviewFulfillsProposalRequest`, `FulfillsProposalListQuery`, `FulfillsProposalListResponse`

### Task 2: Update objective barrel export
- **File:** `packages/types/src/objective/index.ts`
- **Action:** Re-export from `fulfills-workflow.types.ts`

### Task 3: Create FULFILLS error classes
- **File:** `apps/server/src/errors/fulfills.error.ts`
- **Action:** Create `FulfillsError`, `FulfillsAlreadyProposedError`, `FulfillsNotInReviewableStateError`, `FulfillsNotFoundError` extending `JourneyOSError`

### Task 4: Build FulfillsWorkflowRepository
- **File:** `apps/server/src/repositories/fulfillsWorkflow.repository.ts`
- **Action:** CRUD for `fulfills_proposals` table. Methods: `create()`, `findById()`, `findByStatus()`, `findBySloId()`, `updateStatus()`, `findExistingProposal()`

### Task 5: Build FulfillsWorkflowService
- **File:** `apps/server/src/services/fulfillsWorkflow.service.ts`
- **Action:** `createProposal()`, `submitForReview()`, `approve()`, `reject()`, `rePropose()`. DualWrite on approval: create `(SLO)-[:FULFILLS]->(ILO)` in Neo4j.

### Task 6: Build FulfillsWorkflowController
- **File:** `apps/server/src/controllers/fulfillsWorkflow.controller.ts`
- **Action:** `handleCreateProposal()`, `handleSubmitForReview()`, `handleApprove()`, `handleReject()`, `handleListProposals()`

### Task 7: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add protected routes: `POST /api/v1/fulfills/proposals`, `PATCH /api/v1/fulfills/proposals/:id/submit`, `PATCH /api/v1/fulfills/proposals/:id/approve`, `PATCH /api/v1/fulfills/proposals/:id/reject`, `GET /api/v1/fulfills/proposals`

### Task 8: Write service tests
- **File:** `apps/server/src/tests/fulfillsWorkflow.service.test.ts`
- **Action:** 10-12 tests covering proposal creation, 2-step approval, rejection, re-proposal, permission enforcement

---

## 3. Data Model

```typescript
// packages/types/src/objective/fulfills-workflow.types.ts

/** Proposal lifecycle states */
export type FulfillsProposalStatus = "draft" | "proposed" | "approved" | "rejected";

/** A FULFILLS proposal linking an SLO to an ILO */
export interface FulfillsProposal {
  readonly id: string;
  readonly slo_id: string;
  readonly ilo_id: string;
  readonly institution_id: string;
  readonly status: FulfillsProposalStatus;
  readonly justification: string;
  readonly proposed_by: string;          // Course Director UUID
  readonly proposed_at: string | null;
  readonly reviewed_by: string | null;   // Institutional Admin UUID
  readonly reviewed_at: string | null;
  readonly review_note: string | null;
  readonly graph_rel_id: string | null;  // Neo4j relationship ID (set on approval)
  readonly sync_status: "pending" | "synced" | "failed";
  readonly created_at: string;
  readonly updated_at: string;
}

/** Request to create a new FULFILLS proposal */
export interface CreateFulfillsProposalRequest {
  readonly slo_id: string;
  readonly ilo_id: string;
  readonly justification: string;
}

/** Request to review (approve or reject) a proposal */
export interface ReviewFulfillsProposalRequest {
  readonly note?: string;   // Optional for approval, required for rejection
}

/** Query parameters for listing proposals */
export interface FulfillsProposalListQuery {
  readonly institution_id: string;
  readonly status?: FulfillsProposalStatus;
  readonly slo_id?: string;
  readonly ilo_id?: string;
  readonly page?: number;    // Default: 1
  readonly limit?: number;   // Default: 25
}

/** Paginated list response */
export interface FulfillsProposalListResponse {
  readonly proposals: readonly FulfillsProposal[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/** Notification interface (not yet implemented -- placeholder) */
export interface FulfillsNotification {
  readonly proposal_id: string;
  readonly recipient_id: string;
  readonly type: "submitted_for_review" | "approved" | "rejected";
  readonly created_at: string;
}
```

---

## 4. Database Schema

```sql
-- Migration: create_fulfills_proposals
CREATE TABLE fulfills_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_id UUID NOT NULL REFERENCES student_learning_objectives(id),
  ilo_id UUID NOT NULL REFERENCES student_learning_objectives(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'rejected')),
  justification TEXT NOT NULL,
  proposed_by UUID NOT NULL REFERENCES profiles(id),
  proposed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  graph_rel_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active proposals for same SLO-ILO pair
CREATE UNIQUE INDEX idx_fulfills_active_proposal
  ON fulfills_proposals(slo_id, ilo_id)
  WHERE status IN ('draft', 'proposed');

-- Query performance indexes
CREATE INDEX idx_fulfills_institution_status
  ON fulfills_proposals(institution_id, status);
CREATE INDEX idx_fulfills_slo_id
  ON fulfills_proposals(slo_id);
CREATE INDEX idx_fulfills_ilo_id
  ON fulfills_proposals(ilo_id);
CREATE INDEX idx_fulfills_proposed_by
  ON fulfills_proposals(proposed_by);

-- RLS: institution_id scoping
ALTER TABLE fulfills_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY fulfills_proposals_institution_scope ON fulfills_proposals
  USING (institution_id = current_setting('app.institution_id')::UUID);
```

**Neo4j schema (on approval):**
```cypher
// Create FULFILLS relationship when proposal is approved
MATCH (slo:SLO {id: $sloId}), (ilo:ILO {id: $iloId})
CREATE (slo)-[:FULFILLS {
  proposal_id: $proposalId,
  status: 'approved',
  approved_by: $reviewerId,
  approved_at: datetime()
}]->(ilo)

// Remove FULFILLS relationship if approval is revoked
MATCH (slo:SLO {id: $sloId})-[r:FULFILLS]->(ilo:ILO {id: $iloId})
DELETE r
```

---

## 5. API Contract

### POST /api/v1/fulfills/proposals (Auth: Faculty with CD flag)

**Request Body:**
```json
{
  "slo_id": "slo-uuid-1",
  "ilo_id": "ilo-uuid-1",
  "justification": "This SLO directly supports the institution's patient communication objective"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "prop-uuid-1",
    "slo_id": "slo-uuid-1",
    "ilo_id": "ilo-uuid-1",
    "institution_id": "inst-uuid-1",
    "status": "draft",
    "justification": "This SLO directly supports the institution's patient communication objective",
    "proposed_by": "faculty-uuid-1",
    "proposed_at": null,
    "reviewed_by": null,
    "reviewed_at": null,
    "review_note": null,
    "graph_rel_id": null,
    "sync_status": "pending",
    "created_at": "2026-02-19T10:00:00Z",
    "updated_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/fulfills/proposals/:id/submit (Auth: Faculty with CD flag)

**Success Response (200):**
```json
{
  "data": { "id": "prop-uuid-1", "status": "proposed", "proposed_at": "2026-02-19T10:05:00Z" },
  "error": null
}
```

### PATCH /api/v1/fulfills/proposals/:id/approve (Auth: InstitutionalAdmin)

**Request Body:**
```json
{ "note": "Alignment verified with curriculum committee" }
```

**Success Response (200):**
```json
{
  "data": {
    "id": "prop-uuid-1",
    "status": "approved",
    "reviewed_by": "ia-uuid-1",
    "reviewed_at": "2026-02-19T11:00:00Z",
    "review_note": "Alignment verified with curriculum committee",
    "graph_rel_id": "neo4j-rel-789",
    "sync_status": "synced"
  },
  "error": null
}
```

### PATCH /api/v1/fulfills/proposals/:id/reject (Auth: InstitutionalAdmin)

**Request Body:**
```json
{ "note": "SLO does not sufficiently address the ILO's communication component" }
```

**Success Response (200):**
```json
{
  "data": { "id": "prop-uuid-1", "status": "rejected", "review_note": "SLO does not sufficiently address..." },
  "error": null
}
```

### GET /api/v1/fulfills/proposals (Auth: InstitutionalAdmin or Faculty CD)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | string | -- | Filter by status |
| `slo_id` | string | -- | Filter by SLO |
| `ilo_id` | string | -- | Filter by ILO |
| `page` | number | 1 | Page number |
| `limit` | number | 25 | Items per page (max 100) |

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-CD faculty or wrong institution |
| 404 | `NOT_FOUND` | Proposal not found |
| 409 | `ALREADY_PROPOSED` | Active proposal already exists for SLO-ILO pair |
| 422 | `NOT_REVIEWABLE` | Proposal not in correct state for requested action |
| 400 | `VALIDATION_ERROR` | Missing required fields |

---

## 6. Frontend Spec

No dedicated frontend page in this story. The FULFILLS workflow API is consumed by the mapping UI in future stories (E-15 scope). The API contract above is the deliverable.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/objective/fulfills-workflow.types.ts` | Types | Create |
| 2 | `packages/types/src/objective/index.ts` | Types | Edit (add fulfills-workflow export) |
| 3 | Supabase migration via MCP (fulfills_proposals table) | Database | Apply |
| 4 | `apps/server/src/errors/fulfills.error.ts` | Errors | Create |
| 5 | `apps/server/src/repositories/fulfillsWorkflow.repository.ts` | Repository | Create |
| 6 | `apps/server/src/services/fulfillsWorkflow.service.ts` | Service | Create |
| 7 | `apps/server/src/controllers/fulfillsWorkflow.controller.ts` | Controller | Create |
| 8 | `apps/server/src/index.ts` | Routes | Edit (add fulfills routes) |
| 9 | `apps/server/src/tests/fulfillsWorkflow.service.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-4 | institutional_admin | **PENDING** | ILO model/repository must exist (FULFILLS targets ILOs) |
| STORY-IA-2 | institutional_admin | **PENDING** | SLO model/repository must exist (FULFILLS originates from SLOs) |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing
- `zod` -- Request body validation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`
- `packages/types/src/objective/slo.types.ts` -- SLO types (from IA-2)
- `packages/types/src/objective/ilo.types.ts` -- ILO types (from IA-4)

---

## 9. Test Fixtures

```typescript
import { FulfillsProposal, CreateFulfillsProposalRequest } from "@journey-os/types";

// Mock Course Director (proposes)
export const COURSE_DIRECTOR_USER = {
  sub: "cd-uuid-1",
  email: "cd@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock Institutional Admin (reviews)
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock regular faculty (should be denied proposal creation)
export const REGULAR_FACULTY = {
  ...COURSE_DIRECTOR_USER,
  sub: "faculty-uuid-2",
  is_course_director: false,
};

// Valid proposal request
export const VALID_PROPOSAL_REQUEST: CreateFulfillsProposalRequest = {
  slo_id: "slo-uuid-1",
  ilo_id: "ilo-uuid-1",
  justification: "This SLO on patient communication maps to institutional ILO on graduate competency",
};

// Mock proposal in draft state
export const MOCK_DRAFT_PROPOSAL: FulfillsProposal = {
  id: "prop-uuid-1",
  slo_id: "slo-uuid-1",
  ilo_id: "ilo-uuid-1",
  institution_id: "inst-uuid-1",
  status: "draft",
  justification: "This SLO on patient communication maps to institutional ILO on graduate competency",
  proposed_by: "cd-uuid-1",
  proposed_at: null,
  reviewed_by: null,
  reviewed_at: null,
  review_note: null,
  graph_rel_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock proposal in proposed state (awaiting review)
export const MOCK_PROPOSED_PROPOSAL: FulfillsProposal = {
  ...MOCK_DRAFT_PROPOSAL,
  status: "proposed",
  proposed_at: "2026-02-19T10:05:00Z",
};

// Mock approved proposal
export const MOCK_APPROVED_PROPOSAL: FulfillsProposal = {
  ...MOCK_PROPOSED_PROPOSAL,
  status: "approved",
  reviewed_by: "ia-uuid-1",
  reviewed_at: "2026-02-19T11:00:00Z",
  review_note: "Alignment verified",
  graph_rel_id: "neo4j-rel-789",
  sync_status: "synced",
};

// Mock rejected proposal
export const MOCK_REJECTED_PROPOSAL: FulfillsProposal = {
  ...MOCK_PROPOSED_PROPOSAL,
  status: "rejected",
  reviewed_by: "ia-uuid-1",
  reviewed_at: "2026-02-19T11:00:00Z",
  review_note: "Insufficient alignment evidence",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/fulfillsWorkflow.service.test.ts`

```
describe("FulfillsWorkflowService")
  describe("createProposal")
    it("creates proposal in draft state with correct SLO, ILO, and justification")
    it("throws FulfillsAlreadyProposedError when active proposal exists for same SLO-ILO pair")
    it("validates that SLO and ILO belong to the same institution")
  describe("submitForReview")
    it("transitions proposal from draft to proposed state with proposed_at timestamp")
    it("throws FulfillsNotInReviewableStateError when proposal is not in draft state")
  describe("approve")
    it("transitions proposal from proposed to approved with reviewer info")
    it("creates FULFILLS relationship in Neo4j via DualWrite")
    it("sets sync_status to 'synced' after successful Neo4j write")
    it("sets sync_status to 'failed' when Neo4j write fails")
    it("throws FulfillsNotInReviewableStateError when proposal is not in proposed state")
  describe("reject")
    it("transitions proposal from proposed to rejected with required review_note")
    it("throws FulfillsNotInReviewableStateError when proposal is not in proposed state")
  describe("rePropose")
    it("allows rejected proposal to be re-submitted with updated justification")
    it("resets status to draft and clears review fields")
```

**Total: ~12 tests**

---

## 11. E2E Test Spec

Not required for this story. The workflow API is backend-only. E2E coverage comes with the mapping UI in a downstream story.

---

## 12. Acceptance Criteria

1. Course Director can create a FULFILLS proposal in draft state
2. Course Director can submit a draft proposal for review (transitions to proposed)
3. Institutional Admin can approve a proposed proposal (transitions to approved)
4. Institutional Admin can reject a proposed proposal with required reason (transitions to rejected)
5. Approved proposals create `(SLO)-[:FULFILLS {status:'approved'}]->(ILO)` in Neo4j
6. Rejected proposals can be re-proposed with updated justification
7. Duplicate active proposals for same SLO-ILO pair are rejected with 409
8. State transitions are enforced (cannot approve a draft, cannot reject an approved, etc.)
9. DualWrite: Supabase first, Neo4j second, sync_status tracked
10. SLO and ILO must belong to the same institution
11. Notification interface is defined (not implemented)
12. All 12 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| 2-step approval workflow | S-IA-15-1 Acceptance Criteria |
| FULFILLS relationship direction | CLAUDE.md: `(Course)-[:OFFERS]->(SLO)` pattern |
| ILO and SLO are separate node types | CLAUDE.md Architecture Rules |
| DualWrite pattern | CLAUDE.md Database Rules |
| Proposal states: draft, proposed, approved, rejected | S-IA-15-1 Notes |
| Custom error classes | S-IA-15-1 Notes |
| Basic FULFILLS from E-09 | S-IA-09-1 story |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `student_learning_objectives` and `institutions` tables exist
- **Neo4j:** Instance running with ILO and SLO nodes created (IA-4 and IA-2 complete)
- **Express:** Server running on port 3001 with auth + RBAC middleware active

---

## 15. Implementation Notes

- **Proposal states are strict:** Only valid transitions are `draft->proposed`, `proposed->approved`, `proposed->rejected`, `rejected->draft` (re-proposal). Enforce in service layer.
- **DualWrite only on approval:** The Neo4j relationship is ONLY created when a proposal transitions to `approved`. Draft/proposed/rejected states are Supabase-only.
- **Unique constraint on active proposals:** The partial unique index `WHERE status IN ('draft', 'proposed')` prevents duplicate active proposals while allowing re-proposals after rejection.
- **Justification text:** Required on creation and re-proposal. This text helps the reviewer understand the alignment rationale.
- **Review note:** Required for rejection (must explain why), optional for approval.
- **Notification placeholder:** Define the `FulfillsNotification` interface but do NOT implement sending. Log the notification payload to console. Actual notification is E-34.
- **Private fields pattern:** `FulfillsWorkflowService` uses `readonly #supabaseClient`, `readonly #neo4jClient` with constructor DI.
- **Permission model:** Course Director can create/submit/re-propose. Institutional Admin can approve/reject. Both can list proposals within their institution.
