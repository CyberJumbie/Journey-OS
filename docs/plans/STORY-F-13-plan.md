# Plan: STORY-F-13 — Course List & Detail Views

## Critical Discovery: Backend Already Exists

The brief assumes the backend needs to be built from scratch. **It does not.**
Exploration reveals the following are **already implemented** (from STORY-F-1 & STORY-F-11):

| Layer | File | Status |
|-------|------|--------|
| Types | `packages/types/src/course/course.types.ts` | `CourseDTO`, `CourseListQuery`, `CourseListResponse`, `CourseStatus` exist |
| Types | `packages/types/src/course/hierarchy.types.ts` | `CourseHierarchy`, `SectionWithSessions`, `Section`, `Session` exist |
| Error | `apps/server/src/errors/course.error.ts` | `CourseNotFoundError` (code: `"COURSE_NOT_FOUND"`) exists |
| Repository | `apps/server/src/repositories/course.repository.ts` | `list()`, `findById()` with offset pagination exist |
| Service | `apps/server/src/services/course/course.service.ts` | Delegates to repository |
| Service | `apps/server/src/services/course/hierarchy.service.ts` | `getCourseHierarchy()` builds section→session tree |
| Controller | `apps/server/src/controllers/course/course.controller.ts` | `handleList()`, `handleGetById()` exist |
| Controller | `apps/server/src/controllers/course/hierarchy.controller.ts` | `handleGetCourseHierarchy()` exists |
| Routes | `apps/server/src/index.ts` (inline) | `GET /api/v1/courses`, `GET /api/v1/courses/:id`, `GET /api/v1/courses/:courseId/hierarchy` registered |

### Brief vs. Reality Mismatches

| Brief Says | Reality |
|-----------|---------|
| Table column: `title` | Actual column: `name` |
| Table column: `order` (sections) | Actual column: `position` |
| Profiles column: `display_name` | Actual column: `full_name` |
| `CourseListItem` with `program_name`, `course_director_name` | `CourseDTO` has only `program_id`, `course_director_id` (no joins) |
| Cursor-based pagination | Existing API uses offset-based (page/limit) |
| Tables: `course_sections`, `course_sessions` | Actual tables: `sections`, `sessions` |
| `courses.institution_id` | No `institution_id` on courses — join through `programs.institution_id` |
| shadcn/ui components (Select, Input, Table) | **Not installed** — project uses plain Tailwind + lucide-react |
| Atomic Design dirs (`molecules/`, `organisms/`) | Flat by domain: `components/course/` |
| `apps/server/src/api/courses.routes.ts` | No `api/` directory — routes inline in `index.ts` |
| `apps/server/src/composition-root.ts` | Does not exist — DI inline in `index.ts` |

### What Actually Needs Building

**Backend enhancement (minor):** The existing `CourseDTO` list endpoint returns flat rows without program name or course director name. The detail endpoint returns flat `CourseDTO` without hierarchy. Two approaches:

- **Option A (chosen):** Enrich the existing repository `list()` to join `programs.name` and `profiles.full_name`, and enhance `findById()` to include these. Add new view types for the enriched responses. This keeps the API clean.
- **Option B (rejected):** Make separate frontend fetches (course + hierarchy + profile). Too many round trips.

**Frontend (main work):** Build the faculty course list and detail pages.

---

