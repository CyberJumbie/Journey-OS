# STORY-IA-33 Brief: Cross-Course Comparison

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-33
old_id: S-IA-33-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 33
sprint: 18
size: M
depends_on:
  - STORY-IA-11 (institutional_admin) — Analytics Service Infrastructure
blocks: []
personas_served: [institutional_admin]
epic: E-33 (Course & Teaching Analytics)
feature: F-15 (Teaching & Course Analytics)
user_flow: UF-24 (Institutional Course Quality Monitoring)
```

---

## 1. Summary

Build a **Cross-Course Comparison** view allowing institutional admins to compare item bank health across multiple courses. The view includes a comparison table (courses as rows, metrics as columns), a radar chart overlaying up to 5 courses on a multi-axis chart, ranking by any metric, threshold-based warning indicators, drill-down navigation to individual course analytics, and export as CSV or PDF.

Key constraints:
- **Radar chart axes:** Quality, Coverage, Volume, Bloom Diversity, Difficulty Balance
- **Bloom diversity** measured as entropy of Bloom level distribution
- **Institutional thresholds** configurable in admin settings (e.g., min coverage 70%, min quality 3.5)
- **Comparison limited** to courses within admin's institution scope
- **Recharts** RadarChart component for multi-course overlay
- **PDF export** via server-side rendering (react-pdf or Puppeteer)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Hook -> Components -> Page -> Tests**

### Task 1: Create comparison types
- **File:** `packages/types/src/analytics/comparison.types.ts`
- **Action:** Export `CourseComparison`, `ComparisonMetrics`, `ComparisonFilters`, `InstitutionThresholds`, `RadarDataPoint`

### Task 2: Export types from analytics barrel
- **File:** `packages/types/src/analytics/index.ts`
- **Action:** Edit to re-export from `comparison.types.ts`

### Task 3: Build CourseComparisonService
- **File:** `apps/server/src/services/analytics/course-comparison.service.ts`
- **Action:** Class with `#supabase` private field. Methods: `getCourseComparisons(institutionId, filters)`, `getInstitutionThresholds(institutionId)`, `computeBloomDiversity(courseId)`.

### Task 4: Build CourseComparisonController
- **File:** `apps/server/src/controllers/analytics/course-comparison.controller.ts`
- **Action:** Handler for GET /analytics/comparison. Extracts `institution_id` from `req.user`, calls service, returns `ApiResponse`.

### Task 5: Build ComparisonTable component
- **File:** `apps/web/src/components/analytics/ComparisonTable.tsx`
- **Action:** Named export `ComparisonTable`. DataTable with course rows, metric columns. Sortable. Warning indicators for courses below thresholds. Row click navigates to course detail.

### Task 6: Build CourseRadarChart component
- **File:** `apps/web/src/components/analytics/CourseRadarChart.tsx`
- **Action:** Named export `CourseRadarChart`. Recharts RadarChart overlaying up to 5 selected courses. 5 axes: Quality, Coverage, Volume, Bloom Diversity, Difficulty Balance.

### Task 7: Build comparison page
- **File:** `apps/web/src/app/(dashboard)/admin/analytics/comparison/page.tsx`
- **Action:** Default export page. Renders filters, ComparisonTable (with course selection checkboxes for radar), and CourseRadarChart.

### Task 8: Write API tests
- **File:** `apps/server/src/tests/analytics/course-comparison.test.ts`
- **Action:** 8-12 tests for service and controller.

---

## 3. Data Model

```typescript
// packages/types/src/analytics/comparison.types.ts

/** Metrics for a single course comparison */
export interface ComparisonMetrics {
  readonly total_items: number;
  readonly approved_count: number;
  readonly average_quality: number;       // composite score 0-5
  readonly slo_coverage_percentage: number; // 0-100
  readonly bloom_diversity: number;       // entropy 0-1 (higher = more diverse)
  readonly difficulty_balance: number;    // 0-1 (1 = perfectly balanced)
}

/** A course row in the comparison table */
export interface CourseComparison {
  readonly course_id: string;
  readonly course_name: string;
  readonly program_name: string;
  readonly metrics: ComparisonMetrics;
  readonly below_thresholds: readonly string[]; // metric names below threshold
}

/** Radar chart data point for a single course */
export interface RadarDataPoint {
  readonly axis: string;                  // metric name
  readonly value: number;                 // normalized 0-100
}

/** Configurable institutional thresholds */
export interface InstitutionThresholds {
  readonly min_coverage: number;          // default 70
  readonly min_quality: number;           // default 3.5
  readonly min_bloom_diversity: number;   // default 0.5
  readonly min_items: number;             // default 50
}

/** Filter parameters */
export interface ComparisonFilters {
  readonly program_id?: string;
  readonly sort_by?: keyof ComparisonMetrics;
  readonly sort_order?: 'asc' | 'desc';
}
```

