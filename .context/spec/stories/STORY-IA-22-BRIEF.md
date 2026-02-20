# STORY-IA-22 Brief: SLO-to-ILO Linking

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-22
old_id: S-IA-09-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 22
sprint: 4
size: M
depends_on:
  - STORY-IA-2 (institutional_admin) — SLO Model & Repository (SLOs must exist)
  - STORY-F-1 (faculty, cross-lane) — Course CRUD (courses must exist for SLOs)
blocks: []
personas_served: [institutional_admin, faculty]
epic: E-09 (Course SLO Linking & Scheduling)
feature: F-04 (Course & Section Management)
user_flow: UF-12 (SLO Management)
```

---

## 1. Summary

Build the **SLO-to-ILO FULFILLS linking** backend: types, repository, and service for creating, reading, and deleting FULFILLS proposals between SLOs and ILOs. This is the lightweight approval gate version -- Course Director proposes, Institutional Admin approves/rejects. (The more formal 2-step workflow with draft state and re-proposal is STORY-IA-14.) The FULFILLS relationship is tracked in both Supabase (tracking table) and Neo4j (`(SLO)-[:FULFILLS]->(ILO)`) via DualWrite.

Key constraints:
- **FULFILLS relationship:** `(SLO)-[:FULFILLS {status}]->(ILO)` in Neo4j
- **Proposal states:** proposed, approved, rejected (no draft state in this version)
- **Approval gate:** Course Director proposes, Institutional Admin approves/rejects
- **DualWrite:** Supabase tracking table first, Neo4j relationship second
- **Validation:** SLO must belong to a course in the same institution as the ILO
- **ILO and SLO are SEPARATE node types** (architecture rule)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Errors -> Repository -> Service -> Tests**

### Task 1: Create FULFILLS types
- **File:** `packages/types/src/objective/fulfills.types.ts`
- **Action:** Export `FulfillsStatus`, `FulfillsLink`, `CreateFulfillsRequest`, `ApproveFulfillsRequest`, `RejectFulfillsRequest`, `FulfillsListQuery`, `FulfillsListResponse`

### Task 2: Update objective barrel export
- **File:** `packages/types/src/objective/index.ts`
- **Action:** Re-export from `fulfills.types.ts`

### Task 3: Create FULFILLS error classes
- **File:** `apps/server/src/errors/fulfills.error.ts`
- **Action:** Create `FulfillsError`, `DuplicateFulfillsError`, `FulfillsNotFoundError`, `CrossInstitutionFulfillsError`, `FulfillsInvalidStateError` extending `JourneyOSError`

### Task 4: Build FulfillsRepository
- **File:** `apps/server/src/repositories/fulfills.repository.ts`
- **Action:** `create()`, `findById()`, `findBySloId()`, `findByIloId()`, `updateStatus()`, `delete()`, `existsActiveLink()`. Supabase operations on `fulfills_links` table.

### Task 5: Build FulfillsService
- **File:** `apps/server/src/services/fulfills.service.ts`
- **Action:** `propose(sloId, iloId, proposedBy)`, `approve(linkId, reviewedBy, note)`, `reject(linkId, reviewedBy, note)`, `findBySlo(sloId)`, `findByIlo(iloId)`. DualWrite on approval.

### Task 6: Write service tests
- **File:** `apps/server/src/tests/fulfills.service.test.ts`
- **Action:** 10-12 tests covering proposal, approval, rejection, validation, cross-institution block

---

## 3. Data Model

```typescript
// packages/types/src/objective/fulfills.types.ts

/** FULFILLS link status */
export type FulfillsStatus = "proposed" | "approved" | "rejected";

/** A FULFILLS link between an SLO and an ILO */
export interface FulfillsLink {
  readonly id: string;
  readonly slo_id: string;
  readonly ilo_id: string;
  readonly institution_id: string;
  readonly status: FulfillsStatus;
  readonly proposed_by: string;        // Course Director UUID
  readonly proposed_at: string;
  readonly reviewed_by: string | null; // Institutional Admin UUID
  readonly reviewed_at: string | null;
  readonly review_note: string | null;
  readonly graph_rel_id: string | null;
  readonly sync_status: "pending" | "synced" | "failed";
  readonly created_at: string;
  readonly updated_at: string;
}

