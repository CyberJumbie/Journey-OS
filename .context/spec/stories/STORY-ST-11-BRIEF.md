# STORY-ST-11 Brief: Time-on-Task Analytics

## 0. Lane & Priority

```yaml
story_id: STORY-ST-11
old_id: S-ST-43-2
lane: student
lane_priority: 4
within_lane_order: 11
sprint: 28
size: M
depends_on:
  - STORY-ST-5 (student) — Session History
blocks: []
personas_served: [student]
epic: E-43 (Student Progress Analytics)
feature: F-20 (Student Progress Dashboard)
user_flow: UF-31 (Student Adaptive Practice)
```

## 1. Summary

Build **time-on-task analytics** that shows medical students how much time they spend studying each USMLE system/concept area. The feature includes a server-side aggregation API on the Express backend plus a React dashboard page at `/dashboard/analytics/time` with a stacked bar chart (Recharts), time-period selector, drill-down capability, and efficiency metrics.

Key constraints:
- **Express API** — aggregation endpoint in `apps/server`
- **Recharts 2.x** — stacked bar chart or treemap visualization
- **Time periods** — 7, 30, 90 day windows
- **Drill-down** — click a USMLE system bar to see per-concept breakdown
- **Efficiency metric** — mastery gain per hour studied per system
- **Loading skeleton + empty state** for all data views

## 2. Task Breakdown

1. **Types** — Create `TimeOnTaskQuery`, `TimeOnTaskResponse`, `SystemTimeBreakdown`, `ConceptTimeBreakdown`, `StudyEfficiencyMetric` types in `packages/types/src/student/time-analytics.types.ts`
2. **Service** — `TimeAnalyticsService` in `apps/server/src/services/student/time-analytics.service.ts` — aggregation logic from `practice_sessions` table
3. **Controller** — `TimeAnalyticsController` in `apps/server/src/controllers/student/time-analytics.controller.ts`
4. **Routes** — `GET /api/v1/student/analytics/time` with auth middleware (student role)
5. **Frontend page** — `/dashboard/analytics/time/page.tsx` (student layout)
6. **Frontend components** — `TimeOnTaskDashboard`, `SystemTimeChart`, `ConceptDrillDown`, `TimePeriodSelector`, `StudyStatsCards`
7. **Wire up** — Register route in `apps/server/src/index.ts` after auth middleware
8. **API tests** — 16 tests covering aggregation, filtering, edge cases, auth

## 3. Data Model

```typescript
// packages/types/src/student/time-analytics.types.ts

/** Query parameters for time-on-task endpoint */
export interface TimeOnTaskQuery {
  readonly period: TimePeriod;
  readonly system_id?: string;       // Drill-down: specific USMLE system
}

export type TimePeriod = "7d" | "30d" | "90d";

/** Top-level response: time aggregated by USMLE system */
export interface TimeOnTaskResponse {
  readonly summary: StudySummary;
  readonly systems: SystemTimeBreakdown[];
  readonly weekly_sessions: WeeklySessionCount[];
}

/** Summary statistics displayed at top of dashboard */
export interface StudySummary {
  readonly total_study_time_minutes: number;
  readonly average_session_duration_minutes: number;
  readonly total_sessions: number;
  readonly sessions_per_week: number;
  readonly session_goal_per_week: number;        // Fixed at 3
  readonly session_goal_met: boolean;
}

/** Time breakdown per USMLE system */
export interface SystemTimeBreakdown {
  readonly system_id: string;
  readonly system_name: string;
  readonly system_code: string;
  readonly total_minutes: number;
  readonly percentage_of_total: number;
  readonly session_count: number;
  readonly efficiency: StudyEfficiencyMetric;
}

/** Drill-down: time per concept within a USMLE system */
export interface ConceptTimeBreakdown {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly total_minutes: number;
  readonly percentage_of_system: number;
  readonly session_count: number;
  readonly efficiency: StudyEfficiencyMetric;
}

/** Efficiency: mastery gain per hour studied */
export interface StudyEfficiencyMetric {
  readonly mastery_start: number;              // P(L) at period start
  readonly mastery_end: number;                // P(L) at period end
  readonly mastery_gain: number;               // end - start
  readonly hours_studied: number;
  readonly mastery_gain_per_hour: number;      // gain / hours (0 if hours=0)
}

/** Weekly session counts for sparkline / bar chart */
export interface WeeklySessionCount {
  readonly week_start: string;                 // ISO date (Monday)
  readonly session_count: number;
  readonly total_minutes: number;
}

/** Drill-down response when system_id is provided */
export interface ConceptDrillDownResponse {
  readonly system_id: string;
  readonly system_name: string;
  readonly concepts: ConceptTimeBreakdown[];
}
```

