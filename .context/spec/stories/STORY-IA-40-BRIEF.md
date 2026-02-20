# STORY-IA-40 Brief: Compliance Heatmap

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-40
old_id: S-IA-30-2
epic: E-30 (LCME Compliance Engine)
feature: F-14 (LCME Compliance & Reporting)
sprint: 39
lane: institutional_admin
lane_priority: 2
within_lane_order: 40
size: M
depends_on:
  - STORY-IA-27 (institutional_admin) — Compliance computation data
blocks: []
personas_served: [institutional_admin]
```

---

## Section 1: Summary

**What to build:** An interactive 12-standard LCME compliance heatmap at `/admin/compliance` where Institutional Admins can see a color-coded grid of all standards and their elements. Each cell shows compliance status (met/partial/unmet), supports hover tooltips with details, and clicking navigates to the element drill-down view (STORY-IA-41). The page also shows an overall institution compliance score, standard-level aggregates, a legend, a recompute button, and a print-friendly layout.

**Parent epic:** E-30 (LCME Compliance Engine) under F-14 (LCME Compliance & Reporting). This is the primary visualization of LCME compliance status.

**User story:** As an institutional admin, I need an interactive 12-standard compliance heatmap so that I can quickly identify which LCME standards are met, partially met, or unmet across the institution.

**Key constraints:**
- Color scale: green (100% met), yellow (50-99% partial), orange (1-49% partial), red (0% unmet) -- using design tokens
- Click cell navigates to element drill-down (IA-41)
- Hover tooltip: element name, compliance %, evidence count
- Standard-level summary row with aggregate score
- Print-friendly CSS media query
- Responsive: scrollable with sticky header on small screens
- Recompute button triggers fresh computation

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Extend compliance types for heatmap | `packages/types/src/compliance/compliance.types.ts` | 1h |
| 2 | Extend ComplianceComputationService for heatmap data | `apps/server/src/modules/compliance/services/compliance-computation.service.ts` | 1.5h |
| 3 | Extend ComplianceController for heatmap endpoint | `apps/server/src/modules/compliance/controllers/compliance.controller.ts` | 1h |
| 4 | ComplianceHeatmap component | `apps/web/src/components/compliance/compliance-heatmap.tsx` | 3h |
| 5 | HeatmapCell component | `apps/web/src/components/compliance/heatmap-cell.tsx` | 1.5h |
| 6 | ComplianceLegend component | `apps/web/src/components/compliance/compliance-legend.tsx` | 30m |
| 7 | Compliance page | `apps/web/src/app/(dashboard)/admin/compliance/page.tsx` | 2h |
| 8 | Print stylesheet | `apps/web/src/styles/compliance-print.css` | 30m |
| 9 | API tests | `apps/server/src/modules/compliance/__tests__/compliance-heatmap-data.test.ts` | 2h |

**Total estimate:** ~13h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/compliance/compliance.types.ts

/** Compliance status for color mapping */
export type ComplianceStatus = "met" | "partial_high" | "partial_low" | "unmet";

/** Heatmap cell data */
export interface HeatmapCell {
  readonly element_id: string;
  readonly element_number: string;
  readonly element_name: string;
  readonly compliance_pct: number;
  readonly status: ComplianceStatus;
  readonly evidence_count: number;
  readonly total_expected: number;
}

/** Standard row in heatmap */
export interface HeatmapStandard {
  readonly standard_id: string;
  readonly standard_number: number;
  readonly standard_name: string;
  readonly aggregate_score: number;
  readonly aggregate_status: ComplianceStatus;
  readonly elements: readonly HeatmapCell[];
}

/** Full heatmap data response */
export interface ComplianceHeatmapData {
  readonly institution_id: string;
  readonly overall_score: number;
  readonly overall_status: ComplianceStatus;
  readonly standards: readonly HeatmapStandard[];
  readonly computed_at: string;
}

/** Recompute request (empty body, triggers fresh computation) */
export interface RecomputeComplianceRequest {
  readonly force?: boolean;
}

/** Recompute response */
export interface RecomputeComplianceResponse {
  readonly job_id: string;
  readonly status: "started" | "completed";
  readonly estimated_seconds: number;
}
```

---

## Section 4: Database Schema (inline, complete)

No new tables needed. Reads from existing compliance computation results (computed by STORY-IA-27 compliance engine). The heatmap endpoint queries the pre-computed compliance data.

