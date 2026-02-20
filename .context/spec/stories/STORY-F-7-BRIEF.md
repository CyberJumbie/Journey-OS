# STORY-F-7 Brief: KPI Strip Component

## 0. Lane & Priority

```yaml
story_id: STORY-F-7
old_id: S-F-32-2
lane: faculty
lane_priority: 3
within_lane_order: 7
sprint: 8
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-F-21 — Role-Based Dashboard Variants
personas_served: [faculty, faculty_course_director, institutional_admin]
epic: E-32 (Faculty Dashboard)
feature: F-15 (Faculty Dashboard)
user_flow: UF-15 (Faculty Dashboard Overview)
```

## 1. Summary

Build a **KPI strip component** for the faculty dashboard bookmark bar that displays 4 key performance metrics with trend indicators: Questions Generated, Approval Rate, Coverage Score, and Time Saved. Each KPI card shows the current value, a trend arrow (up/down/flat), and trend percentage compared to the previous period. Faculty sees metrics scoped to their own courses; course directors and institutional admins see aggregate metrics for all courses.

The KPI strip sits in the navyDeep bookmark bar at the top of the faculty dashboard (Design Spec Template A). It includes a period selector (Last 7 days, Last 30 days, This semester) and loading skeletons.

Key constraints:
- **Authenticated faculty/admin only** — RBAC enforced
- Reads from existing `assessment_items` table + coverage snapshots
- Trend calculation: `((current - previous) / previous) * 100`
- Role-based scoping: faculty = own courses, course director/admin = all
- Design tokens for trend colors (positive green, negative red, neutral gray)
- Responsive: 4 cols desktop, 2x2 tablet, stacked mobile

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `KpiMetric`, `KpiPeriod`, `KpiQuery`, `KpiResponse` types | `packages/types/src/dashboard/kpi.types.ts` | 30m |
| 2 | Update dashboard barrel export | `packages/types/src/dashboard/index.ts` | 5m |
| 3 | Implement `KpiService` with metric calculations and trend logic | `apps/server/src/services/dashboard/kpi.service.ts` | 90m |
| 4 | Implement `KpiController` with `handleGetKpis()` | `apps/server/src/controllers/dashboard.controller.ts` | 30m |
| 5 | Register route `GET /api/v1/dashboard/kpis` in server index | `apps/server/src/index.ts` | 10m |
| 6 | Build `TrendIndicator` atom (arrow + percentage) | `packages/ui/src/atoms/trend-indicator.tsx` | 20m |
| 7 | Build `KpiCard` atom (value + label + trend) | `packages/ui/src/atoms/kpi-card.tsx` | 30m |
| 8 | Build `KpiStrip` molecule (4-card grid + period selector) | `packages/ui/src/molecules/kpi-strip.tsx` | 45m |
| 9 | Build `useDashboardKpis` hook | `apps/web/src/hooks/use-dashboard-kpis.ts` | 30m |
| 10 | Write API tests (16 tests) | `apps/server/src/__tests__/kpi.controller.test.ts` | 90m |

**Total estimate:** ~6.5 hours (Size M)

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/dashboard/kpi.types.ts

/** Supported KPI period values */
export type KpiPeriod = "7d" | "30d" | "semester";

/** Trend direction for a KPI metric */
export type TrendDirection = "up" | "down" | "flat";

/** Single KPI metric with trend data */
export interface KpiMetric {
  /** Machine-readable metric key */
  readonly key: "questions_generated" | "approval_rate" | "coverage_score" | "time_saved";
  /** Human-readable label */
  readonly label: string;
  /** Current period value */
  readonly value: number;
  /** Display unit (e.g., "", "%", "hrs") */
  readonly unit: string;
  /** Trend direction */
  readonly trend_direction: TrendDirection;
  /** Trend percentage change vs previous period */
  readonly trend_percent: number;
  /** Previous period value (for tooltip) */
  readonly previous_value: number;
}

/** Query parameters for the KPI endpoint */
export interface KpiQuery {
  readonly user_id: string;
  readonly period?: KpiPeriod;  // Default: "7d"
}

