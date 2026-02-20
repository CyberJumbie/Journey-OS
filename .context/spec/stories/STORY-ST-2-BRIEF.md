# STORY-ST-2 Brief: Student Dashboard Page

## 0. Lane & Priority

```yaml
story_id: STORY-ST-2
old_id: S-ST-42-1
lane: student
lane_priority: 4
within_lane_order: 2
sprint: 27
size: L
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
  - STORY-U-8 (universal) — Registration Wizard ✅ DONE
blocks:
  - STORY-ST-5 — Study Plan Generator
  - STORY-ST-6 — Progress Timeline
  - STORY-ST-7 — Weak Areas Drill-Down
  - STORY-ST-8 — Performance Analytics
  - STORY-ST-9 — Goal Setting
personas_served: [student]
epic: E-42 (Student Dashboard)
feature: F-20 (Student Dashboard & Progress)
user_flow: UF-32 (Adaptive Practice Session — login → dashboard → heatmap → weak areas → progress)
```

## 1. Summary

Build the **student dashboard page** at `/dashboard/student` that gives medical students an at-a-glance view of their Step 1 preparation progress. The dashboard displays three primary widgets: an aggregate mastery overview card, a Step 1 readiness score (0-100) with pass probability, and a USMLE coverage heatmap (organ systems x disciplines grid). All data comes from a mock mastery service that returns realistic but static data — this will be swapped for live BKT data in Sprint 31 when STORY-ST-3 lands.

Key constraints:
- **Student role only** — RBAC enforced on the API endpoint
- **Mock data first** — Static mastery data via service layer (no real BKT yet)
- **Responsive** — 2-column desktop, single-column mobile
- **Performance** — Initial render < 2s with mock data
- **Heatmap** — 12 organ systems x 7 disciplines grid, color-coded by mastery percentage

## 2. Task Breakdown

1. **Types** — Create `StudentDashboardData`, `MasteryOverview`, `ReadinessScore`, `HeatmapCell`, `HeatmapData` types in `packages/types/src/student/dashboard.types.ts`
2. **Type index** — Create `packages/types/src/student/index.ts` and add to root index
3. **Mock data** — Create `apps/server/src/services/student/data/mock-mastery.data.ts` with realistic static mastery data
4. **Service** — `StudentDashboardService` with `getDashboard(studentId)` method returning mock data
5. **Controller** — `StudentDashboardController` with `handleGetDashboard(req, res)` method
6. **Routes** — Protected route `GET /api/v1/students/me/dashboard` with RBAC `require(AuthRole.STUDENT)`
7. **Wire up** — Register route in `apps/server/src/index.ts` after auth middleware
8. **Dashboard page** — Replace placeholder `apps/web/src/app/(dashboard)/student/page.tsx` with full dashboard
9. **MasteryOverviewCard** — Atom/molecule showing aggregate mastery percentage with circular progress
10. **ReadinessScoreCard** — Atom/molecule showing 0-100 score with pass probability
11. **CoverageHeatmap** — Organism component rendering organ systems x disciplines grid
12. **EmptyState** — Component for new students with no practice data
13. **Loading skeletons** — Skeleton variants for each card and heatmap
14. **API tests** — 12 tests covering dashboard endpoint, auth, mock data shape
15. **Frontend data fetching** — Client-side fetch with loading/error/empty states

## 3. Data Model

```typescript
// packages/types/src/student/dashboard.types.ts

/** Aggregate mastery across all concepts */
export interface MasteryOverview {
  readonly total_concepts: number;
  readonly mastered_concepts: number;    // P(L) >= 0.95
  readonly in_progress_concepts: number; // 0.50 <= P(L) < 0.95
  readonly not_started_concepts: number; // P(L) < 0.50 or no data
  readonly aggregate_mastery: number;    // 0-100 percentage
  readonly total_attempts: number;
  readonly study_hours: number;          // Estimated from attempt count + avg latency
}

/** Step 1 readiness score */
export interface ReadinessScore {
  readonly score: number;               // 0-100
  readonly pass_probability: number;    // 0.0-1.0
  readonly confidence_interval: {
    readonly lower: number;             // 0-100
    readonly upper: number;             // 0-100
  };
  readonly trend: "improving" | "stable" | "declining";
  readonly last_updated: string;        // ISO 8601
}

/** Single cell in the coverage heatmap */
export interface HeatmapCell {
  readonly system_code: string;         // e.g., "usmle-sys-04"
  readonly system_name: string;         // e.g., "Cardiovascular"
  readonly discipline_code: string;     // e.g., "usmle-disc-03"
  readonly discipline_name: string;     // e.g., "Pathology"
  readonly mastery_pct: number;         // 0-100
  readonly attempt_count: number;
  readonly concept_count: number;
}

/** Full heatmap data structure */
export interface HeatmapData {
  readonly systems: readonly {
    readonly code: string;
    readonly name: string;
  }[];
  readonly disciplines: readonly {
    readonly code: string;
    readonly name: string;
  }[];
  readonly cells: readonly HeatmapCell[];
}

/** Complete student dashboard response */
export interface StudentDashboardData {
  readonly student_id: string;
  readonly mastery: MasteryOverview;
  readonly readiness: ReadinessScore;
  readonly heatmap: HeatmapData;
}
```

