# STORY-F-59 Brief: Import Report

## 0. Lane & Priority

```yaml
story_id: STORY-F-59
old_id: S-F-24-4
lane: faculty
lane_priority: 3
within_lane_order: 59
sprint: 17
size: S
depends_on:
  - STORY-F-57 (faculty) — Import Pipeline (produces report data)
blocks: []
personas_served: [faculty]
epic: E-24 (Legacy Import Pipeline)
feature: F-11
user_flow: UF-16 (Legacy Import Workflow)
```

## 1. Summary

Build an **import report page** that displays the outcome of a legacy question import job -- showing accepted, rejected, and skipped counts with detailed error information. The report is generated from data stored in the `import_jobs` table (JSONB summary column). Faculty can see which items were accepted (with link to item bank), which were rejected (with reasons and source row numbers), and which were skipped (e.g., duplicates). A donut chart (recharts) provides visual breakdown of outcomes. The report can be exported as CSV for record-keeping. Reports are persisted and accessible from the import history list.

Key constraints:
- Report data sourced from `import_jobs.summary` JSONB column (created by STORY-F-57)
- Donut chart with recharts (shadcn/ui compatible)
- CSV export of report data
- Design tokens for outcome colors: accepted (green), rejected (red), skipped (amber)
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `ImportReport`, `ImportOutcome`, `RejectedItem`, `SkippedItem`, `ReportExportFormat` in `packages/types/src/import/`
2. **Service** -- `ImportReportService` with `getReport()`, `exportReportCsv()` methods
3. **Controller** -- `ImportReportController` with GET report, GET export endpoints
4. **Routes** -- Register under `/api/v1/import/:importId/report`
5. **View -- ImportReportSummary** -- Summary card with total, accepted, rejected, skipped counts + donut chart
6. **View -- RejectedItemsTable** -- Table showing identifier, rejection reason, source row number
7. **View -- SkippedItemsTable** -- Table showing identifier, skip reason
8. **View -- Page** -- `page.tsx` for `/faculty/import/[importId]/report`
9. **API tests** -- 7 tests covering report fetch, counts accuracy, rejected details, CSV export
10. **Exports** -- Register types in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/import/report.types.ts

/** Overall import outcome breakdown */
export type ImportOutcomeType = "accepted" | "rejected" | "skipped";

/** A rejected item with reason */
export interface RejectedItem {
  readonly row_number: number;
  readonly identifier: string;
  readonly reason: string;
  readonly field?: string;
}

/** A skipped item with reason */
export interface SkippedItem {
  readonly row_number: number;
  readonly identifier: string;
  readonly reason: string;
  readonly duplicate_of_id?: string;
}

/** Summary counts for the import */
export interface ImportSummary {
  readonly total: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly skipped: number;
}

/** Full import report */
export interface ImportReport {
  readonly import_id: string;
  readonly import_job_name: string;
  readonly created_at: string;
  readonly completed_at: string;
  readonly summary: ImportSummary;
  readonly rejected_items: RejectedItem[];
  readonly skipped_items: SkippedItem[];
  readonly accepted_batch_id: string;
}

/** CSV export response */
export interface ReportCsvExport {
  readonly filename: string;
  readonly content_type: string;
  readonly download_url: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- No new tables needed. Report data lives in the existing import_jobs table.
-- import_jobs table was created by STORY-F-57 (Import Pipeline).

-- Existing table structure (reference):
-- import_jobs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   institution_id UUID NOT NULL REFERENCES institutions(id),
--   uploaded_by UUID NOT NULL REFERENCES profiles(id),
--   file_name TEXT NOT NULL,
--   status TEXT NOT NULL DEFAULT 'pending',
--   summary JSONB NOT NULL DEFAULT '{}',
--   rejected_items JSONB NOT NULL DEFAULT '[]',
--   skipped_items JSONB NOT NULL DEFAULT '[]',
--   accepted_batch_id UUID,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   completed_at TIMESTAMPTZ
-- )

-- Migration: add_import_report_indexes
-- Optimize report lookup by import ID
CREATE INDEX IF NOT EXISTS idx_import_jobs_status
  ON import_jobs(status)
  WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_import_jobs_uploaded_by
  ON import_jobs(uploaded_by, created_at DESC);
