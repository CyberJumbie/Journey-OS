# STORY-AD-9 Brief: Admin Cohort Analytics

## 0. Lane & Priority

```yaml
story_id: STORY-AD-9
old_id: S-AD-45-4
lane: advisor
lane_priority: 5
within_lane_order: 9
sprint: 38
size: M
depends_on:
  - STORY-AD-4 (advisor) — Risk Flag Generation (risk flag data)
  - STORY-AD-8 (advisor) — Intervention Logging (intervention effectiveness data)
blocks: []
personas_served: [institutional_admin, superadmin]
epic: E-45 (Advisor Cohort Dashboard & Interventions)
feature: F-21 (Risk Prediction & Advisor Tools)
user_flow: UF-34 (Admin Cohort Analytics Monitoring)
```

## 1. Summary

Build an **admin cohort analytics page** at `/dashboard/admin/cohort-analytics` that provides aggregate risk metrics, trend monitoring, and intervention effectiveness analysis across student cohorts. The page shows a cohort risk distribution pie chart, a risk trend over time line chart, intervention effectiveness metrics (% improved after intervention), cohort comparison side-by-side, key metric cards (total at-risk, average resolution time, intervention rate), filters (cohort, time period, course), and CSV export. Access is restricted to institutional_admin and superadmin roles.

Key constraints:
- **Admin and superadmin only** -- RBAC enforced
- Aggregate queries use Supabase SQL with GROUP BY cohort, risk_level, time_bucket
- Intervention effectiveness: compare mastery trajectory before/after intervention date
- CSV export uses streaming response for large datasets
- Recharts for chart visualizations

## 2. Task Breakdown

1. **Types** -- Create `CohortAnalyticsData`, `CohortRiskDistribution`, `RiskTrendPoint`, `InterventionEffectiveness`, `CohortComparison`, `CohortAnalyticsQuery` in `packages/types/src/admin/cohort-analytics.types.ts`
2. **Service** -- `CohortAnalyticsService` with `getAnalytics()`, `getRiskTrend()`, `getEffectiveness()`, `exportCsv()` methods
3. **Controller** -- `CohortAnalyticsController` with handlers for each endpoint
4. **Routes** -- Protected routes under `/api/v1/admin/cohort-analytics`
5. **Frontend page** -- `/dashboard/admin/cohort-analytics/page.tsx`
6. **Frontend components** -- `CohortRiskDistribution` chart, `RiskTrendChart`, `InterventionEffectiveness` metrics, key metric cards
7. **CSV export** -- Streaming response endpoint
8. **API tests** -- ~14 tests for service and controller

## 3. Data Model

```typescript
// packages/types/src/admin/cohort-analytics.types.ts

/** Query parameters for cohort analytics */
export interface CohortAnalyticsQuery {
  readonly cohort_id?: string;
  readonly course_id?: string;
  readonly date_from?: string;
  readonly date_to?: string;
  readonly time_bucket?: "day" | "week" | "month";
}

/** Key metric cards */
export interface CohortKeyMetrics {
  readonly total_students: number;
  readonly at_risk_count: number;
  readonly at_risk_percentage: number;
  readonly critical_count: number;
  readonly avg_resolution_time_days: number | null;
  readonly intervention_rate: number;    // % of flagged students with at least one intervention
  readonly improvement_rate: number;     // % of interventions with "improved" outcome
}

/** Risk distribution per cohort */
export interface CohortRiskDistribution {
  readonly cohort_id: string;
  readonly cohort_name: string;
  readonly low: number;
  readonly moderate: number;
  readonly high: number;
  readonly critical: number;
  readonly total: number;
}

/** Single data point on the risk trend chart */
export interface RiskTrendPoint {
  readonly date: string;           // ISO date bucket
  readonly low_count: number;
  readonly moderate_count: number;
  readonly high_count: number;
  readonly critical_count: number;
  readonly total_flagged: number;
}

/** Intervention effectiveness metrics */
export interface InterventionEffectiveness {
  readonly total_interventions: number;
  readonly improved_count: number;
  readonly no_change_count: number;
  readonly declined_count: number;
  readonly pending_count: number;
  readonly improvement_rate: number;        // improved / (total - pending)
  readonly avg_time_to_improvement_days: number | null;
  readonly by_type: readonly InterventionTypeEffectiveness[];
}

/** Effectiveness breakdown by intervention type */
export interface InterventionTypeEffectiveness {
  readonly type: string;
  readonly total: number;
  readonly improved: number;
  readonly improvement_rate: number;
}

/** Side-by-side cohort comparison */
export interface CohortComparison {
  readonly cohorts: readonly CohortComparisonEntry[];
}

/** Single cohort in comparison */
export interface CohortComparisonEntry {
  readonly cohort_id: string;
  readonly cohort_name: string;
  readonly total_students: number;
  readonly at_risk_percentage: number;
  readonly critical_percentage: number;
  readonly avg_mastery: number;
  readonly intervention_rate: number;
  readonly improvement_rate: number;
}

/** Full analytics response */
export interface CohortAnalyticsData {
  readonly key_metrics: CohortKeyMetrics;
  readonly risk_distributions: readonly CohortRiskDistribution[];
  readonly risk_trend: readonly RiskTrendPoint[];
  readonly effectiveness: InterventionEffectiveness;
  readonly comparison: CohortComparison;
}
```

