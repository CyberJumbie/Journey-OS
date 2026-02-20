# STORY-IA-44 Brief: Snapshot Comparison

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-44
old_id: S-IA-31-3
epic: E-31 (LCME Report Export)
feature: F-14 (LCME Compliance & Reporting)
sprint: 39
lane: institutional_admin
lane_priority: 2
within_lane_order: 44
size: M
depends_on:
  - STORY-IA-39 (institutional_admin) — At least two snapshots needed for comparison
blocks: []
personas_served: [institutional_admin]
```

---

## Section 1: Summary

**What to build:** A snapshot comparison view at `/admin/compliance/compare` where Institutional Admins select two compliance snapshots and see a side-by-side comparison of standard/element compliance scores. The comparison highlights improvements (green arrow up), regressions (red arrow down), and unchanged elements (gray). Summary statistics show total improvements, regressions, and net change. New or removed elements are flagged if standards changed between snapshots. The comparison can be exported as PDF.

**Parent epic:** E-31 (LCME Report Export) under F-14 (LCME Compliance & Reporting). This is the final story in the LCME report export pipeline, enabling institutional admins to demonstrate continuous improvement to LCME reviewers.

**User story:** As an institutional admin, I need to compare two compliance snapshots side by side so that I can track compliance improvements and regressions over time.

**Key constraints:**
- Two-snapshot selector (dropdown with date labels)
- Side-by-side table: standard/element scores from both snapshots
- Diff highlighting: improved (green up), regressed (red down), unchanged (gray)
- Delta values: "+5%" or "-3%" per element
- Handle schema evolution (new/removed elements between snapshots)
- Comparison view at `/admin/compliance/compare?a={id1}&b={id2}`
- Export comparison as PDF (reuses PDF service with comparison template)
- Responsive table with sticky headers

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Comparison types | `packages/types/src/compliance/comparison.types.ts` | 1h |
| 2 | Types barrel export | `packages/types/src/compliance/index.ts` | 10m |
| 3 | SnapshotComparisonService | `apps/server/src/modules/compliance/services/snapshot-comparison.service.ts` | 2.5h |
| 4 | Extend SnapshotController | `apps/server/src/modules/compliance/controllers/snapshot.controller.ts` | 1h |
| 5 | Extend snapshot routes | `apps/server/src/modules/compliance/routes/snapshot.routes.ts` | 15m |
| 6 | SnapshotSelector component | `apps/web/src/components/compliance/snapshot-selector.tsx` | 1h |
| 7 | DeltaIndicator atom | `apps/web/src/components/compliance/delta-indicator.tsx` | 30m |
| 8 | SnapshotComparisonTable | `apps/web/src/components/compliance/snapshot-comparison-table.tsx` | 2.5h |
| 9 | Comparison page | `apps/web/src/app/(dashboard)/admin/compliance/compare/page.tsx` | 2h |
| 10 | Comparison PDF template | `apps/server/src/modules/compliance/services/pdf-templates/comparison-template.ts` | 1.5h |
| 11 | Service tests | `apps/server/src/modules/compliance/__tests__/snapshot-comparison.service.test.ts` | 2h |

**Total estimate:** ~14.5h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/compliance/comparison.types.ts

/** Change direction for diff highlighting */
export type ChangeDirection = "improved" | "regressed" | "unchanged" | "new" | "removed";

/** Per-element comparison row */
export interface ElementComparison {
  readonly element_id: string;
  readonly element_number: string;
  readonly element_description: string;
  readonly score_a: number | null;
  readonly score_b: number | null;
  readonly delta: number | null;
  readonly direction: ChangeDirection;
  readonly status_a: string | null;
  readonly status_b: string | null;
}

/** Per-standard comparison section */
export interface StandardComparison {
  readonly standard_id: string;
  readonly standard_number: number;
  readonly standard_name: string;
  readonly aggregate_a: number;
  readonly aggregate_b: number;
  readonly aggregate_delta: number;
  readonly aggregate_direction: ChangeDirection;
  readonly elements: readonly ElementComparison[];
}

/** Full comparison result */
export interface SnapshotComparisonResult {
  readonly snapshot_a: SnapshotSummary;
  readonly snapshot_b: SnapshotSummary;
  readonly overall_a: number;
  readonly overall_b: number;
  readonly overall_delta: number;
  readonly overall_direction: ChangeDirection;
  readonly standards: readonly StandardComparison[];
  readonly summary: ComparisonSummary;
}

/** Summary statistics for the comparison */
export interface ComparisonSummary {
  readonly total_improvements: number;
  readonly total_regressions: number;
  readonly total_unchanged: number;
  readonly total_new: number;
  readonly total_removed: number;
  readonly net_change: number;
}

/** Snapshot summary (used in comparison header) */
export interface SnapshotSummary {
  readonly id: string;
  readonly label: string;
  readonly overall_score: number;
  readonly created_at: string;
}

/** Comparison query params */
export interface ComparisonQuery {
  readonly a: string;
  readonly b: string;
}
```