/** Response envelope for KPI data */
export interface KpiResponse {
  readonly metrics: readonly KpiMetric[];
  readonly period: KpiPeriod;
  readonly period_start: string;
  readonly period_end: string;
  readonly scope: "personal" | "institution";
}
```

## 4. Database Schema (inline, complete)

No new tables needed. KPI calculations query existing tables:

```sql
-- Existing tables used:

-- assessment_items (created in earlier migrations)
-- Columns used: id, institution_id, status, created_at, quality_score
-- Status values: 'draft', 'approved', 'rejected', 'review'

-- generation_logs (created in earlier migrations)
-- Columns used: id, institution_id, faculty_id, created_at

-- user_profiles (created in U-8)
-- Columns used: id, institution_id, role, is_course_director

-- Additional index for KPI query performance:
CREATE INDEX IF NOT EXISTS idx_assessment_items_status_created
  ON assessment_items(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_items_institution_created
  ON assessment_items(institution_id, created_at DESC);
```

## 5. API Contract (complete request/response)

### GET /api/v1/dashboard/kpis (Auth: Faculty, Course Director, Admin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `user_id` | string (UUID) | required | User to calculate KPIs for |
| `period` | string | `7d` | Period: `7d`, `30d`, or `semester` |

**Success Response (200):**
```json
{
  "data": {
    "metrics": [
      {
        "key": "questions_generated",
        "label": "Questions Generated",
        "value": 47,
        "unit": "",
        "trend_direction": "up",
        "trend_percent": 18.5,
        "previous_value": 39
      },
      {
        "key": "approval_rate",
        "label": "Approval Rate",
        "value": 82.3,
        "unit": "%",
        "trend_direction": "up",
        "trend_percent": 5.1,
        "previous_value": 78.3
      },
      {
        "key": "coverage_score",
        "label": "Coverage Score",
        "value": 71.0,
        "unit": "%",
        "trend_direction": "flat",
        "trend_percent": 0.5,
        "previous_value": 70.6
      },
      {
        "key": "time_saved",
        "label": "Time Saved",
        "value": 35.3,
        "unit": "hrs",
        "trend_direction": "up",
        "trend_percent": 18.5,
        "previous_value": 29.3
      }
    ],
    "period": "7d",
    "period_start": "2026-02-12T00:00:00Z",
    "period_end": "2026-02-19T23:59:59Z",
    "scope": "personal"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User cannot access requested user_id's KPIs |
| 400 | `VALIDATION_ERROR` | Invalid period value or user_id format |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
FacultyDashboard (Template — from E-32 layout)
  └── BookmarkBar (navyDeep section)
        ├── GreetingText (Atom — "Good morning, Dr. Smith")
        ├── SummaryText (Atom — "You generated 47 questions this week")
        └── KpiStrip (Molecule — 4-col grid)
              ├── PeriodSelector (Atom — dropdown: 7d, 30d, semester)
              └── KpiCard x4 (Atom — per metric)
                    ├── MetricLabel (text — "Questions Generated")
                    ├── MetricValue (text — "47")
                    └── TrendIndicator (Atom — arrow + "18.5%")
```

**States:**
1. **Loading** — Skeleton cards (4 placeholder cards with pulse animation)
2. **Data** — Four KPI cards with values and trends
3. **Error** — "Unable to load metrics" with retry button
4. **Zero Data** — Shows "0" values with flat trend (new user, no activity)

**Design tokens:**
- Background: `--color-navy-deep` (bookmark bar)
- Card surface: `--color-navy-deep-light` (slightly lighter navy)
- Text: `--color-text-on-dark` (white/cream on navy)
- Trend positive: `--color-trend-positive` (#69a338, Evergreen)
- Trend negative: `--color-trend-negative` (#d32f2f, error red)
- Trend neutral: `--color-trend-neutral` (#9e9e9e, gray)
- Typography: Source Sans 3, 28px value, 14px label, 12px trend
- Spacing: 16px card padding, 12px gap between cards

**TrendIndicator Atom:**
- Up trend: `ChevronUp` icon + green text + "+" prefix
- Down trend: `ChevronDown` icon + red text + "-" prefix (no double negative)
- Flat trend (abs(percent) < 1%): `Minus` icon + gray text

**Responsive:**
- Desktop (>=1024px): 4-column grid, single row
- Tablet (640-1023px): 2x2 grid
- Mobile (<640px): Single column, stacked cards

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/dashboard/kpi.types.ts` | Types | Create |
| 2 | `packages/types/src/dashboard/index.ts` | Types | Edit (add kpi export) |
| 3 | Supabase migration via MCP (performance indexes) | Database | Apply |
| 4 | `apps/server/src/services/dashboard/kpi.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/dashboard.controller.ts` | Controller | Create |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add dashboard/kpis route) |
| 7 | `packages/ui/src/atoms/trend-indicator.tsx` | Atom | Create |
| 8 | `packages/ui/src/atoms/kpi-card.tsx` | Atom | Create |
| 9 | `packages/ui/src/molecules/kpi-strip.tsx` | Molecule | Create |
| 10 | `apps/web/src/hooks/use-dashboard-kpis.ts` | Hook | Create |
| 11 | `apps/server/src/__tests__/kpi.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for role-based access enforcement |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons (ChevronUp, ChevronDown, Minus)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `createRbacMiddleware()`, `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `apps/server/src/errors/validation.error.ts` — `ValidationError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthRole`

## 9. Test Fixtures (inline)

```typescript
// Mock faculty user (sees own courses only)
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "jsmith@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock course director (sees all institution courses)
export const COURSE_DIRECTOR_USER = {
  ...FACULTY_USER,
  sub: "cd-uuid-1",
  email: "bwilson@msm.edu",
  is_course_director: true,
};

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
};

// Mock KPI data for service tests
export const MOCK_CURRENT_PERIOD = {
  questions_generated: 47,
  approved_count: 38,
  total_reviewed: 46,
  avg_coverage: 71.0,
};

export const MOCK_PREVIOUS_PERIOD = {
  questions_generated: 39,
  approved_count: 31,
  total_reviewed: 40,
  avg_coverage: 70.6,
};

// Expected KPI response
export const MOCK_KPI_RESPONSE = {
  metrics: [
    {
      key: "questions_generated",
      label: "Questions Generated",
      value: 47,
      unit: "",
      trend_direction: "up",
      trend_percent: 20.5,
      previous_value: 39,
    },
    {
      key: "approval_rate",
      label: "Approval Rate",
      value: 82.6,
      unit: "%",
      trend_direction: "up",
      trend_percent: 5.1,
      previous_value: 77.5,
    },
    {
      key: "coverage_score",
      label: "Coverage Score",
      value: 71.0,
      unit: "%",
      trend_direction: "flat",
      trend_percent: 0.6,
      previous_value: 70.6,
    },
    {
      key: "time_saved",
      label: "Time Saved",
      value: 35.3,
      unit: "hrs",
      trend_direction: "up",
      trend_percent: 20.5,
      previous_value: 29.3,
    },
  ],
  period: "7d",
  scope: "personal",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/kpi.controller.test.ts`

```
describe("KpiController")
  describe("handleGetKpis")
    ✓ returns 4 KPI metrics for authenticated faculty (200)
    ✓ returns correct metric keys (questions_generated, approval_rate, coverage_score, time_saved)
    ✓ defaults to period=7d when not specified
    ✓ accepts period=30d and returns correct date range
    ✓ accepts period=semester and calculates semester boundaries
    ✓ rejects unauthenticated request (401)
    ✓ rejects student role (403 FORBIDDEN)
    ✓ rejects invalid period value (400 VALIDATION_ERROR)
    ✓ rejects invalid user_id format (400 VALIDATION_ERROR)
    ✓ returns scope=personal for regular faculty
    ✓ returns scope=institution for course director

describe("KpiService")
  describe("calculateMetrics")
    ✓ calculates questions_generated as COUNT of assessment_items in period
    ✓ calculates approval_rate as (approved / total_reviewed) * 100
    ✓ returns 0% approval_rate when no items reviewed (division by zero guard)
    ✓ calculates time_saved as questions_generated * 0.75 (45min in hours)
    ✓ calculates trend_direction as "up" when current > previous by >= 1%
    ✓ calculates trend_direction as "down" when current < previous by >= 1%
    ✓ calculates trend_direction as "flat" when abs(change) < 1%
    ✓ returns 0 trend_percent when previous_value is 0 (division by zero guard)
    ✓ scopes queries to user's courses for faculty role
    ✓ scopes queries to all institution courses for course director
```

**Total: ~21 tests** (11 controller + 10 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full Faculty Dashboard (E-32) is assembled with STORY-F-21 (Role-Based Dashboard Variants).

## 12. Acceptance Criteria

1. KPI strip renders 4 metric cards: Questions Generated, Approval Rate, Coverage Score, Time Saved
2. Each card shows current value, trend arrow, and trend percentage
3. Period selector allows switching between Last 7 days, Last 30 days, This semester
4. Data fetched from `GET /api/v1/dashboard/kpis?user_id=X&period=7d`
5. Faculty users see metrics scoped to their own courses (scope=personal)
6. Course directors and institutional admins see aggregate metrics (scope=institution)
7. Trend direction: up (green) when >=1% increase, down (red) when >=1% decrease, flat (gray) when <1%
8. Division by zero guards: 0% approval rate when no reviews, 0% trend when previous=0
9. Loading skeleton displayed while data fetches
10. Responsive: 4 cols desktop, 2x2 tablet, stacked mobile
11. Time Saved calculated as questions * 45 minutes (converted to hours)
12. Unauthenticated requests receive 401, student role receives 403
13. All ~21 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| KPI strip in Faculty Dashboard bookmark bar | Design Spec Template A: "4-col KPI grid with sparklines" |
| 4 metrics: Questions Generated, Avg Quality, Coverage, Active Students | Design Spec Template A bookmark section |
| Trend period selectable | S-F-32-2 Acceptance Criteria |
| Role-based scoping | S-F-32-2 Acceptance Criteria |
| Approval Rate = approved/total | S-F-32-2 Notes |
| Time Saved = questions x 45min | S-F-32-2 Notes |
| Trend formula: ((current - previous) / previous) * 100 | S-F-32-2 Notes |
| Design tokens for trend colors | S-F-32-2 Notes |
| navyDeep bookmark bar | Design Spec Template A |
| 70% True Blues + 30% Evergreens | Design Spec Template A color spec |

## 14. Environment Prerequisites

- **Supabase:** Project running, `assessment_items` and `user_profiles` tables exist
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **Metric calculations are SQL-based.** The KpiService runs two Supabase queries per metric: one for the current period, one for the previous period (same duration, shifted back). Use `.gte("created_at", periodStart).lte("created_at", periodEnd)` for date filtering.
- **Semester boundaries:** For `period=semester`, calculate based on academic calendar. Use January 1 for spring semester start, August 1 for fall semester start. The previous period is the prior semester.
- **Approval Rate** = `COUNT(status='approved') / COUNT(status IN ('approved','rejected'))`. Exclude `draft` and `review` statuses from the denominator. Guard against division by zero — return 0 if no reviewed items.
- **Time Saved** = `questions_generated * 0.75` (45 minutes per question expressed in hours). This is a configurable constant; store in a `KPI_CONFIG` object for future admin override.
- **Coverage Score** = average `quality_score` across the user's assessment items in the period. If no items, return 0.
- **Trend calculation:** `((current - previous) / previous) * 100`. When `previous === 0`, return `current > 0 ? 100 : 0` to avoid Infinity.
- **Flat threshold:** `abs(trend_percent) < 1.0` is considered flat.
- **Protected route pattern:** Register AFTER auth middleware in `index.ts`. Use `rbac.require(AuthRole.FACULTY)` — this allows faculty, course directors, institutional admins, and superadmins.
- **vi.hoisted()** for mock variables in vitest tests. Supabase mock should use separate mock objects per chain stage.
- **JS #private fields** in KpiService for Supabase client and configuration references.
- **Design Spec adaptation:** The design spec lists "Avg Quality" and "Active Students" as KPI metrics. Per the story spec (S-F-32-2), these are mapped to "Approval Rate" and "Time Saved" respectively, which are more meaningful for the MVP faculty experience. The original metrics will be added in a later iteration.
