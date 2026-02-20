# STORY-F-21 Brief: Role-Based Dashboard Variants

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-21
old_id: S-F-32-4
epic: E-32 (Faculty Dashboard)
feature: F-15 (Faculty Dashboard)
sprint: 8
lane: faculty
lane_priority: 3
within_lane_order: 21
size: M
depends_on:
  - STORY-F-6 (faculty) — Activity Feed Component
  - STORY-F-7 (faculty) — KPI Strip Component
  - STORY-F-12 (faculty) — Course Cards Component
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks: []
cross_epic:
  - STORY-U-6 (universal) — auth/RBAC for role detection
personas_served: [faculty, faculty_course_director, institutional_admin]
```

---

## Section 1: Summary

Build the **role-based dashboard variants** that compose the KPI Strip (F-7), Activity Feed (F-6), and Course Cards (F-12) into a unified faculty dashboard page. The dashboard renders different content based on the authenticated user's highest role:

- **Faculty:** Personal KPIs, own activity feed, assigned courses
- **Course Director:** Program-level KPIs, program activity, all program courses, plus a Faculty Performance table
- **Institutional Admin:** Institution-level KPIs, institution activity, all courses, plus a Coverage Summary widget

Role detection happens via a `useDashboardVariant` hook that reads from the `useAuth` context -- no prop drilling. All KPI and activity API calls include a `scope` parameter (`personal`, `program`, `institution`) based on the variant. The route is `/dashboard` for all roles; content varies by auth context.

Key constraints:
- No new backend endpoints -- this story composes existing components and passes `scope` to existing APIs
- `useDashboardVariant` hook returns `{ variant, scope }` based on user's highest role
- Faculty Performance table (Course Director only): rows = faculty members, cols = questions generated, approval rate, active courses
- Coverage Summary widget (Institutional Admin only): mini heatmap thumbnail with link to `/coverage`
- Atomic Design: Template page composes Organisms (KPI Strip, Activity Feed, Course Cards Grid) with conditional Molecules (Faculty Performance, Coverage Summary)
- All data fetching uses existing API endpoints with `scope` query parameter

---

## Section 2: Task Breakdown

Implementation order: Types -> Hook -> Conditional Molecules -> Template -> Page -> Tests.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define dashboard variant types | `packages/types/src/dashboard/dashboard.types.ts` | 20m |
| 2 | Create barrel export | `packages/types/src/dashboard/index.ts` | 5m |
| 3 | Update root barrel export | `packages/types/src/index.ts` | 5m |
| 4 | Implement `useDashboardVariant` hook | `apps/web/src/hooks/use-dashboard-variant.ts` | 30m |
| 5 | Build `FacultyPerformanceTable` molecule | `packages/ui/src/molecules/faculty-performance-table.tsx` | 60m |
| 6 | Build `CoverageSummaryWidget` molecule | `packages/ui/src/molecules/coverage-summary-widget.tsx` | 45m |
| 7 | Build `FacultyDashboardPage` template | `apps/web/src/components/dashboard/faculty-dashboard-page.tsx` | 60m |
| 8 | Create dashboard page (route entry) | `apps/web/src/app/(dashboard)/faculty/dashboard/page.tsx` | 15m |
| 9 | Write dashboard variant tests | `apps/web/src/__tests__/dashboard/dashboard-variant.test.ts` | 45m |
| 10 | Write template rendering tests | `apps/web/src/__tests__/dashboard/faculty-dashboard-page.test.tsx` | 60m |

**Total estimate:** ~6 hours (Size M)

---

## Section 3: Data Model (inline, complete)

### `packages/types/src/dashboard/dashboard.types.ts`

```typescript
/**
 * Dashboard role variants.
 * Determines which sections and scope are shown.
 */
export type DashboardVariant = "faculty" | "course_director" | "institutional_admin";

/**
 * Data scope for API calls.
 * Controls the breadth of data returned by KPI, activity, and course endpoints.
 */
export type DashboardScope = "personal" | "program" | "institution";