## 4. Database Schema

No new tables needed for mock data. The following tables will be used when BKT is implemented (Sprint 31):

```sql
-- Already defined in schema (future use)
-- mastery_estimates (student_id, subconcept_id, p_mastered, updated_at)
-- student_attempts (student_id, item_id, response, correct, latency_ms)
-- practice_sessions (id, student_id, config, started_at, completed_at, score)
```

**Neo4j query pattern (future — when live data is available):**
```cypher
MATCH (s:Student {supabase_auth_id: $studentId})-[:HAS_MASTERY]->(cm:ConceptMastery)-[:FOR_CONCEPT]->(sc:SubConcept)-[:MAPS_TO]->(us:USMLE_System)
RETURN us.code AS system_code, us.name AS system_name,
       sc.code AS concept_code, cm.p_mastered AS mastery,
       cm.evidence_count AS attempts
```

For STORY-ST-2, the mock service returns static data and does NOT query any database.

## 5. API Contract

### GET /api/v1/students/me/dashboard (Auth: Student+)

Uses `req.user.sub` to identify the student. Higher roles (faculty, admin) can also access for their own data.

**Success Response (200):**
```json
{
  "data": {
    "student_id": "student-uuid-1",
    "mastery": {
      "total_concepts": 227,
      "mastered_concepts": 45,
      "in_progress_concepts": 89,
      "not_started_concepts": 93,
      "aggregate_mastery": 38,
      "total_attempts": 1247,
      "study_hours": 62.4
    },
    "readiness": {
      "score": 54,
      "pass_probability": 0.42,
      "confidence_interval": { "lower": 48, "upper": 60 },
      "trend": "improving",
      "last_updated": "2026-02-19T10:00:00Z"
    },
    "heatmap": {
      "systems": [
        { "code": "usmle-sys-04", "name": "Cardiovascular" },
        { "code": "usmle-sys-07", "name": "Respiratory" }
      ],
      "disciplines": [
        { "code": "usmle-disc-01", "name": "Anatomy" },
        { "code": "usmle-disc-03", "name": "Pathology" }
      ],
      "cells": [
        {
          "system_code": "usmle-sys-04",
          "system_name": "Cardiovascular",
          "discipline_code": "usmle-disc-03",
          "discipline_name": "Pathology",
          "mastery_pct": 72,
          "attempt_count": 34,
          "concept_count": 8
        }
      ]
    }
  },
  "error": null
}
```

**Empty State Response (200 — new student):**
```json
{
  "data": {
    "student_id": "student-uuid-1",
    "mastery": {
      "total_concepts": 227,
      "mastered_concepts": 0,
      "in_progress_concepts": 0,
      "not_started_concepts": 227,
      "aggregate_mastery": 0,
      "total_attempts": 0,
      "study_hours": 0
    },
    "readiness": {
      "score": 0,
      "pass_probability": 0.0,
      "confidence_interval": { "lower": 0, "upper": 0 },
      "trend": "stable",
      "last_updated": "2026-02-19T10:00:00Z"
    },
    "heatmap": {
      "systems": [],
      "disciplines": [],
      "cells": []
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-authenticated role (should not happen after auth middleware) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/dashboard/student` (Dashboard layout)

**Route:** `apps/web/src/app/(dashboard)/student/page.tsx` (replace existing placeholder)

