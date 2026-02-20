# STORY-IA-11 Brief: Course Analytics Page

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-11
old_id: S-IA-33-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 11
sprint: 18
size: M
depends_on:
  - STORY-IA-3 (institutional_admin) — Coverage Computation Service
blocks:
  - STORY-IA-32 — Personal Analytics Page
  - STORY-IA-33 — Cross-Course Comparison
  - STORY-IA-34 — Centrality Visualization
personas_served: [institutional_admin, faculty]
epic: E-33 (Course & Teaching Analytics)
feature: F-15 (Analytics)
user_flow: UF-25 (Institutional Analytics)
```

---

## 1. Summary

Build a **course analytics page** at `/institution/analytics/courses` for InstitutionalAdmin and Faculty users. The page includes a course selector dropdown, KPI cards (total items, approved rate, avg quality score, SLO coverage %), and 4 chart visualizations: Bloom distribution bar chart, USMLE system distribution bar chart, difficulty pie chart, and quality trend line chart. An additional generation velocity trend chart tracks item creation rates over time. All charts and KPIs are filterable by date range and question type.

Key constraints:
- **InstitutionalAdmin + Faculty** -- RBAC enforced with `rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY)`
- Institution scoping: queries filter by `req.user.institution_id`
- Uses `recharts` library for all chart components
- Course selector fetches available courses scoped to the user's institution
- Date range filter defaults to last 30 days
- Question type filter: MCQ, short answer, case study, or all
- KPI values computed server-side via aggregation queries

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create CourseAnalytics types
- **File:** `packages/types/src/analytics/course-analytics.types.ts`
- **Action:** Export `CourseAnalyticsQuery`, `CourseAnalyticsKPIs`, `DistributionItem`, `TrendPoint`, `CourseAnalyticsData`

### Task 2: Create analytics barrel export
- **File:** `packages/types/src/analytics/index.ts`
- **Action:** Create barrel file re-exporting from `course-analytics.types.ts`

### Task 3: Export analytics from main barrel
- **File:** `packages/types/src/index.ts`
- **Action:** Edit to add `export * from "./analytics";`

### Task 4: Build CourseAnalyticsService
- **File:** `apps/server/src/services/analytics/course-analytics.service.ts`
- **Action:** `getAnalytics(institutionId, query)` method. Aggregates item data from Supabase, computes KPIs, distributions, and trends. Uses parameterized date range and question type filters.

### Task 5: Build CourseAnalyticsController
- **File:** `apps/server/src/controllers/analytics/course-analytics.controller.ts`
- **Action:** `handleGetAnalytics(req, res)` method. Extracts `courseId` from `req.params`, query params for date range and question type. Validates `courseId` is a valid UUID.

### Task 6: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add protected route: `GET /api/v1/analytics/courses/:courseId` with `rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.FACULTY)`

### Task 7: Build CourseKPICards component
- **File:** `apps/web/src/components/analytics/course-kpi-cards.tsx`
- **Action:** Named export `CourseKPICards`. Four card grid: total items, approved rate (%), avg quality score, SLO coverage (%). Uses design tokens for card surfaces.

### Task 8: Build BloomDistributionChart component
- **File:** `apps/web/src/components/analytics/bloom-distribution-chart.tsx`
- **Action:** Named export `BloomDistributionChart`. Recharts `BarChart` with 6 bars (Remember, Understand, Apply, Analyze, Evaluate, Create). Horizontal bar layout for readability.

### Task 9: Build USMLEDistributionChart component
- **File:** `apps/web/src/components/analytics/usmle-distribution-chart.tsx`
- **Action:** Named export `USMLEDistributionChart`. Recharts `BarChart` with 16 bars, one per USMLE system. Vertical layout with rotated x-axis labels.

### Task 10: Build QualityTrendChart component
- **File:** `apps/web/src/components/analytics/quality-trend-chart.tsx`
- **Action:** Named export `QualityTrendChart`. Recharts `LineChart` for quality score over time and generation velocity trend. Dual-axis or tab toggle.

### Task 11: Build course analytics page
- **File:** `apps/web/src/app/(protected)/institution/analytics/courses/page.tsx`
- **Action:** Default export page component. Course selector dropdown, date range picker, question type filter, KPI cards, chart grid.

### Task 12: Write service tests
- **File:** `apps/server/src/services/analytics/__tests__/course-analytics.service.test.ts`
- **Action:** 8-12 tests covering KPI computation, distribution aggregation, date filtering, empty data handling

### Task 13: Write controller tests
- **File:** `apps/server/src/controllers/analytics/__tests__/course-analytics.controller.test.ts`
- **Action:** 4 tests covering auth, validation, success response, error handling

---

## 3. Data Model

```typescript
// packages/types/src/analytics/course-analytics.types.ts

