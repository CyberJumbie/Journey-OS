# Plan: STORY-F-12 "Course Cards"

## Critical Brief-vs-Reality Mismatches

| Brief Says | Reality | Impact |
|---|---|---|
| Table `course_faculty` | Table is `course_members` (role = `'faculty'`) | All queries must use `course_members` |
| Column `faculty_id` | Column is `user_id` on `course_members` | Service query fix |
| Field `title` on courses | Column is `name` | Type mapping + API response |
| Field `term` on courses | Two columns: `semester` + `academic_year` | Concatenate in query |
| Field `question_count` on courses | Does NOT exist — must COUNT from `assessment_items` | RPC or subquery |
| Field `coverage_percent` on courses | Does NOT exist — default 0 (future story) | Hardcode 0 for now |
| Field `last_activity_at` on courses | Does NOT exist — use `courses.updated_at` as proxy | Acceptable approximation |
| `is_course_director` on JWT | `courses.course_director_id` FK to `profiles.id` | Check DB, not JWT claim |
| Page at `(protected)/dashboard/faculty/` | Page at `(dashboard)/faculty/page.tsx` | Correct path |
| `StatusBadge` in `packages/ui/src/atoms/` | No atoms dir exists yet for status badges | Create in correct location |
| `CourseCard` doesn't exist | Already exists at `apps/web/src/components/dashboard/course-card.tsx` with mock data | Rewrite existing component |
| `CourseStatus` type to create | Already exists in `packages/types/src/course/course.types.ts` | Reuse, do not duplicate |

## Tasks (implementation order)

### 1. Types — `packages/types/src/dashboard/course-card.types.ts` (Create)
- Define `CourseCardData` (reuse `CourseStatus` from `../course/course.types.ts`)
- Define `CourseCardSort`, `FacultyCourseListQuery`, `FacultyCourseListResponse`, `CourseQuickActions`
- Map to actual DB reality: `name` (not `title`), `term` as derived string, `question_count` as computed
- Export from `packages/types/src/dashboard/index.ts` (edit existing barrel)
- Rebuild types: `packages/types/node_modules/.bin/tsc -b packages/types/tsconfig.json`

### 2. Migration — Supabase RPC function (Apply via MCP)
- Create `get_faculty_courses(p_faculty_id UUID)` RPC that returns course cards with computed fields:
  - JOINs `course_members` (role='faculty') → `courses` → `programs`
  - LEFT JOIN + COUNT on `assessment_items` for `question_count`
  - `courses.updated_at` as `last_activity_at`
  - `CONCAT(semester, ' ', academic_year)` as `term`
  - `0::numeric` as `coverage_percent` (placeholder)
  - `programs.name` as `program_name`
- Create `get_director_courses(p_director_id UUID)` RPC for course directors:
  - Queries all courses WHERE `course_director_id = p_director_id`
  - Same computed fields as above

