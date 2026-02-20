# STORY-IA-25 Brief: Institution Overview Table

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-25
old_id: S-IA-36-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 25
sprint: 9
size: M
depends_on:
  - STORY-IA-5 (institutional_admin) — Admin Dashboard Page
blocks: []
personas_served: [institutional_admin]
epic: E-36 (Admin Dashboard & KPIs)
feature: F-17 (Platform Quality & Admin)
user_flow: UF-25 (Admin Dashboard Monitoring)
```

---

## 1. Summary

Build an **Institution Overview Table** displaying programs and departments within an admin's institution. The table shows key metrics per program: status, faculty count, student count, course count, questions generated, and last activity timestamp. Features include sorting by any column, searching by program name, expandable rows revealing per-course stats, a summary totals row at bottom, and CSV export of the current table view.

The table uses shadcn/ui `DataTable` with `@tanstack/react-table` for column sorting, filtering, and row expansion. Data comes from `GET /api/v1/admin/institution/overview`. Scoped to the authenticated admin's institution via `req.user.institution_id` -- no cross-institution data exposure.

Key constraints:
- **shadcn/ui DataTable** with `@tanstack/react-table` for consistency with existing admin tables
- **Expandable rows** using react-table row expansion API for per-course drill-down
- **CSV export** generated client-side from current filtered/sorted data
- **Status indicators** consistent with platform-wide design (Active/Draft/Archived)
- **Summary row** at table bottom showing institution-wide totals

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Hook -> Components -> Tests**

### Task 1: Create institution overview types
- **File:** `packages/types/src/admin/institution-overview.types.ts`
- **Action:** Export `ProgramOverview`, `CourseOverview`, `InstitutionOverviewResponse`, `InstitutionOverviewSummary`

### Task 2: Export types from admin barrel
- **File:** `packages/types/src/admin/index.ts`
- **Action:** Edit to re-export from `institution-overview.types.ts`

### Task 3: Build AdminDashboardService method
- **File:** `apps/server/src/services/admin/admin-dashboard.service.ts`
- **Action:** Add `getInstitutionOverview(institutionId: string)` method. Queries programs with aggregated counts (faculty, students, courses, questions, last activity).

### Task 4: Build DashboardController endpoint
- **File:** `apps/server/src/controllers/admin/dashboard.controller.ts`
- **Action:** Add `GET /institution/overview` handler. Extracts `institution_id` from `req.user`, calls service, returns `ApiResponse<InstitutionOverviewResponse>`.

### Task 5: Build CSV export utility
- **File:** `apps/web/src/utils/csv-export.ts`
- **Action:** Named export `exportTableAsCSV(headers, rows, filename)`. Generates CSV string from table data, triggers download via Blob URL.

### Task 6: Build useInstitutionOverview hook
- **File:** `apps/web/src/hooks/use-institution-overview.ts`
- **Action:** Named export `useInstitutionOverview()`. Fetches overview data from API, manages loading/error states, returns `{ data, isLoading, error, refetch }`.

### Task 7: Build ProgramDetailRow component
- **File:** `apps/web/src/components/admin/program-detail-row.tsx`
- **Action:** Named export `ProgramDetailRow`. Renders inline expanded row with a mini-table of courses for the selected program, showing per-course stats.

### Task 8: Build InstitutionOverviewTable component
- **File:** `apps/web/src/components/admin/institution-overview-table.tsx`
- **Action:** Named export `InstitutionOverviewTable`. Uses shadcn/ui DataTable with column definitions, sorting, search filtering, row expansion, and summary row. Includes CSV export button.

### Task 9: Write API tests
- **File:** `apps/server/src/tests/admin/institution-overview.test.ts`
- **Action:** 8-10 tests covering service queries, controller response, scoping, aggregation.

### Task 10: Write component tests
- **File:** `apps/web/src/__tests__/components/institution-overview-table.test.tsx`
- **Action:** 6-8 tests covering rendering, sorting, search, expand/collapse, summary totals, CSV export.

---

## 3. Data Model

```typescript
// packages/types/src/admin/institution-overview.types.ts

/** Overview of a single course within a program */
export interface CourseOverview {
  readonly course_id: string;
  readonly course_name: string;
  readonly status: 'active' | 'draft' | 'archived';
  readonly student_count: number;
  readonly questions_generated: number;
  readonly last_activity: string | null; // ISO timestamp
}

/** Overview of a single program/department */
export interface ProgramOverview {
  readonly program_id: string;
  readonly program_name: string;
  readonly status: 'active' | 'draft' | 'archived';
  readonly faculty_count: number;
  readonly student_count: number;
  readonly course_count: number;
  readonly questions_generated: number;
  readonly last_activity: string | null; // ISO timestamp
  readonly courses: readonly CourseOverview[];
}

/** Summary totals for the institution */
export interface InstitutionOverviewSummary {
  readonly total_programs: number;
  readonly total_faculty: number;
  readonly total_students: number;
  readonly total_courses: number;
  readonly total_questions: number;
}