**Component hierarchy:**
```
StudentDashboardPage (page.tsx — default export)
  └── StudentDashboard (client component — organism)
        ├── DashboardHeader
        │     ├── Heading ("Step 1 Preparation")
        │     └── RefreshButton (icon button, re-fetches data)
        ├── SummaryRow (2-column grid on desktop, stack on mobile)
        │     ├── MasteryOverviewCard (molecule)
        │     │     ├── CircularProgress (atom — aggregate mastery %)
        │     │     ├── StatGroup (mastered / in-progress / not-started counts)
        │     │     └── StudyHoursLabel (atom — DM Mono font)
        │     └── ReadinessScoreCard (molecule)
        │           ├── ScoreDisplay (atom — large number 0-100)
        │           ├── PassProbabilityBar (atom — horizontal bar)
        │           ├── TrendIndicator (atom — arrow up/down/flat + label)
        │           └── ConfidenceRange (atom — "48-60" range text)
        ├── CoverageHeatmap (organism)
        │     ├── HeatmapLegend (atom — color scale green/yellow/red)
        │     ├── HeatmapGrid (molecule — CSS grid or table)
        │     │     ├── SystemLabel (y-axis — organ system names)
        │     │     ├── DisciplineLabel (x-axis — discipline names)
        │     │     └── HeatmapCell (atom — colored square with tooltip)
        │     └── HeatmapTooltip (atom — mastery%, attempts, concepts on hover)
        └── EmptyState (conditional — shown when total_attempts === 0)
              ├── IllustrationPlaceholder
              └── CTAButton ("Start Your First Practice Session")
```

**States:**
1. **Loading** — Skeleton cards + skeleton grid (pulsing animation)
2. **Empty** — EmptyState component when `total_attempts === 0`
3. **Data** — Full dashboard with mastery, readiness, and heatmap
4. **Error** — Error message with retry button
5. **Refreshing** — Subtle loading indicator on RefreshButton while re-fetching

**Design tokens:**
- Background: Cream `#f5f3ef` (dashboard shell)
- Cards: White `#ffffff` with `border-radius: 12px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.08)`
- Heatmap cells:
  - Green (>80%): `#69a338` (design system Green)
  - Yellow (50-80%): `#d4a843` (warm amber)
  - Red (<50%): `#c75050` (muted red)
  - Not started (0%): `#e8e5df` (light gray)
- Score display: Navy Deep `#002c76` (large number)
- Pass probability: Blue Mid `#2b71b9` (progress bar fill)
- Typography:
  - Card headings: Lora, 18px, `#002c76`
  - Stat numbers: Source Sans 3, 32px bold
  - Labels: DM Mono, 12px, uppercase
  - Heatmap axis labels: Source Sans 3, 13px
- Spacing: 24px between cards, 16px internal card padding, 4px heatmap cell gap
- Breakpoints: 2-column at `>=1024px`, single-column below

**Heatmap grid dimensions:**
- Rows (12 organ systems): General Principles, Blood & Lymphoreticular, Behavioral Health, Cardiovascular, Dermatologic, GI, Endocrine & Metabolism, Female Reproductive & Breast, Male Reproductive, Multisystem, Musculoskeletal, Neurology & Psychiatry (actual list from USMLE seed data, 16 systems)
- Columns (7 disciplines): Anatomy, Biochemistry & Nutrition, Microbiology, Pathology, Pharmacology, Physiology, Behavioral Science (from USMLE seed data)
- Cell size: `40px x 40px` minimum, scales with container

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/student/dashboard.types.ts` | Types | Create |
| 2 | `packages/types/src/student/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add student export) |
| 4 | `apps/server/src/services/student/data/mock-mastery.data.ts` | Mock Data | Create |
| 5 | `apps/server/src/services/student/student-dashboard.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/student/student-dashboard.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add student dashboard route) |
| 8 | `apps/web/src/app/(dashboard)/student/page.tsx` | Page | Edit (replace placeholder) |
| 9 | `apps/web/src/components/student/student-dashboard.tsx` | Component | Create |
| 10 | `apps/web/src/components/student/mastery-overview-card.tsx` | Component | Create |
| 11 | `apps/web/src/components/student/readiness-score-card.tsx` | Component | Create |
| 12 | `apps/web/src/components/student/coverage-heatmap.tsx` | Component | Create |
| 13 | `apps/web/src/components/student/heatmap-cell.tsx` | Component | Create |
| 14 | `apps/web/src/components/student/dashboard-empty-state.tsx` | Component | Create |
| 15 | `apps/web/src/components/student/dashboard-skeleton.tsx` | Component | Create |
| 16 | `apps/server/src/services/student/__tests__/student-dashboard.service.test.ts` | Tests | Create |
| 17 | `apps/server/src/controllers/student/__tests__/student-dashboard.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for role-based route guard |
| STORY-U-8 | universal | **DONE** | Registration wizard (students exist in profiles table) |
| STORY-U-10 | universal | **DONE** | Dashboard routing and layout shell |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### NPM Packages (new — web only)
- `recharts@^2.x` — Chart library for heatmap visualization (or use CSS grid)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `createRbacMiddleware()`, `rbac.require(AuthRole.STUDENT)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `AuthTokenPayload`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`
- `apps/web/src/app/(dashboard)/student/page.tsx` — Existing placeholder to replace
- `apps/server/src/services/seed/data/usmle-systems.data.ts` — System names for mock data
- `apps/server/src/services/seed/data/usmle-disciplines.data.ts` — Discipline names for mock data