## 4. Database Schema

No new tables needed. Reads from existing tables with aggregate queries:

```sql
-- Key metrics query
SELECT
  COUNT(DISTINCT rf.student_id) FILTER (WHERE rf.risk_level IN ('high', 'critical') AND rf.status != 'resolved') AS at_risk_count,
  COUNT(DISTINCT rf.student_id) FILTER (WHERE rf.risk_level = 'critical' AND rf.status != 'resolved') AS critical_count,
  AVG(EXTRACT(EPOCH FROM (rf.resolved_at - rf.created_at)) / 86400)
    FILTER (WHERE rf.status = 'resolved') AS avg_resolution_time_days,
  COUNT(DISTINCT i.student_id)::float / NULLIF(COUNT(DISTINCT rf.student_id), 0) AS intervention_rate,
  COUNT(DISTINCT i.id) FILTER (WHERE i.outcome = 'improved')::float /
    NULLIF(COUNT(DISTINCT i.id) FILTER (WHERE i.outcome != 'pending'), 0) AS improvement_rate
FROM risk_flags rf
LEFT JOIN interventions i ON i.student_id = rf.student_id
WHERE rf.institution_id = $institutionId;

-- Risk distribution per cohort
SELECT
  s.cohort AS cohort_id,
  s.cohort AS cohort_name,
  COUNT(*) FILTER (WHERE rf.risk_level = 'low') AS low,
  COUNT(*) FILTER (WHERE rf.risk_level = 'moderate') AS moderate,
  COUNT(*) FILTER (WHERE rf.risk_level = 'high') AS high,
  COUNT(*) FILTER (WHERE rf.risk_level = 'critical') AS critical,
  COUNT(*) AS total
FROM risk_flags rf
JOIN students s ON s.supabase_auth_id = rf.student_id
WHERE rf.institution_id = $institutionId
  AND rf.status != 'resolved'
GROUP BY s.cohort;

-- Risk trend over time (weekly buckets)
SELECT
  date_trunc($timeBucket, rf.created_at) AS date,
  COUNT(*) FILTER (WHERE rf.risk_level = 'low') AS low_count,
  COUNT(*) FILTER (WHERE rf.risk_level = 'moderate') AS moderate_count,
  COUNT(*) FILTER (WHERE rf.risk_level = 'high') AS high_count,
  COUNT(*) FILTER (WHERE rf.risk_level = 'critical') AS critical_count,
  COUNT(*) AS total_flagged
FROM risk_flags rf
WHERE rf.institution_id = $institutionId
  AND rf.created_at BETWEEN $dateFrom AND $dateTo
GROUP BY date_trunc($timeBucket, rf.created_at)
ORDER BY date ASC;

-- Intervention effectiveness
SELECT
  COUNT(*) AS total_interventions,
  COUNT(*) FILTER (WHERE outcome = 'improved') AS improved_count,
  COUNT(*) FILTER (WHERE outcome = 'no_change') AS no_change_count,
  COUNT(*) FILTER (WHERE outcome = 'declined') AS declined_count,
  COUNT(*) FILTER (WHERE outcome = 'pending') AS pending_count,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)
    FILTER (WHERE outcome = 'improved') AS avg_time_to_improvement_days
FROM interventions
WHERE institution_id = $institutionId;

-- Effectiveness by type
SELECT
  type,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE outcome = 'improved') AS improved,
  COUNT(*) FILTER (WHERE outcome = 'improved')::float /
    NULLIF(COUNT(*) FILTER (WHERE outcome != 'pending'), 0) AS improvement_rate
FROM interventions
WHERE institution_id = $institutionId
GROUP BY type;
```

## 5. API Contract

### GET /api/v1/admin/cohort-analytics (Auth: Admin, SuperAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cohort_id` | string | (all) | Filter by cohort |
| `course_id` | string | (all) | Filter by course |
| `date_from` | string | 90 days ago | Start date for trends |
| `date_to` | string | today | End date for trends |
| `time_bucket` | string | `week` | Time bucket: `day`, `week`, `month` |