## 4. Database Schema

**No new tables needed.** Uses existing tables from ST-3/ST-5 dependencies.

```sql
-- New indexes for time aggregation performance
-- Migration: add_time_analytics_indexes

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_started
  ON practice_sessions(student_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_status
  ON practice_sessions(status);

CREATE INDEX IF NOT EXISTS idx_student_attempts_student_created
  ON student_attempts(student_id, created_at DESC);
```

**Aggregation query patterns (service layer via Supabase client):**

```sql
-- Total study time by USMLE system for a student in a period
SELECT
  unnest(ps.scope_concept_ids) AS concept_id,
  SUM(EXTRACT(EPOCH FROM (COALESCE(ps.completed_at, now()) - ps.started_at)) / 60.0) AS total_minutes,
  COUNT(DISTINCT ps.id) AS session_count
FROM practice_sessions ps
WHERE ps.student_id = $studentId
  AND ps.started_at >= now() - $interval
  AND ps.status IN ('completed', 'active')
GROUP BY concept_id;

-- Weekly session counts
SELECT
  date_trunc('week', ps.started_at) AS week_start,
  COUNT(*) AS session_count,
  SUM(EXTRACT(EPOCH FROM (COALESCE(ps.completed_at, now()) - ps.started_at)) / 60.0) AS total_minutes
FROM practice_sessions ps
WHERE ps.student_id = $studentId
  AND ps.started_at >= now() - $interval
GROUP BY week_start
ORDER BY week_start ASC;

-- Mastery gain: compare earliest and latest mastery for a concept in the period
-- (requires mastery_estimates history or snapshots — see implementation notes)
```

**No Neo4j changes needed.** USMLE system-to-concept mapping is read from existing `(USMLE_System)-[:HAS_TOPIC]->(USMLE_Topic)` relationships for display names only.

## 5. API Contract

### GET /api/v1/student/analytics/time (Auth: Student)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `30d` | Time period: `7d`, `30d`, `90d` |
| `system_id` | string | -- | Optional: drill-down to specific USMLE system |