```

## 5. API Contract (complete request/response)

### GET /api/v1/import/:importId/report (Auth: faculty, institutional_admin, superadmin)

**Success Response (200):**
```json
{
  "data": {
    "import_id": "import-uuid-1",
    "import_job_name": "Cardiology_Questions_2026.csv",
    "created_at": "2026-02-18T09:00:00Z",
    "completed_at": "2026-02-18T09:05:32Z",
    "summary": {
      "total": 150,
      "accepted": 132,
      "rejected": 8,
      "skipped": 10
    },
    "rejected_items": [
      {
        "row_number": 23,
        "identifier": "Q-23",
        "reason": "Missing correct answer designation",
        "field": "correct_answer"
      }
    ],
    "skipped_items": [
      {
        "row_number": 45,
        "identifier": "Q-45",
        "reason": "Duplicate detected (similarity: 0.97)",
        "duplicate_of_id": "q-uuid-existing-1"
      }
    ],
    "accepted_batch_id": "batch-uuid-1"
  },
  "error": null
}
```

### GET /api/v1/import/:importId/report/export (Auth: faculty, institutional_admin, superadmin)

**Success Response (200):**
```json
{
  "data": {
    "filename": "import-report-2026-02-18.csv",
    "content_type": "text/csv",
    "download_url": "/api/v1/import/import-uuid-1/report/download"
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200 | - | Success |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User did not upload this import and is not admin |
| 404 | `NOT_FOUND` | Import job not found or not yet completed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/faculty/import/[importId]/report`

**File:** `apps/web/src/app/(dashboard)/faculty/import/[importId]/report/page.tsx`

```
ImportReportPage
  ├── PageHeader ("Import Report: {filename}")
  ├── ImportReportSummary (organism)
  │   ├── SummaryCard (molecule) — total/accepted/rejected/skipped counts
  │   ├── DonutChart (molecule) — recharts pie chart with outcome breakdown
  │   └── ExportCsvButton (atom) — "Export Report as CSV"
  ├── AcceptedSection (molecule)
  │   └── Link to item bank filtered by batch: "View 132 accepted items in Item Bank"
  ├── RejectedItemsTable (organism)
  │   ├── DataTable columns: Row #, Identifier, Reason, Field
  │   └── EmptyState: "No items were rejected"
  ├── SkippedItemsTable (organism)
  │   ├── DataTable columns: Row #, Identifier, Reason, Duplicate Link
  │   └── EmptyState: "No items were skipped"
  └── BackLink — "Back to Import History"
```

**Design tokens:**
- Accepted count: `--color-success` (green #69a338)
- Rejected count: `--color-error` (red)
- Skipped count: `--color-warning` (amber)
- Card background: `--color-surface-white` (#ffffff)
- Page background: `--color-bg-cream` (#f5f3ef)

**States:**
1. **Loading** -- Skeleton cards and tables while fetching
2. **Complete** -- Full report displayed with charts and tables
3. **No Rejected** -- Rejected table shows empty state
4. **No Skipped** -- Skipped table shows empty state
5. **Error** -- Import job not found or not completed, error banner

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/import/report.types.ts` | Types | Create |
| 2 | `packages/types/src/import/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add import export) |
| 4 | Supabase migration via MCP (indexes) | Database | Apply |
| 5 | `apps/server/src/services/import/import-report.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/import/import-report.controller.ts` | Controller | Create |
| 7 | `apps/server/src/routes/import.routes.ts` | Routes | Edit (add report routes) |
| 8 | `apps/web/src/components/import/ImportReportSummary.tsx` | Organism | Create |
| 9 | `apps/web/src/components/import/RejectedItemsTable.tsx` | Organism | Create |
| 10 | `apps/web/src/components/import/SkippedItemsTable.tsx` | Organism | Create |
| 11 | `apps/web/src/app/(dashboard)/faculty/import/[importId]/report/page.tsx` | Page | Create |
| 12 | `apps/server/src/__tests__/import/import-report.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-57 | faculty | Pending | Import pipeline produces report data in import_jobs table |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for role check |
| STORY-U-10 | universal | **DONE** | Dashboard routing for faculty layout |

### NPM Packages
- `recharts` -- Donut/pie chart for outcome visualization
- `papaparse` -- CSV generation for report export

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Mock completed import job with report data
export const COMPLETED_IMPORT_JOB = {
  id: "import-uuid-1",
  institution_id: "inst-uuid-1",
  uploaded_by: "faculty-uuid-1",
  file_name: "Cardiology_Questions_2026.csv",
  status: "completed",
  summary: {
    total: 150,
    accepted: 132,
    rejected: 8,
    skipped: 10,
  },
  rejected_items: [
    {
      row_number: 23,
      identifier: "Q-23",
      reason: "Missing correct answer designation",
      field: "correct_answer",
    },
    {
      row_number: 67,
      identifier: "Q-67",
      reason: "Invalid question type",
      field: "question_type",
    },
  ],
  skipped_items: [
    {
      row_number: 45,
      identifier: "Q-45",
      reason: "Duplicate detected (similarity: 0.97)",
      duplicate_of_id: "q-uuid-existing-1",
    },
  ],
  accepted_batch_id: "batch-uuid-1",
  created_at: "2026-02-18T09:00:00Z",
  completed_at: "2026-02-18T09:05:32Z",
};

// Mock pending import (report not yet available)
export const PENDING_IMPORT_JOB = {
  ...COMPLETED_IMPORT_JOB,
  id: "import-uuid-2",
  status: "processing",
  summary: {},
  rejected_items: [],
  skipped_items: [],
  completed_at: null,
};

// Mock faculty user
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/import/import-report.controller.test.ts`

```
describe("ImportReportController")
  describe("GET /api/v1/import/:importId/report")
    > returns full report for completed import job
    > summary counts match accepted + rejected + skipped totals
    > rejected items include row_number, identifier, and reason
    > skipped items include row_number, identifier, and reason
    > returns 404 for non-existent import job
    > returns 404 for import job still processing (not completed)
    > returns 403 when faculty tries to view another user's import

  describe("GET /api/v1/import/:importId/report/export")
    > returns CSV download URL for completed import
    > CSV contains all rejected and skipped items with details
```

**Total: ~9 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Import report is a read-only view; E2E coverage will be part of the full import pipeline E2E test.

## 12. Acceptance Criteria

1. Report page displays summary card with total, accepted, rejected, skipped counts
2. Donut chart visually shows outcome breakdown with correct colors
3. Rejected items table shows item identifier, rejection reason, source row number
4. Skipped items table shows item identifier, skip reason (e.g., duplicate detected)
5. Accepted items section links to item bank filtered by import batch
6. CSV export generates a downloadable file with full report data
7. Report persisted and accessible from import history list
8. Returns 404 for imports that are not yet completed
9. All 9 API tests pass
10. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Report data from import_jobs JSONB | S-F-24-4 SS Notes: "Report data sourced from import_jobs table: counts stored as JSONB summary" |
| Donut chart with recharts | S-F-24-4 SS Notes: "shadcn/ui compatible charting library (recharts)" |
| Outcome design tokens | S-F-24-4 SS Notes: "accepted (green), rejected (red), skipped (amber)" |
| Report URL pattern | S-F-24-4 SS Notes: "/faculty/import/:importId/report" |
| Re-import rejected consideration | S-F-24-4 SS Notes |
| Blocked by import pipeline | S-F-24-4 SS Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, `import_jobs` table created (via STORY-F-57 migration)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **STORY-F-57 (Import Pipeline):** Must be complete -- produces report data
- **No Neo4j needed** for this story

## 15. Figma Make Prototype

```
Frame: Import Report Page (1440x900)
  ├── Sidebar (240px, navy deep #002c76)
  ├── Main Content Area (1200px, cream #f5f3ef)
  │   ├── Back Link: "< Back to Import History"
  │   ├── Header: "Import Report: Cardiology_Questions_2026.csv"
  │   ├── Summary Row (flex, gap-16)
  │   │   ├── SummaryCard (white card, 280px)
  │   │   │   ├── "Total Items: 150" (large number)
  │   │   │   ├── "Accepted: 132" (green #69a338)
  │   │   │   ├── "Rejected: 8" (red)
  │   │   │   └── "Skipped: 10" (amber)
  │   │   ├── DonutChart (recharts, 280px)
  │   │   │   └── Green/Red/Amber segments with labels
  │   │   └── ExportButton: "Export Report as CSV"
  │   ├── Accepted Link Card (white, full width)
  │   │   └── "View 132 accepted items in Item Bank >"
  │   ├── Rejected Items Table (white card)
  │   │   ├── Header: "Rejected Items (8)"
  │   │   └── Columns: Row #, Identifier, Reason, Field
  │   └── Skipped Items Table (white card)
  │       ├── Header: "Skipped Items (10)"
  │       └── Columns: Row #, Identifier, Reason, Duplicate Link
  └── Empty States: "No items were rejected/skipped" (centered, muted text)
```
