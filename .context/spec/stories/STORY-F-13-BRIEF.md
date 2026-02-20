# STORY-F-13 Brief: Course List & Detail Views

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-13
old_id: S-F-08-4
epic: E-08 (Course CRUD & Hierarchy)
feature: F-04 (Course Management)
sprint: 4
lane: faculty
lane_priority: 3
within_lane_order: 13
size: M
depends_on:
  - STORY-F-1 (faculty) — Course Model & Repository (must exist)
blocks: []
personas_served: [faculty, faculty_course_director]
```

---

## Section 1: Summary

Faculty members need to browse, search, and inspect courses within their institution. This story delivers a **course list page** with a filterable, searchable, paginated table and a **course detail page** showing basic info, the Section > Session hierarchy tree, course director info, and a placeholder SLO summary section. On the backend, two new controller endpoints are added: `GET /api/v1/courses` (list with filters) and `GET /api/v1/courses/:id` (detail with hierarchy). On the frontend, the list page uses a `CourseList` organism composed of `CourseTable` and `CourseFilters` molecules, and the detail page uses a `CourseDetail` organism with a tree view.

**User Story:** As a Faculty member, I need filterable course list and detail views so that I can quickly find courses and see their full configuration and hierarchy.

Key constraints:
- Cursor-based pagination for consistent results during concurrent edits
- Faculty sees only courses in their own institution (RLS + RBAC)
- Course directors see edit controls; regular faculty see read-only detail
- Design tokens only for all styling (Three Sheet Hierarchy: Cream > White > Parchment)
- SLO summary section is a placeholder (populated in E-09)

---

## Section 2: Task Breakdown

Implementation order follows Types -> Service -> Controller -> View -> Tests.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `CourseListQuery`, `CourseListItem`, `CourseDetail`, `CourseHierarchyNode` types | `packages/types/src/course/course-view.types.ts` | 30m |
| 2 | Create barrel export for course view types | `packages/types/src/course/index.ts` | 5m |
| 3 | Create custom error class `CourseNotFoundError` | `apps/server/src/errors/course.errors.ts` | 10m |
| 4 | Implement `CourseListService` with `list()` and `getDetail()` methods | `apps/server/src/services/course/course-list.service.ts` | 90m |
| 5 | Implement `CourseListController` with `handleList()` and `handleGetDetail()` | `apps/server/src/controllers/course/course-list.controller.ts` | 60m |
| 6 | Register routes: GET /courses, GET /courses/:id | `apps/server/src/api/courses.routes.ts` | 15m |
| 7 | Build `CourseFilters` molecule (program, year, status dropdowns + search) | `apps/web/src/components/molecules/CourseFilters.tsx` | 45m |
| 8 | Build `CourseTable` molecule (sortable data table with pagination) | `apps/web/src/components/molecules/CourseTable.tsx` | 60m |
| 9 | Build `CourseList` organism (combines filters + table) | `apps/web/src/components/organisms/CourseList.tsx` | 30m |
| 10 | Build `CourseHierarchyTree` molecule (collapsible tree for sections/sessions) | `apps/web/src/components/molecules/CourseHierarchyTree.tsx` | 45m |
| 11 | Build `CourseDetail` organism (info panel + hierarchy + CD + SLO placeholder) | `apps/web/src/components/organisms/CourseDetail.tsx` | 45m |
| 12 | Create course list page | `apps/web/src/app/(dashboard)/faculty/courses/page.tsx` | 20m |
| 13 | Create course detail page | `apps/web/src/app/(dashboard)/faculty/courses/[id]/page.tsx` | 20m |
| 14 | Write controller tests (10 tests) | `apps/server/src/tests/course/course-list.controller.test.ts` | 60m |
| 15 | Wire up routes in API index | `apps/server/src/api/index.ts` | 10m |

**Total estimate:** ~9 hours (Size M)

---

## Section 3: Data Model (inline, complete)

### `packages/types/src/course/course-view.types.ts`

```typescript
/**
 * Types for course list and detail views.
 * These are read-only view DTOs; the mutable Course model
 * is defined in STORY-F-1 (Course Model & Repository).
 */