**Success Response (200):**
```json
{
  "data": {
    "key_metrics": {
      "total_students": 450,
      "at_risk_count": 42,
      "at_risk_percentage": 9.3,
      "critical_count": 8,
      "avg_resolution_time_days": 12.5,
      "intervention_rate": 0.76,
      "improvement_rate": 0.62
    },
    "risk_distributions": [
      {
        "cohort_id": "M2-2026",
        "cohort_name": "M2-2026",
        "low": 35,
        "moderate": 12,
        "high": 8,
        "critical": 3,
        "total": 58
      }
    ],
    "risk_trend": [
      {
        "date": "2026-01-27",
        "low_count": 30,
        "moderate_count": 10,
        "high_count": 6,
        "critical_count": 2,
        "total_flagged": 48
      },
      {
        "date": "2026-02-03",
        "low_count": 33,
        "moderate_count": 11,
        "high_count": 7,
        "critical_count": 3,
        "total_flagged": 54
      }
    ],
    "effectiveness": {
      "total_interventions": 85,
      "improved_count": 48,
      "no_change_count": 15,
      "declined_count": 5,
      "pending_count": 17,
      "improvement_rate": 0.71,
      "avg_time_to_improvement_days": 14.2,
      "by_type": [
        { "type": "meeting", "total": 30, "improved": 20, "improvement_rate": 0.77 },
        { "type": "tutoring_referral", "total": 25, "improved": 18, "improvement_rate": 0.82 },
        { "type": "study_plan", "total": 15, "improved": 6, "improvement_rate": 0.50 },
        { "type": "email", "total": 10, "improved": 3, "improvement_rate": 0.38 },
        { "type": "resource_share", "total": 5, "improved": 1, "improvement_rate": 0.25 }
      ]
    },
    "comparison": {
      "cohorts": [
        {
          "cohort_id": "M2-2026",
          "cohort_name": "M2-2026",
          "total_students": 150,
          "at_risk_percentage": 12.0,
          "critical_percentage": 2.0,
          "avg_mastery": 0.68,
          "intervention_rate": 0.80,
          "improvement_rate": 0.65
        },
        {
          "cohort_id": "M1-2027",
          "cohort_name": "M1-2027",
          "total_students": 160,
          "at_risk_percentage": 7.5,
          "critical_percentage": 1.2,
          "avg_mastery": 0.72,
          "intervention_rate": 0.70,
          "improvement_rate": 0.58
        }
      ]
    }
  },
  "error": null
}
```

### GET /api/v1/admin/cohort-analytics/export (Auth: Admin, SuperAdmin)

**Query Parameters:** Same as main endpoint.

**Response:** `Content-Type: text/csv`, streamed.

```csv
cohort,student_name,risk_level,confidence,top_root_causes,interventions_count,latest_outcome,flag_created_at
M2-2026,Marcus Williams,critical,0.91,"Acid-Base Physiology;Renal Tubular",3,improved,2026-02-19
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not admin or superadmin |
| 400 | `VALIDATION_ERROR` | Invalid date range or time_bucket |
| 500 | `INTERNAL_ERROR` | Unexpected error |

## 6. Frontend Spec

### Page: `/dashboard/admin/cohort-analytics`

**Route:** `apps/web/src/app/(dashboard)/admin/cohort-analytics/page.tsx`

**Component hierarchy:**
```
CohortAnalyticsPage (page.tsx -- default export)
  ├── FilterBar (molecule)
  │     ├── CohortFilter (atom: dropdown)
  │     ├── DateRangePicker (molecule: from/to)
  │     ├── TimeBucketSelector (atom: day/week/month toggle)
  │     └── ExportCsvButton (atom: download icon button)
  ├── KeyMetricsStrip (organism)
  │     ├── MetricCard: Total At-Risk (number + percentage)
  │     ├── MetricCard: Critical Count
  │     ├── MetricCard: Avg Resolution Time
  │     ├── MetricCard: Intervention Rate
  │     └── MetricCard: Improvement Rate
  ├── CohortRiskDistribution (organism: Recharts PieChart per cohort)
  ├── RiskTrendChart (organism: Recharts LineChart, stacked area)
  ├── InterventionEffectiveness (organism)
  │     ├── EffectivenessSummary (molecule: donut chart improved/no change/declined)
  │     └── EffectivenessByType (molecule: horizontal bar chart)
  └── CohortComparison (organism: side-by-side cards or table)