### 3. Service — `apps/server/src/services/dashboard/faculty-course.service.ts` (Create)
- `FacultyCourseService` class with `#supabase` private field, constructor DI
- `async listForFaculty(facultyId: string, isCourseDirector: boolean): Promise<FacultyCourseListResponse>`
- If course director → call `get_director_courses` RPC
- If regular faculty → call `get_faculty_courses` RPC
- Map DB `name` → response `title` (brief's expected shape), or keep as `name` and update type

### 4. Controller — `apps/server/src/controllers/dashboard/faculty-course.controller.ts` (Create)
- `FacultyCourseController` class with `#service` private field
- `async handleList(req: Request, res: Response): Promise<void>`
- Extract `faculty_id` from `req.query`, validate UUID format
- Authorization: faculty can only request own courses (`faculty_id === req.user.sub`), superadmin/institutional_admin can request any
- Determine course director status: check `profiles.is_course_director` from `req.user`
- Return `ApiResponse<FacultyCourseListResponse>`

### 5. Route Registration — `apps/server/src/index.ts` (Edit)
- Instantiate `FacultyCourseService` + `FacultyCourseController`
- Register: `app.get("/api/v1/dashboard/faculty/courses", rbac.require(AuthRole.FACULTY), (req, res) => controller.handleList(req, res))`

### 6. Atoms — `packages/ui/src/atoms/status-badge.tsx` (Create)
- `StatusBadge` component with `status: CourseStatus` prop
- Design tokens: use Tailwind classes mapped to token vars
- `active` → green bg, `draft` → warning/yellow bg, `archived` → gray bg

### 7. Atoms — `packages/ui/src/atoms/mini-progress-bar.tsx` (Create)
- `MiniProgressBar` component with `percent: number` prop (0-100)
- Color scale via Tailwind: 0-33% red, 34-66% yellow, 67-100% green
- Thin horizontal bar with rounded corners

### 8. UI barrel — `packages/ui/src/index.ts` (Edit)
- Add exports for `StatusBadge` and `MiniProgressBar`

### 9. CourseCard Rewrite — `apps/web/src/components/dashboard/course-card.tsx` (Edit existing)
- Replace mock `Course` interface with `CourseCardData` from `@journey-os/types`
- Replace hardcoded `C = {}` colors with Tailwind design token classes
- Add `StatusBadge` and `MiniProgressBar` atoms
- Add quick action buttons (Generate, Review, Coverage)
- Keep existing layout aesthetic but wire to real props
- SVG circle `stroke` values get `/* token: --color-name */` comments (charting exception)

### 10. Hook — `apps/web/src/hooks/use-faculty-courses.ts` (Create)
- `useFacultyCourses(facultyId: string)` hook
- Auth token via `createBrowserClient().auth.getSession()` (follow `use-activity-feed.ts` pattern)
- Fetch `GET /api/v1/dashboard/faculty/courses?faculty_id=X`
- Client-side sorting with `CourseCardSort` state
- Persist sort preference in `localStorage` key `journey:courseCardSort`
- Return `{ courses, loading, error, sortBy, setSortBy, refetch }`

### 11. CourseCardsGrid — `apps/web/src/components/dashboard/course-cards-grid.tsx` (Create)
- Organism: uses `useFacultyCourses` hook
- Responsive grid: 3 col desktop, 2 tablet, 1 mobile (Tailwind `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
- Sort dropdown above grid (3 options)
- States: loading (skeleton), empty, data, error
- Quick action click handlers → `router.push()` to workbench/review/coverage routes

### 12. Dashboard Integration — `apps/web/src/app/(dashboard)/faculty/page.tsx` (Edit)
- Replace `<CourseCard courses={mockCourses} />` with `<CourseCardsGrid facultyId={userId} />`
- Get `userId` from auth session
- Remove `mockCourses` import (keep other mocks for other sections)

### 13. API Tests — `apps/server/src/__tests__/dashboard/faculty-course.controller.test.ts` (Create)
- 12 tests per brief spec (section 10)
- Use `vi.hoisted()` for mock declarations
- Follow supabase mock factory pattern from `docs/solutions/supabase-mock-factory.md`

### 14. Component Tests — `apps/web/src/__tests__/dashboard/course-cards-grid.test.tsx` (Create)
- 6 tests per brief spec (section 10)
- Mock `useFacultyCourses` hook
- Test rendering, status badges, progress bar, empty state, sort, quick actions

## Implementation Order

```
Types (1) → Migration (2) → Service (3) → Controller (4) → Route (5)
→ Atoms (6,7) → UI barrel (8) → CourseCard rewrite (9)
→ Hook (10) → Grid organism (11) → Dashboard integration (12)
→ API Tests (13) → Component Tests (14)
```

## Patterns to Follow

- `docs/solutions/supabase-mock-factory.md` — test mocking
- `docs/solutions/aggregation-dashboard-rpc-pattern.md` — RPC for computed aggregates
- `apps/server/src/services/dashboard/kpi.service.ts` — OOP service pattern
- `apps/server/src/controllers/dashboard/kpi.controller.ts` — controller pattern
- `apps/web/src/hooks/use-activity-feed.ts` — auth token retrieval in hooks

## Testing Strategy

- **API tests (12):** controller auth, role scoping, RBAC, validation, empty state, course director vs regular faculty, superadmin/admin cross-access
- **Component tests (6):** rendering, status badge variants, progress bar, empty state, sort dropdown, quick action routing
- **E2E:** Not required (brief section 11 confirms)

## Figma Make

- [x] Code directly (existing component exists with mock data, rewrite to production)

## Risks / Edge Cases

1. **No `question_count` column** — must aggregate from `assessment_items`. RPC function handles this cleanly.
2. **No `coverage_percent` column** — hardcoded to 0 until coverage calculation story ships. Document this in code comments.
3. **Course director detection** — `profiles.is_course_director` boolean is available on the JWT payload. Also verify via `courses.course_director_id` match in the RPC for extra safety.
4. **`courses.program_id` is nullable** — courses without a program won't have `program_name`. Handle with COALESCE or LEFT JOIN.
5. **Empty `semester`/`academic_year`** — term concatenation may produce empty string. Default to `'—'`.
6. **Existing CourseCard component** — must be rewritten carefully; it's imported by the dashboard page. Change props in a single atomic edit to avoid breaking the page between edits.

## Acceptance Criteria (verbatim from brief)

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
