# STORY-ST-8 Brief: Mastery Trend Charts

## 0. Lane & Priority

```yaml
story_id: STORY-ST-8
old_id: S-ST-43-1
lane: student
lane_priority: 4
within_lane_order: 8
sprint: 28
size: M
depends_on:
  - STORY-ST-2 (student) — Student Dashboard Page
blocks: []
personas_served: [student]
epic: E-43 (Student Progress Analytics)
feature: F-20 (Student Progress & Analytics)
user_flow: UF-32 (Student Dashboard & Progress Tracking)
```

## 1. Summary

Build **mastery trend charts** on a dedicated analytics page (`/dashboard/student/analytics`) that show the student's mastery improvement over time. The primary chart is an overall mastery line chart with daily/weekly toggle. A secondary multi-series chart shows one line per USMLE system (toggleable in legend). Date range selection (7d, 30d, 90d, all) controls the data window. All charts use Recharts 2.x, design token colors, and are fully responsive.

Key constraints:
- **Student only** — RBAC enforced, student sees only their own data
- Data aggregation is server-side; API returns pre-computed time-series arrays
- Chart colors must come from design tokens (no hardcoded hex)
- Empty state when student has < 2 practice sessions
- Milestone markers show significant events on the chart (e.g., first 50% mastery)
- Responsive: charts resize to container width

## 2. Task Breakdown

1. **Types** — Create `TrendDataPoint`, `SystemTrendSeries`, `TrendResponse`, `TrendQuery` types in `packages/types/src/student/trend.types.ts`
2. **Error class** — Create `TrendError` in `apps/server/src/errors/trend.error.ts`
3. **Service** — Create `TrendService` in `apps/server/src/services/student/trend.service.ts` with `getOverallTrend()` and `getSystemTrends()`
4. **Controller** — Create `TrendController` in `apps/server/src/controllers/student/trend.controller.ts` with `handleGetTrends(req, res)`
5. **Routes** — Register `GET /api/v1/student/trends` in `apps/server/src/index.ts` with auth + RBAC
6. **Overall trend chart** — Create `OverallTrendChart` in `apps/web/src/components/student/overall-trend-chart.tsx`
7. **System trend chart** — Create `SystemTrendChart` in `apps/web/src/components/student/system-trend-chart.tsx`
8. **Date range selector** — Create `DateRangeSelector` in `apps/web/src/components/student/date-range-selector.tsx`
9. **Analytics page** — Create `StudentAnalyticsPage` at `apps/web/src/app/(protected)/dashboard/student/analytics/page.tsx`
10. **API tests** — 14 tests covering trend aggregation, auth, filtering, edge cases
11. **Loading/empty states** — Skeleton charts for loading, empty state for < 2 sessions

## 3. Data Model

```typescript
// packages/types/src/student/trend.types.ts

/** Granularity for trend aggregation */
export type TrendGranularity = "daily" | "weekly";

/** Date range preset */
export type TrendDateRange = "7d" | "30d" | "90d" | "all";

/** A single data point in the overall mastery trend */
export interface TrendDataPoint {
  readonly date: string;              // ISO 8601 date (YYYY-MM-DD)
  readonly mastery: number;           // 0.0 - 1.0
  readonly session_count: number;     // Sessions in that period
  readonly items_practiced: number;   // Total items attempted
}

/** A milestone marker on the chart */
export interface TrendMilestone {
  readonly date: string;              // ISO 8601 date
  readonly label: string;             // e.g., "Reached 50% overall mastery"
  readonly type: "mastery_threshold" | "streak" | "session_count";
  readonly value: number;
}

/** A single USMLE system trend series */
export interface SystemTrendSeries {
  readonly system_code: string;
  readonly system_name: string;
  readonly color: string;             // Design token CSS variable name
  readonly data: readonly TrendDataPoint[];
  readonly current_mastery: number;   // Latest mastery value (0.0 - 1.0)
}

/** Full trend response from the API */
export interface TrendResponse {
  readonly overall: readonly TrendDataPoint[];
  readonly systems: readonly SystemTrendSeries[];
  readonly milestones: readonly TrendMilestone[];
  readonly date_range: {
    readonly start: string;           // ISO 8601
    readonly end: string;             // ISO 8601
  };
  readonly granularity: TrendGranularity;
  readonly session_count: number;     // Total sessions in range
}

/** Query parameters for the trends endpoint */
export interface TrendQuery {
  readonly range?: TrendDateRange;           // Default: "30d"
  readonly granularity?: TrendGranularity;   // Default: "daily"
  readonly systems?: string;                 // Comma-separated system codes to include
}
```