```

**States:**
1. **Loading** -- Skeleton cards and chart placeholders
2. **Data** -- Full analytics display with charts
3. **Empty** -- "No risk data available for the selected period"
4. **Error** -- Error with retry button

**Design tokens:**
- Key metrics strip: Navy Deep `#002c76` background, white text, frosted glass cards
- Risk distribution pie: low = Green `#69a338`, moderate = warning-yellow, high = warning-orange, critical = error-red
- Trend chart: Stacked area with same risk colors, Parchment `#faf9f6` background
- Effectiveness donut: improved = Green, no_change = warning, declined = error-red, pending = gray
- Cohort comparison: White `#ffffff` cards side-by-side, Cream `#f5f3ef` background
- Export button: Navy Deep `#002c76` outline, `Download` Lucide icon

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/admin/cohort-analytics.types.ts` | Types | Create |
| 2 | `packages/types/src/admin/index.ts` | Types | Create/Edit (add exports) |
| 3 | `apps/server/src/modules/admin/services/cohort-analytics.service.ts` | Service | Create |
| 4 | `apps/server/src/modules/admin/controllers/cohort-analytics.controller.ts` | Controller | Create |
| 5 | `apps/server/src/modules/admin/routes/cohort-analytics.routes.ts` | Routes | Create |
| 6 | `apps/web/src/app/(dashboard)/admin/cohort-analytics/page.tsx` | View | Create |
| 7 | `apps/web/src/components/admin/cohort-risk-distribution.tsx` | Component | Create |
| 8 | `apps/web/src/components/admin/risk-trend-chart.tsx` | Component | Create |
| 9 | `apps/web/src/components/admin/intervention-effectiveness.tsx` | Component | Create |
| 10 | `apps/server/src/modules/admin/__tests__/cohort-analytics.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-AD-4 | advisor | NOT STARTED | Risk flags table provides risk data to aggregate |
| STORY-AD-8 | advisor | NOT STARTED | Interventions table provides effectiveness data |
| STORY-U-6 | universal | DONE | RBAC middleware for admin role guard |
| STORY-U-10 | universal | DONE | Dashboard routing with admin layout |

### NPM Packages (already installed)
- `recharts` -- Pie charts, line charts, bar charts
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing
- `lucide-react` -- Icons

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` -- Auth middleware
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC for admin roles
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- `risk_flags` table (from STORY-AD-4)
- `interventions` table (from STORY-AD-8)

## 9. Test Fixtures

```typescript
// Mock key metrics
export const MOCK_KEY_METRICS: CohortKeyMetrics = {
  total_students: 450,
  at_risk_count: 42,
  at_risk_percentage: 9.3,
  critical_count: 8,
  avg_resolution_time_days: 12.5,
  intervention_rate: 0.76,
  improvement_rate: 0.62,
};

// Mock risk distribution
export const MOCK_RISK_DISTRIBUTIONS: CohortRiskDistribution[] = [
  {
    cohort_id: "M2-2026",
    cohort_name: "M2-2026",
    low: 35,
    moderate: 12,
    high: 8,
    critical: 3,
    total: 58,
  },
  {
    cohort_id: "M1-2027",
    cohort_name: "M1-2027",
    low: 40,
    moderate: 8,
    high: 5,
    critical: 1,
    total: 54,
  },
];

// Mock trend data
export const MOCK_RISK_TREND: RiskTrendPoint[] = [
  { date: "2026-01-27", low_count: 30, moderate_count: 10, high_count: 6, critical_count: 2, total_flagged: 48 },
  { date: "2026-02-03", low_count: 33, moderate_count: 11, high_count: 7, critical_count: 3, total_flagged: 54 },
  { date: "2026-02-10", low_count: 35, moderate_count: 12, high_count: 8, critical_count: 3, total_flagged: 58 },
];

// Mock effectiveness
export const MOCK_EFFECTIVENESS: InterventionEffectiveness = {
  total_interventions: 85,
  improved_count: 48,
  no_change_count: 15,
  declined_count: 5,
  pending_count: 17,
  improvement_rate: 0.71,
  avg_time_to_improvement_days: 14.2,
  by_type: [
    { type: "meeting", total: 30, improved: 20, improvement_rate: 0.77 },
    { type: "tutoring_referral", total: 25, improved: 18, improvement_rate: 0.82 },
    { type: "study_plan", total: 15, improved: 6, improvement_rate: 0.50 },
  ],
};

// Mock admin user
export const ADMIN_USER = {
  sub: "admin-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...ADMIN_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
};