/** Full overview response */
export interface InstitutionOverviewResponse {
  readonly programs: readonly ProgramOverview[];
  readonly summary: InstitutionOverviewSummary;
}
```

---

## 4. Database Schema

No new tables. The overview aggregates from existing tables:

**Data sources:**
- `programs` -- program name, status, institution_id
- `users` / `profiles` -- faculty and student counts per program (via `program_id` and `role`)
- `courses` -- course count per program
- `questions` or `assessment_items` -- questions generated per program
- `activity_events` -- last activity per program

**Aggregation queries:**
```sql
-- Programs with counts
SELECT
  p.id AS program_id,
  p.name AS program_name,
  p.status,
  COUNT(DISTINCT CASE WHEN pr.role = 'faculty' THEN pr.user_id END) AS faculty_count,
  COUNT(DISTINCT CASE WHEN pr.role = 'student' THEN pr.user_id END) AS student_count,
  COUNT(DISTINCT c.id) AS course_count,
  COUNT(DISTINCT q.id) AS questions_generated,
  MAX(ae.created_at) AS last_activity
FROM programs p
LEFT JOIN profiles pr ON pr.program_id = p.id
LEFT JOIN courses c ON c.program_id = p.id
LEFT JOIN questions q ON q.course_id = c.id
LEFT JOIN activity_events ae ON ae.program_id = p.id
WHERE p.institution_id = $institutionId
GROUP BY p.id, p.name, p.status
ORDER BY p.name;
```

---

## 5. API Contract

### GET /api/v1/admin/institution/overview (Auth: InstitutionalAdmin)

**Headers:**
| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <jwt>` |

**Success Response (200):**
```json
{
  "data": {
    "programs": [
      {
        "program_id": "prog-uuid-1",
        "program_name": "MD Program",
        "status": "active",
        "faculty_count": 45,
        "student_count": 200,
        "course_count": 12,
        "questions_generated": 1523,
        "last_activity": "2026-02-18T14:30:00Z",
        "courses": [
          {
            "course_id": "course-uuid-1",
            "course_name": "Anatomy I",
            "status": "active",
            "student_count": 100,
            "questions_generated": 342,
            "last_activity": "2026-02-18T14:30:00Z"
          }
        ]
      }
    ],
    "summary": {
      "total_programs": 4,
      "total_faculty": 120,
      "total_students": 650,
      "total_courses": 38,
      "total_questions": 5200
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

### Component Hierarchy

```
InstitutionOverviewTable (Organism)
  ├── SearchInput (shadcn/ui Input, filters by program name)
  ├── ExportButton (shadcn/ui Button, triggers CSV export)
  ├── DataTable (@tanstack/react-table)
  │     ├── TableHeader (sortable columns)
  │     ├── TableBody
  │     │     ├── ProgramRow × N
  │     │     │     └── (expanded) ProgramDetailRow
  │     │     │           └── CourseOverview mini-table
  │     │     └── SummaryRow (institution totals, sticky bottom)
  │     └── TableFooter
  └── EmptyState (no programs found)
```

**Column definitions:**
1. Expand toggle (chevron icon)
2. Program Name (sortable, searchable)
3. Status (badge: green=Active, yellow=Draft, gray=Archived)
4. Faculty Count (sortable, right-aligned)
5. Student Count (sortable, right-aligned)
6. Course Count (sortable, right-aligned)
7. Questions Generated (sortable, right-aligned)
8. Last Activity (sortable, relative time format)

**States:**
1. **Loading** -- Skeleton rows matching table structure
2. **Data** -- Populated table with sorting and search
3. **Expanded** -- Program row expanded showing course detail
4. **Empty** -- "No programs found" with suggestion
5. **Error** -- Error message with retry button

**Design tokens:**
- Surface: `--color-surface-primary` (#ffffff)
- Status badges: Active (#69a338), Draft (#eab308), Archived (#9ca3af)
- Table header: `--color-surface-secondary`, `--font-weight-semibold`
- Summary row: `--color-surface-secondary`, `--font-weight-bold`
- Search input: shadcn/ui Input, 320px max width
- Spacing: `--spacing-4` between search/export bar and table

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/admin/institution-overview.types.ts` | Types | Create |
| 2 | `packages/types/src/admin/index.ts` | Types | Edit (add export) |
| 3 | `apps/server/src/services/admin/admin-dashboard.service.ts` | Service | Edit (add method) |
| 4 | `apps/server/src/controllers/admin/dashboard.controller.ts` | Controller | Edit (add endpoint) |
| 5 | `apps/web/src/utils/csv-export.ts` | Utility | Create |
| 6 | `apps/web/src/hooks/use-institution-overview.ts` | Hook | Create |
| 7 | `apps/web/src/components/admin/program-detail-row.tsx` | Component | Create |
| 8 | `apps/web/src/components/admin/institution-overview-table.tsx` | Component | Create |
| 9 | `apps/server/src/tests/admin/institution-overview.test.ts` | Tests | Create |
| 10 | `apps/web/src/__tests__/components/institution-overview-table.test.tsx` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-5 | institutional_admin | **PENDING** | Admin Dashboard Page provides the layout where this table is rendered |