## 4. Database Schema

### Supabase (no new tables, uses existing + new aggregation view)

```sql
-- Existing tables used:
-- mastery_estimates (student_id UUID, subconcept_id UUID, p_mastered FLOAT, updated_at TIMESTAMPTZ)
-- practice_sessions (id UUID, student_id UUID, config JSONB, started_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, score FLOAT)

-- Migration: add_trend_chart_support
-- Indexes for time-series aggregation queries

CREATE INDEX IF NOT EXISTS idx_mastery_estimates_student_updated
  ON mastery_estimates(student_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_started
  ON practice_sessions(student_id, started_at);

-- Materialized view for daily mastery snapshots (refreshed by cron or on-demand)
-- Note: For MVP, the service computes aggregation on-the-fly.
-- This view is created as a future optimization target.
CREATE MATERIALIZED VIEW IF NOT EXISTS mastery_daily_snapshots AS
SELECT
  student_id,
  DATE(updated_at) AS snapshot_date,
  AVG(p_mastered) AS avg_mastery,
  COUNT(DISTINCT subconcept_id) AS concepts_practiced
FROM mastery_estimates
GROUP BY student_id, DATE(updated_at)
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mastery_daily_snapshots_pk
  ON mastery_daily_snapshots(student_id, snapshot_date);
```

### Neo4j (read-only, existing nodes)

```cypher
// Used for mapping subconcepts to USMLE systems for per-system trend breakdown
// Same pattern as STORY-ST-7
MATCH (sys:USMLE_System)-[:HAS_TOPIC]->(t:USMLE_Topic)<-[:BELONGS_TO]-(sc:SubConcept)
RETURN sys.code AS system_code, sys.name AS system_name, COLLECT(sc.id) AS subconcept_ids
```

## 5. API Contract

### GET /api/v1/student/trends (Auth: Student only, own data)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `range` | string | `30d` | Date range: `7d`, `30d`, `90d`, `all` |
| `granularity` | string | `daily` | Aggregation: `daily` or `weekly` |
| `systems` | string | all | Comma-separated system codes to include |

**Success Response (200):**
```json
{
  "data": {
    "overall": [
      { "date": "2026-02-15", "mastery": 0.58, "session_count": 2, "items_practiced": 40 },
      { "date": "2026-02-16", "mastery": 0.60, "session_count": 3, "items_practiced": 55 },
      { "date": "2026-02-17", "mastery": 0.62, "session_count": 1, "items_practiced": 20 },
      { "date": "2026-02-18", "mastery": 0.64, "session_count": 2, "items_practiced": 35 },
      { "date": "2026-02-19", "mastery": 0.65, "session_count": 2, "items_practiced": 30 }
    ],
    "systems": [
      {
        "system_code": "CVS",
        "system_name": "Cardiovascular",
        "color": "var(--chart-1)",
        "data": [
          { "date": "2026-02-15", "mastery": 0.65, "session_count": 1, "items_practiced": 12 },
          { "date": "2026-02-17", "mastery": 0.68, "session_count": 1, "items_practiced": 10 },
          { "date": "2026-02-19", "mastery": 0.72, "session_count": 1, "items_practiced": 8 }
        ],
        "current_mastery": 0.72
      },
      {
        "system_code": "RESP",
        "system_name": "Respiratory",
        "color": "var(--chart-2)",
        "data": [
          { "date": "2026-02-16", "mastery": 0.55, "session_count": 1, "items_practiced": 15 },
          { "date": "2026-02-18", "mastery": 0.60, "session_count": 1, "items_practiced": 10 }
        ],
        "current_mastery": 0.60
      }
    ],
    "milestones": [
      { "date": "2026-02-16", "label": "Reached 60% overall mastery", "type": "mastery_threshold", "value": 0.60 }
    ],
    "date_range": {
      "start": "2026-02-12",
      "end": "2026-02-19"
    },
    "granularity": "daily",
    "session_count": 10
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role |
| 400 | `VALIDATION_ERROR` | Invalid range, granularity, or system code |
| 404 | `INSUFFICIENT_DATA` | Student has < 2 practice sessions |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/dashboard/student/analytics`

