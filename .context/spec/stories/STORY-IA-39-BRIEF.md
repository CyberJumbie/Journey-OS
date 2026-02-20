# STORY-IA-39 Brief: Report Snapshot Service

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-39
old_id: S-IA-31-1
epic: E-31 (LCME Report Export)
feature: F-14 (LCME Compliance & Reporting)
sprint: 39
lane: institutional_admin
lane_priority: 2
within_lane_order: 39
size: M
depends_on:
  - STORY-IA-27 (institutional_admin) — Compliance computation data to snapshot
blocks:
  - STORY-IA-43 — PDF Export (needs snapshot data)
  - STORY-IA-44 — Snapshot Comparison (needs multiple snapshots)
personas_served: [institutional_admin]
```

---

## Section 1: Summary

**What to build:** A `SnapshotService` that captures point-in-time LCME compliance snapshots as immutable records. Institutional admins can create a snapshot (capturing the full current compliance state), list past snapshots, and view snapshot details. Snapshots are stored as JSONB in Supabase and are immutable after creation.

**Parent epic:** E-31 (LCME Report Export) under F-14 (LCME Compliance & Reporting). This is the foundational story for the report export pipeline: snapshots feed into PDF export (IA-43) and snapshot comparison (IA-44).

**User story:** As an institutional admin, I need to capture point-in-time compliance snapshots so that I can track compliance changes over time and prepare for LCME site visits.

**Key constraints:**
- Snapshots are immutable after creation (no edits/updates)
- JSONB column stores full compliance data (standards, elements, scores, evidence chains)
- Auto-named with "YYYY-MM-DD HH:mm" format, optional custom label
- 7-year retention policy (LCME accreditation cycle)
- Soft limit of 100 snapshots per institution with warning
- API: POST (create), GET list, GET detail

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Snapshot types | `packages/types/src/compliance/snapshot.types.ts` | 1h |
| 2 | Types barrel export | `packages/types/src/compliance/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | Supabase migration: compliance_snapshots table | Supabase MCP | 30m |
| 5 | Snapshot error classes | `apps/server/src/errors/compliance.error.ts` | 20m |
| 6 | SnapshotRepository | `apps/server/src/modules/compliance/repositories/snapshot.repository.ts` | 1.5h |
| 7 | SnapshotService | `apps/server/src/modules/compliance/services/snapshot.service.ts` | 2h |
| 8 | SnapshotController | `apps/server/src/modules/compliance/controllers/snapshot.controller.ts` | 1.5h |
| 9 | Snapshot routes | `apps/server/src/modules/compliance/routes/snapshot.routes.ts` | 30m |
| 10 | Register routes | `apps/server/src/index.ts` | 15m |
| 11 | SnapshotList component | `apps/web/src/components/compliance/snapshot-list.tsx` | 1.5h |
| 12 | CreateSnapshotButton component | `apps/web/src/components/compliance/create-snapshot-button.tsx` | 1h |
| 13 | Repository tests | `apps/server/src/modules/compliance/__tests__/snapshot.repository.test.ts` | 1.5h |
| 14 | Service tests | `apps/server/src/modules/compliance/__tests__/snapshot.service.test.ts` | 2h |

**Total estimate:** ~13.5h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/compliance/snapshot.types.ts

/** Compliance snapshot record */
export interface ComplianceSnapshot {
  readonly id: string;
  readonly institution_id: string;
  readonly label: string;
  readonly compliance_data: ComplianceSnapshotData;
  readonly overall_score: number;
  readonly created_by: string;
  readonly created_at: string;
}

/** Full compliance data stored as JSONB */
export interface ComplianceSnapshotData {
  readonly overall_score: number;
  readonly standards: readonly StandardCompliance[];
  readonly computed_at: string;
}

/** Per-standard compliance */
export interface StandardCompliance {
  readonly standard_id: string;
  readonly standard_name: string;
  readonly standard_number: number;
  readonly aggregate_score: number;
  readonly elements: readonly ElementCompliance[];
}