/** Status of a course */
export type CourseStatus = 'active' | 'archived' | 'draft';

/** Query parameters for listing courses */
export interface CourseListQuery {
  /** Cursor for pagination (course ID to start after) */
  readonly cursor?: string;
  /** Number of items per page (default 20, max 100) */
  readonly limit?: number;
  /** Filter by program ID */
  readonly program_id?: string;
  /** Filter by academic year (e.g., "2025-2026") */
  readonly academic_year?: string;
  /** Filter by status */
  readonly status?: CourseStatus;
  /** Search by course title or code */
  readonly search?: string;
  /** Sort field (default: "title") */
  readonly sort_by?: 'title' | 'code' | 'updated_at' | 'academic_year';
  /** Sort direction (default: "asc") */
  readonly sort_dir?: 'asc' | 'desc';
}

/** Summary item in the course list table */
export interface CourseListItem {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly program_name: string;
  readonly program_id: string;
  readonly course_director_name: string;
  readonly course_director_id: string;
  readonly status: CourseStatus;
  readonly academic_year: string;
  readonly section_count: number;
  readonly session_count: number;
  readonly updated_at: string;
}

/** Cursor-based pagination metadata */
export interface CursorPaginationMeta {
  readonly limit: number;
  readonly has_next: boolean;
  readonly next_cursor: string | null;
  readonly total: number;
}

/** Response for course list endpoint */
export interface CourseListResponse {
  readonly data: readonly CourseListItem[];
  readonly meta: CursorPaginationMeta;
}

/** Node in the course hierarchy tree (Section or Session) */
export interface CourseHierarchyNode {
  readonly id: string;
  readonly type: 'section' | 'session';
  readonly title: string;
  readonly order: number;
  readonly children: readonly CourseHierarchyNode[];
}

/** Course detail view DTO */
export interface CourseDetail {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly program_name: string;
  readonly program_id: string;
  readonly course_director: {
    readonly id: string;
    readonly display_name: string;
    readonly email: string;
  };
  readonly status: CourseStatus;
  readonly academic_year: string;
  readonly credit_hours: number;
  readonly hierarchy: readonly CourseHierarchyNode[];
  readonly slo_count: number; // placeholder count, detail in E-09
  readonly institution_id: string;
  readonly graph_node_id: string | null;
  readonly sync_status: 'pending' | 'synced' | 'failed';
  readonly created_at: string;
  readonly updated_at: string;
}
```

---

## Section 4: Database Schema

**No new tables.** This story reads from existing tables created by STORY-F-1 (Course Model):

```sql
-- Existing tables (from STORY-F-1, reference only)
-- courses: id, institution_id, code, title, description, program_id,
--   course_director_id, status, academic_year, credit_hours,
--   graph_node_id, sync_status, created_at, updated_at
-- course_sections: id, course_id, title, order, created_at, updated_at
-- course_sessions: id, section_id, title, order, created_at, updated_at

-- Query for list view (joins program + course director profile)
-- SELECT c.*, p.name AS program_name,
--   prof.display_name AS course_director_name,
--   (SELECT COUNT(*) FROM course_sections WHERE course_id = c.id) AS section_count,
--   (SELECT COUNT(*) FROM course_sessions cs
--     JOIN course_sections sect ON cs.section_id = sect.id
--     WHERE sect.course_id = c.id) AS session_count
-- FROM courses c
-- JOIN programs p ON c.program_id = p.id
-- JOIN user_profiles prof ON c.course_director_id = prof.id
-- WHERE c.institution_id = $institution_id
-- AND ... (filters)
-- ORDER BY ... (sort)
-- LIMIT $limit