## Tasks (revised from brief)

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Add `CourseListItem` and `CourseDetailView` view types | `packages/types/src/course/course-view.types.ts` | 20m |
| 2 | Update barrel export for new view types | `packages/types/src/course/index.ts` | 5m |
| 3 | Rebuild types package | `packages/types/tsconfig.json` | 2m |
| 4 | Add `listEnriched()` method to `CourseRepository` (joins programs + profiles, includes section/session counts) | `apps/server/src/repositories/course.repository.ts` | 45m |
| 5 | Add `listView()` and `getDetailView()` to `CourseService` (enriched list + detail with hierarchy) | `apps/server/src/services/course/course.service.ts` | 30m |
| 6 | Add `handleListView()` and `handleGetDetailView()` to `CourseController` | `apps/server/src/controllers/course/course.controller.ts` | 20m |
| 7 | Register new routes: `GET /api/v1/courses/view`, `GET /api/v1/courses/:id/view` | `apps/server/src/index.ts` | 10m |
| 8 | Build `CourseFilters` component (search + status + academic year dropdowns) | `apps/web/src/components/course/course-filters.tsx` | 45m |
| 9 | Build `CourseListTable` component (sortable table with pagination) | `apps/web/src/components/course/course-list-table.tsx` | 60m |
| 10 | Build `FacultyCourseList` component (combines filters + table) | `apps/web/src/components/course/faculty-course-list.tsx` | 30m |
| 11 | Build `CourseHierarchyTree` component (collapsible sections/sessions) | `apps/web/src/components/course/course-hierarchy-tree.tsx` | 45m |
| 12 | Build `FacultyCourseDetail` component (info + CD + hierarchy + SLO placeholder) | `apps/web/src/components/course/faculty-course-detail.tsx` | 45m |
| 13 | Create course list page | `apps/web/src/app/(dashboard)/faculty/courses/page.tsx` | 15m |
| 14 | Create course detail page | `apps/web/src/app/(dashboard)/faculty/courses/[id]/page.tsx` | 15m |
| 15 | Wire "View all →" button in `CourseCard` to `/faculty/courses` | `apps/web/src/components/dashboard/course-card.tsx` | 5m |
| 16 | Write controller tests for enriched endpoints (8 tests) | `apps/server/src/controllers/course/__tests__/course-view.controller.test.ts` | 60m |

**Total estimate:** ~7.5 hours

---

## Implementation Order

Types → Rebuild types → Repository (enriched list) → Service → Controller → Routes → Frontend components → Pages → Wire-up → Tests

---

## Patterns to Follow

- `docs/solutions/admin-paginated-list-pattern.md` — dual query (data + count) with `Promise.all`, filter/sort/paginate pattern
- `docs/solutions/supabase-inner-join-filter-pattern.md` — `!inner` join for getting program name through FK
- Existing `CourseOverview` component at `apps/web/src/components/course/course-overview.tsx` — reference for fetch + filter + pagination UI pattern (adapt for faculty context)
- Existing `course-card.tsx` dashboard component — follow the Three Sheet design token usage

---

## Database Schema Notes (verified via Supabase MCP)

### Actual table/column names:
- `courses`: `id, code, name, description, department, course_director_id, academic_year, semester, credit_hours, course_type, neo4j_id, status, program_id, created_at, updated_at`
- `sections`: `id, course_id, title, description, position, is_active, sync_status, created_at, updated_at`
- `sessions`: `id, section_id, title, description, week_number, day_of_week, start_time, end_time, is_active, sync_status, created_at, updated_at`
- `programs`: `id, institution_id, name, code, description, is_active, sync_status, created_at, updated_at`
- `profiles`: `id, email, full_name, role, department, title, avatar_url, institution_id, is_course_director, ...`

### Institution scoping path:
`courses.program_id → programs.institution_id` (courses has NO direct `institution_id`)
`courses.course_director_id → profiles.id` (profiles has `full_name`, not `display_name`)

### Enriched list query approach:
```sql
SELECT c.*,
  p.name AS program_name,
  prof.full_name AS course_director_name,
  (SELECT COUNT(*) FROM sections WHERE course_id = c.id) AS section_count,
  (SELECT COUNT(*) FROM sessions s JOIN sections sec ON s.section_id = sec.id WHERE sec.course_id = c.id) AS session_count
FROM courses c
LEFT JOIN programs p ON c.program_id = p.id
LEFT JOIN profiles prof ON c.course_director_id = prof.id
WHERE ... (filters)
ORDER BY ... (sort)
```

In Supabase query builder this becomes:
```typescript
.from("courses")
.select(`
  *,
  program:programs(name),
  director:profiles!courses_course_director_id_fkey(full_name, email)
`)
```
Section/session counts will need separate count queries or RPC.

---

## Testing Strategy