**Route:** `apps/web/src/app/(protected)/dashboard/student/analytics/page.tsx`

**Component hierarchy:**
```
StudentAnalyticsPage (page.tsx — default export)
  └── AnalyticsDashboard (client component)
        ├── DateRangeSelector (molecule)
        │     ├── ToggleGroup (shadcn/ui — 7d/30d/90d/all)
        │     └── GranularityToggle (daily/weekly switch)
        ├── OverallTrendChart (organism)
        │     ├── LineChart (Recharts — single mastery line)
        │     ├── ReferenceLine (milestones)
        │     ├── Tooltip (hover: date, mastery %, sessions)
        │     └── Legend (overall mastery label)
        ├── SystemTrendChart (organism)
        │     ├── LineChart (Recharts — multi-series)
        │     ├── Legend (clickable: toggle system visibility)
        │     ├── Tooltip (hover: system name, mastery %)
        │     └── SystemToggleList (checkboxes for system selection)
        └── MilestoneBadges (molecule — horizontal scroll of milestone chips)
```

**Props:**
```typescript
interface OverallTrendChartProps {
  readonly data: readonly TrendDataPoint[];
  readonly milestones: readonly TrendMilestone[];
  readonly dateRange: { start: string; end: string };
  readonly isLoading: boolean;
}

interface SystemTrendChartProps {
  readonly systems: readonly SystemTrendSeries[];
  readonly dateRange: { start: string; end: string };
  readonly isLoading: boolean;
}

interface DateRangeSelectorProps {
  readonly range: TrendDateRange;
  readonly granularity: TrendGranularity;
  readonly onRangeChange: (range: TrendDateRange) => void;
  readonly onGranularityChange: (granularity: TrendGranularity) => void;
}
```

**States:**
1. **Loading** — Skeleton chart areas (rect placeholders for both charts)
2. **Empty** — "Complete at least 2 practice sessions to see your trends" with CTA link to practice
3. **Data** — Both charts rendered with current range/granularity
4. **Error** — Error message with retry button
5. **Filtering** — Charts re-render with updated data on range/granularity/system toggle change

**Chart color tokens (mapped to USMLE systems):**
```
--chart-1: #2b71b9  (Blue Mid — Cardiovascular)
--chart-2: #69a338  (Green — Respiratory)
--chart-3: #002c76  (Navy Deep — Renal)
--chart-4: #e8a838  (Amber — GI)
--chart-5: #c75050  (Coral — Endocrine)
--chart-6: #7b5ea7  (Purple — Reproductive)
--chart-7: #3d9ca8  (Teal — MSK)
--chart-8: #d4763a  (Orange — Hematologic)
--chart-9: #5a8f3d  (Forest — Neuro)
--chart-10: #8b6b4a (Brown — Skin)
--chart-11: #6b8fb5 (Slate — Behavioral)
--chart-12: #a85b8f (Mauve — Immune)
--chart-13: #5b7e6b (Sage — Biostatistics)
--chart-14: #7a7a7a (Gray — Multisystem)
```

**Design tokens:**
- Surface: White card on Cream background
- Chart background: transparent (white card handles bg)
- Grid lines: `#f5f3ef` (Cream)
- Axis labels: 12px Source Sans 3, muted gray
- Tooltip: White bg, Navy Deep border, 14px Source Sans 3
- Legend: 13px Source Sans 3, clickable items with color dot
- Milestone markers: vertical dashed line + chip badge
- Spacing: 24px card padding, 32px between charts, 16px chart internal padding

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/trend.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Edit (add trend export) |
| 3 | `apps/server/src/errors/trend.error.ts` | Errors | Create |
| 4 | Supabase migration via MCP (indexes + materialized view) | Database | Apply |
| 5 | `apps/server/src/services/student/trend.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/student/trend.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add student trends route) |
| 8 | `apps/web/src/components/student/date-range-selector.tsx` | Molecule | Create |
| 9 | `apps/web/src/components/student/overall-trend-chart.tsx` | Organism | Create |
| 10 | `apps/web/src/components/student/system-trend-chart.tsx` | Organism | Create |
| 11 | `apps/web/src/app/(protected)/dashboard/student/analytics/page.tsx` | Page | Create |
| 12 | `apps/server/src/__tests__/trend.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-2 | student | **REQUIRED** | Student Dashboard Page (navigation link to analytics) |
| STORY-U-6 | universal | **DONE** | RBAC middleware for student-only enforcement |
| STORY-U-7 | universal | **DONE** | USMLE seed data (system codes for multi-series chart) |