## 9. Test Fixtures (inline)

```typescript
// Mock student user
export const STUDENT_USER = {
  sub: "student-uuid-1",
  email: "marcus@msm.edu",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock faculty user (should be denied for student-only endpoints)
export const FACULTY_USER = {
  ...STUDENT_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  is_course_director: true,
};

// Mock dashboard data — student with practice history
export const MOCK_DASHBOARD_WITH_DATA = {
  student_id: "student-uuid-1",
  mastery: {
    total_concepts: 227,
    mastered_concepts: 45,
    in_progress_concepts: 89,
    not_started_concepts: 93,
    aggregate_mastery: 38,
    total_attempts: 1247,
    study_hours: 62.4,
  },
  readiness: {
    score: 54,
    pass_probability: 0.42,
    confidence_interval: { lower: 48, upper: 60 },
    trend: "improving" as const,
    last_updated: "2026-02-19T10:00:00Z",
  },
  heatmap: {
    systems: [
      { code: "usmle-sys-04", name: "Cardiovascular" },
      { code: "usmle-sys-07", name: "Respiratory" },
      { code: "usmle-sys-09", name: "Renal & Urinary" },
    ],
    disciplines: [
      { code: "usmle-disc-01", name: "Anatomy" },
      { code: "usmle-disc-03", name: "Pathology" },
      { code: "usmle-disc-05", name: "Pharmacology" },
    ],
    cells: [
      {
        system_code: "usmle-sys-04",
        system_name: "Cardiovascular",
        discipline_code: "usmle-disc-03",
        discipline_name: "Pathology",
        mastery_pct: 72,
        attempt_count: 34,
        concept_count: 8,
      },
      {
        system_code: "usmle-sys-04",
        system_name: "Cardiovascular",
        discipline_code: "usmle-disc-01",
        discipline_name: "Anatomy",
        mastery_pct: 85,
        attempt_count: 28,
        concept_count: 6,
      },
      {
        system_code: "usmle-sys-07",
        system_name: "Respiratory",
        discipline_code: "usmle-disc-03",
        discipline_name: "Pathology",
        mastery_pct: 41,
        attempt_count: 12,
        concept_count: 7,
      },
    ],
  },
};

// Mock dashboard data — new student (empty state)
export const MOCK_DASHBOARD_EMPTY = {
  student_id: "student-uuid-2",
  mastery: {
    total_concepts: 227,
    mastered_concepts: 0,
    in_progress_concepts: 0,
    not_started_concepts: 227,
    aggregate_mastery: 0,
    total_attempts: 0,
    study_hours: 0,
  },
  readiness: {
    score: 0,
    pass_probability: 0.0,
    confidence_interval: { lower: 0, upper: 0 },
    trend: "stable" as const,
    last_updated: "2026-02-19T10:00:00Z",
  },
  heatmap: {
    systems: [],
    disciplines: [],
    cells: [],
  },
};
```

## 10. API Test Spec (vitest)

**File:** `apps/server/src/controllers/student/__tests__/student-dashboard.controller.test.ts`

```
describe("StudentDashboardController")
  describe("handleGetDashboard")
    ✓ returns dashboard data for authenticated student (200)
    ✓ returns correct mastery overview shape
    ✓ returns readiness score with pass probability
    ✓ returns heatmap with systems, disciplines, and cells
    ✓ rejects unauthenticated request (401)
    ✓ returns empty state for student with no practice data
    ✓ uses req.user.sub as student ID
    ✓ returns correct ApiResponse envelope format
```

**File:** `apps/server/src/services/student/__tests__/student-dashboard.service.test.ts`

