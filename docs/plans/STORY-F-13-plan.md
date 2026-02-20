# Plan: STORY-F-13 — Course List & Detail Views

## Status: Nearly Complete — Service Test Remaining

The backend (types, error, repository, service, controller, routes) and frontend (components, pages) are **fully implemented**. The controller test exists with 6 passing tests. The only missing deliverable is the **service-layer test**.

---

## What Already Exists (Do NOT Re-Implement)

### Backend
| Layer | File | Status |
|-------|------|--------|
| Types | `packages/types/src/course/course-view.types.ts` | `CourseListItem`, `CourseListViewResponse`, `CourseDetailView` |
| Types barrel | `packages/types/src/course/index.ts` | Exports `course-view.types` |
| Error | `apps/server/src/errors/course.error.ts` | `CourseNotFoundError` (code: `"COURSE_NOT_FOUND"`) |
| Repository | `apps/server/src/repositories/course.repository.ts` | `listEnriched()`, `findByIdEnriched()` |
| Service | `apps/server/src/services/course/course-view.service.ts` | `listView()`, `getDetailView()` |
| Controller | `apps/server/src/controllers/course/course-view.controller.ts` | `handleListView()`, `handleGetDetailView()` |
| Controller test | `apps/server/src/controllers/course/__tests__/course-view.controller.test.ts` | 6 tests passing |
| Routes | `apps/server/src/index.ts` (lines 469–482) | `GET /api/v1/courses/view`, `GET /api/v1/courses/:id/view` |

### Frontend
| Layer | File | Status |
|-------|------|--------|
| List page | `apps/web/src/app/(dashboard)/faculty/courses/page.tsx` | Renders `FacultyCourseList` |
| Detail page | `apps/web/src/app/(dashboard)/faculty/courses/[id]/page.tsx` | Renders `FacultyCourseDetail` |
| List organism | `apps/web/src/components/course/faculty-course-list.tsx` | Fetch + filter + pagination |
| Table | `apps/web/src/components/course/course-list-table.tsx` | Sortable, paginated |
| Filters | `apps/web/src/components/course/course-filters.tsx` | Search, status, academic_year |
| Detail organism | `apps/web/src/components/course/faculty-course-detail.tsx` | Info + CD + hierarchy + SLO placeholder |
| Hierarchy tree | `apps/web/src/components/course/course-hierarchy-tree.tsx` | Collapsible sections/sessions |

---

## Tasks (1 remaining)

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Write `CourseViewService` unit tests (10–12 tests) | `apps/server/src/services/course/__tests__/course-view.service.test.ts` | 60m |

---

## Implementation Order

Create → Run → Verify

---

## Patterns to Follow

- `apps/server/src/services/course/__tests__/course.service.test.ts` — sibling mock factory pattern: `createMockRepository()` returns partial mock cast through `unknown`
- `apps/server/src/controllers/course/__tests__/course-view.controller.test.ts` — fixture constants (reuse same shape)
- `docs/solutions/supabase-mock-factory.md` — mock chain pattern (not needed here: service test mocks at interface level, no Supabase chains)
- Use `.rejects.toThrow(CourseNotFoundError)` (class form), never string form
- ESM `import` for `@journey-os/types`, never `require()`

---

## Test Strategy for `course-view.service.test.ts`

### Mock Structure

```typescript
function createMockRepository() {
  return {
    listEnriched: vi.fn(),
    findByIdEnriched: vi.fn(),
  } as unknown as CourseRepository;
}

function createMockHierarchyService() {
  return {
    getCourseHierarchy: vi.fn(),
  } as unknown as HierarchyService;
}
```

### Test Cases

**`listView(query)` — 4 tests:**
1. Delegates to `repository.listEnriched()` and returns result unchanged
2. Passes filter params through to repository
3. Passes pagination params through to repository
4. Propagates repository errors (no catch in service)

**`getDetailView(id)` — 8 tests:**
5. Returns `CourseDetailView` with hierarchy and director info
6. Calls `findByIdEnriched` and `getCourseHierarchy` in parallel (`Promise.all`)
7. Throws `CourseNotFoundError` when `findByIdEnriched` returns `null`
8. Handles `null` `program_name` (no program assigned)
9. Handles `null` director (no course director assigned)
10. `slo_count` is always `0` (placeholder)
11. Maps `hierarchy.sections` to `detail.hierarchy`
12. Propagates `getCourseHierarchy` errors

### Key Service Behavior Notes

- `listView()` is pure delegation — no transformation
- `getDetailView()` uses `Promise.all` for parallel fetch, so `getCourseHierarchy` still runs even if `findByIdEnriched` returns null (error thrown after both resolve)
- `slo_count` is hardcoded to `0`
- `course` fields are cast with `as string`, `as number` — mock must use matching shapes
- `description`, `department`, `program_id`, etc. use `?? null` fallback

---

## Risks / Edge Cases

1. **Mock shape must match `findByIdEnriched` return** — it returns `{ course: Record<string, unknown>, program_name: string | null, director: { id, full_name, email } | null }`. The `course` object has untyped fields accessed via `as string` casts.
2. **`Promise.all` error propagation** — if `getCourseHierarchy` throws and `findByIdEnriched` resolves, the service throws the hierarchy error (not `CourseNotFoundError`). Test this edge case.
3. **No Supabase mock needed** — this is a service-layer test. Both dependencies are mocked at the interface level.

---

## Acceptance Criteria (from brief, with status)

- [x] Course list page at `/faculty/courses` displays courses in a filterable table
- [x] Table columns: code, title, program, course director, status, academic year
- [x] Filter by: program, academic year, status (active/archived/draft)
- [x] Search by course title or code (case-insensitive, 300ms debounce)
- [x] Offset-based pagination with configurable page size (adapted from brief's cursor-based)
- [x] Course detail page at `/faculty/courses/[id]` shows full course info
- [x] Detail page shows Section > Session hierarchy as a collapsible tree
- [x] Detail page shows course director info (name, email)
- [x] Detail page has SLO summary placeholder section
- [x] Edit button visible only to course director
- [x] Faculty sees only courses from their own institution
- [x] `GET /api/v1/courses/view` returns paginated, filtered list
- [x] `GET /api/v1/courses/:id/view` returns detail with hierarchy
- [x] 404 returned for non-existent course ID
- [x] Controller tests pass (6 tests)
- [ ] **Service tests pass (10–12 tests) ← remaining work**
- [x] TypeScript strict, named exports only (except page.tsx default exports)
- [x] Design tokens only, no hardcoded styling values
