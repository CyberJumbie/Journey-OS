# STORY-IA-30 Brief: FULFILLS Review Queue

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-30
old_id: S-IA-15-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 30
sprint: 5
size: M
depends_on:
  - STORY-IA-14 (institutional_admin) — FULFILLS Workflow Service (proposals must exist)
blocks: []
personas_served: [institutional_admin]
epic: E-15 (Objective Mapping & Framework Linking)
feature: F-07 (Objective Mapping)
user_flow: UF-12 (Objective Alignment Review)
```

---

## 1. Summary

Build a **FULFILLS Review Queue** page that lists all pending FULFILLS proposals (SLO-to-ILO alignment requests) for the admin's institution. Each proposal shows the SLO code/title, ILO code/title, proposer name, justification text, and submitted date. Admins can approve (with optional note) or reject (with required reason) proposals. The page includes filtering by course, proposer, and date range, sorting by submission date or course name, and review statistics (pending, approved this week, rejected this week). All actions create audit trail records.

Key constraints:
- **RBAC enforced** at controller level (institutional_admin only)
- **Audit trail** stored in `fulfills_reviews` table
- **Reject reason is required** to give Course Directors actionable feedback
- **UI mirrors** Concept Review Queue pattern (S-F-13-1) for consistency
- **Design tokens** for status badges: pending (yellow), approved (green), rejected (red)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Controller -> Route -> Molecules -> Organisms -> Page -> Tests**

### Task 1: Create FULFILLS review types
- **File:** `packages/types/src/mapping/fulfills-review.types.ts`
- **Action:** Export `FulfillsProposal`, `FulfillsReviewAction`, `FulfillsReviewStats`, `FulfillsReviewFilters`

### Task 2: Export types from mapping barrel
- **File:** `packages/types/src/mapping/index.ts`
- **Action:** Create barrel or edit to re-export from `fulfills-review.types.ts`

### Task 3: Build FulfillsReviewController
- **File:** `apps/server/src/controllers/fulfillsReview.controller.ts`
- **Action:** Class with `#fulfillsService` private field. Handlers: `getPendingProposals(req, res)` for GET /fulfills/pending, `reviewProposal(req, res)` for PATCH /fulfills/:id/review. Validates req.params.id with typeof string check.

### Task 4: Register fulfills review routes
- **File:** `apps/server/src/routes/fulfillsReview.routes.ts`
- **Action:** Wire controller with auth + RBAC middleware (AuthRole.INSTITUTIONAL_ADMIN).

### Task 5: Build FulfillsProposalCard molecule
- **File:** `apps/web/src/components/molecules/FulfillsProposalCard.tsx`
- **Action:** Named export `FulfillsProposalCard`. Card showing SLO/ILO info, proposer, justification, date, and approve/reject action buttons. Reject opens a textarea for required reason. Approve has optional note input.

### Task 6: Build FulfillsReviewStats molecule
- **File:** `apps/web/src/components/molecules/FulfillsReviewStats.tsx`
- **Action:** Named export `FulfillsReviewStats`. Three stat cards: Pending count, Approved this week, Rejected this week.

### Task 7: Build FulfillsReviewQueue organism
- **File:** `apps/web/src/components/organisms/FulfillsReviewQueue/FulfillsReviewQueue.tsx`
- **Action:** Named export `FulfillsReviewQueue`. Combines stats, filters (course, proposer, date range), sort controls, and scrollable proposal card list.

### Task 8: Build review queue page
- **File:** `apps/web/src/app/(protected)/institution/mapping/reviews/page.tsx`
- **Action:** Default export page. Renders FulfillsReviewQueue with page header.

### Task 9: Write controller tests
- **File:** `apps/server/src/tests/fulfillsReview.controller.test.ts`
- **Action:** 8-10 tests covering listing, approve, reject, filtering, audit trail, RBAC.

---

## 3. Data Model