- **API tests (Task 16):** 8 tests covering the enriched view endpoints
  1. `GET /api/v1/courses/view` — returns enriched list with program_name, director_name
  2. Filter by status
  3. Filter by search (name/code)
  4. Pagination (page/limit/total)
  5. Invalid query params → 400
  6. `GET /api/v1/courses/:id/view` — returns detail with hierarchy, director info
  7. Non-existent course → 404
  8. Enriched fields present (section_count, session_count, program_name)
- **E2E:** Not required per brief (not one of 5 critical journeys)

---

## Figma Make

- [ ] Code directly (no prototype needed — following existing patterns)

---

## Risks / Edge Cases

1. **No shadcn/ui installed** — must build table/filters with plain Tailwind + HTML. Follow existing component patterns (see `CourseOverview`, `CourseCard`).
2. **Offset pagination vs cursor** — use existing offset-based since that's what the API supports. Brief's cursor-based design is aspirational but would require rewriting the repository.
3. **Institution scoping** — courses lack direct `institution_id`. The RBAC middleware on existing routes uses `rbac.requireCourseDirector()` which doesn't do institution filtering. RLS policies on the `courses` table handle this. New view routes should use `rbac.require(AuthRole.FACULTY)` since all faculty (not just CDs) should see the list.
4. **Course director name requires LEFT JOIN** — `course_director_id` can be null. Use LEFT JOIN to avoid dropping courses without a CD.
5. **Section/session counts** — Supabase relational queries don't directly support count aggregations. Options: (a) RPC function, (b) fetch all sections/sessions and count in-app, (c) add a `courses_with_counts` view. We'll use approach (b) with two lightweight count queries via `Promise.all`.
6. **Column name mismatches from brief** — `name` not `title`, `full_name` not `display_name`, `position` not `order`. All view types must use the actual DB column names.

---

## Files to Create (8 new)

```
packages/types/src/course/course-view.types.ts
apps/web/src/components/course/course-filters.tsx
apps/web/src/components/course/course-list-table.tsx
apps/web/src/components/course/faculty-course-list.tsx
apps/web/src/components/course/course-hierarchy-tree.tsx
apps/web/src/components/course/faculty-course-detail.tsx
apps/web/src/app/(dashboard)/faculty/courses/page.tsx
apps/web/src/app/(dashboard)/faculty/courses/[id]/page.tsx
```

## Files to Modify (6 existing)

```
packages/types/src/course/index.ts              — Re-export course-view types
apps/server/src/repositories/course.repository.ts — Add listEnriched() method
apps/server/src/services/course/course.service.ts — Add listView(), getDetailView()
apps/server/src/controllers/course/course.controller.ts — Add handleListView(), handleGetDetailView()
apps/server/src/index.ts                        — Register new /view routes
apps/web/src/components/dashboard/course-card.tsx — Wire "View all →" href
```

**Total files:** 8 new + 6 modified = 14

---

## Acceptance Criteria (verbatim from brief)

- [ ] Course list page at `/faculty/courses` displays courses in a filterable table
- [ ] Table columns: code, title, program, course director, status, academic year
- [ ] Filter by: program, academic year, status (active/archived/draft)
- [ ] Search by course title or code (case-insensitive, 300ms debounce)
- [ ] Cursor-based pagination with configurable page size (10, 20, 50) → **adapted: offset-based to match existing API**
- [ ] Course detail page at `/faculty/courses/[id]` shows full course info
- [ ] Detail page shows Section > Session hierarchy as a collapsible tree
- [ ] Detail page shows course director info (name, email)
- [ ] Detail page has SLO summary placeholder section
- [ ] Edit button visible only to course director
- [ ] Faculty sees only courses from their own institution
- [ ] GET /api/v1/courses returns paginated, filtered list → **via enriched /view endpoint**
- [ ] GET /api/v1/courses/:id returns detail with hierarchy → **via enriched /view endpoint**
- [ ] 404 returned for non-existent course ID
- [ ] All API tests pass (8 tests for enriched endpoints)
- [ ] TypeScript strict, named exports only (except page.tsx default exports)
- [ ] Design tokens only, no hardcoded styling values
