# STORY-IA-37 Brief: Lint Results UI

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-IA-37
old_id: S-IA-37-3
epic: E-37 (KaizenML Linting & Golden Dataset)
feature: F-17 (Quality Assurance & Linting)
sprint: 15
lane: institutional_admin
lane_priority: 2
within_lane_order: 37
size: M
depends_on:
  - STORY-IA-12 (institutional_admin) — Lint Engine (produces reports to display)
blocks: []
personas_served: [institutional_admin]
```

---

## Section 1: Summary

**What to build:** A lint results dashboard at `/admin/kaizen` where Institutional Admins can view paginated lint run reports, drill into individual reports to see grouped findings by rule with severity badges, filter/sort findings, mark findings as resolved, and export reports as CSV.

**Parent epic:** E-37 (KaizenML Linting & Golden Dataset) under F-17 (Quality Assurance & Linting). This story builds the UI layer on top of the lint engine (STORY-IA-12) that produces the lint findings.

**User story:** As an Institutional Admin, I need a lint results page showing errors with severity, affected nodes, and suggested fixes so that I can triage and resolve data quality issues efficiently.

**Personas:** Institutional Admin (primary viewer and triager of lint results).

**Key constraints:**
- **Institutional Admin only** -- RBAC enforced (403 for all other roles)
- Reads from existing lint report data produced by STORY-IA-12 lint engine
- Severity levels: critical (red), warning (amber), info (blue) -- using design tokens
- Paginated report list with trend sparkline over 30 days
- "Mark as resolved" action updates finding record with `resolved_by` and `resolved_at`
- CSV export includes all finding fields

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Lint UI types and DTOs | `packages/types/src/kaizen/lint-ui.types.ts` | 1h |
| 2 | Types barrel export | `packages/types/src/kaizen/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | Supabase migration: add resolved_by/resolved_at to lint_findings | Supabase MCP | 30m |
| 5 | LintReportRepository | `apps/server/src/repositories/kaizen/lint-report.repository.ts` | 1.5h |
| 6 | LintReportService | `apps/server/src/services/kaizen/lint-report.service.ts` | 1.5h |
| 7 | LintReportController | `apps/server/src/controllers/kaizen/lint-report.controller.ts` | 1.5h |
| 8 | Register routes in index.ts | `apps/server/src/index.ts` | 15m |
| 9 | KaizenPage (report list) | `apps/web/src/app/(dashboard)/admin/kaizen/page.tsx` | 2h |
| 10 | ReportDetailPage | `apps/web/src/app/(dashboard)/admin/kaizen/[reportId]/page.tsx` | 2h |
| 11 | LintReportTable component | `apps/web/src/components/kaizen/lint-report-table.tsx` | 1.5h |
| 12 | FindingCard component | `apps/web/src/components/kaizen/finding-card.tsx` | 1h |
| 13 | SeverityBadge atom | `apps/web/src/components/kaizen/severity-badge.tsx` | 30m |
| 14 | TrendSparkline component | `apps/web/src/components/kaizen/trend-sparkline.tsx` | 1h |
| 15 | API tests | `apps/server/src/__tests__/kaizen/lint-report.controller.test.ts` | 2h |

**Total estimate:** ~15h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/kaizen/lint-ui.types.ts

/** Severity levels for lint findings */
export type LintSeverity = "critical" | "warning" | "info";

/** Lint rule categories */
export type LintRuleCategory = "mapping" | "content" | "structure" | "coverage" | "metadata";

/** Single lint finding */
export interface LintFinding {
  readonly id: string;
  readonly report_id: string;
  readonly rule_name: string;
  readonly rule_category: LintRuleCategory;
  readonly severity: LintSeverity;
  readonly message: string;
  readonly suggested_fix: string;
  readonly affected_node_ids: readonly string[];
  readonly affected_node_labels: readonly string[];
  readonly resolved: boolean;
  readonly resolved_by: string | null;
  readonly resolved_at: string | null;
  readonly created_at: string;
}

/** Severity breakdown counts */
export interface SeverityBreakdown {
  readonly critical: number;
  readonly warning: number;
  readonly info: number;
}

/** Lint report summary (list view) */
export interface LintReportSummary {
  readonly id: string;
  readonly institution_id: string;
  readonly run_date: string;
  readonly total_findings: number;
  readonly severity_breakdown: SeverityBreakdown;
  readonly unresolved_count: number;
  readonly created_at: string;
}

/** Lint report detail (includes findings) */
export interface LintReportDetail {
  readonly id: string;
  readonly institution_id: string;
  readonly run_date: string;
  readonly total_findings: number;
  readonly severity_breakdown: SeverityBreakdown;
  readonly unresolved_count: number;
  readonly findings: readonly LintFinding[];
  readonly created_at: string;
}