```typescript
// packages/types/src/mapping/fulfills-review.types.ts

export type ReviewAction = 'approve' | 'reject';
export type ProposalStatus = 'pending' | 'approved' | 'rejected';

/** A FULFILLS proposal awaiting review */
export interface FulfillsProposal {
  readonly id: string;
  readonly slo_id: string;
  readonly slo_code: string;
  readonly slo_title: string;
  readonly ilo_id: string;
  readonly ilo_code: string;
  readonly ilo_title: string;
  readonly proposer_id: string;
  readonly proposer_name: string;
  readonly justification: string;
  readonly status: ProposalStatus;
  readonly course_id: string;
  readonly course_name: string;
  readonly submitted_at: string;         // ISO timestamp
  readonly reviewed_at?: string;         // ISO timestamp
  readonly reviewed_by?: string;
  readonly review_note?: string;
  readonly rejection_reason?: string;
}

/** Review action payload */
export interface FulfillsReviewAction {
  readonly action: ReviewAction;
  readonly note?: string;                // optional for approve
  readonly reason?: string;              // required for reject
}

/** Review statistics for the queue header */
export interface FulfillsReviewStats {
  readonly pending_count: number;
  readonly approved_this_week: number;
  readonly rejected_this_week: number;
}

/** Filter parameters for the review queue */
export interface FulfillsReviewFilters {
  readonly course_id?: string;
  readonly proposer_id?: string;
  readonly date_from?: string;           // ISO date
  readonly date_to?: string;             // ISO date
  readonly sort_by?: 'submitted_at' | 'course_name';
  readonly sort_order?: 'asc' | 'desc';
}
```

---

## 4. Database Schema

### Existing table: `fulfills_proposals` (created by STORY-IA-14)

Expected columns: `id`, `slo_id`, `ilo_id`, `proposer_id`, `justification`, `status`, `course_id`, `submitted_at`, `reviewed_at`, `reviewed_by`, `review_note`, `rejection_reason`, `institution_id`

### New table: `fulfills_reviews` (audit trail)

```sql
CREATE TABLE fulfills_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES fulfills_proposals(id),
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  reason TEXT,                                   -- required for reject
  note TEXT,                                     -- optional for approve
  institution_id UUID NOT NULL REFERENCES institutions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fulfills_reviews_proposal ON fulfills_reviews(proposal_id);
CREATE INDEX idx_fulfills_reviews_institution ON fulfills_reviews(institution_id, created_at DESC);

ALTER TABLE fulfills_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view own institution reviews"
  ON fulfills_reviews FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
```

---

## 5. API Contract

### GET /api/v1/fulfills/pending (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `course_id` | UUID | -- | Filter by course |
| `proposer_id` | UUID | -- | Filter by proposer |
| `date_from` | string | -- | Filter from date (ISO) |
| `date_to` | string | -- | Filter to date (ISO) |
| `sort_by` | string | `submitted_at` | Sort field |
| `sort_order` | string | `desc` | Sort direction |

**Success Response (200):**
```json
{
  "data": {
    "proposals": [
      {
        "id": "prop-uuid-1",
        "slo_id": "slo-uuid-1",
        "slo_code": "SLO-101",
        "slo_title": "Describe cardiac physiology",
        "ilo_id": "ilo-uuid-1",
        "ilo_code": "ILO-1",
        "ilo_title": "Apply biomedical sciences",
        "proposer_id": "faculty-uuid-1",
        "proposer_name": "Dr. Johnson",
        "justification": "SLO-101 directly supports ILO-1 by covering cardiac physiology fundamentals",
        "status": "pending",
        "course_id": "course-uuid-1",
        "course_name": "Anatomy I",
        "submitted_at": "2026-02-18T10:00:00Z"
      }
    ],
    "stats": {
      "pending_count": 12,
      "approved_this_week": 8,
      "rejected_this_week": 2
    }
  },
  "error": null
}
```