-- Cursor-based pagination:
-- WHERE c.id > $cursor (with matching ORDER BY)
```

RLS on `courses` table already restricts reads to the user's institution (from STORY-F-1).

---

## Section 5: API Contract

Base URL: `/api/v1`
Auth: Bearer JWT (Supabase Auth) in `Authorization` header
All responses: `{ data, error, meta }` envelope

### 5.1 GET /api/v1/courses

**Auth:** faculty (AuthRole.FACULTY or AuthRole.INST_ADMIN)
**Description:** List courses in the user's institution with optional filters, search, and cursor-based pagination.

**Query Params:**
```
?cursor=uuid&limit=20&program_id=uuid&academic_year=2025-2026&status=active&search=cardio&sort_by=title&sort_dir=asc
```

**Response (200):**
```json
{
  "data": [
    {
      "id": "course-001",
      "code": "MED-301",
      "title": "Cardiovascular Systems",
      "program_name": "MD Program",
      "program_id": "prog-001",
      "course_director_name": "Dr. Sarah Carter",
      "course_director_id": "user-001",
      "status": "active",
      "academic_year": "2025-2026",
      "section_count": 4,
      "session_count": 24,
      "updated_at": "2026-02-10T14:30:00Z"
    }
  ],
  "error": null,
  "meta": {
    "limit": 20,
    "has_next": true,
    "next_cursor": "course-020",
    "total": 45
  }
}
```

**Error Responses:**
- `400 VALIDATION_ERROR` -- Invalid query params (negative limit, invalid sort field)
- `401 UNAUTHORIZED` -- Missing or invalid JWT
- `403 FORBIDDEN` -- Role not authorized

### 5.2 GET /api/v1/courses/:id

**Auth:** faculty (same institution only)
**Description:** Get course detail with hierarchy tree, course director info, and SLO count placeholder.

**Response (200):**
```json
{
  "data": {
    "id": "course-001",
    "code": "MED-301",
    "title": "Cardiovascular Systems",
    "description": "Comprehensive study of the cardiovascular system including anatomy, physiology, pathology, and pharmacology.",
    "program_name": "MD Program",
    "program_id": "prog-001",
    "course_director": {
      "id": "user-001",
      "display_name": "Dr. Sarah Carter",
      "email": "scarter@msm.edu"
    },
    "status": "active",
    "academic_year": "2025-2026",
    "credit_hours": 6,
    "hierarchy": [
      {
        "id": "sect-001",
        "type": "section",
        "title": "Anatomy & Embryology",
        "order": 1,
        "children": [
          {
            "id": "sess-001",
            "type": "session",
            "title": "Heart Chambers & Great Vessels",
            "order": 1,
            "children": []
          },
          {
            "id": "sess-002",
            "type": "session",
            "title": "Coronary Circulation",
            "order": 2,
            "children": []
          }
        ]
      },
      {
        "id": "sect-002",
        "type": "section",
        "title": "Physiology",
        "order": 2,
        "children": [
          {
            "id": "sess-003",
            "type": "session",
            "title": "Cardiac Cycle & Hemodynamics",
            "order": 1,
            "children": []
          }
        ]
      }
    ],
    "slo_count": 0,
    "institution_id": "inst-001",
    "graph_node_id": "neo4j-course-001",
    "sync_status": "synced",
    "created_at": "2026-01-05T08:00:00Z",
    "updated_at": "2026-02-10T14:30:00Z"
  },
  "error": null
}
```

**Error Responses:**
- `401 UNAUTHORIZED` -- Missing or invalid JWT
- `403 FORBIDDEN` -- Course belongs to a different institution
- `404 COURSE_NOT_FOUND` -- Course ID does not exist

---

## Section 6: Frontend Spec

### Page: `/faculty/courses` (course list)

**Route:** `apps/web/src/app/(dashboard)/faculty/courses/page.tsx`

**Component hierarchy (Atomic Design):**
```
CoursesPage (page.tsx -- default export)
  └── CourseList (Organism)
        ├── CourseFilters (Molecule)
        │     ├── ProgramSelect (Atom -- shadcn/ui Select)
        │     ├── AcademicYearSelect (Atom -- shadcn/ui Select)
        │     ├── StatusSelect (Atom -- shadcn/ui Select)
        │     └── SearchInput (Atom -- shadcn/ui Input with debounce)
        └── CourseTable (Molecule)
              ├── DataTable (shadcn/ui Table)
              ├── Sortable column headers
              └── CursorPagination (Atom -- Prev/Next buttons)