/**
 * Mapping from variant to scope.
 */
export const VARIANT_SCOPE_MAP: Readonly<Record<DashboardVariant, DashboardScope>> = {
  faculty: "personal",
  course_director: "program",
  institutional_admin: "institution",
};

/**
 * Return type of useDashboardVariant hook.
 */
export interface DashboardVariantInfo {
  /** The determined dashboard variant */
  readonly variant: DashboardVariant;
  /** The scope to pass to API calls */
  readonly scope: DashboardScope;
  /** Whether the user sees the Faculty Performance table */
  readonly showFacultyPerformance: boolean;
  /** Whether the user sees the Coverage Summary widget */
  readonly showCoverageSummary: boolean;
}

/**
 * Faculty performance row (Course Director variant).
 * One row per faculty member in the program.
 */
export interface FacultyPerformanceRow {
  readonly user_id: string;
  readonly display_name: string;
  readonly email: string;
  readonly questions_generated: number;
  readonly approval_rate: number;
  readonly active_courses: number;
}

/**
 * Faculty performance table data.
 */
export interface FacultyPerformanceData {
  readonly rows: readonly FacultyPerformanceRow[];
  readonly total: number;
}

/**
 * Coverage summary data (Institutional Admin variant).
 * Minimal data for the thumbnail heatmap.
 */
export interface CoverageSummaryData {
  /** Overall coverage percentage (0-100) */
  readonly overall_coverage_percent: number;
  /** Number of topics with full coverage */
  readonly topics_covered: number;
  /** Total number of topics */
  readonly topics_total: number;
  /** Heatmap cells: array of { label, value (0-1) } for the mini heatmap */
  readonly heatmap_cells: readonly HeatmapCell[];
}

/**
 * A single cell in the coverage mini-heatmap.
 */
export interface HeatmapCell {
  readonly label: string;
  readonly value: number;
}

/**
 * Role hierarchy for dashboard variant determination.
 * Higher number = more authority.
 */
export const DASHBOARD_ROLE_HIERARCHY: Readonly<Record<string, number>> = {
  faculty: 1,
  course_director: 2,
  institutional_admin: 3,
  superadmin: 4,
};
```

### `packages/types/src/dashboard/index.ts`

```typescript
export type {
  DashboardVariant,
  DashboardScope,
  DashboardVariantInfo,
  FacultyPerformanceRow,
  FacultyPerformanceData,
  CoverageSummaryData,
  HeatmapCell,
} from "./dashboard.types";

