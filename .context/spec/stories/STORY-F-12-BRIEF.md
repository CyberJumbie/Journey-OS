# STORY-F-12 Brief: Course Cards

## 0. Lane & Priority

```yaml
story_id: STORY-F-12
old_id: S-F-32-3
lane: faculty
lane_priority: 3
within_lane_order: 12
sprint: 8
size: M
depends_on:
  - STORY-F-1 (faculty) — Course Model (course types + courses table)
  - STORY-U-6 (universal) — RBAC Middleware DONE
  - STORY-U-10 (universal) — Dashboard Routing DONE
blocks: []
personas_served: [faculty]
epic: E-32 (Faculty Dashboard)
feature: F-15 (Faculty Dashboard)
user_flow: UF-17 (Faculty Dashboard Overview)
```

## 1. Summary

Build **course overview cards** for the faculty dashboard displaying each assigned course with title, code, term, question count, curriculum coverage percentage, and status badge. Each card includes quick action buttons routing to the generation workbench, review queue, and coverage heatmap. Cards are displayed in a responsive grid (3 columns desktop, 2 tablet, 1 mobile) with client-side sorting (most recent activity, alphabetical, coverage ascending). Course Directors see all program courses; regular faculty see only their assigned courses. Sort preference is persisted in `localStorage`.

Key constraints:
- Atomic Design: `StatusBadge` atom, `MiniProgressBar` atom, `CourseCard` molecule, `CourseCardsGrid` organism
- Design tokens only -- no hardcoded colors, fonts, or spacing
- Faculty-scoped API: `GET /api/v1/courses?faculty_id=X` with role-based course filtering
- Empty state when no courses assigned

## 2. Task Breakdown

1. **Types** -- Create `CourseCardData`, `CourseCardSort`, `FacultyCourseListQuery` types
2. **API endpoint** -- `GET /api/v1/courses` with faculty_id filter and course director logic
3. **Service** -- `FacultyCourseService` with `listForFaculty()` method
4. **Controller** -- `FacultyCourseController` with `handleList()` method
5. **Atoms** -- `StatusBadge`, `MiniProgressBar` in `packages/ui`
6. **Molecule** -- `CourseCard` in `packages/ui`
7. **Organism** -- `CourseCardsGrid` in `apps/web`
8. **Hook** -- `useFacultyCourses` data fetching hook
9. **Dashboard integration** -- Add `CourseCardsGrid` to faculty dashboard page
10. **API tests** -- 12 tests covering list, filtering, role scoping, sorting
11. **Component tests** -- 6 tests covering rendering, actions, sort, empty state

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/dashboard/course-card.types.ts

/** Course status for badge display */
export type CourseStatus = "active" | "draft" | "archived";

/** Sort options for course cards */
export type CourseCardSort = "recent_activity" | "alphabetical" | "coverage_asc";

/** Query parameters for faculty course list endpoint */
export interface FacultyCourseListQuery {
  readonly faculty_id: string;
  readonly sort_by?: CourseCardSort;
}

/** Data shape for a single course card */
export interface CourseCardData {
  readonly id: string;
  readonly title: string;
  readonly code: string;
  readonly term: string;
  readonly status: CourseStatus;
  readonly question_count: number;
  readonly coverage_percent: number;
  readonly last_activity_at: string | null;
  readonly program_id: string;
  readonly program_name: string;
}

/** Response from faculty courses endpoint */
export interface FacultyCourseListResponse {
  readonly courses: ReadonlyArray<CourseCardData>;
}

/** Quick action route targets */
export interface CourseQuickActions {
  readonly generate: string;   // /workbench?course={id}&mode=generate
  readonly review: string;     // /review?course={id}
  readonly coverage: string;   // /coverage?course={id}
}
```

## 4. Database Schema (inline, complete)

No new tables. Uses existing `courses` table with faculty assignment join. Requires `course_faculty` assignment table or faculty_id on courses (from STORY-F-1).

```sql
-- Migration: add_course_card_query_indexes