// Empty analytics (no data)
export const MOCK_EMPTY_ANALYTICS: CohortAnalyticsData = {
  key_metrics: {
    total_students: 0,
    at_risk_count: 0,
    at_risk_percentage: 0,
    critical_count: 0,
    avg_resolution_time_days: null,
    intervention_rate: 0,
    improvement_rate: 0,
  },
  risk_distributions: [],
  risk_trend: [],
  effectiveness: {
    total_interventions: 0,
    improved_count: 0,
    no_change_count: 0,
    declined_count: 0,
    pending_count: 0,
    improvement_rate: 0,
    avg_time_to_improvement_days: null,
    by_type: [],
  },
  comparison: { cohorts: [] },
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/admin/__tests__/cohort-analytics.service.test.ts`

```
describe("CohortAnalyticsService")
  describe("getAnalytics")
    ✓ returns full analytics data with key metrics, distributions, trends, effectiveness
    ✓ filters by cohort_id when provided
    ✓ filters by date range (date_from, date_to)
    ✓ defaults date_from to 90 days ago
    ✓ returns empty analytics when no risk data exists
    ✓ computes at_risk_percentage correctly (at_risk_count / total_students * 100)
    ✓ computes improvement_rate as improved / (total - pending)
    ✓ handles null avg_resolution_time when no resolved flags

  describe("getRiskTrend")
    ✓ returns trend data bucketed by week (default)
    ✓ supports day and month time buckets
    ✓ returns empty array when no flags in date range

  describe("getEffectiveness")
    ✓ returns effectiveness metrics by intervention type
    ✓ handles division by zero when no non-pending interventions

  describe("exportCsv")
    ✓ generates CSV with correct headers and data rows

describe("CohortAnalyticsController")
  ✓ GET /api/v1/admin/cohort-analytics returns 200 for admin
  ✓ GET /api/v1/admin/cohort-analytics returns 200 for superadmin
  ✓ returns 401 for unauthenticated request
  ✓ returns 403 for student role
  ✓ returns 403 for advisor role (admin-only endpoint)
  ✓ validates date range format
  ✓ GET /api/v1/admin/cohort-analytics/export returns CSV content-type
```

**Total: ~21 tests** (14 service + 7 controller)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not a standalone critical journey. Admin cohort analytics E2E is deferred until the full advisor/admin flow is complete. Manual verification recommended for chart rendering.

## 12. Acceptance Criteria

1. Admin analytics page at `/dashboard/admin/cohort-analytics` with role guard
2. Cohort risk distribution pie chart shows per-cohort breakdown
3. Risk trend over time line chart shows weekly changes
4. Intervention effectiveness metrics show improvement rate
5. Effectiveness broken down by intervention type
6. Cohort comparison shows side-by-side risk profiles
7. Key metric cards: total at-risk, critical count, avg resolution time, intervention rate, improvement rate
8. Filters by cohort, time period, course work correctly
9. CSV export downloads data with correct format
10. Admin and superadmin access only (403 for other roles)
11. Loading skeletons and empty states display correctly
12. All ~21 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Admin cohort analytics page | S-AD-45-4 § AC |
| Cohort risk distribution | S-AD-45-4 § AC: "pie chart of risk levels per cohort" |
| Risk trend over time | S-AD-45-4 § AC: "line chart showing risk level changes" |
| Intervention effectiveness | S-AD-45-4 § AC: "% of students who improved after intervention" |
| Cohort comparison | S-AD-45-4 § AC: "side-by-side risk profiles" |
| CSV export | S-AD-45-4 § AC: "Export data as CSV" |
| GROUP BY queries | S-AD-45-4 § Notes: "Supabase SQL with GROUP BY cohort, risk_level, time_bucket" |
| Serves UF-34 | S-AD-45-4 § Notes |
| Streaming CSV for large datasets | S-AD-45-4 § Notes |
| Effectiveness: compare before/after | S-AD-45-4 § Notes: "compare mastery trajectory before/after intervention date" |

## 14. Environment Prerequisites

- **Supabase:** Project running with `risk_flags` (from AD-4) and `interventions` (from AD-8) tables populated
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story (all queries are Supabase aggregate SQL)
- **No Python API needed**

## 15. Figma / Make Prototype

No Figma link available. Key visual specifications:

- Key metrics strip: Navy Deep `#002c76` background, frosted glass cards with white text
- Pie chart: Recharts PieChart with risk-level colors (green/yellow/orange/red)
- Trend chart: Recharts AreaChart stacked, same color scheme, Parchment background
- Effectiveness donut: improved = Green `#69a338`, no_change = warning, declined = error-red
- By-type bar chart: Horizontal bars with type-specific colors
- Cohort comparison: White cards side-by-side with comparison metrics
- CSV export: Navy Deep outline button with `Download` Lucide icon, top-right of filter bar