/** Query params for lint report list */
export interface LintReportListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: "run_date" | "total_findings";
  readonly sort_dir?: "asc" | "desc";
}

/** Query params for findings within a report */
export interface LintFindingQuery {
  readonly severity?: LintSeverity;
  readonly category?: LintRuleCategory;
  readonly resolved?: boolean;
  readonly sort_by?: "severity" | "rule_name" | "created_at";
  readonly sort_dir?: "asc" | "desc";
}

/** Trend data point for sparkline */
export interface LintTrendPoint {
  readonly date: string;
  readonly critical: number;
  readonly warning: number;
  readonly info: number;
}

/** Resolve finding request */
export interface ResolveFindingRequest {
  readonly finding_id: string;
}

/** CSV export row */
export interface LintFindingCsvRow {
  readonly report_date: string;
  readonly rule_name: string;
  readonly rule_category: string;
  readonly severity: string;
  readonly message: string;
  readonly suggested_fix: string;
  readonly affected_nodes: string;
  readonly resolved: string;
  readonly resolved_by: string;
  readonly resolved_at: string;
}
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: add_resolved_fields_to_lint_findings
-- Assumes lint_reports and lint_findings tables created by STORY-IA-12

ALTER TABLE lint_findings
  ADD COLUMN IF NOT EXISTS resolved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Index for filtering by severity and resolved status
CREATE INDEX IF NOT EXISTS idx_lint_findings_severity ON lint_findings(severity);
CREATE INDEX IF NOT EXISTS idx_lint_findings_resolved ON lint_findings(resolved);
CREATE INDEX IF NOT EXISTS idx_lint_findings_report_id ON lint_findings(report_id);

-- Index for trend query (last 30 days)
CREATE INDEX IF NOT EXISTS idx_lint_reports_run_date ON lint_reports(run_date DESC);
CREATE INDEX IF NOT EXISTS idx_lint_reports_institution_id ON lint_reports(institution_id);
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/admin/kaizen/reports (Auth: institutional_admin)