-- Index for faculty course lookups
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_last_activity_at ON courses(last_activity_at DESC);

-- Faculty-course assignment (if not created by STORY-F-1)
-- This may already exist; only create if not present:
CREATE TABLE IF NOT EXISTS course_faculty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(course_id, faculty_id)
);

CREATE INDEX IF NOT EXISTS idx_course_faculty_faculty_id ON course_faculty(faculty_id);
CREATE INDEX IF NOT EXISTS idx_course_faculty_course_id ON course_faculty(course_id);

-- RLS for course_faculty
ALTER TABLE course_faculty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty reads own assignments" ON course_faculty
    FOR SELECT USING (
        faculty_id = auth.uid()
        OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'institutional_admin')
    );
```

**Query pattern (service layer):**
```sql
-- For regular faculty: courses assigned via course_faculty
SELECT c.id, c.title, c.code, c.term, c.status, c.question_count,
       c.coverage_percent, c.last_activity_at, p.id AS program_id, p.name AS program_name
FROM courses c
JOIN course_faculty cf ON c.id = cf.course_id
JOIN programs p ON c.program_id = p.id
WHERE cf.faculty_id = $faculty_id;

-- For course directors: all courses in their program(s)
SELECT c.id, c.title, c.code, c.term, c.status, c.question_count,
       c.coverage_percent, c.last_activity_at, p.id AS program_id, p.name AS program_name