```

**States:**
1. **Loading** -- Skeleton table with 5 placeholder rows
2. **Empty** -- "No courses found" with filter reset suggestion
3. **Populated** -- Table with course rows
4. **Error** -- Toast notification with retry button
5. **Filtered** -- Active filter badges above table with clear-all option

**CourseFilters behavior:**
- All filters apply on change (no submit button)
- Search input has 300ms debounce
- Filters combine with AND logic
- Active filters shown as badges with X to remove
- "Clear all" button when any filter is active

**CourseTable columns:**
| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Code | 100px | Yes | Course code (e.g., MED-301) |
| Title | flex | Yes | Course title (clickable link to detail) |
| Program | 150px | No | Program name |
| Course Director | 150px | No | CD display name |
| Status | 80px | No | Badge: green (active), gray (archived), yellow (draft) |
| Academic Year | 100px | Yes | Year range |

**Pagination:**
- Cursor-based: "Previous" and "Next" buttons
- Page size selector: 10, 20, 50
- Total count displayed: "Showing 1-20 of 45 courses"

### Page: `/faculty/courses/[id]` (course detail)

**Route:** `apps/web/src/app/(dashboard)/faculty/courses/[id]/page.tsx`

**Component hierarchy:**
```
CourseDetailPage (page.tsx -- default export)
  └── CourseDetail (Organism)
        ├── CourseInfoCard (Molecule)
        │     ├── Code, Title, Description
        │     ├── StatusBadge (Atom)
        │     ├── Program link
        │     └── Edit button (visible to CD only)
        ├── CourseDirectorCard (Molecule)
        │     ├── Avatar (placeholder)
        │     ├── Name, Email
        │     └── "Contact" button (mailto link)
        ├── CourseHierarchyTree (Molecule)
        │     ├── Collapsible section nodes
        │     └── Session leaf nodes
        └── SLOPlaceholder (Molecule)
              └── "Student Learning Outcomes will appear here" message
```

**Design tokens:**
- Surface: White sheet for cards (Three Sheet Hierarchy)
- Card: Parchment inner for hierarchy tree
- Primary: Navy Deep for headings and links
- Status badges: Green/active, Gray/archived, Yellow/draft
- Typography: Lora for page heading, Source Sans 3 for body text and labels
- Spacing: design token `--space-4` for card gaps, `--space-6` for section gaps

**CourseHierarchyTree behavior:**
- All sections expanded by default
- Click section header to collapse/expand
- Session nodes show order number as prefix
- Indentation: 24px per level
- Section icon: folder; Session icon: file-text (from lucide-react)

---

## Section 7: Files to Create

Implementation order: Types -> Errors -> Service -> Controller -> Views -> Tests

```
# 1. Types (packages/types)
packages/types/src/course/course-view.types.ts
packages/types/src/course/index.ts

# 2. Errors (apps/server)
apps/server/src/errors/course.errors.ts

# 3. Service (apps/server)
apps/server/src/services/course/course-list.service.ts

# 4. Controller (apps/server)
apps/server/src/controllers/course/course-list.controller.ts

# 5. Routes (apps/server)
apps/server/src/api/courses.routes.ts

# 6. Frontend components (apps/web)
apps/web/src/components/molecules/CourseFilters.tsx
apps/web/src/components/molecules/CourseTable.tsx
apps/web/src/components/molecules/CourseHierarchyTree.tsx
apps/web/src/components/organisms/CourseList.tsx
apps/web/src/components/organisms/CourseDetail.tsx