---

## 4. Database Schema

No new tables. Comparison data computed from existing tables:

**Data sources:**
- `courses` -- course list per institution
- `questions` / `assessment_items` -- per-course item counts, quality scores, Bloom levels, difficulty
- `slos` -- per-course SLO coverage

**Bloom diversity (entropy) computation:**
```sql
-- Bloom level distribution per course
SELECT bloom_level, COUNT(*) AS count
FROM questions
WHERE course_id = $courseId
GROUP BY bloom_level;

-- Entropy = -SUM(p * ln(p)) where p = count/total per Bloom level
-- Normalized by dividing by ln(6) (max entropy for 6 Bloom levels)
```

**Thresholds stored in `institution_settings` table (key-value).**

---

## 5. API Contract

### GET /api/v1/analytics/comparison (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `program_id` | UUID | -- | Filter by program |
| `sort_by` | string | `average_quality` | Sort metric |
| `sort_order` | string | `desc` | Sort direction |

**Success Response (200):**
```json
{
  "data": {
    "courses": [
      {
        "course_id": "course-uuid-1",
        "course_name": "Anatomy I",
        "program_name": "MD Program",
        "metrics": {
          "total_items": 342,
          "approved_count": 290,
          "average_quality": 4.2,
          "slo_coverage_percentage": 85,
          "bloom_diversity": 0.78,
          "difficulty_balance": 0.65
        },
        "below_thresholds": []
      },
      {
        "course_id": "course-uuid-3",
        "course_name": "Biochemistry I",
        "program_name": "MD Program",
        "metrics": {
          "total_items": 45,
          "approved_count": 30,
          "average_quality": 3.1,
          "slo_coverage_percentage": 55,
          "bloom_diversity": 0.35,
          "difficulty_balance": 0.40
        },
        "below_thresholds": ["average_quality", "slo_coverage_percentage", "bloom_diversity", "total_items"]
      }
    ],
    "thresholds": {
      "min_coverage": 70,
      "min_quality": 3.5,
      "min_bloom_diversity": 0.5,
      "min_items": 50
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
| 400 | `VALIDATION_ERROR` | Invalid sort field or UUID |

---

## 6. Frontend Spec

### Page: `/admin/analytics/comparison`

**Component hierarchy:**
```
ComparisonPage (page.tsx -- default export)
  ├── PageHeader ("Cross-Course Comparison")
  ├── FilterBar
  │     ├── ProgramSelect
  │     └── ExportMenu (CSV / PDF buttons)
  ├── CourseRadarChart (Recharts RadarChart)
  │     └── Up to 5 course overlays (selected via checkboxes)
  └── ComparisonTable (DataTable)
        ├── CheckboxColumn (select for radar, max 5)
        ├── CourseNameColumn (clickable, navigates to detail)
        ├── ProgramColumn
        ├── TotalItemsColumn (sortable, warning if below threshold)
        ├── QualityColumn (sortable, warning if below threshold)
        ├── CoverageColumn (sortable, warning if below threshold)
        ├── BloomDiversityColumn (sortable, warning if below threshold)
        └── DifficultyBalanceColumn (sortable)
```

**States:**
1. **Loading** -- Skeleton table and chart placeholder
2. **Data** -- Table populated, radar chart shows selected courses
3. **Selected** -- Up to 5 courses checked for radar chart overlay
4. **Warning** -- Courses below thresholds flagged with amber warning icon
5. **Empty** -- "No courses found" message

**Design tokens:**
- Warning icon: `#eab308` (amber), Lucide `AlertTriangle`
- Radar chart colors: 5 distinct colors for overlaid courses: `#002c76`, `#69a338`, `#dc2626`, `#7c3aed`, `#eab308`
- Threshold line on radar: dashed gray at threshold values
- Table: shadcn/ui DataTable, consistent with other admin tables
- Below-threshold cell: light red background `#fef2f2`

**Radar Chart Axes (normalized 0-100):**
1. Quality: `(average_quality / 5) * 100`
2. Coverage: `slo_coverage_percentage` (already 0-100)
3. Volume: `min(total_items / 200, 1) * 100` (cap at 200 items = 100%)
4. Bloom Diversity: `bloom_diversity * 100`
5. Difficulty Balance: `difficulty_balance * 100`

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/analytics/comparison.types.ts` | Types | Create |
| 2 | `packages/types/src/analytics/index.ts` | Types | Edit (add export) |
| 3 | `apps/server/src/services/analytics/course-comparison.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/analytics/course-comparison.controller.ts` | Controller | Create |
| 5 | `apps/web/src/components/analytics/ComparisonTable.tsx` | Component | Create |
| 6 | `apps/web/src/components/analytics/CourseRadarChart.tsx` | Component | Create |
| 7 | `apps/web/src/app/(dashboard)/admin/analytics/comparison/page.tsx` | Page | Create |
| 8 | `apps/server/src/tests/analytics/course-comparison.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-11 | institutional_admin | **PENDING** | Analytics service infrastructure provides base query patterns |