export {
  VARIANT_SCOPE_MAP,
  DASHBOARD_ROLE_HIERARCHY,
} from "./dashboard.types";
```

---

## Section 4: Database Schema

**No new tables.** This story reads existing data via scoped API calls. The `scope` parameter is added to existing KPI, activity, and course list endpoints (already supported or trivially added).

For the Faculty Performance table data (Course Director variant), the query joins `profiles` with aggregate counts from `generated_items` and `review_decisions` tables. If those tables do not yet exist, the service returns mock data with a TODO comment.

For the Coverage Summary widget (Institutional Admin variant), the data comes from an existing or mocked coverage analysis endpoint.

---

## Section 5: API Contract

This story does not create new backend endpoints. It consumes existing endpoints with the `scope` query parameter:

### Existing Endpoints Used

| Method | Endpoint | Scope Param | Used By |
|--------|----------|-------------|---------|
| GET | `/api/v1/dashboard/kpis` | `?scope=personal\|program\|institution` | KPI Strip (F-7) |
| GET | `/api/v1/dashboard/activity` | `?scope=personal\|program\|institution` | Activity Feed (F-6) |
| GET | `/api/v1/courses` | `?scope=personal\|program\|institution` | Course Cards (F-12) |
| GET | `/api/v1/dashboard/faculty-performance` | (Course Director only) | Faculty Performance Table |
| GET | `/api/v1/dashboard/coverage-summary` | (Institutional Admin only) | Coverage Summary Widget |

### New Endpoints (thin wrappers, may be added if not yet available)

#### GET /api/v1/dashboard/faculty-performance

**Auth:** course_director+ (AuthRole.COURSE_DIRECTOR or higher)
**Description:** Returns faculty performance data for the user's program.

**Response (200):**
```json
{
  "data": {
    "rows": [
      {
        "user_id": "user-uuid-001",
        "display_name": "Dr. Sarah Carter",
        "email": "dr.carter@msm.edu",
        "questions_generated": 245,
        "approval_rate": 0.87,
        "active_courses": 3
      },
      {
        "user_id": "user-uuid-002",
        "display_name": "Dr. James Wilson",
        "email": "dr.wilson@msm.edu",
        "questions_generated": 178,
        "approval_rate": 0.92,
        "active_courses": 2
      }
    ],
    "total": 2
  },
  "error": null
}
```

#### GET /api/v1/dashboard/coverage-summary

**Auth:** institutional_admin+ (AuthRole.INSTITUTIONAL_ADMIN or higher)
**Description:** Returns coverage summary for the user's institution.

**Response (200):**
```json
{
  "data": {
    "overall_coverage_percent": 73,
    "topics_covered": 164,
    "topics_total": 225,
    "heatmap_cells": [
      { "label": "Cardiovascular", "value": 0.92 },
      { "label": "Respiratory", "value": 0.85 },
      { "label": "Renal", "value": 0.45 },
      { "label": "GI", "value": 0.78 },
      { "label": "Neuro", "value": 0.62 },
      { "label": "MSK", "value": 0.55 }
    ]
  },
  "error": null
}
```

**Note:** If these endpoints do not exist yet from prior stories, the frontend components should handle loading/empty states gracefully and use the fixtures as fallback during development.

---

## Section 6: Frontend Spec

### Page: `/faculty/dashboard` (same route `/dashboard` for all roles)

**Route:** `apps/web/src/app/(dashboard)/faculty/dashboard/page.tsx`

**Component hierarchy (Atomic Design):**
```
FacultyDashboardPage (page.tsx -- default export)
  └── FacultyDashboardTemplate (Template)
        ├── KPIStrip (Organism -- from F-7)
        │     └── scope={variant.scope}
        │
        ├── MainContentGrid (2-column on desktop)
        │     ├── LeftColumn
        │     │     ├── CourseCardsGrid (Organism -- from F-12)
        │     │     │     └── scope={variant.scope}
        │     │     │
        │     │     └── [CONDITIONAL: Course Director only]
        │     │           FacultyPerformanceTable (Molecule)
        │     │                 ├── TableHeader: "Faculty Performance"
        │     │                 ├── TableRows (sortable columns)
        │     │                 │     ├── NameCell (display_name)
        │     │                 │     ├── QuestionsCell (questions_generated)
        │     │                 │     ├── ApprovalRateCell (percentage bar)
        │     │                 │     └── ActiveCoursesCell (count)
        │     │                 └── TableFooter (total count)
        │     │
        │     └── RightColumn
        │           ├── ActivityFeed (Organism -- from F-6)
        │           │     └── scope={variant.scope}
        │           │
        │           └── [CONDITIONAL: Institutional Admin only]
        │                 CoverageSummaryWidget (Molecule)
        │                       ├── WidgetHeader: "Coverage Summary"
        │                       ├── OverallPercentage (large number)
        │                       ├── TopicProgress (X of Y topics covered)
        │                       ├── MiniHeatmap (6-cell grid with color intensity)
        │                       └── ViewFullCoverageLink -> /coverage
        │
        └── WelcomeBanner (conditional: first visit)
```

### `useDashboardVariant` Hook

```typescript
// apps/web/src/hooks/use-dashboard-variant.ts
import { useAuth } from "@web/hooks/useAuth";
import type { DashboardVariantInfo, DashboardVariant, DashboardScope } from "@journey-os/types";
import { VARIANT_SCOPE_MAP, DASHBOARD_ROLE_HIERARCHY } from "@journey-os/types";