```
describe("StudentDashboardService")
  describe("getDashboard")
    ✓ returns StudentDashboardData shape
    ✓ returns mock data with realistic mastery values (0-100)
    ✓ heatmap cells have valid system and discipline codes
    ✓ aggregate_mastery matches calculated average
```

**Total: ~12 tests**

## 11. E2E Test Spec (Playwright)

This is part of the student critical journey (UF-32: login -> dashboard -> heatmap -> weak areas). Include a basic smoke test:

**File:** `apps/web/e2e/student-dashboard.spec.ts`

```
describe("Student Dashboard")
  test("student can view dashboard after login")
    - Navigate to /login
    - Login as marcus@msm.edu (student demo account)
    - Expect redirect to /dashboard/student
    - Expect "Step 1 Preparation" heading visible
    - Expect mastery overview card visible
    - Expect readiness score card visible
    - Expect coverage heatmap visible
    - Expect no console errors
```

## 12. Acceptance Criteria

1. Dashboard page loads at `(dashboard)/student` route with role-based guard
2. Mastery overview card shows aggregate mastery percentage, mastered/in-progress/not-started counts
3. Step 1 readiness score displays 0-100 with pass probability estimate
4. USMLE coverage heatmap renders organ systems x disciplines grid
5. Heatmap cells color-coded: green (>80%), yellow (50-80%), red (<50%), gray (0%)
6. Dashboard loads mock mastery data from `StudentDashboardService`
7. Responsive layout: 2-column on desktop (>=1024px), single-column on mobile
8. Loading skeletons displayed while data fetches
9. Empty state shown for new students with no practice data
10. Refresh button reloads dashboard data
11. Initial render < 2s with mock data
12. All 12 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Student dashboard with mastery overview | DESIGN_SPEC SS Group D, Template A (Dashboard) |
| Marcus Williams M2 persona | PRODUCT_BRIEF SS Marcus Williams |
| USMLE system coverage heatmap | ARCHITECTURE_v10 SS 13.1: Student screens |
| Step 1 readiness score | ARCHITECTURE_v10 SS 13.2: Readiness estimation |
| 12 organ systems | USMLE_SYSTEMS seed data (16 systems — usmle-sys-01 through usmle-sys-16) |
| 7 scientific disciplines | USMLE_DISCIPLINES seed data (7 — usmle-disc-01 through usmle-disc-07) |
| Mock mastery swapped for BKT in Sprint 31 | ROADMAP_v2_3 SS Sprint 31: E-40 BKT & IRT Engine |
| UF-32 flow: login -> dashboard -> heatmap -> weak areas | UF-32 SS Adaptive Practice Session |
| Dashboard route guard | apps/web/src/app/(dashboard)/student/page.tsx (existing placeholder) |
| API endpoint pattern | apps/server/src/index.ts (existing route pattern) |

## 14. Environment Prerequisites

- **Express server** running on port 3001 with auth + RBAC middleware active
- **Next.js** web app running on port 3000
- **Supabase** running with `profiles` table populated (student users exist)
- **No Neo4j needed** for this story (mock data only)
- **USMLE seed data** loaded (STORY-U-7) for system/discipline names reference

## 15. Figma Make Prototype

Optional. Dashboard layout suggestion:

```
┌─────────────────────────────────────────────────────┐
│  Step 1 Preparation                    [↻ Refresh]  │
├──────────────────────┬──────────────────────────────┤
│  Mastery Overview    │  Step 1 Readiness            │
│  ┌──────┐            │  ┌─────────────┐             │
│  │  38% │  aggregate │  │     54      │ / 100       │
│  └──────┘            │  └─────────────┘             │
│  45 mastered         │  Pass prob: 42%              │
│  89 in progress      │  Trend: ↑ Improving          │
│  93 not started      │  Range: 48-60                │
│  1,247 attempts      │  Updated: Feb 19             │
├──────────────────────┴──────────────────────────────┤
│  USMLE Coverage Heatmap                             │
│        Ana  Bio  Mic  Pat  Pha  Phy  Beh            │
│  Card   ██   ██   ██   ██   ██   ██   ██           │
│  Resp   ██   ██   ██   ██   ██   ██   ██           │
│  Ren    ██   ██   ██   ██   ██   ██   ██           │
│  GI     ██   ██   ██   ██   ██   ██   ██           │
│  ...                                                │
│  Legend: ■ >80%  ■ 50-80%  ■ <50%  □ Not started   │
└─────────────────────────────────────────────────────┘
```
