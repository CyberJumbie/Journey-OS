# STORY-IA-32 Brief: Personal Analytics Page

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-32
old_id: S-IA-33-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 32
sprint: 18
size: M
depends_on:
  - STORY-IA-11 (institutional_admin) — Analytics Service Infrastructure
blocks: []
personas_served: [faculty]
epic: E-33 (Course & Teaching Analytics)
feature: F-15 (Teaching & Course Analytics)
user_flow: UF-24 (Faculty Productivity Tracking)
```

---

## 1. Summary

Build a **Personal Analytics Page** for faculty members showing their generation velocity, quality trends, approval rates, review turnaround times, top-performing categories, and a GitHub-style activity heatmap. Faculty can track their productivity over time and compare their metrics (anonymized) against the institution average.

Key constraints:
- **Scoped by `user_id`** from auth context -- faculty see only their own data
- **Institution comparison** uses anonymized aggregates (no individual faculty exposed)
- **Recharts** for all chart components, consistent with course analytics styling
- **Activity heatmap** is a 52-week x 7-day grid with color intensity = generation count
- **Filterable** by course and date range

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Hook -> Components -> Page -> Tests**

### Task 1: Create personal analytics types
- **File:** `packages/types/src/analytics/personal-analytics.types.ts`
- **Action:** Export `VelocityDataPoint`, `QualityTrendPoint`, `ApprovalRateData`, `ReviewTurnaroundData`, `TopCategory`, `ActivityDay`, `PersonalAnalyticsResponse`, `PersonalAnalyticsFilters`

### Task 2: Export types from analytics barrel
- **File:** `packages/types/src/analytics/index.ts`
- **Action:** Create barrel or edit to re-export from `personal-analytics.types.ts`

### Task 3: Build PersonalAnalyticsService
- **File:** `apps/server/src/services/analytics/personal-analytics.service.ts`
- **Action:** Class with `#supabase` private field. Methods: `getVelocity(userId, filters)`, `getQualityTrend(userId, filters)`, `getApprovalRate(userId, filters)`, `getReviewTurnaround(userId, filters)`, `getTopCategories(userId, filters)`, `getActivityHeatmap(userId)`, `getInstitutionComparison(institutionId)`.

### Task 4: Build PersonalAnalyticsController
- **File:** `apps/server/src/controllers/analytics/personal-analytics.controller.ts`
- **Action:** Handler for GET /analytics/personal. Extracts `user_id` from `req.user`, calls service methods, returns `ApiResponse<PersonalAnalyticsResponse>`.

### Task 5: Build VelocityChart component
- **File:** `apps/web/src/components/analytics/VelocityChart.tsx`
- **Action:** Named export `VelocityChart`. Recharts line/bar chart showing items generated per day/week with trend line.

### Task 6: Build QualityTrendChart component
- **File:** `apps/web/src/components/analytics/QualityTrendChart.tsx`
- **Action:** Named export `QualityTrendChart`. Recharts line chart showing average composite score over time with rolling average.

### Task 7: Build ActivityHeatmap component
- **File:** `apps/web/src/components/analytics/ActivityHeatmap.tsx`
- **Action:** Named export `ActivityHeatmap`. 52x7 grid (GitHub-style). Color intensity based on generation count per day. Tooltip on hover with date and count.

### Task 8: Build personal analytics page
- **File:** `apps/web/src/app/(dashboard)/faculty/analytics/page.tsx`
- **Action:** Default export page. Renders all analytics components with date range and course filter controls.

### Task 9: Write API tests
- **File:** `apps/server/src/tests/analytics/personal-analytics.test.ts`
- **Action:** 8-12 tests for service methods and controller.

---

## 3. Data Model