export function useDashboardVariant(): DashboardVariantInfo {
  const { user } = useAuth();

  // Determine variant from user's highest applicable role
  const variant = determineVariant(user?.role, user?.is_course_director);

  return {
    variant,
    scope: VARIANT_SCOPE_MAP[variant],
    showFacultyPerformance: variant === "course_director",
    showCoverageSummary: variant === "institutional_admin",
  };
}

function determineVariant(
  role: string | undefined,
  isCourseDirector: boolean | undefined,
): DashboardVariant {
  if (role === "institutional_admin" || role === "superadmin") {
    return "institutional_admin";
  }
  if (isCourseDirector) {
    return "course_director";
  }
  return "faculty";
}
```

### FacultyPerformanceTable (Course Director Only)

```typescript
interface FacultyPerformanceTableProps {
  readonly data: FacultyPerformanceData | null;
  readonly loading: boolean;
}
```

**Columns:**
| Column | Width | Sortable | Format |
|--------|-------|----------|--------|
| Faculty Name | 35% | Yes | display_name |
| Questions Generated | 20% | Yes | number |
| Approval Rate | 25% | Yes | percentage bar (green/yellow/red) |
| Active Courses | 20% | Yes | number |

**Approval rate color thresholds:**
- Green (`--color-green`): >= 85%
- Yellow (`--color-amber-500`): 70-84%
- Red (`--color-red-500`): < 70%

### CoverageSummaryWidget (Institutional Admin Only)

```typescript
interface CoverageSummaryWidgetProps {
  readonly data: CoverageSummaryData | null;
  readonly loading: boolean;
}
```

**Mini heatmap:** 6 cells in a 2x3 or 3x2 grid. Each cell shows a topic label and is colored by intensity:
- White (`--color-white`): value = 0
- Light green: value 0.01-0.49
- Medium green: value 0.50-0.79
- Dark green (`--color-green`): value 0.80-1.0

### FacultyDashboardTemplate

```typescript
interface FacultyDashboardTemplateProps {
  readonly variant: DashboardVariantInfo;
}
```

The template composes the organisms and conditional molecules. It does NOT import the hook directly -- the page component calls `useDashboardVariant` and passes the result as props. This keeps the template testable without mocking auth context.

### Design Tokens

- Page background: Cream (`--color-cream`)
- Card backgrounds: White (`--color-white`)
- KPI Strip: Navy Deep bookmark bar (from F-7)
- Section headings: Lora font, `--color-text-primary`
- Table header: `--color-cream-dark` background
- Table rows: White background, alternating `--color-cream` zebra stripe
- Link color: Navy Deep `--color-navy-deep`
- Grid gap: `--space-6` between columns, `--space-4` between rows
- Widget border: `--border-default` with `--radius-lg`

### Responsive

- Desktop (>= 1024px): 2-column layout (60/40 split)
- Tablet (768-1023px): 1-column stacked, KPI Strip horizontal
- Mobile (< 768px): 1-column stacked, KPI Strip wraps to 2x2 grid

---

## Section 7: Files to Create

```
# 1. Types (packages/types)
packages/types/src/dashboard/dashboard.types.ts
packages/types/src/dashboard/index.ts

# 2. Types barrel update
packages/types/src/index.ts                          -- UPDATE

# 3. Hook (apps/web)
apps/web/src/hooks/use-dashboard-variant.ts

# 4. Conditional molecules (packages/ui)
packages/ui/src/molecules/faculty-performance-table.tsx
packages/ui/src/molecules/coverage-summary-widget.tsx

# 5. Template (apps/web)
apps/web/src/components/dashboard/faculty-dashboard-page.tsx

# 6. Page (apps/web)
apps/web/src/app/(dashboard)/faculty/dashboard/page.tsx

