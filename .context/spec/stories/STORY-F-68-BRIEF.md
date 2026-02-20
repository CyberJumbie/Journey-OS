# STORY-F-68 Brief: Repository Statistics

## 0. Lane & Priority

```yaml
story_id: STORY-F-68
old_id: S-F-25-4
lane: faculty
lane_priority: 3
within_lane_order: 68
sprint: 18
size: M
depends_on:
  - STORY-F-64 (faculty) — Item Bank Browser Page (item bank has items to compute statistics on)
blocks: []
personas_served: [faculty, institutional_admin]
epic: E-25 (Item Bank Browser & Export)
feature: F-11 (Item Bank Repository)
user_flow: UF-19 (Item Bank Browse & Export)
```

## 1. Summary

Build an **aggregate statistics dashboard** for the item bank at `/faculty/item-bank/statistics`. Faculty can view KPI cards (total items, average quality, coverage percentage, items this month), distribution charts (Bloom level, difficulty, question type, USMLE system), a coverage heatmap (SLOs vs. Bloom levels), quality score distribution histograms, and trend charts (items added per week/month). Statistics are cached in a `statistics_cache` table with a 5-minute auto-refresh interval and a manual refresh button.

This is the final story in E-25 (Item Bank Browser & Export): F-64 (browser) -> F-66 (detail) -> F-67 (export) -> **F-68 (statistics)**.

Key constraints:
- **Faculty + Admin scoped** — course-scoped for faculty (default), institution-scoped for admin roles
- Aggregate queries cached in `statistics_cache` table with 5-minute TTL
- Charts built with recharts (shadcn/ui compatible)
- Coverage heatmap: matrix of SLOs vs. Bloom levels, cell color intensity = question count
- Named exports only, TypeScript strict, custom error classes

## 2. Task Breakdown

1. **Types** — Create `ItemBankStatistics`, `StatisticsKPI`, `DistributionData`, `CoverageHeatmapCell`, `TrendDataPoint`, `StatisticsCacheEntry` in `packages/types/src/item-bank/statistics.types.ts`
2. **Migration** — Create `statistics_cache` table in Supabase via MCP
3. **Error classes** — `StatisticsCacheError` in `apps/server/src/errors/item-bank.errors.ts` (edit existing)
4. **Service** — `ItemBankStatisticsService` with `getStatistics()`, `refreshCache()`, `invalidateCache()` methods
5. **Controller** — `ItemBankStatisticsController` with `handleGetStatistics()` and `handleRefreshCache()` methods
6. **Routes** — Protected routes `GET /api/v1/item-bank/statistics` and `POST /api/v1/item-bank/statistics/refresh` with RBAC
7. **Frontend page** — `/faculty/item-bank/statistics` page
8. **Frontend components** — `StatisticsKPICards`, `DistributionCharts`, `CoverageHeatmap`, `TrendCharts`
9. **Wire up** — Register routes in exam module router
10. **API tests** — 10 tests covering aggregate queries, scope filtering, cache behavior

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/item-bank/statistics.types.ts

/** KPI card data for the statistics dashboard */
export interface StatisticsKPI {
  readonly total_items: number;
  readonly average_quality_score: number;
  readonly coverage_percentage: number;
  readonly items_this_month: number;
}

/** Distribution breakdown for a single dimension */
export interface DistributionEntry {
  readonly label: string;
  readonly count: number;
  readonly percentage: number;
}

/** Distribution data grouped by dimension */
export interface DistributionData {
  readonly bloom_level: readonly DistributionEntry[];
  readonly difficulty: readonly DistributionEntry[];
  readonly question_type: readonly DistributionEntry[];
  readonly usmle_system: readonly DistributionEntry[];
}

/** Item status breakdown */
export interface StatusDistribution {
  readonly approved: number;
  readonly draft: number;
  readonly rejected: number;
  readonly archived: number;
}

/** Single cell in the SLO x Bloom coverage heatmap */
export interface CoverageHeatmapCell {
  readonly slo_id: string;
  readonly slo_name: string;
  readonly bloom_level: string;
  readonly question_count: number;
  readonly intensity: number; // 0.0 - 1.0 normalized
}