**Query params:** `?page=1&limit=20&sort_by=run_date&sort_dir=desc`

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "report-uuid-1",
      "institution_id": "inst-uuid-1",
      "run_date": "2026-02-19T02:00:00Z",
      "total_findings": 42,
      "severity_breakdown": { "critical": 5, "warning": 18, "info": 19 },
      "unresolved_count": 35,
      "created_at": "2026-02-19T02:05:00Z"
    }
  ],
  "error": null,
  "meta": { "page": 1, "limit": 20, "total": 8, "total_pages": 1 }
}
```

### GET /api/v1/admin/kaizen/reports/:reportId (Auth: institutional_admin)

**Query params:** `?severity=critical&category=mapping&resolved=false&sort_by=severity&sort_dir=desc`

**Success Response (200):**
```json
{
  "data": {
    "id": "report-uuid-1",
    "institution_id": "inst-uuid-1",
    "run_date": "2026-02-19T02:00:00Z",
    "total_findings": 42,
    "severity_breakdown": { "critical": 5, "warning": 18, "info": 19 },
    "unresolved_count": 35,
    "findings": [
      {
        "id": "finding-uuid-1",
        "report_id": "report-uuid-1",
        "rule_name": "missing-slo-mapping",
        "rule_category": "mapping",
        "severity": "critical",
        "message": "ILO 'Cardiac physiology' has no mapped SLOs",
        "suggested_fix": "Create SLO mappings for this ILO in the curriculum editor",
        "affected_node_ids": ["ilo-uuid-1"],
        "affected_node_labels": ["ILO"],
        "resolved": false,
        "resolved_by": null,
        "resolved_at": null,
        "created_at": "2026-02-19T02:00:00Z"
      }
    ],
    "created_at": "2026-02-19T02:05:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/admin/kaizen/findings/:findingId/resolve (Auth: institutional_admin)

**Success Response (200):**
```json
{
  "data": {
    "id": "finding-uuid-1",
    "resolved": true,
    "resolved_by": "user-uuid-1",
    "resolved_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/admin/kaizen/reports/:reportId/export/csv (Auth: institutional_admin)

Returns CSV file download with `Content-Type: text/csv` and `Content-Disposition: attachment; filename="lint_report_{date}.csv"`.

### GET /api/v1/admin/kaizen/trend (Auth: institutional_admin)

**Query params:** `?days=30`

**Success Response (200):**
```json
{
  "data": [
    { "date": "2026-02-18", "critical": 5, "warning": 18, "info": 19 },
    { "date": "2026-02-17", "critical": 7, "warning": 20, "info": 22 }
  ],
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-institutional_admin role |
| 404 | `REPORT_NOT_FOUND` | Report ID does not exist |
| 404 | `FINDING_NOT_FOUND` | Finding ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

### Page: `/admin/kaizen` (Institutional Admin layout)

**Route:** `apps/web/src/app/(dashboard)/admin/kaizen/page.tsx`

**Component hierarchy:**
```
KaizenPage (page.tsx -- default export)
  +-- AggregateStatsBar
  |     +-- StatCard (critical count)
  |     +-- StatCard (warning count)
  |     +-- StatCard (info count)
  |     +-- TrendSparkline (30-day trend)
  +-- LintReportTable (organism)
        +-- SortableHeader (date, findings count)
        +-- ReportRow (date, total findings, severity breakdown, unresolved count)
        +-- Pagination
```

### Page: `/admin/kaizen/[reportId]` (Report detail)

**Route:** `apps/web/src/app/(dashboard)/admin/kaizen/[reportId]/page.tsx`

**Component hierarchy:**
```
ReportDetailPage (page.tsx -- default export)
  +-- Breadcrumb (Kaizen > Report {date})
  +-- ReportHeader (date, totals, severity breakdown)
  +-- FilterBar
  |     +-- SeverityFilter (dropdown)
  |     +-- CategoryFilter (dropdown)
  |     +-- ResolvedFilter (toggle)
  +-- ExportCsvButton
  +-- FindingsGroupedByRule
        +-- RuleGroup (rule name, count)
              +-- FindingCard (molecule)
                    +-- SeverityBadge (atom)
                    +-- AffectedNodeLink (link to entity page)
                    +-- SuggestedFix (text)
                    +-- ResolveButton ("Mark as resolved")
```

**States:**
1. **Loading** -- Skeleton table / cards while fetching
2. **Empty** -- "No lint reports found" or "No findings match filters"
3. **Data** -- Table / cards with data
4. **Error** -- Error message with retry button

**Design tokens:**
- SeverityBadge colors: critical = `error-red`, warning = `warning-amber`, info = `info-blue`
- Surface: White card on Cream `#f5f3ef` background
- Typography: Source Sans 3 for table data
- Spacing: 16px cell padding, 24px section gap
- TrendSparkline: Recharts `<LineChart>` with 3 severity lines

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/kaizen/lint-ui.types.ts` | Types | Create |
| 2 | `packages/types/src/kaizen/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add kaizen export) |
| 4 | Supabase migration via MCP (resolved fields + indexes) | Database | Apply |
| 5 | `apps/server/src/errors/kaizen.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add kaizen errors) |
| 7 | `apps/server/src/repositories/kaizen/lint-report.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/kaizen/lint-report.service.ts` | Service | Create |
| 9 | `apps/server/src/controllers/kaizen/lint-report.controller.ts` | Controller | Create |
| 10 | `apps/server/src/index.ts` | Routes | Edit (add kaizen routes) |
| 11 | `apps/web/src/components/kaizen/severity-badge.tsx` | Atom | Create |
| 12 | `apps/web/src/components/kaizen/trend-sparkline.tsx` | Atom | Create |
| 13 | `apps/web/src/components/kaizen/finding-card.tsx` | Molecule | Create |
| 14 | `apps/web/src/components/kaizen/lint-report-table.tsx` | Organism | Create |
| 15 | `apps/web/src/app/(dashboard)/admin/kaizen/page.tsx` | Page | Create |
| 16 | `apps/web/src/app/(dashboard)/admin/kaizen/[reportId]/page.tsx` | Page | Create |
| 17 | `apps/server/src/__tests__/kaizen/lint-report.controller.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-12 | institutional_admin | **NOT YET** | Lint engine produces lint_reports and lint_findings tables and data |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `recharts` -- TrendSparkline chart
- `vitest` -- Testing
- `lucide-react` -- Icons

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware` with `AuthRole` enum
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`

---

## Section 9: Test Fixtures (inline)

```typescript
// Mock Institutional Admin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@med.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock faculty user (should be denied)
export const FACULTY_USER = {
  ...INST_ADMIN_USER,
  sub: "faculty-uuid-1",
  email: "faculty@med.edu",
  role: "faculty" as const,
};

// Mock lint report summaries
export const MOCK_LINT_REPORTS = [
  {
    id: "report-1",
    institution_id: "inst-uuid-1",
    run_date: "2026-02-19T02:00:00Z",
    total_findings: 42,
    severity_breakdown: { critical: 5, warning: 18, info: 19 },
    unresolved_count: 35,
    created_at: "2026-02-19T02:05:00Z",
  },
  {
    id: "report-2",
    institution_id: "inst-uuid-1",
    run_date: "2026-02-18T02:00:00Z",
    total_findings: 38,
    severity_breakdown: { critical: 7, warning: 15, info: 16 },
    unresolved_count: 30,
    created_at: "2026-02-18T02:05:00Z",
  },
];

// Mock findings
export const MOCK_FINDINGS = [
  {
    id: "finding-1",
    report_id: "report-1",
    rule_name: "missing-slo-mapping",
    rule_category: "mapping" as const,
    severity: "critical" as const,
    message: "ILO 'Cardiac physiology' has no mapped SLOs",
    suggested_fix: "Create SLO mappings for this ILO",
    affected_node_ids: ["ilo-uuid-1"],
    affected_node_labels: ["ILO"],
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    created_at: "2026-02-19T02:00:00Z",
  },
  {
    id: "finding-2",
    report_id: "report-1",
    rule_name: "low-question-coverage",
    rule_category: "coverage" as const,
    severity: "warning" as const,
    message: "Topic 'Renal tubular function' has < 5 active questions",
    suggested_fix: "Generate additional questions via workbench",
    affected_node_ids: ["topic-uuid-1"],
    affected_node_labels: ["Topic"],
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    created_at: "2026-02-19T02:00:00Z",
  },
];

// Mock trend data
export const MOCK_TREND = [
  { date: "2026-02-19", critical: 5, warning: 18, info: 19 },
  { date: "2026-02-18", critical: 7, warning: 15, info: 16 },
  { date: "2026-02-17", critical: 6, warning: 17, info: 20 },
];
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/kaizen/lint-report.controller.test.ts`

```
describe("LintReportController")
  describe("GET /api/v1/admin/kaizen/reports")
    + returns paginated lint report list for institutional admin (200)
    + returns correct pagination meta
    + defaults to page=1, limit=20, sort_by=run_date desc
    + rejects unauthenticated request (401)
    + rejects non-institutional_admin roles (403)
    + sorts by total_findings when specified

  describe("GET /api/v1/admin/kaizen/reports/:reportId")
    + returns report detail with findings (200)
    + filters findings by severity
    + filters findings by category
    + filters findings by resolved status
    + returns 404 for non-existent report
    + scopes to user's institution

  describe("PATCH /api/v1/admin/kaizen/findings/:findingId/resolve")
    + marks finding as resolved with user id and timestamp (200)
    + returns 404 for non-existent finding
    + rejects non-institutional_admin (403)

  describe("GET /api/v1/admin/kaizen/reports/:reportId/export/csv")
    + returns CSV with correct headers and data
    + returns Content-Type text/csv
    + returns 404 for non-existent report

  describe("GET /api/v1/admin/kaizen/trend")
    + returns trend data for last 30 days
    + scopes to user's institution
```

**Total: ~19 tests**

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. E2E coverage will be added when the full KaizenML pipeline (lint engine + results UI) is stable and integrated.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | Institutional Admin can view paginated lint report list at `/admin/kaizen` | API test + manual |
| 2 | Non-institutional_admin roles receive 403 Forbidden | API test |
| 3 | Report detail page shows findings grouped by rule with severity badges | Manual |
| 4 | Findings can be filtered by severity, category, and resolved status | API test |
| 5 | "Mark as resolved" updates finding with resolved_by and resolved_at | API test |
| 6 | CSV export contains all finding fields | API test |
| 7 | Trend sparkline shows finding counts over last 30 days | API test + manual |
| 8 | Affected node links navigate to relevant entity pages | Manual |
| 9 | Aggregate stats bar shows critical/warning/info counts | Manual |
| 10 | All ~19 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Lint results page with severity/node/fix | S-IA-37-3 SS User Story |
| Severity badge colors (critical=red, warning=amber, info=blue) | S-IA-37-3 SS Notes |
| Trend sparkline for last 30 days | S-IA-37-3 SS Acceptance Criteria |
| "Mark as resolved" action | S-IA-37-3 SS Acceptance Criteria |
| CSV export for offline analysis | S-IA-37-3 SS Notes |
| Node-centric triage view suggestion | S-IA-37-3 SS Notes |
| Design tokens for colors | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `lint_reports` and `lint_findings` tables exist (from STORY-IA-12)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story (lint data is Supabase-only)

---

## Section 15: Figma Make Prototype

Code directly for the report list table. For the report detail page with findings cards and trend sparkline, a quick Figma wireframe would be helpful but is not blocking. Use Recharts for sparkline, shadcn/ui Table for report list, shadcn/ui Card for findings.