### PATCH /api/v1/fulfills/:id/review (Auth: InstitutionalAdmin)

**Request Body:**
```json
{
  "action": "reject",
  "reason": "SLO-101 more closely aligns with ILO-3. Please resubmit."
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "prop-uuid-1",
    "status": "rejected",
    "reviewed_at": "2026-02-19T14:00:00Z",
    "reviewed_by": "ia-uuid-1",
    "rejection_reason": "SLO-101 more closely aligns with ILO-3. Please resubmit."
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin |
| 400 | `VALIDATION_ERROR` | Reject without reason, invalid action |
| 404 | `NOT_FOUND` | Proposal not found |

---

## 6. Frontend Spec

### Page: `/institution/mapping/reviews`

**Component hierarchy:**
```
FulfillsReviewPage (page.tsx -- default export)
  ├── PageHeader ("FULFILLS Review Queue")
  └── FulfillsReviewQueue (Organism)
        ├── FulfillsReviewStats (Molecule)
        │     ├── StatCard ("Pending": 12, yellow)
        │     ├── StatCard ("Approved This Week": 8, green)
        │     └── StatCard ("Rejected This Week": 2, red)
        ├── FilterBar
        │     ├── CourseSelect
        │     ├── ProposerSelect
        │     ├── DateRangePicker
        │     └── SortSelect
        └── ProposalList (scrollable)
              └── FulfillsProposalCard × N (Molecule)
                    ├── SLO info (code, title)
                    ├── ILO info (code, title)
                    ├── Proposer name + submitted date
                    ├── Justification text
                    ├── ApproveButton (green, optional note input)
                    └── RejectButton (red, required reason textarea)
```

**States:**
1. **Loading** -- Skeleton cards
2. **Data** -- Scrollable list of proposal cards with stats
3. **Approving** -- Inline note input expanded, spinner on confirm
4. **Rejecting** -- Inline reason textarea expanded, required validation
5. **Empty** -- "No pending proposals" celebration state
6. **Error** -- Error message with retry

**Design tokens:**
- Pending badge: `#eab308` (yellow)
- Approved badge: `#69a338` (green)
- Rejected badge: `#dc2626` (red)
- Card: `--color-surface-primary`, `--shadow-sm`, `--radius-md`
- SLO/ILO code: `--font-family-mono`, `--font-size-sm`
- Justification: `--font-size-sm`, `--color-text-secondary`, italic

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/mapping/fulfills-review.types.ts` | Types | Create |
| 2 | `packages/types/src/mapping/index.ts` | Types | Create |
| 3 | `apps/server/src/controllers/fulfillsReview.controller.ts` | Controller | Create |
| 4 | `apps/server/src/routes/fulfillsReview.routes.ts` | Route | Create |
| 5 | `apps/web/src/components/molecules/FulfillsProposalCard.tsx` | Molecule | Create |
| 6 | `apps/web/src/components/molecules/FulfillsReviewStats.tsx` | Molecule | Create |
| 7 | `apps/web/src/components/organisms/FulfillsReviewQueue/FulfillsReviewQueue.tsx` | Organism | Create |
| 8 | `apps/web/src/app/(protected)/institution/mapping/reviews/page.tsx` | Page | Create |
| 9 | `apps/server/src/tests/fulfillsReview.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-14 | institutional_admin | **PENDING** | FULFILLS Workflow Service creates proposals that this queue reviews |

### NPM Packages
- No new packages expected