```sql
-- Existing tables used (from STORY-IA-27):
-- compliance_results (institution_id, standard_id, element_id, compliance_score, evidence_count, total_expected, computed_at)
-- lcme_standards (id, number, name, description)
-- lcme_elements (id, standard_id, number, name, description)

-- Additional index for heatmap query performance:
CREATE INDEX IF NOT EXISTS idx_compliance_results_institution_computed
  ON compliance_results(institution_id, computed_at DESC);
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/compliance/heatmap (Auth: institutional_admin)

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "overall_score": 78.5,
    "overall_status": "partial_high",
    "standards": [
      {
        "standard_id": "std-1",
        "standard_number": 1,
        "standard_name": "Mission, Planning, and Integration",
        "aggregate_score": 92.0,
        "aggregate_status": "met",
        "elements": [
          {
            "element_id": "elem-1-1",
            "element_number": "1.1",
            "element_name": "Strategic Planning and Continuous Quality Improvement",
            "compliance_pct": 100,
            "status": "met",
            "evidence_count": 5,
            "total_expected": 5
          },
          {
            "element_id": "elem-1-2",
            "element_number": "1.2",
            "element_name": "Institutional Effectiveness",
            "compliance_pct": 40,
            "status": "partial_low",
            "evidence_count": 2,
            "total_expected": 5
          }
        ]
      }
    ],
    "computed_at": "2026-02-19T02:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/compliance/recompute (Auth: institutional_admin)

**Request:**
```json
{
  "force": true
}
```

**Success Response (202):**
```json
{
  "data": {
    "job_id": "job-uuid-1",
    "status": "started",
    "estimated_seconds": 30
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-institutional_admin role |
| 404 | `NO_COMPLIANCE_DATA` | No compliance results computed yet |
| 429 | `RECOMPUTE_THROTTLED` | Recompute requested within last 5 minutes |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

### Page: `/admin/compliance` (Institutional Admin layout)

**Route:** `apps/web/src/app/(dashboard)/admin/compliance/page.tsx`

**Component hierarchy:**
```
CompliancePage (page.tsx -- default export)
  +-- PageHeader
  |     +-- Title ("LCME Compliance Dashboard")
  |     +-- OverallScoreBadge (large, prominent)
  |     +-- LastComputedTimestamp
  |     +-- RecomputeButton
  |     +-- PrintButton
  +-- ComplianceLegend (atom)
  |     +-- ColorSwatch (green = met 100%)
  |     +-- ColorSwatch (yellow = partial 50-99%)
  |     +-- ColorSwatch (orange = partial 1-49%)
  |     +-- ColorSwatch (red = unmet 0%)
  +-- ComplianceHeatmap (organism)
        +-- HeatmapHeader (element column headers -- sticky)
        +-- StandardRow (per standard)
        |     +-- StandardLabel (number + name + aggregate score)
        |     +-- HeatmapCell (per element)
        |           +-- ColorBlock (based on status)
        |           +-- Tooltip (element name, %, evidence count)
        |           +-- onClick -> navigate to /admin/compliance/elements/{elementId}
        +-- SummaryRow (overall aggregates)
```

**States:**
1. **Loading** -- Skeleton grid matching heatmap dimensions
2. **Empty** -- "No compliance data computed yet. Click Recompute to start."
3. **Data** -- Full heatmap with colors, tooltips, click handlers
4. **Recomputing** -- Recompute button disabled with spinner, heatmap dimmed
5. **Error** -- Error message with retry button
6. **Print** -- Simplified layout, grayscale-safe colors, no tooltips

**Design tokens:**
- Met (100%): Green `#69a338`
- Partial high (50-99%): Warning yellow
- Partial low (1-49%): Warning orange
- Unmet (0%): Error red
- Surface: White card on Cream `#f5f3ef`
- Cell size: 48x48px with 2px gap
- Overall score: Navy Deep `#002c76` large text
- Tooltip: shadcn/ui Tooltip with dark background

**Responsive behavior:**
- Desktop (>= 1280px): Full grid visible
- Tablet (768-1279px): Horizontal scroll with sticky standard labels
- Print: Force landscape, reduce cell size, add page break between standards 6-7

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/compliance/compliance.types.ts` | Types | Create |
| 2 | `packages/types/src/compliance/index.ts` | Types | Edit (add compliance types) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add compliance export) |
| 4 | Supabase migration via MCP (index for heatmap query) | Database | Apply |
| 5 | `apps/server/src/modules/compliance/services/compliance-computation.service.ts` | Service | Edit (add heatmap data method) |
| 6 | `apps/server/src/modules/compliance/controllers/compliance.controller.ts` | Controller | Edit (add heatmap endpoint) |
| 7 | `apps/server/src/modules/compliance/routes/compliance.routes.ts` | Routes | Create or Edit |
| 8 | `apps/web/src/components/compliance/compliance-legend.tsx` | Atom | Create |
| 9 | `apps/web/src/components/compliance/heatmap-cell.tsx` | Atom | Create |
| 10 | `apps/web/src/components/compliance/compliance-heatmap.tsx` | Organism | Create |
| 11 | `apps/web/src/app/(dashboard)/admin/compliance/page.tsx` | Page | Create |
| 12 | `apps/web/src/styles/compliance-print.css` | Styles | Create |
| 13 | `apps/server/src/modules/compliance/__tests__/compliance-heatmap-data.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-27 | institutional_admin | **NOT YET** | Compliance computation engine provides the data for the heatmap |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `recharts` -- Could use for heatmap cells or fallback charting
- `lucide-react` -- Icons (recompute, print)
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware` with `AuthRole` enum
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- Compliance computation service (from STORY-IA-27)

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

// Mock heatmap data
export const MOCK_HEATMAP_DATA = {
  institution_id: "inst-uuid-1",
  overall_score: 78.5,
  overall_status: "partial_high" as const,
  standards: [
    {
      standard_id: "std-1",
      standard_number: 1,
      standard_name: "Mission, Planning, and Integration",
      aggregate_score: 92.0,
      aggregate_status: "met" as const,
      elements: [
        {
          element_id: "elem-1-1",
          element_number: "1.1",
          element_name: "Strategic Planning",
          compliance_pct: 100,
          status: "met" as const,
          evidence_count: 5,
          total_expected: 5,
        },
        {
          element_id: "elem-1-2",
          element_number: "1.2",
          element_name: "Institutional Effectiveness",
          compliance_pct: 40,
          status: "partial_low" as const,
          evidence_count: 2,
          total_expected: 5,
        },
      ],
    },
    {
      standard_id: "std-2",
      standard_number: 2,
      standard_name: "Leadership and Administration",
      aggregate_score: 0,
      aggregate_status: "unmet" as const,
      elements: [
        {
          element_id: "elem-2-1",
          element_number: "2.1",
          element_name: "Administrative Leadership",
          compliance_pct: 0,
          status: "unmet" as const,
          evidence_count: 0,
          total_expected: 3,
        },
      ],
    },
  ],
  computed_at: "2026-02-19T02:00:00Z",
};

// Mock empty compliance data (no computation done yet)
export const MOCK_EMPTY_HEATMAP = null;
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/compliance/__tests__/compliance-heatmap-data.test.ts`

```
describe("ComplianceController - Heatmap")
  describe("GET /api/v1/compliance/heatmap")
    + returns heatmap data with all 12 standards for institutional admin (200)
    + includes overall_score and overall_status
    + each standard has aggregate_score and elements array
    + each element has compliance_pct, status, evidence_count
    + status computed correctly: met (100%), partial_high (50-99), partial_low (1-49), unmet (0)
    + scopes data to user's institution
    + rejects unauthenticated request (401)
    + rejects non-institutional_admin roles (403)
    + returns 404 when no compliance data has been computed

  describe("POST /api/v1/compliance/recompute")
    + returns 202 with job_id when recompute triggered
    + rejects when recompute requested within last 5 minutes (429)
    + rejects non-institutional_admin (403)
```

**Total: ~12 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will be part of the full LCME compliance journey test when the heatmap, drill-down, and export are all complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | Heatmap displays all 12 LCME standards with their elements | API test + manual |
| 2 | Cell colors correctly reflect compliance status (green/yellow/orange/red) | Manual |
| 3 | Hover tooltip shows element name, compliance %, evidence count | Manual |
| 4 | Click cell navigates to element drill-down page | Manual |
| 5 | Standard-level summary row shows aggregate compliance | API test |
| 6 | Overall institution compliance score displayed prominently | Manual |
| 7 | Legend explains color scale | Manual |
| 8 | Recompute button triggers fresh computation | API test |
| 9 | Print-friendly layout works with media query | Manual |
| 10 | Responsive scroll with sticky headers on small screens | Manual |
| 11 | Non-institutional_admin roles receive 403 | API test |
| 12 | All ~12 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| 12-standard compliance heatmap | S-IA-30-2 SS User Story |
| Cell colors: green/yellow/orange/red | S-IA-30-2 SS Acceptance Criteria |
| Hover tooltip with element details | S-IA-30-2 SS Acceptance Criteria |
| Click to drill-down | S-IA-30-2 SS Acceptance Criteria |
| Recompute button | S-IA-30-2 SS Acceptance Criteria |
| Print-friendly layout | S-IA-30-2 SS Acceptance Criteria |
| D3.js for custom cell rendering | S-IA-30-2 SS Notes |
| Design tokens, no hardcoded hex | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, compliance computation tables exist (from STORY-IA-27), LCME standards/elements seeded
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story (compliance data is Supabase-only)

---

## Section 15: Figma Make Prototype

Recommended: Create a quick Figma prototype for the heatmap grid layout showing the 12-standard x N-element grid with color coding, tooltips, and the overall score header. This is a visually complex component that benefits from design iteration before coding. Use design tokens for all colors.