**Headers:**
| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {jwt}` | Yes |

**Success Response (200) — Overview:**
```json
{
  "data": {
    "summary": {
      "total_study_time_minutes": 842,
      "average_session_duration_minutes": 28.1,
      "total_sessions": 30,
      "sessions_per_week": 3.5,
      "session_goal_per_week": 3,
      "session_goal_met": true
    },
    "systems": [
      {
        "system_id": "usmle-sys-cardiovascular",
        "system_name": "Cardiovascular",
        "system_code": "CVS",
        "total_minutes": 210,
        "percentage_of_total": 24.9,
        "session_count": 8,
        "efficiency": {
          "mastery_start": 0.35,
          "mastery_end": 0.62,
          "mastery_gain": 0.27,
          "hours_studied": 3.5,
          "mastery_gain_per_hour": 0.077
        }
      }
    ],
    "weekly_sessions": [
      {
        "week_start": "2026-01-20",
        "session_count": 4,
        "total_minutes": 112
      }
    ]
  },
  "error": null
}
```

**Success Response (200) — Drill-down (with system_id):**
```json
{
  "data": {
    "system_id": "usmle-sys-cardiovascular",
    "system_name": "Cardiovascular",
    "concepts": [
      {
        "concept_id": "concept-cardiac-output",
        "concept_name": "Cardiac Output",
        "total_minutes": 85,
        "percentage_of_system": 40.5,
        "session_count": 4,
        "efficiency": {
          "mastery_start": 0.22,
          "mastery_end": 0.58,
          "mastery_gain": 0.36,
          "hours_studied": 1.42,
          "mastery_gain_per_hour": 0.254
        }
      }
    ]
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-student role |
| 400 | `VALIDATION_ERROR` | Invalid period value or system_id format |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/dashboard/analytics/time` (Student layout)

**Route:** `apps/web/src/app/(protected)/dashboard/analytics/time/page.tsx`

**Component hierarchy:**
```
TimeAnalyticsPage (page.tsx — default export)
  └── TimeOnTaskDashboard (client component)
        ├── TimePeriodSelector (tabs: 7d / 30d / 90d)
        ├── StudyStatsCards (4 stat cards in a row)
        │     ├── TotalStudyTimeCard (total_study_time_minutes → hours:minutes)
        │     ├── AvgSessionCard (average_session_duration_minutes)
        │     ├── SessionsPerWeekCard (sessions_per_week with goal indicator)
        │     └── TotalSessionsCard (total_sessions count)
        ├── SystemTimeChart (stacked bar chart — Recharts BarChart)
        │     └── SystemBar (one bar per USMLE system, colored by system)
        ├── ConceptDrillDown (shown when a system bar is clicked)
        │     ├── BackButton ("← All Systems")
        │     ├── ConceptTimeList (list of concepts with time bars)
        │     └── EfficiencyTable (mastery_gain_per_hour per concept)
        └── WeeklySessionChart (small bar chart: sessions per week with goal line)
```

**States:**
1. **Loading** — Skeleton: 4 stat card skeletons + chart skeleton placeholder
2. **Empty** — "No study sessions recorded yet. Start a practice session to see your time analytics." with CTA button to `/practice/launch`
3. **Data** — Full dashboard with charts, stats, interactive bars
4. **Drill-down** — System detail view with concept breakdown, back button
5. **Error** — Error message with retry button

**Design tokens:**
- Surface: White card on Cream `#f5f3ef` background
- Chart colors: One color per USMLE system (up to 16 systems)
  - Cardiovascular: `#2b71b9` (Blue Mid)
  - Respiratory: `#69a338` (Green)
  - Renal: `#e8a838` (Amber)
  - GI: `#9b59b6` (Purple)
  - Neuro: `#e74c3c` (Red)
  - Remaining: generated from design system palette
- Goal line: Green `#69a338` when met, Red `#e74c3c` when below
- Stat cards: Navy Deep `#002c76` for primary number, muted for label
- Typography: Source Sans 3 for labels, DM Mono for numbers/durations
- Spacing: 24px section gap, 16px card padding, 12px chart margins

**Interactions:**
- Click system bar → animate transition to drill-down view
- Click "Back" → return to overview with system chart
- Switch period tab → refetch data with loading skeleton
- Hover bar → tooltip with exact minutes and session count

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/time-analytics.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Create or Edit (add time-analytics export) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export if not present) |
| 4 | Supabase migration via MCP (indexes) | Database | Apply |
| 5 | `apps/server/src/errors/analytics.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add analytics errors) |
| 7 | `apps/server/src/services/student/time-analytics.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/student/time-analytics.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add analytics route) |
| 10 | `apps/web/src/app/(protected)/dashboard/analytics/time/page.tsx` | Page | Create |
| 11 | `apps/web/src/components/student/time-on-task-dashboard.tsx` | Component | Create |
| 12 | `apps/web/src/components/student/system-time-chart.tsx` | Component | Create |
| 13 | `apps/web/src/components/student/concept-drill-down.tsx` | Component | Create |
| 14 | `apps/web/src/components/student/study-stats-cards.tsx` | Component | Create |
| 15 | `apps/web/src/components/student/time-period-selector.tsx` | Atom | Create |
| 16 | `apps/web/src/components/student/weekly-session-chart.tsx` | Component | Create |
| 17 | `apps/web/src/lib/hooks/use-time-analytics.ts` | Hook | Create |
| 18 | `apps/server/src/services/student/__tests__/time-analytics.service.test.ts` | Tests | Create |
| 19 | `apps/server/src/controllers/student/__tests__/time-analytics.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-ST-5 | student | Not started | Session History — `practice_sessions` table with timestamps |

### NPM Packages (already installed or to add)
- `recharts@2.x` — Charting library (may need to install in apps/web)
- `@supabase/supabase-js` — Supabase client for aggregation queries
- `express` — Server framework
- `vitest` — Testing
- `lucide-react` — Icons for stat cards

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`