/** Query parameters for course analytics endpoint */
export interface CourseAnalyticsQuery {
  readonly course_id: string;
  readonly date_from?: string;  // ISO date string
  readonly date_to?: string;    // ISO date string
  readonly question_type?: string; // MCQ, short_answer, case_study
}

/** KPI summary for a course */
export interface CourseAnalyticsKPIs {
  readonly total_items: number;
  readonly approved_rate: number;       // 0-100 percentage
  readonly avg_quality_score: number;   // 0-1 float
  readonly slo_coverage_pct: number;    // 0-100 percentage
}

/** Single bar/slice in a distribution chart */
export interface DistributionItem {
  readonly label: string;
  readonly count: number;
}

/** Single point in a time series chart */
export interface TrendPoint {
  readonly date: string;   // ISO date string (day granularity)
  readonly value: number;
}

/** Complete analytics payload for a course */
export interface CourseAnalyticsData {
  readonly kpis: CourseAnalyticsKPIs;
  readonly bloom_distribution: readonly DistributionItem[];
  readonly usmle_distribution: readonly DistributionItem[];
  readonly difficulty_distribution: readonly DistributionItem[];
  readonly quality_trend: readonly TrendPoint[];
  readonly generation_velocity: readonly TrendPoint[];
}
```

---

## 4. Database Schema

No new tables. Uses existing item bank tables and course/SLO tables.

**Aggregation queries used by the service:**

```sql
-- KPI: total items + approved rate
SELECT
  COUNT(*) AS total_items,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'approved') / NULLIF(COUNT(*), 0), 1) AS approved_rate,
  ROUND(AVG(quality_score)::numeric, 3) AS avg_quality_score
FROM assessment_items
WHERE course_id = $course_id
  AND ($date_from IS NULL OR created_at >= $date_from)
  AND ($date_to IS NULL OR created_at <= $date_to)
  AND ($question_type IS NULL OR question_type = $question_type);

-- KPI: SLO coverage %
SELECT
  ROUND(100.0 * COUNT(DISTINCT ai.slo_id) / NULLIF((SELECT COUNT(*) FROM slos WHERE course_id = $course_id), 0), 1) AS slo_coverage_pct
FROM assessment_items ai
WHERE ai.course_id = $course_id
  AND ai.slo_id IS NOT NULL;

-- Bloom distribution
SELECT bloom_level AS label, COUNT(*) AS count
FROM assessment_items
WHERE course_id = $course_id
GROUP BY bloom_level
ORDER BY ARRAY_POSITION(ARRAY['remember','understand','apply','analyze','evaluate','create'], bloom_level);

-- USMLE system distribution
SELECT usmle_system AS label, COUNT(*) AS count
FROM assessment_items
WHERE course_id = $course_id
GROUP BY usmle_system
ORDER BY count DESC;

-- Difficulty distribution
SELECT difficulty AS label, COUNT(*) AS count
FROM assessment_items
WHERE course_id = $course_id
GROUP BY difficulty;

-- Quality trend (daily)
SELECT DATE(created_at) AS date, ROUND(AVG(quality_score)::numeric, 3) AS value
FROM assessment_items
WHERE course_id = $course_id
GROUP BY DATE(created_at)
ORDER BY date;

-- Generation velocity (daily item count)
SELECT DATE(created_at) AS date, COUNT(*) AS value
FROM assessment_items
WHERE course_id = $course_id
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## 5. API Contract

### GET /api/v1/analytics/courses/:courseId (Auth: InstitutionalAdmin or Faculty)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `courseId` | UUID | Course to get analytics for |

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `date_from` | ISO date | 30 days ago | Start of date range |
| `date_to` | ISO date | today | End of date range |
| `question_type` | string | -- | Filter by type (MCQ, short_answer, case_study) |