### NPM Packages
- `recharts` -- already installed (RadarChart is a built-in Recharts component)
- No new packages expected for MVP. PDF export can use `react-pdf` or be deferred.

### Existing Files Needed
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/table.tsx` -- shadcn/ui Table
- `apps/web/src/components/ui/checkbox.tsx` -- shadcn/ui Checkbox for radar selection
- `apps/web/src/components/ui/select.tsx` -- shadcn/ui Select for filters
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button for export
- `apps/web/src/utils/csv-export.ts` -- CSV export utility (from STORY-IA-25)

---

## 9. Test Fixtures

```typescript
export const MOCK_COURSES: CourseComparison[] = [
  {
    course_id: "course-uuid-1",
    course_name: "Anatomy I",
    program_name: "MD Program",
    metrics: {
      total_items: 342,
      approved_count: 290,
      average_quality: 4.2,
      slo_coverage_percentage: 85,
      bloom_diversity: 0.78,
      difficulty_balance: 0.65,
    },
    below_thresholds: [],
  },
  {
    course_id: "course-uuid-2",
    course_name: "Pharmacology I",
    program_name: "MD Program",
    metrics: {
      total_items: 180,
      approved_count: 155,
      average_quality: 3.9,
      slo_coverage_percentage: 72,
      bloom_diversity: 0.62,
      difficulty_balance: 0.55,
    },
    below_thresholds: [],
  },
  {
    course_id: "course-uuid-3",
    course_name: "Biochemistry I",
    program_name: "MD Program",
    metrics: {
      total_items: 45,
      approved_count: 30,
      average_quality: 3.1,
      slo_coverage_percentage: 55,
      bloom_diversity: 0.35,
      difficulty_balance: 0.40,
    },
    below_thresholds: ["average_quality", "slo_coverage_percentage", "bloom_diversity", "total_items"],
  },
];

export const MOCK_THRESHOLDS: InstitutionThresholds = {
  min_coverage: 70,
  min_quality: 3.5,
  min_bloom_diversity: 0.5,
  min_items: 50,
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

**File:** `apps/server/src/tests/analytics/course-comparison.test.ts`

```
describe("CourseComparisonService")
  describe("getCourseComparisons")
    it("returns all courses with metrics for institution")
    it("flags courses below institutional thresholds")
    it("filters by program_id when provided")
    it("sorts by specified metric column")
  describe("computeBloomDiversity")
    it("returns 0 for single Bloom level")
    it("returns ~1.0 for evenly distributed Bloom levels")
    it("returns intermediate value for skewed distribution")
  describe("getInstitutionThresholds")
    it("returns configured thresholds from institution_settings")
    it("returns defaults when no custom thresholds configured")

describe("GET /api/v1/analytics/comparison")
  it("returns 200 with course comparisons for institutional_admin")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")
  it("scopes to requesting user institution only")
```

**Total: ~11 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. Cross-course comparison is a read-only analytics view. API and component tests provide sufficient coverage.

---

## 12. Acceptance Criteria

1. Multi-course comparison table shows courses as rows with metric columns
2. Metrics include: total items, approved count, average quality, SLO coverage %, Bloom diversity
3. Radar chart overlays up to 5 selected courses on 5-axis chart
4. Table sortable by any metric column
5. Courses below institutional thresholds flagged with warning indicators
6. Drill-down: click course row to navigate to course analytics detail
7. Export comparison as CSV
8. Scoped to admin's institution only
9. All ~11 API tests pass
10. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Cross-course comparison concept | S-IA-33-3 User Story |
| Radar chart axes | S-IA-33-3 Notes |
| Bloom diversity as entropy | S-IA-33-3 Notes |
| Institutional thresholds configurable | S-IA-33-3 Notes |
| Comparison limited to institution scope | S-IA-33-3 Notes |
| PDF export consideration | S-IA-33-3 Notes |
| Blocked by analytics infrastructure | S-IA-33-3 Dependencies |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Express:** Server running with analytics routes
- **Supabase:** courses, questions, slos, institution_settings tables populated
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim
- **Prerequisite:** Analytics service infrastructure (STORY-IA-11) must exist

---

## 15. Figma Make Prototype

No Figma prototype for this story. Reference Recharts RadarChart examples for multi-overlay pattern. Follow existing admin table patterns for comparison table layout.