# 7. Tests (apps/web)
apps/web/src/__tests__/dashboard/dashboard-variant.test.ts
apps/web/src/__tests__/dashboard/faculty-dashboard-page.test.tsx
```

**Total files:** 8 new + 1 modified

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-6 | faculty | Required | Activity Feed Organism (component + API endpoint) |
| STORY-F-7 | faculty | Required | KPI Strip Organism (component + API endpoint) |
| STORY-F-12 | faculty | Required | Course Cards Grid Organism (component + API endpoint) |
| STORY-U-6 | universal | **DONE** | RBAC Middleware for role detection |

### NPM Packages (already installed)
- `react` / `next` -- Framework
- `lucide-react` -- Icons (TrendingUp, TrendingDown, BarChart, ExternalLink)
- `vitest` / `@testing-library/react` -- Testing
- `recharts` -- Charts (for mini heatmap / progress bars)

### shadcn/ui Components Used
- `Table` -- Faculty performance table
- `Card` -- Coverage summary widget
- `Badge` -- Role indicator
- `Skeleton` -- Loading states
- `Progress` -- Approval rate bar

### Existing Files Needed
- `apps/web/src/hooks/useAuth.ts` -- Auth context hook (user object with role, is_course_director)
- `apps/web/src/components/kpi/KPIStrip.tsx` -- KPI Strip organism (from F-7)
- `apps/web/src/components/activity/ActivityFeed.tsx` -- Activity Feed organism (from F-6)
- `apps/web/src/components/courses/CourseCardsGrid.tsx` -- Course Cards organism (from F-12)
- `apps/web/src/app/(dashboard)/layout.tsx` -- Dashboard layout
- `packages/types/src/auth/auth.types.ts` -- `AuthUser`, `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

---

## Section 9: Test Fixtures (inline)

```typescript
import type {
  DashboardVariantInfo,
  FacultyPerformanceRow,
  FacultyPerformanceData,
  CoverageSummaryData,
} from "@journey-os/types";

/** Faculty variant info */
export const FACULTY_VARIANT: DashboardVariantInfo = {
  variant: "faculty",
  scope: "personal",
  showFacultyPerformance: false,
  showCoverageSummary: false,
};

/** Course Director variant info */
export const COURSE_DIRECTOR_VARIANT: DashboardVariantInfo = {
  variant: "course_director",
  scope: "program",
  showFacultyPerformance: true,
  showCoverageSummary: false,
};

/** Institutional Admin variant info */
export const INSTITUTIONAL_ADMIN_VARIANT: DashboardVariantInfo = {
  variant: "institutional_admin",
  scope: "institution",
  showFacultyPerformance: false,
  showCoverageSummary: true,
};

/** Mock faculty users */
export const MOCK_FACULTY_USER = {
  id: "user-uuid-001",
  email: "dr.faculty@msm.edu",
  role: "faculty" as const,
  is_course_director: false,
  institution_id: "inst-uuid-001",
  display_name: "Dr. Faculty Member",
};

export const MOCK_COURSE_DIRECTOR_USER = {
  id: "user-uuid-002",
  email: "dr.director@msm.edu",
  role: "faculty" as const,
  is_course_director: true,
  institution_id: "inst-uuid-001",
  display_name: "Dr. Course Director",
};

export const MOCK_ADMIN_USER = {
  id: "user-uuid-003",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  is_course_director: false,
  institution_id: "inst-uuid-001",
  display_name: "Admin User",
};

/** Faculty performance fixture */
export const FACULTY_PERFORMANCE_DATA: FacultyPerformanceData = {
  rows: [
    {
      user_id: "user-uuid-010",
      display_name: "Dr. Sarah Carter",
      email: "dr.carter@msm.edu",
      questions_generated: 245,
      approval_rate: 0.87,
      active_courses: 3,
    },
    {
      user_id: "user-uuid-011",
      display_name: "Dr. James Wilson",
      email: "dr.wilson@msm.edu",
      questions_generated: 178,
      approval_rate: 0.92,
      active_courses: 2,
    },
    {
      user_id: "user-uuid-012",
      display_name: "Dr. Lisa Chen",
      email: "dr.chen@msm.edu",
      questions_generated: 56,
      approval_rate: 0.65,
      active_courses: 1,
    },
  ],
  total: 3,
};

/** Coverage summary fixture */
export const COVERAGE_SUMMARY_DATA: CoverageSummaryData = {
  overall_coverage_percent: 73,
  topics_covered: 164,
  topics_total: 225,
  heatmap_cells: [
    { label: "Cardiovascular", value: 0.92 },
    { label: "Respiratory", value: 0.85 },
    { label: "Renal", value: 0.45 },
    { label: "GI", value: 0.78 },
    { label: "Neuro", value: 0.62 },
    { label: "MSK", value: 0.55 },
  ],
};
```