# 7. Pages (apps/web)
apps/web/src/app/(dashboard)/faculty/courses/page.tsx
apps/web/src/app/(dashboard)/faculty/courses/[id]/page.tsx

# 8. Tests (apps/server)
apps/server/src/tests/course/course-list.controller.test.ts
```

**Files to modify (wire-up):**
```
apps/server/src/api/index.ts                 -- Register course routes
apps/server/src/composition-root.ts          -- Wire CourseListService -> CourseListController
packages/types/src/index.ts                  -- Re-export course view types
```

**Total files:** 13 new + 3 modified

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-1 | faculty | **Must be DONE** | Course model, repository, `courses` table, `course_sections`, `course_sessions` tables |

### NPM Packages (already in monorepo)
- `express` -- Route handling
- `zod` -- Input validation
- `@supabase/supabase-js` -- Supabase client for reads
- `vitest` -- Testing
- `lucide-react` -- Icons for tree view
- `@tanstack/react-query` or fetch wrapper -- Data fetching in frontend

### NPM Packages (may need installation)
- None expected; shadcn/ui Table component should already be available.

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`, `AuthRole`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `AuthUser`

---

## Section 9: Test Fixtures (inline)

### Faculty Users

```typescript
export const FACULTY_USER = {
  id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
  email: "dr.carter@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: true,
  display_name: "Dr. Sarah Carter",
};

export const FACULTY_NON_CD = {
  id: "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb",
  email: "dr.johnson@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
  display_name: "Dr. Mark Johnson",
};

export const FACULTY_OTHER_INSTITUTION = {
  id: "cccccccc-3333-3333-3333-cccccccccccc",
  email: "dr.williams@howard.edu",
  role: "faculty" as const,
  institution_id: "inst-0002-0002-0002-000000000002",
  is_course_director: false,
  display_name: "Dr. Lisa Williams",
};
```

### Course Fixtures

```typescript
export const COURSE_LIST_ITEMS = [
  {
    id: "course-0001",
    code: "MED-301",
    title: "Cardiovascular Systems",
    program_name: "MD Program",
    program_id: "prog-0001",
    course_director_name: "Dr. Sarah Carter",
    course_director_id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    status: "active" as const,
    academic_year: "2025-2026",
    section_count: 4,
    session_count: 24,
    updated_at: "2026-02-10T14:30:00Z",
  },
  {
    id: "course-0002",
    code: "MED-302",
    title: "Respiratory Systems",
    program_name: "MD Program",
    program_id: "prog-0001",
    course_director_name: "Dr. Mark Johnson",
    course_director_id: "bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb",
    status: "active" as const,
    academic_year: "2025-2026",
    section_count: 3,
    session_count: 18,
    updated_at: "2026-02-05T09:00:00Z",
  },
  {
    id: "course-0003",
    code: "MED-201",
    title: "Biochemistry Foundations",
    program_name: "MD Program",
    program_id: "prog-0001",
    course_director_name: "Dr. Sarah Carter",
    course_director_id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    status: "archived" as const,
    academic_year: "2024-2025",
    section_count: 5,
    session_count: 30,
    updated_at: "2025-06-01T08:00:00Z",
  },
];

export const COURSE_DETAIL_FIXTURE = {
  id: "course-0001",
  code: "MED-301",
  title: "Cardiovascular Systems",
  description: "Comprehensive study of the cardiovascular system including anatomy, physiology, pathology, and pharmacology.",
  program_name: "MD Program",
  program_id: "prog-0001",
  course_director: {
    id: "aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa",
    display_name: "Dr. Sarah Carter",
    email: "scarter@msm.edu",
  },
  status: "active" as const,
  academic_year: "2025-2026",
  credit_hours: 6,
  hierarchy: [
    {
      id: "sect-001",
      type: "section" as const,
      title: "Anatomy & Embryology",
      order: 1,
      children: [
        { id: "sess-001", type: "session" as const, title: "Heart Chambers & Great Vessels", order: 1, children: [] },
        { id: "sess-002", type: "session" as const, title: "Coronary Circulation", order: 2, children: [] },
      ],
    },
    {
      id: "sect-002",
      type: "section" as const,
      title: "Physiology",
      order: 2,
      children: [
        { id: "sess-003", type: "session" as const, title: "Cardiac Cycle & Hemodynamics", order: 1, children: [] },
      ],
    },
  ],
  slo_count: 0,
  institution_id: "inst-0001-0001-0001-000000000001",
  graph_node_id: "neo4j-course-001",
  sync_status: "synced" as const,
  created_at: "2026-01-05T08:00:00Z",
  updated_at: "2026-02-10T14:30:00Z",
};
```