**Success Response (200):**
```json
{
  "data": {
    "kpis": {
      "total_items": 245,
      "approved_rate": 72.3,
      "avg_quality_score": 0.812,
      "slo_coverage_pct": 68.5
    },
    "bloom_distribution": [
      { "label": "Remember", "count": 45 },
      { "label": "Understand", "count": 62 },
      { "label": "Apply", "count": 78 },
      { "label": "Analyze", "count": 35 },
      { "label": "Evaluate", "count": 18 },
      { "label": "Create", "count": 7 }
    ],
    "usmle_distribution": [
      { "label": "Cardiovascular", "count": 32 },
      { "label": "Respiratory", "count": 28 },
      { "label": "Nervous/Special Senses", "count": 25 },
      { "label": "Gastrointestinal", "count": 22 },
      { "label": "Renal/Urinary", "count": 20 },
      { "label": "Endocrine", "count": 18 },
      { "label": "Musculoskeletal", "count": 16 },
      { "label": "Reproductive", "count": 14 },
      { "label": "Pharmacology", "count": 13 },
      { "label": "Hematopoietic/Lymphoreticular", "count": 12 },
      { "label": "Immune", "count": 11 },
      { "label": "Skin/Subcutaneous", "count": 10 },
      { "label": "Behavioral/Emotional", "count": 9 },
      { "label": "Biostatistics/Epidemiology", "count": 7 },
      { "label": "Nutrition", "count": 5 },
      { "label": "Multisystem", "count": 3 }
    ],
    "difficulty_distribution": [
      { "label": "easy", "count": 85 },
      { "label": "medium", "count": 112 },
      { "label": "hard", "count": 48 }
    ],
    "quality_trend": [
      { "date": "2026-01-20", "value": 0.75 },
      { "date": "2026-01-21", "value": 0.78 },
      { "date": "2026-01-22", "value": 0.81 }
    ],
    "generation_velocity": [
      { "date": "2026-01-20", "value": 12 },
      { "date": "2026-01-21", "value": 8 },
      { "date": "2026-01-22", "value": 15 }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not InstitutionalAdmin or Faculty |
| 400 | `VALIDATION_ERROR` | Invalid courseId (not UUID) or invalid date format |
| 404 | `NOT_FOUND` | Course does not exist or not in user's institution |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

### Page: `/institution/analytics/courses` (InstitutionalAdmin layout)

**Route:** `apps/web/src/app/(protected)/institution/analytics/courses/page.tsx`

**Component hierarchy:**
```
CourseAnalyticsPage (page.tsx -- default export)
  └── CourseAnalyticsDashboard (client component)
        ├── CourseSelector (dropdown of institution courses)
        ├── FilterBar
        │     ├── DateRangePicker (date_from, date_to)
        │     └── QuestionTypeFilter (dropdown: all, MCQ, short_answer, case_study)
        ├── CourseKPICards
        │     ├── TotalItemsCard
        │     ├── ApprovedRateCard
        │     ├── AvgQualityCard
        │     └── SLOCoverageCard
        └── ChartGrid (2x2 responsive grid)
              ├── BloomDistributionChart (BarChart, 6 bars)
              ├── USMLEDistributionChart (BarChart, 16 bars)
              ├── DifficultyPieChart (PieChart, 3 slices)
              └── QualityTrendChart (LineChart, dual series)
```

**States:**
1. **No Course Selected** -- Prompt to select a course from the dropdown
2. **Loading** -- Skeleton cards and chart placeholders while fetching
3. **Data** -- KPI cards with values, charts rendered with data
4. **Empty** -- "No items found for this course" with suggestion text
5. **Error** -- Error message with retry button

**Design tokens:**
- Surface: `--color-surface-primary` (white card backgrounds)
- KPI cards: `--color-surface-secondary` with `--radius-md` and `--shadow-sm`
- Chart colors: `--color-primary`, `--color-secondary`, `--color-accent` for bar/line fills
- Difficulty colors: easy = `--color-success`, medium = `--color-warning`, hard = `--color-error`
- Typography: Source Sans 3 body, DM Mono for numeric values
- Spacing: `--spacing-4` card padding, `--spacing-6` section gap
- Grid: 2 columns on desktop, 1 column on mobile

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/analytics/course-analytics.types.ts` | Types | Create |
| 2 | `packages/types/src/analytics/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add analytics barrel) |
| 4 | `apps/server/src/services/analytics/course-analytics.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/analytics/course-analytics.controller.ts` | Controller | Create |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add analytics route) |
| 7 | `apps/web/src/app/(protected)/institution/analytics/courses/page.tsx` | View | Create |
| 8 | `apps/web/src/components/analytics/course-kpi-cards.tsx` | Component | Create |
| 9 | `apps/web/src/components/analytics/bloom-distribution-chart.tsx` | Component | Create |
| 10 | `apps/web/src/components/analytics/usmle-distribution-chart.tsx` | Component | Create |
| 11 | `apps/web/src/components/analytics/quality-trend-chart.tsx` | Component | Create |
| 12 | `apps/server/src/services/analytics/__tests__/course-analytics.service.test.ts` | Tests | Create |
| 13 | `apps/server/src/controllers/analytics/__tests__/course-analytics.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-3 | institutional_admin | **PENDING** | Coverage Computation Service provides SLO coverage % |