```typescript
// packages/types/src/analytics/personal-analytics.types.ts

/** Velocity data point (items generated per period) */
export interface VelocityDataPoint {
  readonly period: string;               // date or week label
  readonly count: number;
  readonly trend: number;                // rolling average
}

/** Quality trend data point */
export interface QualityTrendPoint {
  readonly period: string;
  readonly average_score: number;        // composite quality score
  readonly rolling_average: number;      // 7-day rolling average
}

/** Approval rate breakdown */
export interface ApprovalRateData {
  readonly total_items: number;
  readonly approved: number;
  readonly rejected: number;
  readonly revised: number;
  readonly approval_rate: number;        // percentage
}

/** Review turnaround metrics */
export interface ReviewTurnaroundData {
  readonly average_hours: number;
  readonly median_hours: number;
  readonly p90_hours: number;            // 90th percentile
}

/** Top performing category */
export interface TopCategory {
  readonly category: string;             // Bloom level or question type
  readonly average_score: number;
  readonly item_count: number;
}

/** Single day in activity heatmap */
export interface ActivityDay {
  readonly date: string;                 // YYYY-MM-DD
  readonly count: number;                // items generated
  readonly day_of_week: number;          // 0=Sun, 6=Sat
  readonly week: number;                 // 0-51
}

/** Filters for personal analytics */
export interface PersonalAnalyticsFilters {
  readonly course_id?: string;
  readonly date_from?: string;
  readonly date_to?: string;
}

/** Full personal analytics response */
export interface PersonalAnalyticsResponse {
  readonly velocity: readonly VelocityDataPoint[];
  readonly quality_trend: readonly QualityTrendPoint[];
  readonly approval_rate: ApprovalRateData;
  readonly review_turnaround: ReviewTurnaroundData;
  readonly top_categories: readonly TopCategory[];
  readonly activity_heatmap: readonly ActivityDay[];
  readonly institution_comparison: {
    readonly avg_velocity: number;
    readonly avg_quality: number;
    readonly avg_approval_rate: number;
  };
}
```

---

## 4. Database Schema

No new tables. Analytics computed from existing data:

**Data sources:**
- `questions` / `assessment_items` -- items generated by user, with `created_at`, `quality_score`, `bloom_level`, `question_type`
- `review_actions` -- review decisions with `action` (approve/reject/revise), `created_at`
- Turnaround: `review_actions.created_at - questions.created_at` delta

**Example queries:**
```sql
-- Velocity: items generated per day
SELECT DATE(created_at) AS period, COUNT(*) AS count
FROM questions
WHERE created_by = $userId AND created_at >= $dateFrom
GROUP BY DATE(created_at) ORDER BY period;

-- Quality trend
SELECT DATE(created_at) AS period, AVG(composite_score) AS average_score
FROM questions
WHERE created_by = $userId AND created_at >= $dateFrom
GROUP BY DATE(created_at) ORDER BY period;

-- Activity heatmap (last 52 weeks)
SELECT DATE(created_at) AS date,
       COUNT(*) AS count,
       EXTRACT(DOW FROM created_at) AS day_of_week
FROM questions
WHERE created_by = $userId AND created_at >= NOW() - INTERVAL '52 weeks'
GROUP BY DATE(created_at);

-- Institution comparison (anonymized)
SELECT AVG(daily_count) AS avg_velocity
FROM (
  SELECT DATE(created_at), COUNT(*) AS daily_count
  FROM questions WHERE institution_id = $institutionId
  GROUP BY created_by, DATE(created_at)
) sub;
```

---

## 5. API Contract

### GET /api/v1/analytics/personal (Auth: Faculty)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `course_id` | UUID | -- | Filter by course |
| `date_from` | string | 90 days ago | Start date (ISO) |
| `date_to` | string | today | End date (ISO) |