---

## Section 10: API Test Spec (vitest)

**File:** `apps/server/src/tests/course/course-list.controller.test.ts`
**Total tests:** 10

### Controller Tests

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
// vi.hoisted() for mocks that vi.mock() closures reference
const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: { from: vi.fn() },
}));

describe('CourseListController', () => {
  describe('GET /api/v1/courses', () => {
    it('returns paginated course list with default limit of 20', async () => {
      // Assert: 200 status
      // Assert: data is array of CourseListItem
      // Assert: meta has limit, has_next, next_cursor, total
    });

    it('filters by program_id', async () => {
      // Query: ?program_id=prog-0001
      // Assert: all returned courses have program_id = prog-0001
    });

    it('filters by academic_year', async () => {
      // Query: ?academic_year=2025-2026
      // Assert: all returned courses have academic_year = 2025-2026
    });

    it('filters by status', async () => {
      // Query: ?status=active
      // Assert: all returned courses have status = active
    });

    it('searches by title (case-insensitive)', async () => {
      // Query: ?search=cardio
      // Assert: returned courses have "cardio" in title (case-insensitive)
    });

    it('searches by code', async () => {
      // Query: ?search=MED-301
      // Assert: returned courses include MED-301
    });

    it('applies cursor-based pagination correctly', async () => {
      // Query: ?cursor=course-0001&limit=1
      // Assert: returned courses start after course-0001
      // Assert: meta.has_next reflects remaining items
      // Assert: meta.next_cursor is set when more items exist
    });

    it('rejects invalid query params with 400 VALIDATION_ERROR', async () => {
      // Query: ?limit=-1 or ?sort_by=invalid_field
      // Assert: 400 status
      // Assert: error.code = 'VALIDATION_ERROR'
    });
  });

  describe('GET /api/v1/courses/:id', () => {
    it('returns course detail with hierarchy tree', async () => {
      // Assert: 200 status
      // Assert: data has hierarchy array with sections containing sessions
      // Assert: course_director object has id, display_name, email
      // Assert: slo_count is a number (placeholder = 0)
    });

    it('returns 404 COURSE_NOT_FOUND for non-existent course', async () => {
      // Params: id = 'nonexistent-uuid'
      // Assert: 404 status
      // Assert: error.code = 'COURSE_NOT_FOUND'
    });
  });
});
```

### Test Structure Notes

- Use `vi.hoisted()` to declare Supabase mock variables before `vi.mock()` closures reference them.
- Mock `req.user` with `FACULTY_USER` fixture for auth context.
- Supabase mock chains: `from('courses').select(...).eq(...).order(...).limit(...)` -- create separate mock objects per chain stage (see `docs/solutions/supabase-mock-factory.md`).

---

## Section 11: E2E Test Spec (Playwright)

Not required for this story. Course list/detail is not one of the 5 critical user journeys. E2E coverage will be added when the full Course Management flow (E-08) is complete.

---

## Section 12: Acceptance Criteria

- [ ] Course list page at `/faculty/courses` displays courses in a filterable table
- [ ] Table columns: code, title, program, course director, status, academic year
- [ ] Filter by: program, academic year, status (active/archived/draft)
- [ ] Search by course title or code (case-insensitive, 300ms debounce)
- [ ] Cursor-based pagination with configurable page size (10, 20, 50)
- [ ] Course detail page at `/faculty/courses/[id]` shows full course info
- [ ] Detail page shows Section > Session hierarchy as a collapsible tree
- [ ] Detail page shows course director info (name, email)
- [ ] Detail page has SLO summary placeholder section
- [ ] Edit button visible only to course director
- [ ] Faculty sees only courses from their own institution
- [ ] GET /api/v1/courses returns paginated, filtered list
- [ ] GET /api/v1/courses/:id returns detail with hierarchy
- [ ] 404 returned for non-existent course ID
- [ ] All 10 API tests pass
- [ ] TypeScript strict, named exports only (except page.tsx default exports)
- [ ] Design tokens only, no hardcoded styling values

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/spec/stories/S-F-08-4.md` | Original story with acceptance criteria, implementation layers, dependencies |
| `.context/source/03-schema/API_CONTRACT_v1.md` | API conventions (envelope `{ data, error, meta }`, pagination, error codes, `/api/v1` base) |
| `.context/source/03-schema/SUPABASE_DDL_v1.md` | Table conventions, RLS patterns, index naming. Course tables defined in F-1 |
| `.context/source/04-process/CODE_STANDARDS.md` | MVC layer rules, Atomic Design hierarchy, OOP standards, testing standards |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Three Sheet Hierarchy design tokens, monorepo structure |