/** Per-element compliance within a standard */
export interface ElementCompliance {
  readonly element_id: string;
  readonly element_number: string;
  readonly element_description: string;
  readonly compliance_score: number;
  readonly status: ComplianceStatus;
  readonly evidence_count: number;
  readonly total_expected: number;
  readonly evidence_chain_summary: string;
}

/** Compliance status enum */
export type ComplianceStatus = "met" | "partial" | "unmet";

/** Create snapshot request */
export interface CreateSnapshotRequest {
  readonly label?: string;
}

/** Snapshot list query */
export interface SnapshotListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_dir?: "asc" | "desc";
}

/** Snapshot list item (without full compliance_data) */
export interface SnapshotListItem {
  readonly id: string;
  readonly institution_id: string;
  readonly label: string;
  readonly overall_score: number;
  readonly created_by: string;
  readonly created_at: string;
}
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_compliance_snapshots_table
CREATE TABLE compliance_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    label TEXT NOT NULL,
    compliance_data JSONB NOT NULL,
    overall_score NUMERIC(5, 2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No updated_at: snapshots are immutable
-- No update/delete policies: snapshots cannot be modified

-- Indexes
CREATE INDEX idx_compliance_snapshots_institution_id
  ON compliance_snapshots(institution_id);
CREATE INDEX idx_compliance_snapshots_created_at
  ON compliance_snapshots(created_at DESC);
CREATE INDEX idx_compliance_snapshots_institution_created
  ON compliance_snapshots(institution_id, created_at DESC);

-- RLS
ALTER TABLE compliance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Institutional admin reads own institution snapshots" ON compliance_snapshots
    FOR SELECT USING (
        institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('institutional_admin', 'superadmin')
    );

CREATE POLICY "Institutional admin creates snapshots" ON compliance_snapshots
    FOR INSERT WITH CHECK (
        institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'institutional_admin'
    );

CREATE POLICY "SuperAdmin full access to snapshots" ON compliance_snapshots
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

---

## Section 5: API Contract (complete request/response)

### POST /api/v1/compliance/snapshots (Auth: institutional_admin)

**Request:**
```json
{
  "label": "Pre-site visit snapshot"
}
```

If `label` is omitted, auto-generates: `"2026-02-19 14:30"`.

**Success Response (201):**
```json
{
  "data": {
    "id": "snap-uuid-1",
    "institution_id": "inst-uuid-1",
    "label": "Pre-site visit snapshot",
    "overall_score": 78.5,
    "created_by": "admin-uuid-1",
    "created_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### GET /api/v1/compliance/snapshots (Auth: institutional_admin)

**Query params:** `?page=1&limit=20&sort_dir=desc`

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "snap-uuid-1",
      "institution_id": "inst-uuid-1",
      "label": "Pre-site visit snapshot",
      "overall_score": 78.5,
      "created_by": "admin-uuid-1",
      "created_at": "2026-02-19T14:30:00Z"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 20, "total": 5, "total_pages": 1 }
}
```

### GET /api/v1/compliance/snapshots/:id (Auth: institutional_admin)

**Success Response (200):**
```json
{
  "data": {
    "id": "snap-uuid-1",
    "institution_id": "inst-uuid-1",
    "label": "Pre-site visit snapshot",
    "compliance_data": {
      "overall_score": 78.5,
      "standards": [
        {
          "standard_id": "std-1",
          "standard_name": "Mission, Planning, and Integration",
          "standard_number": 1,
          "aggregate_score": 92.0,
          "elements": [
            {
              "element_id": "elem-1-1",
              "element_number": "1.1",
              "element_description": "Strategic Planning and Continuous Quality Improvement",
              "compliance_score": 100,
              "status": "met",
              "evidence_count": 5,
              "total_expected": 5,
              "evidence_chain_summary": "5/5 evidence chains complete"
            }
          ]
        }
      ],
      "computed_at": "2026-02-19T14:29:55Z"
    },
    "overall_score": 78.5,
    "created_by": "admin-uuid-1",
    "created_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-institutional_admin role |
| 404 | `SNAPSHOT_NOT_FOUND` | Snapshot ID does not exist |
| 409 | `SNAPSHOT_LIMIT_REACHED` | Institution has 100+ snapshots (soft limit warning) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

### Components (integrated into existing compliance page)

**SnapshotList component:** `apps/web/src/components/compliance/snapshot-list.tsx`

```
SnapshotList (organism)
  +-- SnapshotHeader
  |     +-- Title ("Compliance Snapshots")
  |     +-- CreateSnapshotButton
  +-- SnapshotTable
  |     +-- SnapshotRow (label, overall score, created date, created by)
  |     +-- ScoreBadge (green >= 80, yellow 50-79, red < 50)
  +-- Pagination
  +-- EmptyState ("No snapshots yet. Create your first snapshot.")
```

**CreateSnapshotButton:** `apps/web/src/components/compliance/create-snapshot-button.tsx`

```
CreateSnapshotButton
  +-- Button ("Take Snapshot")
  +-- Dialog (optional label input)
  +-- Loading spinner during creation
  +-- Success toast with snapshot label
  +-- Warning toast if approaching 100-snapshot limit
```

**States:**
1. **Loading** -- Skeleton table
2. **Empty** -- "No snapshots" with create CTA
3. **Data** -- Table with snapshots
4. **Creating** -- Button disabled with spinner
5. **Limit warning** -- Toast when 90+ snapshots

**Design tokens:**
- Score badges: met = `#69a338`, partial = `warning-amber`, unmet = `error-red`
- Surface: White card on Cream `#f5f3ef`
- Typography: Source Sans 3

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/compliance/snapshot.types.ts` | Types | Create |
| 2 | `packages/types/src/compliance/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add compliance export) |
| 4 | Supabase migration via MCP (compliance_snapshots table) | Database | Apply |
| 5 | `apps/server/src/errors/compliance.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add compliance errors) |
| 7 | `apps/server/src/modules/compliance/repositories/snapshot.repository.ts` | Repository | Create |
| 8 | `apps/server/src/modules/compliance/services/snapshot.service.ts` | Service | Create |
| 9 | `apps/server/src/modules/compliance/controllers/snapshot.controller.ts` | Controller | Create |
| 10 | `apps/server/src/modules/compliance/routes/snapshot.routes.ts` | Routes | Create |
| 11 | `apps/server/src/index.ts` | Routes | Edit (add compliance routes) |
| 12 | `apps/web/src/components/compliance/snapshot-list.tsx` | Component | Create |
| 13 | `apps/web/src/components/compliance/create-snapshot-button.tsx` | Component | Create |
| 14 | `apps/server/src/modules/compliance/__tests__/snapshot.repository.test.ts` | Tests | Create |
| 15 | `apps/server/src/modules/compliance/__tests__/snapshot.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-27 | institutional_admin | **NOT YET** | Compliance computation service that generates the data to snapshot |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `zod` -- Request validation
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware` with `AuthRole` enum
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- Compliance computation service (from STORY-IA-27) -- provides current compliance data

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock Institutional Admin
export const INST_ADMIN_USER = {
  sub: "admin-uuid-1",
  email: "admin@med.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock compliance data for snapshot
export const MOCK_COMPLIANCE_DATA = {
  overall_score: 78.5,
  standards: [
    {
      standard_id: "std-1",
      standard_name: "Mission, Planning, and Integration",
      standard_number: 1,
      aggregate_score: 92.0,
      elements: [
        {
          element_id: "elem-1-1",
          element_number: "1.1",
          element_description: "Strategic Planning",
          compliance_score: 100,
          status: "met" as const,
          evidence_count: 5,
          total_expected: 5,
          evidence_chain_summary: "5/5 complete",
        },
        {
          element_id: "elem-1-2",
          element_number: "1.2",
          element_description: "Institutional Effectiveness",
          compliance_score: 84,
          status: "partial" as const,
          evidence_count: 4,
          total_expected: 5,
          evidence_chain_summary: "4/5 complete",
        },
      ],
    },
  ],
  computed_at: "2026-02-19T14:29:55Z",
};

// Mock snapshot list items
export const MOCK_SNAPSHOTS = [
  {
    id: "snap-1",
    institution_id: "inst-uuid-1",
    label: "Pre-site visit",
    overall_score: 78.5,
    created_by: "admin-uuid-1",
    created_at: "2026-02-19T14:30:00Z",
  },
  {
    id: "snap-2",
    institution_id: "inst-uuid-1",
    label: "2026-02-01 10:00",
    overall_score: 72.3,
    created_by: "admin-uuid-1",
    created_at: "2026-02-01T10:00:00Z",
  },
];
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/compliance/__tests__/snapshot.service.test.ts`