### NPM Packages
- `@tanstack/react-table` -- table framework (likely already installed from SA-2 user directory)
- No new packages expected

### Existing Files Needed
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/table.tsx` -- shadcn/ui Table
- `apps/web/src/components/ui/input.tsx` -- shadcn/ui Input for search
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button for export
- `apps/web/src/components/ui/badge.tsx` -- shadcn/ui Badge for status indicators
- `apps/web/src/components/ui/skeleton.tsx` -- shadcn/ui Skeleton for loading

---

## 9. Test Fixtures

```typescript
// Mock program overview data
export const MOCK_PROGRAMS: ProgramOverview[] = [
  {
    program_id: "prog-uuid-1",
    program_name: "MD Program",
    status: "active",
    faculty_count: 45,
    student_count: 200,
    course_count: 12,
    questions_generated: 1523,
    last_activity: "2026-02-18T14:30:00Z",
    courses: [
      {
        course_id: "course-uuid-1",
        course_name: "Anatomy I",
        status: "active",
        student_count: 100,
        questions_generated: 342,
        last_activity: "2026-02-18T14:30:00Z",
      },
      {
        course_id: "course-uuid-2",
        course_name: "Biochemistry I",
        status: "active",
        student_count: 100,
        questions_generated: 281,
        last_activity: "2026-02-17T09:15:00Z",
      },
    ],
  },
  {
    program_id: "prog-uuid-2",
    program_name: "PA Program",
    status: "active",
    faculty_count: 20,
    student_count: 80,
    course_count: 8,
    questions_generated: 634,
    last_activity: "2026-02-16T11:00:00Z",
    courses: [],
  },
  {
    program_id: "prog-uuid-3",
    program_name: "Research Track",
    status: "draft",
    faculty_count: 5,
    student_count: 0,
    course_count: 2,
    questions_generated: 0,
    last_activity: null,
    courses: [],
  },
];

export const MOCK_SUMMARY: InstitutionOverviewSummary = {
  total_programs: 3,
  total_faculty: 70,
  total_students: 280,
  total_courses: 22,
  total_questions: 2157,
};

export const MOCK_OVERVIEW_RESPONSE: InstitutionOverviewResponse = {
  programs: MOCK_PROGRAMS,
  summary: MOCK_SUMMARY,
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

**File:** `apps/server/src/tests/admin/institution-overview.test.ts`

```
describe("AdminDashboardService.getInstitutionOverview")
  it("returns programs with aggregated counts for institution")
  it("scopes query to the given institution_id only")
  it("includes course details nested in each program")
  it("computes summary totals correctly across all programs")
  it("handles institution with zero programs gracefully")
  it("sorts programs by name alphabetically by default")

describe("GET /api/v1/admin/institution/overview")
  it("returns 200 with overview data for authenticated institutional_admin")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")
  it("scopes data to requesting user institution only")
```

**Total: 10 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. The institution overview table is a supporting component within the admin dashboard. E2E coverage will be provided by the admin dashboard critical journey test.

---

## 12. Acceptance Criteria

1. InstitutionOverviewTable renders programs/departments as rows within the authenticated admin's institution
2. Columns display: program name, status, faculty count, student count, course count, questions generated, last activity
3. Table is sortable by any column (ascending/descending toggle)
4. Search input filters programs by name (case-insensitive partial match)
5. Row click expands inline to show ProgramDetailRow with per-course stats
6. Summary row at bottom displays institution-wide totals
7. Status indicators use consistent design: Active (green), Draft (yellow), Archived (gray)
8. CSV export button downloads current table data (respecting active filters/sort)
9. Data fetched from `GET /api/v1/admin/institution/overview`
10. All 10 API tests pass
11. All 6-8 component tests pass
12. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Institution overview table concept | S-IA-36-2 User Story |
| Column definitions | S-IA-36-2 Acceptance Criteria |
| DataTable with @tanstack/react-table | S-IA-36-2 Notes (consistent with S-SA-05-1) |
| Expandable rows for course detail | S-IA-36-2 Acceptance Criteria |
| CSV export client-side | S-IA-36-2 Notes |
| Scoped to current user institution | S-IA-36-2 Notes |
| Blocked by admin dashboard page | S-IA-36-2 Dependencies |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Express:** Server running with admin routes registered
- **Supabase:** Programs, courses, profiles, questions tables populated
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim
- **RBAC:** `institutional_admin` role required for endpoint access

---

## 15. Figma Make Prototype

No Figma prototype for this story. Follow existing admin table patterns from the Global User Directory (STORY-SA-2) for layout consistency.