**Success Response (200):**
```json
{
  "data": {
    "velocity": [
      { "period": "2026-02-17", "count": 5, "trend": 4.2 },
      { "period": "2026-02-18", "count": 3, "trend": 4.0 }
    ],
    "quality_trend": [
      { "period": "2026-02-17", "average_score": 4.2, "rolling_average": 3.9 }
    ],
    "approval_rate": {
      "total_items": 150,
      "approved": 120,
      "rejected": 15,
      "revised": 15,
      "approval_rate": 80.0
    },
    "review_turnaround": {
      "average_hours": 18.5,
      "median_hours": 12.0,
      "p90_hours": 48.0
    },
    "top_categories": [
      { "category": "Apply (Bloom 3)", "average_score": 4.5, "item_count": 45 },
      { "category": "Analyze (Bloom 4)", "average_score": 4.2, "item_count": 30 }
    ],
    "activity_heatmap": [
      { "date": "2026-02-18", "count": 3, "day_of_week": 2, "week": 7 }
    ],
    "institution_comparison": {
      "avg_velocity": 3.5,
      "avg_quality": 3.8,
      "avg_approval_rate": 75.0
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not faculty or institutional_admin |
| 400 | `VALIDATION_ERROR` | Invalid date format or UUID |

---

## 6. Frontend Spec

### Page: `/faculty/analytics`

**Component hierarchy:**
```
PersonalAnalyticsPage (page.tsx -- default export)
  ├── PageHeader ("My Analytics")
  ├── FilterBar
  │     ├── CourseSelect
  │     └── DateRangePicker
  ├── MetricCards (grid, 4 columns)
  │     ├── ApprovalRateCard (donut chart or percentage)
  │     ├── AvgQualityCard (score with trend arrow)
  │     ├── ReviewTurnaroundCard (hours with median)
  │     └── ComparisonCard ("vs Institution Average")
  ├── VelocityChart (Recharts bar + trend line)
  ├── QualityTrendChart (Recharts line with rolling average)
  ├── TopCategories (horizontal bar chart or table)
  └── ActivityHeatmap (52x7 grid)
        └── HeatmapDay × 364
```

**States:**
1. **Loading** -- Skeleton charts and metric cards
2. **Data** -- All charts and metrics populated
3. **Filtered** -- Charts update when course or date range changes
4. **Empty** -- "No generation activity yet" with encouragement message
5. **Error** -- Error message with retry

**Design tokens:**
- Surface: `--color-surface-primary` (#ffffff)
- Metric cards: `--shadow-sm`, `--radius-md`, `--spacing-4` padding
- Velocity bars: `#69a338` (green)
- Quality line: `#002c76` (navy deep)
- Rolling average line: `#9ca3af` (gray, dashed)
- Activity heatmap levels: 0 = `#ebedf0`, 1-2 = `#9be9a8`, 3-5 = `#40c463`, 6-9 = `#30a14e`, 10+ = `#216e39`
- Comparison arrows: green (above avg), red (below avg)
- Chart area: 100% width, 280px height

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/analytics/personal-analytics.types.ts` | Types | Create |
| 2 | `packages/types/src/analytics/index.ts` | Types | Create |
| 3 | `apps/server/src/services/analytics/personal-analytics.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/analytics/personal-analytics.controller.ts` | Controller | Create |
| 5 | `apps/web/src/components/analytics/VelocityChart.tsx` | Component | Create |
| 6 | `apps/web/src/components/analytics/QualityTrendChart.tsx` | Component | Create |
| 7 | `apps/web/src/components/analytics/ActivityHeatmap.tsx` | Component | Create |
| 8 | `apps/web/src/app/(dashboard)/faculty/analytics/page.tsx` | Page | Create |
| 9 | `apps/server/src/tests/analytics/personal-analytics.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-11 | institutional_admin | **PENDING** | Analytics service infrastructure (base queries, shared patterns) |

### NPM Packages
- `recharts` -- already installed for admin charts
- No new packages expected

### Existing Files Needed
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/card.tsx` -- shadcn/ui Card for metric cards
- `apps/web/src/components/ui/select.tsx` -- shadcn/ui Select for filters
- `apps/web/src/components/ui/skeleton.tsx` -- shadcn/ui Skeleton
- `apps/server/src/middleware/auth.middleware.ts` -- JWT authentication
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC enforcement

---

## 9. Test Fixtures

```typescript
export const MOCK_VELOCITY: VelocityDataPoint[] = [
  { period: "2026-02-13", count: 4, trend: 3.5 },
  { period: "2026-02-14", count: 6, trend: 4.0 },
  { period: "2026-02-15", count: 2, trend: 3.8 },
  { period: "2026-02-16", count: 0, trend: 3.5 },
  { period: "2026-02-17", count: 5, trend: 3.6 },
  { period: "2026-02-18", count: 3, trend: 3.5 },
  { period: "2026-02-19", count: 7, trend: 3.9 },
];