### NPM Packages
- `recharts` (2.x) — Chart rendering (required, may need install in apps/web)
- `date-fns` — Date range computation and formatting
- `@supabase/supabase-js` — Supabase client for aggregation queries
- `neo4j-driver` — Subconcept-to-system mapping

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthTokenPayload`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`

## 9. Test Fixtures

```typescript
// Mock student auth
export const STUDENT_USER = {
  sub: "student-uuid-1",
  email: "alice@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock advisor user (should be denied)
export const ADVISOR_USER = {
  ...STUDENT_USER,
  sub: "advisor-uuid-1",
  email: "advisor@msm.edu",
  role: "advisor" as const,
};

// Mock overall trend data (7 days, daily)
export const MOCK_OVERALL_TREND: TrendDataPoint[] = [
  { date: "2026-02-13", mastery: 0.55, session_count: 2, items_practiced: 40 },
  { date: "2026-02-14", mastery: 0.57, session_count: 1, items_practiced: 20 },
  { date: "2026-02-15", mastery: 0.58, session_count: 2, items_practiced: 35 },
  { date: "2026-02-16", mastery: 0.60, session_count: 3, items_practiced: 55 },
  { date: "2026-02-17", mastery: 0.62, session_count: 1, items_practiced: 20 },
  { date: "2026-02-18", mastery: 0.64, session_count: 2, items_practiced: 35 },
  { date: "2026-02-19", mastery: 0.65, session_count: 2, items_practiced: 30 },
];

// Mock system trend (2 systems, sparse data)
export const MOCK_SYSTEM_TRENDS: SystemTrendSeries[] = [
  {
    system_code: "CVS",
    system_name: "Cardiovascular",
    color: "var(--chart-1)",
    data: [
      { date: "2026-02-13", mastery: 0.62, session_count: 1, items_practiced: 12 },
      { date: "2026-02-15", mastery: 0.65, session_count: 1, items_practiced: 10 },
      { date: "2026-02-17", mastery: 0.68, session_count: 1, items_practiced: 8 },
      { date: "2026-02-19", mastery: 0.72, session_count: 1, items_practiced: 8 },
    ],
    current_mastery: 0.72,
  },
  {
    system_code: "RESP",
    system_name: "Respiratory",
    color: "var(--chart-2)",
    data: [
      { date: "2026-02-14", mastery: 0.50, session_count: 1, items_practiced: 15 },
      { date: "2026-02-16", mastery: 0.55, session_count: 1, items_practiced: 12 },
      { date: "2026-02-18", mastery: 0.60, session_count: 1, items_practiced: 10 },
    ],
    current_mastery: 0.60,
  },
];

// Mock milestones
export const MOCK_MILESTONES: TrendMilestone[] = [
  { date: "2026-02-16", label: "Reached 60% overall mastery", type: "mastery_threshold", value: 0.60 },
];

// Mock empty student (< 2 sessions)
export const MOCK_EMPTY_SESSIONS: never[] = [];

// Mock weekly aggregation (for weekly granularity test)
export const MOCK_WEEKLY_TREND: TrendDataPoint[] = [
  { date: "2026-01-27", mastery: 0.50, session_count: 5, items_practiced: 100 },
  { date: "2026-02-03", mastery: 0.55, session_count: 8, items_practiced: 150 },
  { date: "2026-02-10", mastery: 0.60, session_count: 6, items_practiced: 120 },
  { date: "2026-02-17", mastery: 0.65, session_count: 7, items_practiced: 130 },
];
```

## 10. API Test Spec (vitest)

**File:** `apps/server/src/__tests__/trend.controller.test.ts`

```
describe("TrendController")
  describe("handleGetTrends")
    it returns overall mastery trend for authenticated student (200)
    it returns system-level trend series with color tokens
    it returns milestone markers within the date range
    it defaults to 30d range and daily granularity
    it respects range query parameter (7d, 30d, 90d, all)
    it respects granularity query parameter (daily, weekly)
    it filters systems when systems query param is provided
    it rejects unauthenticated request (401)
    it rejects non-student roles (403 FORBIDDEN)
    it returns 400 for invalid range value
    it returns 404 INSUFFICIENT_DATA when student has < 2 sessions

describe("TrendService")
  describe("getOverallTrend")
    it aggregates daily mastery from mastery_estimates
    it aggregates weekly mastery when granularity is weekly
    it computes correct date range boundaries for each preset
  describe("getSystemTrends")
    it maps subconcepts to systems via Neo4j lookup
    it returns sparse data (only dates with activity per system)
    it assigns chart color tokens to each system series
  describe("getMilestones")
    it detects mastery threshold crossings (50%, 75%, 90%)
```