---

## Section 10: API Test Spec (vitest)

**File:** `apps/web/src/__tests__/dashboard/dashboard-variant.test.ts`
**Total tests:** 6

```
describe("useDashboardVariant")
  it returns faculty variant for regular faculty user
  it returns course_director variant for faculty with is_course_director=true
  it returns institutional_admin variant for institutional_admin role
  it returns institutional_admin variant for superadmin role
  it sets showFacultyPerformance=true only for course_director
  it sets showCoverageSummary=true only for institutional_admin
```

**File:** `apps/web/src/__tests__/dashboard/faculty-dashboard-page.test.tsx`
**Total tests:** 6

```
describe("FacultyDashboardTemplate")
  it renders KPI Strip, Activity Feed, and Course Cards for all variants

  describe("Faculty variant")
    it does not render Faculty Performance table
    it does not render Coverage Summary widget

  describe("Course Director variant")
    it renders Faculty Performance table with sortable columns
    it does not render Coverage Summary widget

  describe("Institutional Admin variant")
    it renders Coverage Summary widget with heatmap
    it renders link to /coverage page
```

**Total: 12 tests** (6 hook + 6 template)

---

## Section 11: E2E Test Spec (Playwright)

Not required for this story. Dashboard overview is not one of the 5 critical user journeys. E2E coverage will be added when the generation pipeline E2E flow is built.

---

## Section 12: Acceptance Criteria

- [ ] Dashboard page at `/faculty/dashboard` (or `/dashboard`) renders role-appropriate content
- [ ] `useDashboardVariant` hook correctly determines variant from auth context
- [ ] Faculty variant: personal KPIs, own activity, assigned courses -- no extra tables/widgets
- [ ] Course Director variant: program-level KPIs, program activity, all program courses, Faculty Performance table
- [ ] Institutional Admin variant: institution-level KPIs, institution activity, all courses, Coverage Summary widget
- [ ] Faculty Performance table shows: name, questions generated, approval rate (with color), active courses
- [ ] Faculty Performance table columns are sortable
- [ ] Coverage Summary widget shows: overall percentage, topic progress, mini heatmap, link to /coverage
- [ ] Mini heatmap uses green intensity scale based on coverage value
- [ ] Role detection from auth context (`useAuth` hook), no role prop drilling
- [ ] Scope parameter passed to existing API endpoints (KPI, activity, courses)
- [ ] 2-column desktop layout (60/40), stacked on tablet/mobile
- [ ] All 12 tests pass
- [ ] TypeScript strict, named exports only (except page.tsx default export)
- [ ] Design tokens only, no hardcoded styling values

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/spec/stories/S-F-32-4.md` | Original story with acceptance criteria, implementation layers, dependencies |
| `.context/spec/stories/STORY-F-6-BRIEF.md` | Activity Feed component API, scope parameter |
| `.context/spec/stories/STORY-F-7-BRIEF.md` | KPI Strip component API, scope parameter, bookmark bar design |
| `.context/spec/stories/STORY-F-12-BRIEF.md` | Course Cards component API, responsive grid |
| `.context/source/04-process/CODE_STANDARDS.md` | Atomic Design hierarchy (Template composes Organisms) |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Three Sheet design system, dashboard layout patterns |

---

## Section 14: Environment Prerequisites

### Required Services
- **Supabase:** Project running with all tables from F-6, F-7, F-12 stories
- **Express:** Server running on port 3001 with KPI, activity, and course endpoints
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story directly (underlying services may use it)

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

### Pre-implementation Checks
1. Verify STORY-F-6 (Activity Feed) component exists and accepts `scope` prop
2. Verify STORY-F-7 (KPI Strip) component exists and accepts `scope` prop
3. Verify STORY-F-12 (Course Cards) component exists and accepts `scope` prop
4. Verify `useAuth` hook returns user object with `role` and `is_course_director` fields
5. Verify dashboard layout exists at `apps/web/src/app/(dashboard)/layout.tsx`
6. Verify shadcn/ui Table, Card, Progress, Skeleton components installed
7. Verify `recharts` installed for mini heatmap visualization

---

## Section 15: Implementation Notes

- **Template vs Page separation:** The page component (`page.tsx`) calls the `useDashboardVariant` hook and passes the result to the template. The template receives `DashboardVariantInfo` as props, making it testable without mocking auth context:

```typescript
// apps/web/src/app/(dashboard)/faculty/dashboard/page.tsx
"use client";