### NPM Packages
- `@supabase/supabase-js` -- Supabase client (already installed)
- `express` -- Server framework (already installed)
- `vitest` -- Testing (already installed)
- `recharts` -- Charting library (**needs install** in apps/web)
- `date-fns` -- Date formatting for chart axes (already installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`, `rbac.require()`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`

---

## 9. Test Fixtures

```typescript
// Mock InstitutionalAdmin user
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

// Mock Faculty user (also has access)
export const FACULTY_USER = {
  ...INST_ADMIN_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
};

// Mock Student user (should be denied)
export const STUDENT_USER = {
  ...INST_ADMIN_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
};

// Mock course ID
export const MOCK_COURSE_ID = "course-uuid-1";

// Mock analytics data
export const MOCK_ANALYTICS_DATA = {
  kpis: {
    total_items: 245,
    approved_rate: 72.3,
    avg_quality_score: 0.812,
    slo_coverage_pct: 68.5,
  },
  bloom_distribution: [
    { label: "Remember", count: 45 },
    { label: "Understand", count: 62 },
    { label: "Apply", count: 78 },
    { label: "Analyze", count: 35 },
    { label: "Evaluate", count: 18 },
    { label: "Create", count: 7 },
  ],
  usmle_distribution: [
    { label: "Cardiovascular", count: 32 },
    { label: "Respiratory", count: 28 },
    { label: "Nervous/Special Senses", count: 25 },
    { label: "Gastrointestinal", count: 22 },
    { label: "Renal/Urinary", count: 20 },
    { label: "Endocrine", count: 18 },
    { label: "Musculoskeletal", count: 16 },
    { label: "Reproductive", count: 14 },
    { label: "Pharmacology", count: 13 },
    { label: "Hematopoietic/Lymphoreticular", count: 12 },
    { label: "Immune", count: 11 },
    { label: "Skin/Subcutaneous", count: 10 },
    { label: "Behavioral/Emotional", count: 9 },
    { label: "Biostatistics/Epidemiology", count: 7 },
    { label: "Nutrition", count: 5 },
    { label: "Multisystem", count: 3 },
  ],
  difficulty_distribution: [
    { label: "easy", count: 85 },
    { label: "medium", count: 112 },
    { label: "hard", count: 48 },
  ],
  quality_trend: [
    { date: "2026-01-20", value: 0.75 },
    { date: "2026-01-21", value: 0.78 },
    { date: "2026-01-22", value: 0.81 },
    { date: "2026-01-23", value: 0.80 },
    { date: "2026-01-24", value: 0.83 },
  ],
  generation_velocity: [
    { date: "2026-01-20", value: 12 },
    { date: "2026-01-21", value: 8 },
    { date: "2026-01-22", value: 15 },
    { date: "2026-01-23", value: 10 },
    { date: "2026-01-24", value: 14 },
  ],
};

// Mock empty analytics data
export const MOCK_EMPTY_ANALYTICS = {
  kpis: {
    total_items: 0,
    approved_rate: 0,
    avg_quality_score: 0,
    slo_coverage_pct: 0,
  },
  bloom_distribution: [],
  usmle_distribution: [],
  difficulty_distribution: [],
  quality_trend: [],
  generation_velocity: [],
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/analytics/__tests__/course-analytics.service.test.ts`

```
describe("CourseAnalyticsService")
  describe("getAnalytics")
    it("returns KPIs with correct aggregation for a course")
    it("computes approved_rate as percentage of approved items")
    it("computes avg_quality_score as mean of quality_score column")
    it("computes slo_coverage_pct using distinct SLO count vs total SLOs")
    it("returns bloom_distribution with 6 Bloom levels")
    it("returns usmle_distribution with up to 16 USMLE systems")
    it("returns difficulty_distribution with easy/medium/hard counts")
    it("returns quality_trend as daily averages sorted by date")
    it("returns generation_velocity as daily item counts sorted by date")
    it("filters by date_from and date_to when provided")
    it("filters by question_type when provided")
    it("returns zero KPIs and empty arrays when no items exist")
```

**File:** `apps/server/src/controllers/analytics/__tests__/course-analytics.controller.test.ts`

```
describe("CourseAnalyticsController")
  describe("handleGetAnalytics")
    it("returns 200 with analytics data for valid courseId")
    it("returns 400 when courseId is not a valid UUID")
    it("returns 400 when date_from is not a valid ISO date")
    it("passes query params to service correctly")
```

**Total: ~16 tests** (12 service + 4 controller)

---

## 11. E2E Test Spec (Playwright)

**File:** `apps/web/e2e/course-analytics.spec.ts`

```
describe("Course Analytics Page")
  it("InstitutionalAdmin can view course analytics dashboard")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/analytics/courses
    3. Select a course from the dropdown
    4. Verify KPI cards display numeric values
    5. Verify Bloom distribution chart renders 6 bars
    6. Change date range filter
    7. Verify charts update with new data
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. InstitutionalAdmin and Faculty can access `/institution/analytics/courses`
2. Other roles (student, advisor) receive 403 Forbidden
3. Course selector dropdown shows courses scoped to user's institution
4. KPI cards display: total items, approved rate (%), avg quality score, SLO coverage (%)
5. Bloom distribution bar chart renders 6 bars (Remember through Create)
6. USMLE system distribution bar chart renders up to 16 bars
7. Difficulty pie chart renders 3 slices (easy, medium, hard)
8. Quality trend line chart shows daily average quality scores
9. Generation velocity trend shows daily item creation counts
10. Date range filter narrows all KPIs and charts to the selected period
11. Question type filter narrows results to the selected type
12. Empty state shown when no items exist for the selected course
13. Loading skeletons shown while data is fetching
14. All ~16 API tests pass
15. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Course analytics KPIs | UF-25 Institutional Analytics |
| Bloom distribution visualization | S-IA-33-1 Acceptance Criteria |
| USMLE system distribution | USMLE_CONTENT_OUTLINE 16 systems |
| Difficulty categorization | S-IA-33-1 Task Breakdown |
| Quality trend over time | E-33 Course & Teaching Analytics |
| SLO coverage computation | STORY-IA-3 Coverage Computation Service |
| RBAC enforcement | STORY-U-6 Brief Implementation Notes |
| API response format | API_CONTRACT_v1 Conventions |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `assessment_items`, `courses`, `slos` tables exist
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **recharts:** Must be installed in apps/web (`pnpm add recharts`)
- **No Neo4j needed** for this story (read-only analytics from Supabase)

---

## 15. Implementation Notes

- **Recharts over D3:** Use recharts for all charts in this story. D3.js is reserved for the USMLE heatmap (IA-13) which needs custom SVG rendering. Recharts integrates cleanly with React components.
- **Aggregation strategy:** Run 6 separate Supabase queries in parallel using `Promise.all()` inside the service. Each query is a focused aggregation. This is simpler and faster than a single complex query.
- **Date defaults:** When `date_from` is not provided, default to 30 days before today. When `date_to` is not provided, default to today. Compute defaults in the controller before passing to the service.
- **SLO coverage %:** This is `(distinct SLOs with at least one item) / (total SLOs for the course) * 100`. If a course has 0 SLOs, return 0 (not NaN). Use `NULLIF` in the SQL query.
- **Bloom level ordering:** Bloom levels must appear in Bloom's taxonomy order (Remember, Understand, Apply, Analyze, Evaluate, Create), not alphabetical. Use `ARRAY_POSITION` in SQL or sort client-side.
- **USMLE system labels:** Use the full 16 system names from the seed data. Sort by count descending for the bar chart so the most-covered systems appear first.
- **Private fields pattern:** Service class uses `readonly #supabaseClient: SupabaseClient` with constructor DI per architecture rules.
- **Question type validation:** Valid values are `MCQ`, `short_answer`, `case_study`. Reject unknown types with 400.