**Total: ~17 tests** (11 controller + 6 service)

## 11. E2E Test Spec (Playwright)

Not required for this story. Trend charts are not part of the 5 critical user journeys. Chart rendering correctness will be verified through visual QA and component-level tests.

## 12. Acceptance Criteria

1. Line chart shows overall mastery percentage over time with daily/weekly toggle
2. Multi-series chart displays one line per USMLE system, toggled via clickable legend
3. Date range selector provides 7d, 30d, 90d, and all time presets
4. Hover tooltip shows exact date, mastery percentage, and session count
5. Legend displays system names with current mastery values and color dots
6. Milestone markers appear as vertical dashed lines on the chart
7. Charts rendered with Recharts 2.x library
8. Charts resize responsively to container width
9. Loading state shows skeleton chart placeholders
10. Empty state shown when student has < 2 practice sessions with CTA
11. Chart colors use design token CSS variables (no hardcoded hex in components)
12. Non-student roles receive 403 Forbidden
13. Analytics page accessible at `/dashboard/student/analytics`
14. All 17 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Student analytics page | ARCHITECTURE_v10 SS 13.1: Student Dashboard |
| Trend charts for mastery tracking | DESIGN_SPEC SS Group D: StudentAnalytics |
| Recharts for chart rendering | ARCHITECTURE_v10 SS 2.1: Frontend Stack |
| mastery_estimates table | SUPABASE_DDL_v1 SS Student Tables |
| practice_sessions table | SUPABASE_DDL_v1 SS Student Tables |
| USMLE system codes for multi-series | NODE_REGISTRY_v1 SS Layer 2 |
| Sprint 28 placement | ROADMAP_v2_3 SS Sprint 28 |
| Daily/weekly toggle, date range | S-ST-43-1 SS Acceptance Criteria |
| UF-32 Student Dashboard flow | UF-32 SS Progress Tracking |

## 14. Environment Prerequisites

- **Supabase:** Project running, `mastery_estimates` and `practice_sessions` tables exist, indexes applied, materialized view created
- **Neo4j:** Running with USMLE seed data (227 nodes from STORY-U-7) for subconcept-to-system mapping
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000 with student dashboard from STORY-ST-2
- **Recharts 2.x:** Installed in apps/web
- **date-fns:** Installed in apps/server and apps/web

## 15. Figma / Make Prototype

**Analytics page layout (ASCII wireframe):**
```
+----------------------------------------------------------+
|  Student Analytics                   [7d] [30d] [90d] [All] |
|                                      [Daily] / [Weekly]     |
+----------------------------------------------------------+
|                                                            |
|  Overall Mastery Trend                                     |
|  0.70 |                                    ____/           |
|  0.60 |              ___/----____----/                      |
|  0.50 |     ___/----/     |milestone                       |
|  0.40 |____/                                               |
|       +-----|------|------|------|------|------|---->       |
|       Feb 13 Feb 14 Feb 15 Feb 16 Feb 17 Feb 18 Feb 19    |
|                                                            |
|  [*Reached 60% overall mastery - Feb 16]                   |
|                                                            |
+----------------------------------------------------------+
|                                                            |
|  Mastery by System                                         |
|  [x] CVS  [x] RESP  [x] RENAL  [ ] GI  [ ] ENDO  ...    |
|                                                            |
|  0.80 |    CVS ____....----                                |
|  0.70 |   /                                                |
|  0.60 |  /        RESP ____....                            |
|  0.50 | /        /                                         |
|  0.40 |/________/                                          |
|       +------|------|------|------|------|------|---->      |
|       Feb 13 Feb 14 Feb 15 Feb 16 Feb 17 Feb 18 Feb 19    |
|                                                            |
|  Legend:                                                    |
|  * CVS  72%  * RESP  60%  * RENAL  58%                    |
+----------------------------------------------------------+
```