## 9. Test Fixtures

```typescript
// apps/server/src/services/student/__tests__/time-analytics.fixtures.ts

import { AuthRole } from "@journey-os/types";

export const STUDENT_USER = {
  sub: "student-uuid-001",
  email: "student@msm.edu",
  role: AuthRole.STUDENT,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

export const FACULTY_USER = {
  ...STUDENT_USER,
  sub: "faculty-uuid-001",
  email: "faculty@msm.edu",
  role: AuthRole.FACULTY,
};

export const MOCK_PRACTICE_SESSIONS = [
  {
    id: "session-001",
    student_id: "student-uuid-001",
    scope_concept_ids: ["concept-cardiac-output", "concept-starling-law"],
    status: "completed",
    started_at: "2026-02-10T09:00:00Z",
    completed_at: "2026-02-10T09:35:00Z",  // 35 minutes
  },
  {
    id: "session-002",
    student_id: "student-uuid-001",
    scope_concept_ids: ["concept-blood-pressure", "concept-renal-perfusion"],
    status: "completed",
    started_at: "2026-02-12T14:00:00Z",
    completed_at: "2026-02-12T14:22:00Z",  // 22 minutes
  },
  {
    id: "session-003",
    student_id: "student-uuid-001",
    scope_concept_ids: ["concept-cardiac-output"],
    status: "completed",
    started_at: "2026-02-15T10:00:00Z",
    completed_at: "2026-02-15T10:45:00Z",  // 45 minutes
  },
  {
    id: "session-004",
    student_id: "student-uuid-001",
    scope_concept_ids: ["concept-acid-base"],
    status: "active",
    started_at: "2026-02-19T08:00:00Z",
    completed_at: null,  // Still active
  },
];

export const MOCK_MASTERY_START = [
  { concept_id: "concept-cardiac-output", p_mastery: 0.22, updated_at: "2026-02-01T00:00:00Z" },
  { concept_id: "concept-starling-law", p_mastery: 0.15, updated_at: "2026-02-01T00:00:00Z" },
  { concept_id: "concept-blood-pressure", p_mastery: 0.40, updated_at: "2026-02-01T00:00:00Z" },
];

export const MOCK_MASTERY_END = [
  { concept_id: "concept-cardiac-output", p_mastery: 0.58, updated_at: "2026-02-19T00:00:00Z" },
  { concept_id: "concept-starling-law", p_mastery: 0.42, updated_at: "2026-02-19T00:00:00Z" },
  { concept_id: "concept-blood-pressure", p_mastery: 0.65, updated_at: "2026-02-19T00:00:00Z" },
];

export const EMPTY_SESSIONS: typeof MOCK_PRACTICE_SESSIONS = [];

export const USMLE_SYSTEMS_MAP: Record<string, { system_id: string; system_name: string; system_code: string }> = {
  "concept-cardiac-output": {
    system_id: "usmle-sys-cardiovascular",
    system_name: "Cardiovascular",
    system_code: "CVS",
  },
  "concept-starling-law": {
    system_id: "usmle-sys-cardiovascular",
    system_name: "Cardiovascular",
    system_code: "CVS",
  },
  "concept-blood-pressure": {
    system_id: "usmle-sys-cardiovascular",
    system_name: "Cardiovascular",
    system_code: "CVS",
  },
  "concept-renal-perfusion": {
    system_id: "usmle-sys-renal",
    system_name: "Renal/Urinary",
    system_code: "REN",
  },
  "concept-acid-base": {
    system_id: "usmle-sys-renal",
    system_name: "Renal/Urinary",
    system_code: "REN",
  },
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/controllers/student/__tests__/time-analytics.controller.test.ts`