FROM courses c
JOIN programs p ON c.program_id = p.id
WHERE p.institution_id = $institution_id;
```

## 5. API Contract (complete request/response)

### GET /api/v1/courses (Auth: faculty+)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `faculty_id` | string | (required) | UUID of the faculty member |

**Success Response (200):**
```json
{
  "data": {
    "courses": [
      {
        "id": "course-uuid-1",
        "title": "Medical Sciences I",
        "code": "MS-101",
        "term": "Fall 2026",
        "status": "active",
        "question_count": 142,
        "coverage_percent": 67.5,
        "last_activity_at": "2026-02-18T16:30:00Z",
        "program_id": "prog-uuid-1",
        "program_name": "Doctor of Medicine"
      },
      {
        "id": "course-uuid-2",
        "title": "Pharmacology Fundamentals",
        "code": "PHARM-201",
        "term": "Spring 2026",
        "status": "draft",
        "question_count": 0,
        "coverage_percent": 0,
        "last_activity_at": null,
        "program_id": "prog-uuid-1",
        "program_name": "Doctor of Medicine"
      }
    ]
  },
  "error": null
}
```

**Empty state (200):**
```json
{
  "data": {
    "courses": []
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing faculty_id, invalid UUID format |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Requesting courses for a different faculty member (unless superadmin/admin) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Integration: Faculty Dashboard

**Route:** `apps/web/src/app/(protected)/dashboard/faculty/page.tsx` (existing page, edit to add grid)

**Component hierarchy:**
```
FacultyDashboardPage (page.tsx -- default export, existing)
  └── CourseCardsGrid (organism, client component)
        ├── SortDropdown (atom -- select with 3 options)
        ├── CourseCard[] (molecule, mapped from data)
        │     ├── StatusBadge (atom -- Active/Draft/Archived)
        │     ├── MiniProgressBar (atom -- coverage %)
        │     ├── Course info (title, code, term, question count)
        │     └── QuickActionBar
        │           ├── GenerateButton (-> /workbench?course=id&mode=generate)
        │           ├── ReviewButton (-> /review?course=id)
        │           └── CoverageButton (-> /coverage?course=id)
        └── EmptyState ("No courses assigned" message)
```

### Component: StatusBadge (atom)

**File:** `packages/ui/src/atoms/status-badge.tsx`

**Props:**
```typescript
export interface StatusBadgeProps {
  readonly status: CourseStatus;
}
```

**Visual states:**
- `active` -- Green background (design token: `--color-status-active`), white text, "Active"
- `draft` -- Yellow background (design token: `--color-status-draft`), dark text, "Draft"
- `archived` -- Gray background (design token: `--color-status-archived`), white text, "Archived"

### Component: MiniProgressBar (atom)

**File:** `packages/ui/src/atoms/mini-progress-bar.tsx`

**Props:**
```typescript
export interface MiniProgressBarProps {
  readonly percent: number;  // 0-100
}
```

**Color scale (design tokens):**
- 0-33%: `--color-coverage-low` (red)
- 34-66%: `--color-coverage-medium` (yellow)
- 67-100%: `--color-coverage-high` (green)

### Component: CourseCard (molecule)

**File:** `packages/ui/src/molecules/course-card.tsx`

**Props:**
```typescript
export interface CourseCardProps {
  readonly course: CourseCardData;
  readonly onGenerate: (courseId: string) => void;
  readonly onReview: (courseId: string) => void;
  readonly onCoverage: (courseId: string) => void;
}
```

**Layout:**
```
+-----------------------------------+
| [StatusBadge]           MS-101    |
| Medical Sciences I                |
| Fall 2026                         |
|                                   |
| 142 questions                     |
| [MiniProgressBar] 67.5% coverage  |
|                                   |
| [Generate] [Review] [Coverage]    |
+-----------------------------------+
```

### Component: CourseCardsGrid (organism)

**File:** `apps/web/src/components/dashboard/course-cards-grid.tsx`

**Props:**
```typescript
export interface CourseCardsGridProps {
  readonly facultyId: string;
}
```

**States:**
1. **Loading** -- Skeleton cards (3 placeholders)
2. **Empty** -- "No courses assigned. Contact your institutional admin to get started." with muted icon
3. **Data** -- Responsive grid of course cards with sort dropdown
4. **Error** -- Error message with retry button

**Responsive grid:**
- Desktop (>=1024px): 3 columns, `gap: var(--spacing-6)`
- Tablet (>=768px): 2 columns, `gap: var(--spacing-4)`
- Mobile (<768px): 1 column, `gap: var(--spacing-4)`

**Sort dropdown (above grid):**
- "Most Recent Activity" (default)
- "Alphabetical (A-Z)"
- "Coverage (Low to High)"
- Selected sort stored in `localStorage` key: `journey:courseCardSort`

**Design tokens:**
- Card surface: `var(--color-surface-card)` (white)
- Card border: `var(--color-border-subtle)`
- Card shadow: `var(--shadow-sm)`
- Card hover: `var(--shadow-md)` with subtle scale transform
- Typography: `var(--font-heading)` for course title, `var(--font-body)` for details
- Spacing: `var(--spacing-4)` for card padding, `var(--spacing-2)` for inner gaps
- Quick action buttons: `var(--color-primary)` outline style, `var(--font-body-sm)` text

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/dashboard/course-card.types.ts` | Types | Create |
| 2 | `packages/types/src/dashboard/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add dashboard export) |
| 4 | Supabase migration via MCP (indexes + course_faculty) | Database | Apply |
| 5 | `apps/server/src/services/course/faculty-course.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/course/faculty-course.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add GET /api/v1/courses) |
| 8 | `packages/ui/src/atoms/status-badge.tsx` | Atom | Create |
| 9 | `packages/ui/src/atoms/mini-progress-bar.tsx` | Atom | Create |
| 10 | `packages/ui/src/molecules/course-card.tsx` | Molecule | Create |
| 11 | `apps/web/src/hooks/use-faculty-courses.ts` | Hook | Create |
| 12 | `apps/web/src/components/dashboard/course-cards-grid.tsx` | Organism | Create |
| 13 | `apps/web/src/app/(protected)/dashboard/faculty/page.tsx` | Page | Edit (add grid) |
| 14 | `apps/server/src/__tests__/course/faculty-course.controller.test.ts` | Tests | Create |
| 15 | `apps/web/src/__tests__/dashboard/course-cards-grid.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-1 | faculty | Pending | Course model + `courses` table must exist |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty-only enforcement |
| STORY-U-10 | universal | **DONE** | Dashboard routing + protected layout |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing
- `next` -- Next.js framework
- `react` -- React

### NPM Packages (may need installing)
- `@testing-library/react` -- Component testing (if not already installed)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`, `rbac.require()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/errors/validation.error.ts` -- `ValidationError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `AuthTokenPayload`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum
- `apps/web/src/app/(protected)/dashboard/faculty/page.tsx` -- Existing faculty dashboard page

## 9. Test Fixtures (inline)

```typescript
import { AuthRole } from "@journey-os/types";
import type { CourseCardData } from "@journey-os/types";

// Mock faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock course director (sees all program courses)
export const COURSE_DIRECTOR_USER = {
  ...FACULTY_USER,
  sub: "director-uuid-1",
  email: "director@msm.edu",
  is_course_director: true,
};

// Mock student (should be denied)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: AuthRole.STUDENT,
};

// Mock course card data
export const ACTIVE_COURSE: CourseCardData = {
  id: "course-uuid-1",
  title: "Medical Sciences I",
  code: "MS-101",
  term: "Fall 2026",
  status: "active",
  question_count: 142,
  coverage_percent: 67.5,
  last_activity_at: "2026-02-18T16:30:00Z",
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

export const DRAFT_COURSE: CourseCardData = {
  id: "course-uuid-2",
  title: "Pharmacology Fundamentals",
  code: "PHARM-201",
  term: "Spring 2026",
  status: "draft",
  question_count: 0,
  coverage_percent: 0,
  last_activity_at: null,
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

export const ARCHIVED_COURSE: CourseCardData = {
  id: "course-uuid-3",
  title: "Anatomy Review",
  code: "ANAT-100",
  term: "Spring 2025",
  status: "archived",
  question_count: 89,
  coverage_percent: 92.3,
  last_activity_at: "2025-12-15T10:00:00Z",
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

export const LOW_COVERAGE_COURSE: CourseCardData = {
  id: "course-uuid-4",
  title: "Pathology Essentials",
  code: "PATH-301",
  term: "Fall 2026",
  status: "active",
  question_count: 25,
  coverage_percent: 18.2,
  last_activity_at: "2026-02-10T09:00:00Z",
  program_id: "prog-uuid-1",
  program_name: "Doctor of Medicine",
};

export const MOCK_COURSES = [ACTIVE_COURSE, DRAFT_COURSE, ARCHIVED_COURSE, LOW_COVERAGE_COURSE];
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/course/faculty-course.controller.test.ts`

```
describe("FacultyCourseController")
  describe("handleList")
    > returns courses assigned to faculty (200)
    > returns all program courses for course director (200)
    > returns course card fields (id, title, code, term, status, question_count, coverage_percent)
    > returns empty courses array when faculty has no assignments (200)
    > rejects unauthenticated request (401)
    > rejects student role (403 FORBIDDEN)
    > rejects missing faculty_id query param (400 VALIDATION_ERROR)
    > rejects faculty requesting another faculty member's courses (403 FORBIDDEN)
    > allows superadmin to request any faculty member's courses (200)
    > allows institutional_admin to request faculty in their institution (200)

describe("FacultyCourseService")
  describe("listForFaculty")
    > builds correct Supabase query for regular faculty (course_faculty join)
    > builds correct Supabase query for course director (program scope)
```

**Total: ~12 tests** (10 controller + 2 service)

**File:** `apps/web/src/__tests__/dashboard/course-cards-grid.test.tsx`

```
describe("CourseCardsGrid")
  > renders course cards with correct title, code, term
  > displays correct status badge color for active/draft/archived
  > displays mini progress bar with correct coverage percent
  > renders empty state when no courses
  > quick action buttons navigate to correct routes
  > sort dropdown changes card order
```

**Total: ~6 component tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The faculty dashboard is not one of the 5 critical user journeys. E2E will be added when the full dashboard is assembled (E-32 complete).

## 12. Acceptance Criteria

1. Faculty dashboard displays course cards in a responsive grid (3/2/1 columns)
2. Each card shows: title, code, term, question count, coverage %, status badge
3. Status badge renders correctly: Active (green), Draft (yellow), Archived (gray)
4. Mini progress bar shows coverage with color scale (red/yellow/green)
5. Quick actions route correctly: Generate to workbench, Review to queue, Coverage to heatmap
6. Regular faculty sees only assigned courses; Course Director sees all program courses
7. Sort dropdown with 3 options; selection persisted in localStorage
8. Empty state displayed when no courses assigned with helpful message
9. SuperAdmin and institutional_admin can view any faculty's courses
10. Faculty cannot request another faculty member's course list (403)
11. All 12 API tests and 6 component tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Course cards on faculty dashboard | S-F-32-3 SS User Story |
| Card fields (title, code, term, questions, coverage) | S-F-32-3 SS Acceptance Criteria |
| Quick actions (Generate, Review, Coverage) | S-F-32-3 SS Acceptance Criteria |
| Responsive grid (3/2/1) | S-F-32-3 SS Acceptance Criteria |
| Sort options (recent, alpha, coverage) | S-F-32-3 SS Acceptance Criteria |
| Coverage color scale (red/yellow/green) | S-F-32-3 SS Notes: "same color scale as the heatmap" |
| Course Director sees all program courses | S-F-32-3 SS Notes: "Course Director sees all courses in their program" |
| Sort persisted in localStorage | S-F-32-3 SS Notes: "persisted in localStorage" |
| API endpoint | S-F-32-3 SS Notes: "/api/courses?faculty_id=X" |
| Atomic Design layers | ARCHITECTURE_v10 SS 3.2: Atoms > Molecules > Organisms |

## 14. Environment Prerequisites

- **Supabase:** Project running, `courses` table exists (STORY-F-1), `course_faculty` join table exists, performance indexes applied
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000 with faculty dashboard page at `/dashboard/faculty`
- **No Neo4j needed** for this story (read-only, Supabase only)

## 15. Implementation Notes

- **Atomic Design layering:** `StatusBadge` and `MiniProgressBar` go in `packages/ui/src/atoms/` (shared design system). `CourseCard` goes in `packages/ui/src/molecules/` (shared). `CourseCardsGrid` goes in `apps/web/src/components/dashboard/` (app-specific organism).
- **Course Director detection:** Check `req.user.is_course_director` from the JWT payload. If true, query all courses in the user's program(s) instead of the `course_faculty` join.
- **Faculty scope enforcement:** If the requesting user is a regular faculty member, `faculty_id` must match their own `sub`. SuperAdmin and institutional_admin can request any faculty's courses.
- **localStorage sort key:** Use `journey:courseCardSort` as the key. Default to `recent_activity` if key does not exist.
- **Coverage percent source:** The `coverage_percent` field on the course record is a denormalized snapshot updated by the coverage calculation service (future story). For now, it defaults to 0 if not yet computed.
- **Design tokens:** All colors must reference CSS custom properties or design token constants. Never use hex values directly in component code. The token definitions are in the shared design system.
- **OOP pattern:** `FacultyCourseService` uses JS `#private` fields (`#supabaseClient`). Constructor DI.
- **Named exports only** for all atoms, molecules, organisms, hooks, services, controllers.
- **Path alias:** Use `@web/components/...` for imports within `apps/web`, `@journey-os/types` for cross-package types.
- **vi.hoisted():** Use for any mock declarations referenced by `vi.mock()` closures in tests.