---

## Section 14: Environment Prerequisites

### Required Services
- **Supabase:** PostgreSQL with `courses`, `course_sections`, `course_sessions`, `programs`, `user_profiles` tables migrated (from STORY-F-1)
- **Node.js:** v20+ runtime
- **Next.js:** v15 web app running on port 3000
- **Express:** Server running on port 3001

### Required Environment Variables
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Pre-implementation Checks
1. Verify `courses` table exists in Supabase with RLS policies (from STORY-F-1)
2. Verify `course_sections` and `course_sessions` tables exist (from STORY-F-1)
3. Verify `programs` table exists for the program join
4. Verify route registration pattern in `apps/server/src/api/index.ts`

---

## Section 15: Implementation Notes

- **Cursor-based pagination:** Use the course `id` (UUID) as the cursor. Query with `WHERE id > $cursor ORDER BY id ASC LIMIT $limit + 1`. If the result has `limit + 1` rows, `has_next = true` and `next_cursor = result[limit - 1].id`. Return only `limit` rows.
- **Search:** Use Supabase `.ilike('title', `%${search}%`)` or `.or(`title.ilike.%${search}%,code.ilike.%${search}%`)` for combined title/code search.
- **Hierarchy query:** Fetch sections for the course, then sessions for each section. Build the tree in the service layer, not via recursive SQL. This keeps the query simple and allows sorting by `order` field at each level.
- **SLO placeholder:** The `slo_count` field returns 0 for now. In E-09 (SLO Management), this will query the `slos` table with `COUNT(*) WHERE course_id = $id`.
- **Edit button visibility:** Pass `is_course_director` from `req.user` to the detail response, or check `course_director_id === req.user.id` on the frontend. The edit form itself is in a separate story.
- **Narrow `req.params`:** Express `req.params.id` is `string | string[]` in strict mode. Narrow with `typeof req.params.id === 'string'` before passing to service.
- **Error classes:** `CourseNotFoundError` extends `JourneyOSError` with code `COURSE_NOT_FOUND` and HTTP status 404.

### Zod Validation Schema for List Query

```typescript
import { z } from 'zod';

export const CourseListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  program_id: z.string().uuid().optional(),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  search: z.string().max(200).optional(),
  sort_by: z.enum(['title', 'code', 'updated_at', 'academic_year']).default('title'),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
});
```

### Error Class Definition

```typescript
// apps/server/src/errors/course.errors.ts
import { JourneyOSError } from './base.errors';

export class CourseNotFoundError extends JourneyOSError {
  constructor(courseId: string) {
    super(`Course '${courseId}' not found`, 'COURSE_NOT_FOUND');
  }
}
```