```
describe("TimeAnalyticsController")
  describe("handleGetTimeAnalytics")
    ✓ returns 200 with time breakdown by USMLE system (30d default)
    ✓ returns correct summary stats (total time, avg duration, sessions/week)
    ✓ returns weekly_sessions array with correct week buckets
    ✓ returns sessions_per_week goal indicator (goal_met true when >= 3)
    ✓ filters sessions by 7d period correctly
    ✓ filters sessions by 90d period correctly
    ✓ returns drill-down by concept when system_id provided
    ✓ returns efficiency metrics (mastery_gain_per_hour) per system
    ✓ returns empty systems array when no sessions exist
    ✓ returns zero efficiency when hours_studied is zero
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-student roles (403 FORBIDDEN)
    ✓ rejects invalid period value (400 VALIDATION_ERROR)
    ✓ handles active sessions (uses now() for duration calc)

describe("TimeAnalyticsService")
  describe("getTimeBySystem")
    ✓ aggregates session time correctly across multiple sessions
    ✓ maps concept_ids to USMLE systems correctly
    ✓ calculates percentage_of_total for each system
    ✓ sorts systems by total_minutes descending
```

**Total: ~18 tests** (14 controller + 4 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. Time-on-task analytics is not part of the 5 critical user journeys. The full student dashboard journey E2E will cover this later.

## 12. Acceptance Criteria

1. Student can access `/dashboard/analytics/time` and see time breakdown by USMLE system
2. Stacked bar chart (Recharts) displays time per system with distinct colors
3. Time period selector supports 7d, 30d, 90d with data refetching
4. Total study time displayed prominently in hours:minutes format
5. Average session duration statistic shown
6. Sessions per week shown with target indicator (goal >= 3/week, green when met)
7. Clicking a system bar drills down to per-concept time breakdown
8. Efficiency metric (mastery gain per hour studied) displayed per system
9. API correctly aggregates time from `practice_sessions` table
10. Loading skeleton shown during data fetch
11. Empty state shown when no sessions exist with CTA to start practicing
12. Non-student roles receive 403 Forbidden
13. All 18 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Time-on-task analytics | F-20 SS Student Progress Dashboard |
| Stacked bar chart / treemap | S-ST-43-2 SS Acceptance Criteria |
| Time period selector (7d, 30d, 90d) | S-ST-43-2 SS Acceptance Criteria |
| Sessions per week goal >= 3 | S-ST-43-2 SS Acceptance Criteria |
| Efficiency metric (mastery gain/hour) | S-ST-43-2 SS Acceptance Criteria |
| practice_sessions table | SUPABASE_DDL_v1 SS Practice module |
| USMLE system taxonomy | NODE_REGISTRY_v1 SS Layer 2 |
| Design system colors/tokens | DESIGN_SPEC SS Group D: StudentPractice |
| Recharts 2.x for charts | ARCHITECTURE_v10 SS 8.2: Frontend libraries |
| Student role auth | ARCHITECTURE_v10 SS 4.1: role hierarchy |

## 14. Environment Prerequisites

- **Supabase:** `practice_sessions`, `mastery_estimates` tables exist (from ST-3/ST-5)
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **Recharts:** Install `recharts@2.x` in `apps/web` if not present (`pnpm add recharts --filter @journey-os/web`)
- **No Neo4j needed** for runtime queries (USMLE system mapping can use static seed data)
- **No Python API needed** — this is Express + React only

## 15. Figma / Make Prototype

**Layout sketch:**
```
┌──────────────────────────────────────────────────┐
│  Time on Task Analytics     [ 7d | 30d | 90d ]  │
├──────────┬──────────┬───────────┬────────────────┤
│ Total    │ Avg      │ Sessions/ │ Total          │
│ 14h 02m  │ 28 min   │ Week 3.5  │ Sessions 30    │
│          │          │ ✓ Goal 3  │                │
├──────────┴──────────┴───────────┴────────────────┤
│                                                  │
│  ████████████████████  Cardiovascular (3.5h)     │
│  ███████████           Renal (1.8h)              │
│  ████████              Respiratory (1.5h)        │
│  ██████                Neuro (1.2h)              │
│  ████                  GI (0.8h)                 │
│  (click to drill down)                           │
│                                                  │
├──────────────────────────────────────────────────┤
│  Sessions Per Week                               │
│  ▓▓▓  ▓▓▓▓ ▓▓▓  ▓▓▓▓▓ --- goal line (3)        │
│  W1   W2   W3   W4                              │
└──────────────────────────────────────────────────┘
```