import { useDashboardVariant } from "@web/hooks/use-dashboard-variant";
import { FacultyDashboardTemplate } from "@web/components/dashboard/faculty-dashboard-page";

export default function FacultyDashboardPage() {
  const variant = useDashboardVariant();
  return <FacultyDashboardTemplate variant={variant} />;
}
```

```typescript
// apps/web/src/components/dashboard/faculty-dashboard-page.tsx
import type { DashboardVariantInfo } from "@journey-os/types";
// Import organisms from their respective story locations
import { KPIStrip } from "@web/components/kpi/KPIStrip";
import { ActivityFeed } from "@web/components/activity/ActivityFeed";
import { CourseCardsGrid } from "@web/components/courses/CourseCardsGrid";
import { FacultyPerformanceTable } from "@journey-os/ui/molecules/faculty-performance-table";
import { CoverageSummaryWidget } from "@journey-os/ui/molecules/coverage-summary-widget";

interface FacultyDashboardTemplateProps {
  readonly variant: DashboardVariantInfo;
}

export function FacultyDashboardTemplate({ variant }: FacultyDashboardTemplateProps) {
  return (
    <div className="dashboard-layout">
      <KPIStrip scope={variant.scope} />

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <CourseCardsGrid scope={variant.scope} />
          {variant.showFacultyPerformance && (
            <FacultyPerformanceTable />
          )}
        </div>

        <div className="dashboard-sidebar">
          <ActivityFeed scope={variant.scope} />
          {variant.showCoverageSummary && (
            <CoverageSummaryWidget />
          )}
        </div>
      </div>
    </div>
  );
}
```

- **Faculty Performance table sorting:** Use local state for sort column and direction. Sort client-side since the data set is small (typically < 50 faculty per program).

- **Coverage Summary mini heatmap:** Use a simple CSS grid with 6 cells. Each cell's background color is computed from the `value` using a green intensity scale. No full Recharts chart needed -- a styled div grid suffices. Link at the bottom: `<a href="/coverage">View Full Coverage Report</a>`.

- **Conditional rendering pattern:** Use `variant.showFacultyPerformance` and `variant.showCoverageSummary` booleans from the hook return. This keeps the conditional logic in one place and makes testing straightforward.

- **Testing the hook:** Mock `useAuth` to return different user objects. Assert the returned `DashboardVariantInfo` matches expected values. Use `renderHook` from `@testing-library/react`.

- **Testing the template:** Mock the child organisms (KPIStrip, ActivityFeed, CourseCardsGrid) as simple div stubs. Assert that FacultyPerformanceTable and CoverageSummaryWidget render/don't render based on variant props.

- **Named exports only** for all files except `page.tsx` (Next.js App Router requirement).
- **Design tokens only** -- use CSS custom properties, no hardcoded hex/font/spacing values.
- **vi.hoisted()** needed for any mocks referenced by `vi.mock()` closures in tests.