### Existing Files Needed
- `apps/server/src/services/fulfills.service.ts` -- FULFILLS workflow service (from STORY-IA-14)
- `apps/server/src/middleware/auth.middleware.ts` -- JWT authentication
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC enforcement
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/card.tsx` -- shadcn/ui Card
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button
- `apps/web/src/components/ui/textarea.tsx` -- shadcn/ui Textarea for rejection reason
- `apps/web/src/components/ui/badge.tsx` -- shadcn/ui Badge for status

---

## 9. Test Fixtures

```typescript
export const MOCK_PROPOSALS: FulfillsProposal[] = [
  {
    id: "prop-uuid-1",
    slo_id: "slo-uuid-1",
    slo_code: "SLO-101",
    slo_title: "Describe cardiac physiology",
    ilo_id: "ilo-uuid-1",
    ilo_code: "ILO-1",
    ilo_title: "Apply biomedical sciences",
    proposer_id: "faculty-uuid-1",
    proposer_name: "Dr. Johnson",
    justification: "SLO-101 directly supports ILO-1 by covering cardiac physiology fundamentals",
    status: "pending",
    course_id: "course-uuid-1",
    course_name: "Anatomy I",
    submitted_at: "2026-02-18T10:00:00Z",
  },
  {
    id: "prop-uuid-2",
    slo_id: "slo-uuid-2",
    slo_code: "SLO-201",
    slo_title: "Explain pharmacokinetics",
    ilo_id: "ilo-uuid-2",
    ilo_code: "ILO-3",
    ilo_title: "Apply pharmacological principles",
    proposer_id: "faculty-uuid-2",
    proposer_name: "Dr. Smith",
    justification: "Pharmacokinetics is a core component of pharmacological principles",
    status: "pending",
    course_id: "course-uuid-2",
    course_name: "Pharmacology I",
    submitted_at: "2026-02-17T15:00:00Z",
  },
];

export const MOCK_REVIEW_STATS: FulfillsReviewStats = {
  pending_count: 12,
  approved_this_week: 8,
  rejected_this_week: 2,
};

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/fulfillsReview.controller.test.ts`

```
describe("GET /api/v1/fulfills/pending")
  it("returns 200 with pending proposals and stats for institutional_admin")
  it("filters proposals by course_id")
  it("filters proposals by proposer_id")
  it("filters proposals by date range")
  it("sorts proposals by submitted_at descending by default")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")

describe("PATCH /api/v1/fulfills/:id/review")
  it("approves proposal with optional note and creates audit record")
  it("rejects proposal with required reason and creates audit record")
  it("returns 400 when rejecting without a reason")
  it("returns 404 for non-existent proposal")
```

**Total: ~11 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. The review queue is an internal admin workflow. API tests provide sufficient coverage.

---

## 12. Acceptance Criteria

1. Review queue page lists all pending FULFILLS proposals for the institution
2. Each proposal shows: SLO code/title, ILO code/title, proposer name, justification, submitted date
3. Approve action accepts optional note and updates proposal status
4. Reject action requires a reason and updates proposal status
5. Proposals filterable by course, proposer, and date range
6. Proposals sortable by submission date and course name
7. Review statistics display: pending count, approved this week, rejected this week
8. Approval/rejection creates audit trail record in fulfills_reviews table
9. All ~11 API tests pass
10. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| FULFILLS review queue concept | S-IA-15-4 User Story |
| Proposal card content | S-IA-15-4 Acceptance Criteria |
| Reject reason required | S-IA-15-4 Notes |
| Audit trail in fulfills_reviews | S-IA-15-4 Notes |
| UI mirrors Concept Review Queue | S-IA-15-4 Notes |
| RBAC at controller level | S-IA-15-4 Notes |
| Blocked by FULFILLS workflow service | S-IA-15-4 Dependencies |

---

## 14. Environment Prerequisites

- **Express:** Server running with fulfills routes registered
- **Supabase:** fulfills_proposals and fulfills_reviews tables created
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim
- **RBAC:** institutional_admin role required for all endpoints
- **Prerequisite data:** FULFILLS proposals exist (from STORY-IA-14)

---

## 15. Figma Make Prototype

No Figma prototype for this story. Mirror the Concept Review Queue pattern (S-F-13-1) for layout consistency. Use card-based proposal list with inline action buttons.