/** Request to propose a new FULFILLS link */
export interface CreateFulfillsRequest {
  readonly slo_id: string;
  readonly ilo_id: string;
}

/** Request to approve a FULFILLS proposal */
export interface ApproveFulfillsRequest {
  readonly note?: string;
}

/** Request to reject a FULFILLS proposal */
export interface RejectFulfillsRequest {
  readonly note: string;   // Required for rejection
}

/** Query parameters for FULFILLS list */
export interface FulfillsListQuery {
  readonly slo_id?: string;
  readonly ilo_id?: string;
  readonly institution_id: string;
  readonly status?: FulfillsStatus;
  readonly page?: number;    // Default: 1
  readonly limit?: number;   // Default: 50
}

/** Paginated FULFILLS list response */
export interface FulfillsListResponse {
  readonly links: readonly FulfillsLink[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

---

## 4. Database Schema

```sql
-- Migration: create_fulfills_links
CREATE TABLE fulfills_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slo_id UUID NOT NULL REFERENCES student_learning_objectives(id),
  ilo_id UUID NOT NULL REFERENCES student_learning_objectives(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'rejected')),
  proposed_by UUID NOT NULL REFERENCES profiles(id),
  proposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  graph_rel_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate active links for same SLO-ILO pair
CREATE UNIQUE INDEX idx_fulfills_active_link
  ON fulfills_links(slo_id, ilo_id)
  WHERE status IN ('proposed', 'approved');

-- Query performance indexes
CREATE INDEX idx_fulfills_links_slo
  ON fulfills_links(slo_id);
CREATE INDEX idx_fulfills_links_ilo
  ON fulfills_links(ilo_id);
CREATE INDEX idx_fulfills_links_institution
  ON fulfills_links(institution_id, status);
CREATE INDEX idx_fulfills_links_proposed_by
  ON fulfills_links(proposed_by);

-- RLS
ALTER TABLE fulfills_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY fulfills_links_institution_scope ON fulfills_links
  USING (institution_id = current_setting('app.institution_id')::UUID);
```

**Neo4j schema (on approval):**
```cypher
// Create FULFILLS relationship when approved
MATCH (slo:SLO {id: $sloId}), (ilo:ILO {id: $iloId})
CREATE (slo)-[:FULFILLS {
  link_id: $linkId,
  status: 'approved',
  approved_by: $reviewerId,
  approved_at: datetime()
}]->(ilo)

// Remove FULFILLS relationship on rejection/deletion
MATCH (slo:SLO {id: $sloId})-[r:FULFILLS]->(ilo:ILO {id: $iloId})
DELETE r
```

**Cross-institution validation query:**
```sql
-- Verify SLO and ILO belong to the same institution
SELECT
  slo.institution_id AS slo_institution,
  ilo.institution_id AS ilo_institution
FROM student_learning_objectives slo, student_learning_objectives ilo
WHERE slo.id = $slo_id AND slo.scope = 'session'
  AND ilo.id = $ilo_id AND ilo.scope = 'institutional'
  AND slo.institution_id = ilo.institution_id;
```

---

## 5. API Contract

No API endpoints in this story. This is a **repository + service** story. The controller/routes are added when a UI story consumes this service. The service exposes:

```typescript
class FulfillsService {
  async propose(request: CreateFulfillsRequest, proposedBy: string, institutionId: string): Promise<FulfillsLink>;
  async approve(linkId: string, reviewedBy: string, note?: string): Promise<FulfillsLink>;
  async reject(linkId: string, reviewedBy: string, note: string): Promise<FulfillsLink>;
  async findBySlo(sloId: string, query?: FulfillsListQuery): Promise<FulfillsListResponse>;
  async findByIlo(iloId: string, query?: FulfillsListQuery): Promise<FulfillsListResponse>;
  async findById(id: string): Promise<FulfillsLink>;
}
```

---

## 6. Frontend Spec

No frontend components in this story. This is backend-only.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/objective/fulfills.types.ts` | Types | Create |
| 2 | `packages/types/src/objective/index.ts` | Types | Edit (add fulfills export) |
| 3 | Supabase migration via MCP (fulfills_links table) | Database | Apply |
| 4 | `apps/server/src/errors/fulfills.error.ts` | Errors | Create |
| 5 | `apps/server/src/repositories/fulfills.repository.ts` | Repository | Create |
| 6 | `apps/server/src/services/fulfills.service.ts` | Service | Create |
| 7 | `apps/server/src/tests/fulfills.service.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-2 | institutional_admin | **PENDING** | SLO model and repository must exist |
| STORY-F-1 | faculty | **PENDING** | Courses must exist (SLOs belong to courses) |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/objective/slo.types.ts` -- SLO types (from IA-2)
- `packages/types/src/objective/ilo.types.ts` -- ILO types (from IA-4)
- `apps/server/src/repositories/ilo.repository.ts` -- ILO repository (from IA-4)
- `apps/server/src/repositories/slo.repository.ts` -- SLO repository (from IA-2)

---

## 9. Test Fixtures

```typescript
import { FulfillsLink, CreateFulfillsRequest, FulfillsStatus } from "@journey-os/types";

// Mock Course Director (proposes)
export const COURSE_DIRECTOR_USER = {
  sub: "cd-uuid-1",
  email: "cd@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
};

// Mock Institutional Admin (reviews)
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Mock SLO (course-scoped)
export const MOCK_SLO = {
  id: "slo-uuid-1",
  code: "SLO-PHYS-101-01",
  title: "Describe cardiovascular physiology",
  course_id: "course-uuid-1",
  institution_id: "inst-uuid-1",
  scope: "session" as const,
};

// Mock ILO (institution-scoped)
export const MOCK_ILO = {
  id: "ilo-uuid-1",
  code: "ILO-MSM-01",
  title: "Demonstrate patient-centered communication",
  institution_id: "inst-uuid-1",
  scope: "institutional" as const,
};

// Mock SLO from different institution (for cross-institution test)
export const MOCK_OTHER_INST_SLO = {
  ...MOCK_SLO,
  id: "slo-uuid-other",
  institution_id: "inst-uuid-2",
};

// Valid proposal request
export const VALID_FULFILLS_REQUEST: CreateFulfillsRequest = {
  slo_id: "slo-uuid-1",
  ilo_id: "ilo-uuid-1",
};

// Mock proposed link
export const MOCK_PROPOSED_LINK: FulfillsLink = {
  id: "link-uuid-1",
  slo_id: "slo-uuid-1",
  ilo_id: "ilo-uuid-1",
  institution_id: "inst-uuid-1",
  status: "proposed",
  proposed_by: "cd-uuid-1",
  proposed_at: "2026-02-19T10:00:00Z",
  reviewed_by: null,
  reviewed_at: null,
  review_note: null,
  graph_rel_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock approved link
export const MOCK_APPROVED_LINK: FulfillsLink = {
  ...MOCK_PROPOSED_LINK,
  status: "approved",
  reviewed_by: "ia-uuid-1",
  reviewed_at: "2026-02-19T11:00:00Z",
  review_note: "Alignment verified",
  graph_rel_id: "neo4j-rel-123",
  sync_status: "synced",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/fulfills.service.test.ts`

```
describe("FulfillsService")
  describe("propose")
    it("creates FULFILLS link in Supabase with status='proposed'")
    it("validates SLO and ILO belong to the same institution")
    it("throws CrossInstitutionFulfillsError when institutions differ")
    it("throws DuplicateFulfillsError when active link exists for same SLO-ILO pair")
    it("validates SLO has scope='session' and ILO has scope='institutional'")
  describe("approve")
    it("transitions link from proposed to approved")
    it("creates FULFILLS relationship in Neo4j via DualWrite")
    it("sets sync_status to 'synced' after successful DualWrite")
    it("sets sync_status to 'failed' when Neo4j write fails")
    it("throws FulfillsInvalidStateError when link is not in proposed state")
  describe("reject")
    it("transitions link from proposed to rejected with required note")
    it("throws FulfillsInvalidStateError when link is not in proposed state")
  describe("findBySlo")
    it("returns all FULFILLS links for a given SLO")
  describe("findByIlo")
    it("returns all FULFILLS links for a given ILO with pagination")
```

**Total: ~14 tests**

---

## 11. E2E Test Spec

Not required for this story. This is a backend-only repository/service story with no UI.

---

## 12. Acceptance Criteria

1. FULFILLS types exported from `@journey-os/types`
2. `fulfills_links` table created in Supabase with correct schema
3. Proposal creates a FULFILLS link with `status='proposed'`
4. Approval transitions to `status='approved'` and creates Neo4j relationship
5. Rejection transitions to `status='rejected'` with required note
6. DualWrite: Supabase first, Neo4j second, sync_status tracked
7. Cross-institution FULFILLS links are rejected
8. Duplicate active links for same SLO-ILO pair are rejected
9. SLO must have `scope='session'`, ILO must have `scope='institutional'`
10. ILO and SLO are separate node types in Neo4j (FULFILLS goes from SLO to ILO)
11. Audit fields: proposed_by, proposed_at, reviewed_by, reviewed_at, review_note
12. All 14 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| FULFILLS relationship direction | S-IA-09-1: `(SLO)-[:FULFILLS]->(ILO)` |
| ILO and SLO are separate node types | CLAUDE.md Architecture Rules |
| Approval gate: propose + approve/reject | S-IA-09-1 Acceptance Criteria |
| DualWrite pattern | CLAUDE.md Database Rules |
| Audit fields | S-IA-09-1 Notes |
| Cross-institution validation | S-IA-09-1 Acceptance Criteria |
| Lightweight workflow (no draft state) | S-IA-09-1 Notes |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `student_learning_objectives` and `institutions` tables exist
- **Neo4j:** Instance running with SLO and ILO nodes (IA-2 and IA-4 complete)
- **Express:** Server running on port 3001
- **STORY-IA-2 must be complete** -- SLO model/repository
- **STORY-F-1 must be complete** -- courses must exist for SLOs

---

## 15. Implementation Notes

- **Lightweight vs formal workflow:** This story (IA-22) implements the simple version: propose -> approve/reject. No draft state, no re-proposal. STORY-IA-14 builds on top of this with draft state, justification text, and re-proposal capability. If implementing IA-14 after IA-22, IA-14 can extend or replace this.
- **Cross-institution validation:** Before creating a link, verify that `SLO.institution_id === ILO.institution_id`. The SLO's institution is determined by the course it belongs to. Use a join query or lookup both records.
- **Scope validation:** The SLO must have `scope='session'` and the ILO must have `scope='institutional'`. This prevents accidentally linking two SLOs or two ILOs.
- **Neo4j relationship properties:** The FULFILLS relationship includes `link_id`, `status`, `approved_by`, `approved_at` as properties. This allows querying approved links directly in Neo4j.
- **DualWrite on approval only:** The Neo4j relationship is only created when a link is approved. Proposed and rejected links are Supabase-only.
- **Unique constraint:** The partial unique index on `(slo_id, ilo_id) WHERE status IN ('proposed', 'approved')` prevents duplicate active links but allows re-linking after rejection.
- **Private fields pattern:** `FulfillsService` uses `readonly #supabaseClient`, `readonly #neo4jClient`, `readonly #fulfillsRepo` with constructor DI.
- **No controller/routes:** This story builds the domain layer only. API endpoints come from downstream UI stories.