/** Time-series trend data point */
export interface TrendDataPoint {
  readonly period: string;     // ISO date string (week start or month start)
  readonly count: number;
}

/** Trend data for items added over time */
export interface TrendData {
  readonly weekly: readonly TrendDataPoint[];
  readonly monthly: readonly TrendDataPoint[];
}

/** Complete statistics response */
export interface ItemBankStatistics {
  readonly kpi: StatisticsKPI;
  readonly status_distribution: StatusDistribution;
  readonly distributions: DistributionData;
  readonly coverage_heatmap: readonly CoverageHeatmapCell[];
  readonly trends: TrendData;
  readonly cached_at: string;
  readonly scope: StatisticsScope;
}

/** Scope for statistics queries */
export type StatisticsScope = "course" | "institution";

/** Query parameters for statistics endpoint */
export interface StatisticsQuery {
  readonly scope?: StatisticsScope;       // Default: "course"
  readonly course_id?: string;            // Required when scope = "course"
  readonly institution_id?: string;       // Auto-filled from user context for institution scope
}

/** Cache entry stored in statistics_cache table */
export interface StatisticsCacheEntry {
  readonly id: string;
  readonly scope: StatisticsScope;
  readonly scope_id: string;             // course_id or institution_id
  readonly data: ItemBankStatistics;
  readonly expires_at: string;
  readonly created_at: string;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_statistics_cache
CREATE TABLE IF NOT EXISTS statistics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('course', 'institution')),
  scope_id UUID NOT NULL,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_statistics_cache_scope
  ON statistics_cache(scope, scope_id);

CREATE INDEX IF NOT EXISTS idx_statistics_cache_expires
  ON statistics_cache(expires_at);

-- RLS: Faculty can read statistics for their courses; admins for their institution
ALTER TABLE statistics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can read course statistics"
  ON statistics_cache FOR SELECT
  USING (scope = 'course');

CREATE POLICY "Admins can read institution statistics"
  ON statistics_cache FOR SELECT
  USING (scope = 'institution');