---

## Section 4: Database Schema (inline, complete)

No new tables needed. Reads from existing `compliance_snapshots` table (from STORY-IA-39).

```sql
-- Existing table used:
-- compliance_snapshots (id, institution_id, label, compliance_data JSONB, overall_score, created_by, created_at)

-- The comparison is computed in-memory by loading both snapshots' compliance_data
-- and iterating their standard/element structures to compute deltas.
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/compliance/snapshots/compare?a={id1}&b={id2} (Auth: institutional_admin)

**Query params:** `?a=snap-uuid-1&b=snap-uuid-2`

**Success Response (200):**
```json
{
  "data": {
    "snapshot_a": {
      "id": "snap-uuid-1",
      "label": "2026-01-15 10:00",
      "overall_score": 72.3,
      "created_at": "2026-01-15T10:00:00Z"
    },
    "snapshot_b": {
      "id": "snap-uuid-2",
      "label": "Pre-site visit",
      "overall_score": 78.5,
      "created_at": "2026-02-19T14:30:00Z"
    },
    "overall_a": 72.3,
    "overall_b": 78.5,
    "overall_delta": 6.2,
    "overall_direction": "improved",
    "standards": [
      {
        "standard_id": "std-1",
        "standard_number": 1,
        "standard_name": "Mission, Planning, and Integration",
        "aggregate_a": 85.0,
        "aggregate_b": 92.0,
        "aggregate_delta": 7.0,
        "aggregate_direction": "improved",
        "elements": [
          {
            "element_id": "elem-1-1",
            "element_number": "1.1",
            "element_description": "Strategic Planning",
            "score_a": 80,
            "score_b": 100,
            "delta": 20,
            "direction": "improved",
            "status_a": "partial_high",
            "status_b": "met"
          },
          {
            "element_id": "elem-1-2",
            "element_number": "1.2",
            "element_description": "Institutional Effectiveness",
            "score_a": 90,
            "score_b": 84,
            "delta": -6,
            "direction": "regressed",
            "status_a": "met",
            "status_b": "partial_high"
          }
        ]
      }
    ],
    "summary": {
      "total_improvements": 8,
      "total_regressions": 2,
      "total_unchanged": 15,
      "total_new": 1,
      "total_removed": 0,
      "net_change": 6.2
    }
  },
  "error": null
}
```

### POST /api/v1/compliance/snapshots/compare/export/pdf?a={id1}&b={id2} (Auth: institutional_admin)

Triggers async comparison PDF generation. Same async pattern as STORY-IA-43.

**Success Response (202):**
```json
{
  "data": {
    "job_id": "job-uuid-2",
    "status": "pending",
    "estimated_seconds": 20
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing a or b query param, or a == b |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-institutional_admin role |
| 404 | `SNAPSHOT_NOT_FOUND` | One or both snapshot IDs do not exist |
| 403 | `CROSS_INSTITUTION` | Snapshots belong to different institutions |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

### Page: `/admin/compliance/compare`

**Route:** `apps/web/src/app/(dashboard)/admin/compliance/compare/page.tsx`

**Component hierarchy:**
```
ComparisonPage (page.tsx -- default export)
  +-- PageHeader ("Snapshot Comparison")
  +-- SnapshotSelectorBar
  |     +-- SnapshotSelector (Snapshot A -- dropdown with date labels)
  |     +-- "vs" label
  |     +-- SnapshotSelector (Snapshot B -- dropdown with date labels)
  |     +-- CompareButton
  +-- ComparisonHeader (when comparison loaded)
  |     +-- OverallScoreA + label
  |     +-- DeltaIndicator (overall: +6.2% improved)
  |     +-- OverallScoreB + label
  +-- ComparisonSummaryBar
  |     +-- StatCard (improvements count, green)
  |     +-- StatCard (regressions count, red)
  |     +-- StatCard (unchanged count, gray)
  |     +-- StatCard (net change, green/red)
  +-- ExportComparisonPdfButton
  +-- SnapshotComparisonTable (organism)
        +-- StandardRow (per standard -- expandable)
        |     +-- StandardLabel + aggregate scores + DeltaIndicator
        |     +-- ElementRows (per element within standard)
        |           +-- Element description
        |           +-- Score A
        |           +-- Score B
        |           +-- DeltaIndicator (arrow + percentage)
        +-- StickyHeader (standard names, Score A, Score B, Delta)
```

### DeltaIndicator (atom)

**Location:** `apps/web/src/components/compliance/delta-indicator.tsx`

```
DeltaIndicator
  +-- Arrow icon (ArrowUp for improved, ArrowDown for regressed, Minus for unchanged)
  +-- Delta value ("+5%" or "-3%" or "--")
  +-- Color: green (improved), red (regressed), gray (unchanged), blue (new), strikethrough (removed)
```

### SnapshotSelector (molecule)

**Location:** `apps/web/src/components/compliance/snapshot-selector.tsx`

```
SnapshotSelector
  +-- shadcn/ui Select dropdown
  +-- Options: snapshot label + date, sorted by created_at desc
  +-- Placeholder: "Select snapshot..."
```

**States:**
1. **Initial** -- Two empty selectors with "Select snapshot" placeholder
2. **Selected** -- Both snapshots chosen, compare button enabled
3. **Loading** -- Skeleton table while comparison computes
4. **Data** -- Full comparison table with deltas and summary
5. **Error** -- Error message (e.g., snapshots from different institutions)

**Design tokens:**
- Improved: Green `#69a338` + ArrowUp
- Regressed: Error red + ArrowDown
- Unchanged: Gray + Minus
- New element: Info blue + "NEW" badge
- Removed element: Muted + strikethrough
- Surface: White card on Cream `#f5f3ef`
- Sticky header: White with bottom border

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/compliance/comparison.types.ts` | Types | Create |
| 2 | `packages/types/src/compliance/index.ts` | Types | Edit (add comparison export) |
| 3 | `apps/server/src/modules/compliance/services/snapshot-comparison.service.ts` | Service | Create |
| 4 | `apps/server/src/modules/compliance/services/pdf-templates/comparison-template.ts` | Template | Create |
| 5 | `apps/server/src/modules/compliance/controllers/snapshot.controller.ts` | Controller | Edit (add compare endpoints) |
| 6 | `apps/server/src/modules/compliance/routes/snapshot.routes.ts` | Routes | Edit (add compare routes) |
| 7 | `apps/web/src/components/compliance/delta-indicator.tsx` | Atom | Create |
| 8 | `apps/web/src/components/compliance/snapshot-selector.tsx` | Molecule | Create |
| 9 | `apps/web/src/components/compliance/snapshot-comparison-table.tsx` | Organism | Create |
| 10 | `apps/web/src/app/(dashboard)/admin/compliance/compare/page.tsx` | Page | Create |
| 11 | `apps/server/src/modules/compliance/__tests__/snapshot-comparison.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-39 | institutional_admin | **NOT YET** | Snapshot service provides the snapshots to compare |

### Optional Story Dependency
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-43 | institutional_admin | **NOT YET** | PDF export service for comparison PDF (can be deferred) |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `lucide-react` -- Arrow icons for delta indicators
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/modules/compliance/repositories/snapshot.repository.ts` -- from STORY-IA-39
- `apps/server/src/modules/compliance/services/pdf-export.service.ts` -- from STORY-IA-43 (for comparison PDF)
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`

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

// Mock snapshot A (older)
export const MOCK_SNAPSHOT_A = {
  id: "snap-uuid-1",
  institution_id: "inst-uuid-1",
  label: "2026-01-15 10:00",
  overall_score: 72.3,
  compliance_data: {
    overall_score: 72.3,
    standards: [
      {
        standard_id: "std-1",
        standard_name: "Mission, Planning, and Integration",
        standard_number: 1,
        aggregate_score: 85.0,
        elements: [
          { element_id: "elem-1-1", element_number: "1.1", element_description: "Strategic Planning", compliance_score: 80, status: "partial_high", evidence_count: 4, total_expected: 5, evidence_chain_summary: "4/5" },
          { element_id: "elem-1-2", element_number: "1.2", element_description: "Institutional Effectiveness", compliance_score: 90, status: "met", evidence_count: 5, total_expected: 5, evidence_chain_summary: "5/5" },
        ],
      },
    ],
    computed_at: "2026-01-15T09:59:00Z",
  },
  created_by: "admin-uuid-1",
  created_at: "2026-01-15T10:00:00Z",
};

// Mock snapshot B (newer, with improvements and a regression)
export const MOCK_SNAPSHOT_B = {
  id: "snap-uuid-2",
  institution_id: "inst-uuid-1",
  label: "Pre-site visit",
  overall_score: 78.5,
  compliance_data: {
    overall_score: 78.5,
    standards: [
      {
        standard_id: "std-1",
        standard_name: "Mission, Planning, and Integration",
        standard_number: 1,
        aggregate_score: 92.0,
        elements: [
          { element_id: "elem-1-1", element_number: "1.1", element_description: "Strategic Planning", compliance_score: 100, status: "met", evidence_count: 5, total_expected: 5, evidence_chain_summary: "5/5" },
          { element_id: "elem-1-2", element_number: "1.2", element_description: "Institutional Effectiveness", compliance_score: 84, status: "partial_high", evidence_count: 4, total_expected: 5, evidence_chain_summary: "4/5" },
          { element_id: "elem-1-3", element_number: "1.3", element_description: "New Element", compliance_score: 70, status: "partial_high", evidence_count: 3, total_expected: 4, evidence_chain_summary: "3/4" },
        ],
      },
    ],
    computed_at: "2026-02-19T14:29:55Z",
  },
  created_by: "admin-uuid-1",
  created_at: "2026-02-19T14:30:00Z",
};

// Mock snapshot from different institution (cross-institution test)
export const MOCK_SNAPSHOT_DIFFERENT_INST = {
  ...MOCK_SNAPSHOT_A,
  id: "snap-uuid-other",
  institution_id: "inst-uuid-2",
};

// Expected comparison result
export const EXPECTED_COMPARISON = {
  overall_a: 72.3,
  overall_b: 78.5,
  overall_delta: 6.2,
  overall_direction: "improved" as const,
  summary: {
    total_improvements: 1,
    total_regressions: 1,
    total_unchanged: 0,
    total_new: 1,
    total_removed: 0,
    net_change: 6.2,
  },
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/compliance/__tests__/snapshot-comparison.service.test.ts`

```
describe("SnapshotComparisonService")
  describe("compare")
    + loads both snapshots by ID
    + computes per-element deltas correctly
    + marks improved elements (score_b > score_a) with direction 'improved'
    + marks regressed elements (score_b < score_a) with direction 'regressed'
    + marks unchanged elements (score_b == score_a) with direction 'unchanged'
    + marks new elements (present in B but not A) with direction 'new' and score_a = null
    + marks removed elements (present in A but not B) with direction 'removed' and score_b = null
    + computes standard-level aggregate deltas
    + computes overall delta correctly
    + computes summary statistics (total improvements, regressions, unchanged, new, removed)
    + rejects when snapshot A not found (404)
    + rejects when snapshot B not found (404)
    + rejects when a == b (400 VALIDATION_ERROR)
    + rejects when snapshots from different institutions (403)
    + handles empty standards list gracefully

describe("SnapshotComparisonController")
  describe("GET /api/v1/compliance/snapshots/compare")
    + returns 200 with comparison result
    + returns 400 when a or b query param missing
    + rejects non-institutional_admin (403)
    + rejects unauthenticated (401)
```

**Total: ~19 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will be part of the full LCME report pipeline journey: create snapshot A -> create snapshot B -> compare -> export comparison PDF.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | Snapshot selector shows all snapshots with date labels | Manual |
| 2 | Side-by-side comparison shows scores from both snapshots | API test + manual |
| 3 | Improved elements highlighted with green arrow up and delta | API test |
| 4 | Regressed elements highlighted with red arrow down and delta | API test |
| 5 | Unchanged elements shown with gray indicator | API test |
| 6 | New elements (added between snapshots) flagged with "NEW" badge | API test |
| 7 | Removed elements flagged with strikethrough | API test |
| 8 | Summary statistics: improvements, regressions, net change | API test |
| 9 | Comparison URL format: /admin/compliance/compare?a={id}&b={id} | Manual |
| 10 | Export comparison as PDF works | Manual |
| 11 | Same snapshot for A and B returns validation error | API test |
| 12 | Cross-institution comparison blocked | API test |
| 13 | Responsive table with sticky headers | Manual |
| 14 | All ~19 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Side-by-side snapshot comparison | S-IA-31-3 SS User Story |
| Diff highlighting: improved/regressed/unchanged | S-IA-31-3 SS Acceptance Criteria |
| Delta values per element | S-IA-31-3 SS Acceptance Criteria |
| Summary statistics | S-IA-31-3 SS Acceptance Criteria |
| New/removed elements handling | S-IA-31-3 SS Acceptance Criteria |
| URL format with query params | S-IA-31-3 SS Acceptance Criteria |
| Export comparison as PDF | S-IA-31-3 SS Acceptance Criteria |
| Schema evolution handling | S-IA-31-3 SS Notes |
| DeltaIndicator as reusable atom | S-IA-31-3 SS Notes |
| Critical for demonstrating improvement | S-IA-31-3 SS Notes |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `compliance_snapshots` table exists (from STORY-IA-39) with at least 2 snapshots for testing
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **PDF export service** (from STORY-IA-43) needed for comparison PDF export
- **No Neo4j needed** for this story

---

## Section 15: Figma Make Prototype

Recommended: Design the comparison table layout showing two columns of scores with delta indicators. The visual diff highlighting (green arrows, red arrows, gray dashes) and the summary statistics bar should be prototyped to ensure clarity for LCME reviewers. The DeltaIndicator atom is reusable across the application.