export const MOCK_QUALITY_TREND: QualityTrendPoint[] = [
  { period: "2026-02-13", average_score: 3.8, rolling_average: 3.5 },
  { period: "2026-02-14", average_score: 4.1, rolling_average: 3.6 },
  { period: "2026-02-15", average_score: 3.5, rolling_average: 3.6 },
  { period: "2026-02-18", average_score: 4.3, rolling_average: 3.9 },
];

export const MOCK_APPROVAL_RATE: ApprovalRateData = {
  total_items: 150,
  approved: 120,
  rejected: 15,
  revised: 15,
  approval_rate: 80.0,
};

export const MOCK_TURNAROUND: ReviewTurnaroundData = {
  average_hours: 18.5,
  median_hours: 12.0,
  p90_hours: 48.0,
};

export const MOCK_TOP_CATEGORIES: TopCategory[] = [
  { category: "Apply (Bloom 3)", average_score: 4.5, item_count: 45 },
  { category: "Analyze (Bloom 4)", average_score: 4.2, item_count: 30 },
  { category: "Evaluate (Bloom 5)", average_score: 3.9, item_count: 18 },
];

export const MOCK_ACTIVITY_DAYS: ActivityDay[] = [
  { date: "2026-02-17", count: 5, day_of_week: 1, week: 7 },
  { date: "2026-02-18", count: 3, day_of_week: 2, week: 7 },
  { date: "2026-02-19", count: 7, day_of_week: 3, week: 7 },
];

export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "dr.johnson@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/analytics/personal-analytics.test.ts`

```
describe("PersonalAnalyticsService")
  describe("getVelocity")
    it("returns daily generation counts for user")
    it("computes rolling average trend line")
    it("filters by course_id when provided")
  describe("getQualityTrend")
    it("returns average composite scores over time")
    it("computes 7-day rolling average")
  describe("getApprovalRate")
    it("computes correct approval/rejection/revision percentages")
  describe("getActivityHeatmap")
    it("returns 52 weeks of daily activity counts")
    it("returns zero for days with no activity")
  describe("getInstitutionComparison")
    it("returns anonymized institution averages")

describe("GET /api/v1/analytics/personal")
  it("returns 200 with all analytics data for faculty user")
  it("scopes data to authenticated user only")
  it("returns 401 for unauthenticated requests")
  it("filters data by course_id and date range")
```

**Total: ~12 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. Faculty analytics is a read-only dashboard. API and component tests provide sufficient coverage.

---

## 12. Acceptance Criteria

1. Generation velocity chart shows items generated per day/week with trend line
2. Quality trend chart shows average composite score with rolling average
3. Approval rate displays approved/rejected/revised percentages
4. Review turnaround shows average time from generation to review decision
5. Top performing categories ranked by Bloom level and question type
6. Institution comparison shows personal metrics vs anonymized averages
7. Activity heatmap displays 52-week GitHub-style contribution grid
8. All metrics filterable by course and date range
9. Faculty can only see their own data (scoped by user_id from auth)
10. All ~12 API tests pass
11. Named exports only, TypeScript strict

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Personal analytics concept | S-IA-33-2 User Story |
| Velocity and quality metrics | S-IA-33-2 Acceptance Criteria |
| Activity heatmap 52x7 grid | S-IA-33-2 Notes |
| Institution comparison anonymized | S-IA-33-2 Notes |
| Recharts for charts | S-IA-33-2 Notes |
| Review turnaround computation | S-IA-33-2 Notes |
| Blocked by analytics infrastructure | S-IA-33-2 Dependencies |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Express:** Server running with analytics routes
- **Supabase:** questions, review_actions tables populated with data
- **Auth:** Faculty JWT with `user_id` and `institution_id` claims
- **Prerequisite:** Analytics service infrastructure (STORY-IA-11) must exist

---

## 15. Figma Make Prototype

No Figma prototype for this story. Reference GitHub contribution graph for activity heatmap styling. Use Recharts examples for line/bar chart patterns. Follow existing admin dashboard layout for card grid.