```
describe("SnapshotService")
  describe("create")
    + captures current compliance state from computation service
    + stores compliance data as JSONB in Supabase
    + auto-generates label when not provided (YYYY-MM-DD HH:mm)
    + uses custom label when provided
    + sets created_by from authenticated user
    + returns snapshot without full compliance_data (list item shape)
    + warns when institution has 90+ snapshots (approaching limit)
    + returns 409 when institution has 100+ snapshots

  describe("list")
    + returns paginated snapshot list without compliance_data
    + defaults to page=1, limit=20, sort by created_at desc
    + scopes to user's institution

  describe("getById")
    + returns full snapshot with compliance_data
    + returns 404 for non-existent snapshot
    + rejects access to snapshot from different institution
```

**File:** `apps/server/src/modules/compliance/__tests__/snapshot.repository.test.ts`

```
describe("SnapshotRepository")
  describe("create")
    + inserts snapshot with JSONB compliance data
    + returns created snapshot record
  describe("findByInstitution")
    + returns paginated results ordered by created_at desc
    + excludes compliance_data from list results
  describe("findById")
    + returns full snapshot including compliance_data
    + returns null for non-existent id
  describe("countByInstitution")
    + returns count of snapshots for institution
```

**Total: ~18 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will be added when the full LCME report pipeline (snapshot + PDF export + comparison) is complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | POST creates immutable snapshot with current compliance data | API test |
| 2 | Snapshot compliance_data stored as JSONB | API test |
| 3 | Auto-generated label uses "YYYY-MM-DD HH:mm" format | API test |
| 4 | Custom label accepted when provided | API test |
| 5 | GET list returns snapshots without compliance_data (performance) | API test |
| 6 | GET detail returns full snapshot with compliance_data | API test |
| 7 | Snapshots scoped to user's institution | API test |
| 8 | 100-snapshot soft limit enforced with 409 error | API test |
| 9 | Non-institutional_admin roles receive 403 | API test |
| 10 | All ~18 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Point-in-time compliance snapshots | S-IA-31-1 SS User Story |
| Snapshot fields and JSONB storage | S-IA-31-1 SS Acceptance Criteria |
| 7-year retention policy | S-IA-31-1 SS Acceptance Criteria |
| 100 snapshot limit per institution | S-IA-31-1 SS Acceptance Criteria |
| Immutable after creation | S-IA-31-1 SS Acceptance Criteria |
| API endpoints (POST, GET list, GET detail) | S-IA-31-1 SS Acceptance Criteria |
| Blocks PDF export and comparison | S-IA-31-1 SS Dependencies |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `institutions` table exists, `compliance_snapshots` migration applied
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Compliance computation service** (from STORY-IA-27) must be available to generate snapshot data
- **No Neo4j needed** for this story (compliance snapshots are Supabase-only)

---

## Section 15: Figma Make Prototype

Code directly for the snapshot list table and create button. Use shadcn/ui Table for the list, shadcn/ui Dialog for the create modal with optional label input. Score badges use the project color tokens.
