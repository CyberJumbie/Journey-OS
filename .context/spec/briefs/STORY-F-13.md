# STORY-F-13: Course List & Detail Views

**Epic:** E-08 (Course CRUD & Hierarchy)
**Feature:** F-04
**Sprint:** 4
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-08-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need filterable course list and detail views so that I can quickly find courses and see their full configuration and hierarchy.

## Acceptance Criteria
- [ ] Course list page with table view: columns for code, title, program, CD, status, academic year
- [ ] Filter by: program, academic year, status (active/archived)
- [ ] Search by course title or code
- [ ] Pagination with configurable page size
- [ ] Course detail page showing: basic info, hierarchy tree, CD info, SLO summary (placeholder)
- [ ] Edit inline or navigate to edit form from detail view
- [ ] Controller endpoints: GET /courses (list with filters), GET /courses/:id (detail with hierarchy)
- [ ] 8-10 API tests for list filtering, pagination, detail fetch, 404 handling
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production. AllCourses.tsx (admin) and CourseList.tsx (faculty) are two views of the same data.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/courses/AllCourses.tsx` | `apps/web/src/app/(protected)/courses/page.tsx` | Admin-scoped course list. Convert React Router to Next.js App Router. Replace inline styles with Tailwind + design tokens. |
| `.context/source/05-reference/app/app/pages/faculty/CourseList.tsx` | `apps/web/src/app/(protected)/faculty/courses/page.tsx` | Faculty-scoped course list. Same component, filtered by faculty courses. |
| `.context/source/05-reference/app/app/pages/courses/CourseDashboard.tsx` | `apps/web/src/app/(protected)/courses/[id]/page.tsx` | Course detail view with hierarchy tree. |
| `.context/source/05-reference/app/app/pages/faculty/CourseDetailView.tsx` | (reference for detail layout) | Faculty-specific detail view with section/session tree. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Controller | apps/server | `src/controllers/course/course.controller.ts` (extend) |
| Route | apps/server | `src/routes/course.routes.ts` (extend) |
| View - List | apps/web | `src/app/(protected)/courses/page.tsx` |
| Components | apps/web | `src/components/course/course-list.tsx`, `src/components/course/course-table.tsx`, `src/components/course/course-filters.tsx` |
| View - Detail | apps/web | `src/app/(protected)/courses/[id]/page.tsx` |
| Components | apps/web | `src/components/course/course-detail.tsx`, `src/components/course/hierarchy-tree.tsx` |
| Hooks | apps/web | `src/hooks/use-courses.ts`, `src/hooks/use-course-detail.ts` |
| Tests | apps/server | `src/controllers/course/__tests__/course.controller.test.ts` (extend) |

## Database Schema
No new tables. Uses existing `courses`, `programs`, `sections`, `sessions` tables.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/courses` | Faculty+ | List courses with filters and pagination |
| GET | `/api/v1/courses/:id` | Faculty+ | Get course detail with hierarchy |

Query params for list: `program_id`, `academic_year`, `status`, `search`, `page`, `page_size`, `sort`.

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-1 (course model and repository must exist)
- **Cross-lane:** STORY-U-3 (RBAC for endpoint protection)

## Testing Requirements
### API Tests (8-10)
1. GET /courses returns paginated list
2. Filter by program_id returns matching courses
3. Filter by status returns matching courses
4. Filter by academic_year returns matching courses
5. Search by title substring matches correctly
6. Search by code matches correctly
7. GET /courses/:id returns course with nested hierarchy
8. GET /courses/:nonexistent returns 404
9. Pagination metadata includes total count and page info
10. Sort by title, code, or academic_year

## Implementation Notes
- CourseList is an Organism containing CourseTable (Molecule) and CourseFilters (Molecule).
- Detail view uses a tree component to visualize Section > Session hierarchy.
- Use design tokens for table styling, never hardcoded hex/font/spacing.
- Pagination follows offset-based pattern with total count.
- Course detail includes a placeholder section for SLOs (populated in later epics).
- `courses` has no direct `institution_id` -- must join through `programs.institution_id`.
- When building Supabase queries with conditional filters, apply all `.eq()` filters BEFORE `.order()` and `.range()`.
- When querying through intermediate tables, use Supabase `!inner` join syntax. See `docs/solutions/supabase-inner-join-filter-pattern.md`.
- Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"`.