```

## 5. API Contract (complete request/response)

### GET /api/v1/item-bank/statistics (Auth: Faculty, Institutional Admin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `scope` | string | `course` | Scope: `course` or `institution` |
| `course_id` | string (UUID) | — | Required when scope = `course` |

**Success Response (200):**
```json
{
  "data": {
    "kpi": {
      "total_items": 842,
      "average_quality_score": 7.3,
      "coverage_percentage": 84.5,
      "items_this_month": 47
    },
    "status_distribution": {
      "approved": 620,
      "draft": 145,
      "rejected": 42,
      "archived": 35
    },
    "distributions": {
      "bloom_level": [
        { "label": "Remember", "count": 120, "percentage": 14.3 },
        { "label": "Understand", "count": 185, "percentage": 22.0 }
      ],
      "difficulty": [
        { "label": "easy", "count": 210, "percentage": 25.0 },
        { "label": "medium", "count": 380, "percentage": 45.1 },
        { "label": "hard", "count": 252, "percentage": 29.9 }
      ],
      "question_type": [],
      "usmle_system": []
    },
    "coverage_heatmap": [
      { "slo_id": "slo-1", "slo_name": "Cardiovascular Physiology", "bloom_level": "Apply", "question_count": 12, "intensity": 0.75 }
    ],
    "trends": {
      "weekly": [
        { "period": "2026-02-10", "count": 15 },
        { "period": "2026-02-17", "count": 22 }
      ],
      "monthly": [
        { "period": "2026-01-01", "count": 58 },
        { "period": "2026-02-01", "count": 47 }
      ]
    },
    "cached_at": "2026-02-19T12:00:00Z",
    "scope": "course"
  },
  "error": null
}
```

### POST /api/v1/item-bank/statistics/refresh (Auth: Faculty, Institutional Admin)

**Request Body:**
```json
{
  "scope": "course",
  "course_id": "course-uuid-1"
}
```

**Success Response (200):**
```json
{
  "data": {
    "refreshed_at": "2026-02-19T12:05:00Z",
    "scope": "course",
    "scope_id": "course-uuid-1"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User lacks access to requested scope |
| 400 | `VALIDATION_ERROR` | Missing course_id when scope=course |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/faculty/item-bank/statistics` (Faculty layout)

**Route:** `apps/web/src/app/(dashboard)/faculty/item-bank/statistics/page.tsx`

**Component hierarchy:**
```
ItemBankStatisticsPage (page.tsx — default export)
  └── StatisticsDashboard (client component)
        ├── ScopeSelector (dropdown: course / institution)
        ├── CourseSelector (dropdown, visible when scope=course)
        ├── RefreshButton (manual cache refresh)
        ├── CacheTimestamp ("Last updated: 2 min ago")
        ├── StatisticsKPICards (organism)
        │     ├── KPICard — Total Items
        │     ├── KPICard — Average Quality Score
        │     ├── KPICard — Coverage %
        │     └── KPICard — Items This Month
        ├── StatusDistributionChart (donut chart)
        ├── DistributionCharts (organism)
        │     ├── BloomLevelChart (bar chart)
        │     ├── DifficultyChart (pie chart)
        │     ├── QuestionTypeChart (bar chart)
        │     └── USMLESystemChart (horizontal bar chart)
        ├── CoverageHeatmap (organism)
        │     └── Matrix: SLOs (rows) x Bloom levels (columns), cell color intensity
        └── TrendCharts (organism)
              ├── WeeklyTrendLine
              └── MonthlyTrendLine
```

**States:**
1. **Loading** — Skeleton cards and chart placeholders while fetching
2. **Data** — Full dashboard with charts rendered
3. **Refreshing** — Spinner on refresh button, data still visible
4. **Empty** — "No items in this scope yet" with link to item bank
5. **Error** — Error message with retry button

**Design tokens:**
- KPI cards: White `#ffffff` surface, Navy Deep `#002c76` text for values
- Charts: Green `#69a338` primary, Navy `#002c76` secondary
- Heatmap: gradient from White `#ffffff` (0) to Green `#69a338` (high intensity)
- Surface: Cream `#f5f3ef` background
- Typography: Source Sans 3

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/item-bank/statistics.types.ts` | Types | Create |
| 2 | `packages/types/src/item-bank/index.ts` | Types | Edit (add statistics export) |
| 3 | Supabase migration via MCP (statistics_cache table) | Database | Apply |
| 4 | `apps/server/src/errors/item-bank.errors.ts` | Errors | Edit (add StatisticsCacheError) |
| 5 | `apps/server/src/services/item-bank/statistics.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/item-bank/statistics.controller.ts` | Controller | Create |
| 7 | `apps/server/src/routes/item-bank/statistics.routes.ts` | Routes | Create |
| 8 | `apps/web/src/app/(dashboard)/faculty/item-bank/statistics/page.tsx` | View | Create |
| 9 | `apps/web/src/components/item-bank/statistics-kpi-cards.tsx` | Component | Create |
| 10 | `apps/web/src/components/item-bank/distribution-charts.tsx` | Component | Create |
| 11 | `apps/web/src/components/item-bank/coverage-heatmap.tsx` | Component | Create |
| 12 | `apps/web/src/components/item-bank/trend-charts.tsx` | Component | Create |
| 13 | `apps/server/src/tests/item-bank/statistics.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-64 | faculty | pending | Item Bank Browser — items must exist for statistics computation |

### NPM Packages
- `recharts` — Chart library (shadcn/ui compatible) — **NEW, must install**
- `@supabase/supabase-js` — Supabase client (installed)
- `express` — Server framework (installed)
- `vitest` — Testing (installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- Item bank tables from F-64 (questions, items, etc.)

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
  is_course_director: false,
};

// Mock KPI data
export const MOCK_KPI: StatisticsKPI = {
  total_items: 842,
  average_quality_score: 7.3,
  coverage_percentage: 84.5,
  items_this_month: 47,
};

// Mock status distribution
export const MOCK_STATUS_DISTRIBUTION = {
  approved: 620,
  draft: 145,
  rejected: 42,
  archived: 35,
};

// Mock distribution data
export const MOCK_BLOOM_DISTRIBUTION = [
  { label: "Remember", count: 120, percentage: 14.3 },
  { label: "Understand", count: 185, percentage: 22.0 },
  { label: "Apply", count: 250, percentage: 29.7 },
  { label: "Analyze", count: 180, percentage: 21.4 },
  { label: "Evaluate", count: 72, percentage: 8.6 },
  { label: "Create", count: 35, percentage: 4.2 },
];

// Mock coverage heatmap cell
export const MOCK_HEATMAP_CELLS = [
  { slo_id: "slo-1", slo_name: "Cardiovascular Physiology", bloom_level: "Apply", question_count: 12, intensity: 0.75 },
  { slo_id: "slo-1", slo_name: "Cardiovascular Physiology", bloom_level: "Analyze", question_count: 3, intensity: 0.19 },
  { slo_id: "slo-2", slo_name: "Renal Pathophysiology", bloom_level: "Remember", question_count: 8, intensity: 0.50 },
];

// Mock cache entry
export const MOCK_CACHE_ENTRY = {
  id: "cache-uuid-1",
  scope: "course" as const,
  scope_id: "course-uuid-1",
  data: {} as ItemBankStatistics,
  expires_at: new Date(Date.now() + 300000).toISOString(),
  created_at: new Date().toISOString(),
};

// Expired cache entry
export const MOCK_EXPIRED_CACHE = {
  ...MOCK_CACHE_ENTRY,
  expires_at: new Date(Date.now() - 60000).toISOString(),
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/item-bank/statistics.test.ts`

```
describe("ItemBankStatisticsController")
  describe("handleGetStatistics")
    - returns full statistics for faculty user with course scope (200)
    - returns institution-scoped statistics for admin role (200)
    - returns cached data when cache is fresh (hits cache)
    - recomputes when cache is expired
    - rejects unauthenticated request (401)
    - rejects student role (403 FORBIDDEN)
    - rejects missing course_id when scope=course (400 VALIDATION_ERROR)
    - returns empty distributions when no items exist

  describe("handleRefreshCache")
    - invalidates and recomputes statistics (200)
    - returns new cached_at timestamp after refresh

describe("ItemBankStatisticsService")
  describe("getStatistics")
    - computes correct KPI values from items table
    - computes correct status distribution counts
    - computes coverage heatmap with normalized intensity
    - returns weekly and monthly trend data
    - uses cached data when available and not expired
    - recomputes and updates cache when expired
  describe("refreshCache")
    - deletes old cache entry and creates new one
    - sets expires_at to 5 minutes from now
```

**Total: ~18 tests** (8 controller + 10 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Statistics dashboard is not part of the 5 critical user journeys.

## 12. Acceptance Criteria

1. Faculty can access `/faculty/item-bank/statistics` and see KPI cards
2. Distribution charts render for Bloom level, difficulty, question type, and USMLE system
3. Coverage heatmap shows SLO x Bloom matrix with color intensity
4. Trend charts show items added per week and per month
5. Course-scoped view is default for faculty
6. Institution-scoped view available for admin roles
7. Statistics are cached with 5-minute TTL
8. Manual refresh button invalidates cache and recomputes
9. Auto-refresh every 5 minutes on the statistics page
10. Total item count correctly breaks down by status (approved, draft, rejected, archived)
11. All ~18 API tests pass
12. TypeScript strict, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Aggregate statistics dashboard | S-F-25-4 § User Story |
| KPI cards: total, quality, coverage, monthly | S-F-25-4 § Acceptance Criteria |
| Distribution charts: Bloom, difficulty, type, system | S-F-25-4 § Acceptance Criteria |
| Coverage heatmap: SLO x Bloom | S-F-25-4 § Notes: "matrix of SLOs vs. Bloom levels" |
| Cached aggregates with TTL | S-F-25-4 § Notes: "cache results in statistics_cache table" |
| Charts with recharts | S-F-25-4 § Notes: "recharts (shadcn/ui compatible)" |
| Course-scoped default, institution for admin | S-F-25-4 § Notes |
| Auto-refresh every 5 minutes | S-F-25-4 § Notes |

## 14. Environment Prerequisites

- **Supabase:** Project running, item bank tables exist (from F-64), `statistics_cache` table created by migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No Figma designs available. Build from component hierarchy above using shadcn/ui primitives (Card, Badge) and recharts. Reference existing dashboard patterns in the codebase for layout consistency.
