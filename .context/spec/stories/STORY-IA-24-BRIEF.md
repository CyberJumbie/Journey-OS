# STORY-IA-24 Brief: SLO Management UI

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-24
old_id: S-IA-14-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 24
sprint: 5
size: M
depends_on:
  - STORY-IA-2 (institutional_admin) — SLO Model & Repository
blocks: []
personas_served: [institutional_admin, faculty]
epic: E-14 (ILO & SLO CRUD)
feature: F-07 (Learning Objectives)
user_flow: UF-12 (SLO Management)
```

---

## 1. Summary

Build the **SLO Management UI** -- a full CRUD interface for course-level Student Learning Objectives. The page displays SLOs scoped to a selected course, with a course selector at the top. The table shows code, title, Bloom level, status, FULFILLS link status (linked/unlinked to ILOs), and created date. Supports search, filtering, and sorting. Includes a create/edit form and soft-delete. Both Institutional Admins and Course Directors can access this UI.

Key constraints:
- **SLOManagement** is an Organism containing SLOTable and SLOForm Molecules (atomic design)
- **Course-scoped:** SLOs filtered by selected course
- **Course selector** dropdown at top of page
- **FULFILLS link status** shows whether SLO has an approved link to an ILO
- **Custom error class:** `DuplicateSLOCodeError` for uniqueness within course scope
- **Faculty Course Directors** can also access this UI for their own courses

---

## 2. Task Breakdown

Implementation order follows: **Validation -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create SLO validation middleware
- **File:** `apps/server/src/middleware/slo.validation.ts`
- **Action:** Zod schemas for create, update, and query params. Validate code format, title length, bloom_level enum, course_id required on create.

### Task 2: Build SLOController
- **File:** `apps/server/src/controllers/slo.controller.ts`
- **Action:** `handleList(req, res)`, `handleCreate(req, res)`, `handleUpdate(req, res)`, `handleArchive(req, res)`. Uses SLOService from IA-2.

### Task 3: Create SLO routes
- **File:** `apps/server/src/routes/slo.routes.ts`
- **Action:** `GET /api/v1/courses/:courseId/slos`, `POST /api/v1/slos`, `PATCH /api/v1/slos/:id`, `DELETE /api/v1/slos/:id` with InstitutionalAdmin or CourseDirector RBAC

### Task 4: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Mount SLO routes

### Task 5: Build SLOManagement organism
- **File:** `apps/web/src/components/organisms/SLOManagement/SLOManagement.tsx`
- **Action:** Container component with course selector, table, and form

### Task 6: Build SLOTable molecule
- **File:** `apps/web/src/components/molecules/SLOTable.tsx`
- **Action:** Table with sortable headers, search, filters, pagination

### Task 7: Build SLOForm molecule
- **File:** `apps/web/src/components/molecules/SLOForm.tsx`
- **Action:** Create/edit form with code, title, description, Bloom level, course selector

### Task 8: Build SLO list page
- **File:** `apps/web/src/app/(protected)/institution/slos/page.tsx`
- **Action:** Default export page rendering SLOManagement organism

### Task 9: Write controller tests
- **File:** `apps/server/src/tests/slo.controller.test.ts`
- **Action:** 8-10 tests for CRUD endpoints, course scoping, validation, permissions

---

## 3. Data Model

Uses `SLO`, `CreateSLORequest`, `UpdateSLORequest`, `SLOListQuery`, `SLOListResponse` types from STORY-IA-2.

Additional UI-specific types:

```typescript
// Extended for the table display (includes FULFILLS link status)
export interface SLOTableRow {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly bloom_level: BloomLevel;
  readonly status: ObjectiveStatus;
  readonly course_id: string;
  readonly course_name: string;
  readonly fulfills_status: "linked" | "unlinked";  // Has approved FULFILLS to an ILO?
  readonly fulfills_ilo_code: string | null;         // ILO code if linked
  readonly created_at: string;
}

/** Query for SLO list with FULFILLS status */
export interface SLOListWithFulfillsQuery {
  readonly course_id: string;          // Required -- SLOs are always course-scoped
  readonly status?: ObjectiveStatus;
  readonly bloom_level?: BloomLevel;
  readonly fulfills_status?: "linked" | "unlinked";
  readonly search?: string;
  readonly sort_by?: "code" | "title" | "bloom_level" | "status" | "fulfills_status" | "created_at";
  readonly sort_dir?: "asc" | "desc";
  readonly page?: number;
  readonly limit?: number;
}
```

---

## 4. Database Schema

No new tables. Uses `student_learning_objectives` (from IA-2) with FULFILLS join.

**Query for SLO list with FULFILLS status:**
```sql
SELECT
  slo.id,
  slo.code,
  slo.title,
  slo.description,
  slo.bloom_level,
  slo.status,
  slo.course_id,
  c.name AS course_name,
  slo.created_at,
  CASE WHEN fl.id IS NOT NULL THEN 'linked' ELSE 'unlinked' END AS fulfills_status,
  ilo.code AS fulfills_ilo_code
FROM student_learning_objectives slo
JOIN courses c ON c.id = slo.course_id
LEFT JOIN fulfills_links fl ON fl.slo_id = slo.id AND fl.status = 'approved'
LEFT JOIN student_learning_objectives ilo ON ilo.id = fl.ilo_id AND ilo.scope = 'institutional'
WHERE slo.course_id = $course_id
  AND slo.scope = 'session'
  AND slo.institution_id = $institution_id
  AND ($search IS NULL OR slo.title ILIKE '%' || $search || '%' OR slo.code ILIKE '%' || $search || '%')
  AND ($bloom_level IS NULL OR slo.bloom_level = $bloom_level)
  AND ($status IS NULL OR slo.status = $status)
ORDER BY $sort_by $sort_dir
LIMIT $limit OFFSET ($page - 1) * $limit;
```

---

## 5. API Contract

### GET /api/v1/courses/:courseId/slos (Auth: InstitutionalAdmin or Course Director)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |
| `sort_by` | string | `code` | Sort field |
| `sort_dir` | string | `asc` | Sort direction |
| `search` | string | -- | Search title/code (ILIKE) |
| `bloom_level` | string | -- | Filter by Bloom level |
| `status` | string | -- | Filter: draft, active, archived |
| `fulfills_status` | string | -- | Filter: linked, unlinked |

**Success Response (200):**
```json
{
  "data": {
    "objectives": [
      {
        "id": "slo-uuid-1",
        "code": "SLO-PHYS-101-01",
        "title": "Describe cardiovascular physiology",
        "bloom_level": "understand",
        "status": "active",
        "course_id": "course-uuid-1",
        "course_name": "Physiology 101",
        "fulfills_status": "linked",
        "fulfills_ilo_code": "ILO-MSM-01",
        "created_at": "2026-02-01T10:00:00Z"
      },
      {
        "id": "slo-uuid-2",
        "code": "SLO-PHYS-101-02",
        "title": "Explain renal physiology",
        "bloom_level": "understand",
        "status": "active",
        "course_id": "course-uuid-1",
        "course_name": "Physiology 101",
        "fulfills_status": "unlinked",
        "fulfills_ilo_code": null,
        "created_at": "2026-02-02T10:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "total_pages": 1
    }
  },
  "error": null
}
```

### POST /api/v1/slos (Auth: InstitutionalAdmin or Course Director)

**Request Body:**
```json
{
  "code": "SLO-PHYS-101-03",
  "title": "Apply hemodynamic principles to clinical scenarios",
  "description": "Students will apply knowledge of...",
  "bloom_level": "apply",
  "course_id": "course-uuid-1"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "slo-uuid-3",
    "code": "SLO-PHYS-101-03",
    "title": "Apply hemodynamic principles to clinical scenarios",
    "bloom_level": "apply",
    "status": "draft",
    "course_id": "course-uuid-1",
    "sync_status": "synced",
    "created_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/slos/:id (Auth: InstitutionalAdmin or Course Director)

**Request Body:**
```json
{
  "title": "Updated SLO title",
  "bloom_level": "analyze"
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "slo-uuid-1",
    "title": "Updated SLO title",
    "bloom_level": "analyze",
    "updated_at": "2026-02-19T10:05:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/slos/:id (Auth: InstitutionalAdmin or Course Director)

Soft-delete (archives the SLO).

**Success Response (200):**
```json
{
  "data": { "id": "slo-uuid-1", "status": "archived" },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin and not Course Director for this course |
| 400 | `VALIDATION_ERROR` | Invalid bloom_level, missing required fields |
| 404 | `NOT_FOUND` | SLO or course not found |
| 409 | `DUPLICATE_CODE` | SLO code already exists within course |

---

## 6. Frontend Spec

### Page: `/institution/slos` (SLO Management)

**Route:** `apps/web/src/app/(protected)/institution/slos/page.tsx`

**Component hierarchy:**
```
SLOListPage (page.tsx -- default export)
  └── SLOManagement (organism, client component)
        ├── CourseSelector (dropdown at top, selects course context)
        ├── PageHeader ("Student Learning Objectives" + course name + Create button)
        ├── SearchBar (debounced 300ms)
        ├── FilterBar
        │     ├── BloomLevelFilter (dropdown: 6 levels + "All")
        │     ├── StatusFilter (dropdown: draft, active, archived, all)
        │     └── FulfillsFilter (dropdown: linked, unlinked, all)
        ├── SLOTable (molecule)
        │     ├── SortableHeader (code, title, bloom_level, status, fulfills_status, created_at)
        │     └── SLORow (for each SLO)
        │           ├── CodeCell (monospace font)
        │           ├── TitleCell
        │           ├── BloomBadge
        │           ├── StatusBadge
        │           ├── FulfillsBadge (linked=green with ILO code, unlinked=gray "No ILO")
        │           ├── DateCell
        │           └── ActionMenu (edit, archive)
        ├── Pagination
        ├── SLOForm (molecule -- modal)
        │     ├── CodeInput (text, pattern validation)
        │     ├── TitleInput (text, required)
        │     ├── DescriptionTextarea
        │     ├── BloomLevelSelect
        │     ├── CourseDisplay (read-only, shows current course context)
        │     └── SubmitButton
        └── ArchiveConfirmDialog
```

**States:**
1. **No Course Selected** -- Prompt to select a course from dropdown
2. **Loading** -- Skeleton table rows
3. **Empty** -- "No SLOs for this course" with Create button
4. **Data** -- Table with SLOs, filters, sorting
5. **Creating** -- Form modal open for new SLO
6. **Editing** -- Form modal open with existing SLO data
7. **Archiving** -- Confirmation dialog open

**Design tokens:**
- Course selector: shadcn/ui `Select` with `--color-primary` Navy Deep border
- FULFILLS linked badge: `--color-success` green, shows ILO code
- FULFILLS unlinked badge: `--color-muted` gray, "No ILO"
- Bloom badges: Same color scheme as ILO page (consistency)
- Status badges: Same scheme as ILO page (consistency)
- Code cell: `--font-mono` DM Mono

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `apps/server/src/middleware/slo.validation.ts` | Validation | Create |
| 2 | `apps/server/src/controllers/slo.controller.ts` | Controller | Create |
| 3 | `apps/server/src/routes/slo.routes.ts` | Routes | Create |
| 4 | `apps/server/src/index.ts` | Routes | Edit (mount SLO routes) |
| 5 | `apps/web/src/app/(protected)/institution/slos/page.tsx` | View | Create |
| 6 | `apps/web/src/components/organisms/SLOManagement/SLOManagement.tsx` | Organism | Create |
| 7 | `apps/web/src/components/molecules/SLOTable.tsx` | Molecule | Create |
| 8 | `apps/web/src/components/molecules/SLOForm.tsx` | Molecule | Create |
| 9 | `apps/server/src/tests/slo.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-2 | institutional_admin | **PENDING** | SLO model, repository, and service must exist |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `vitest` -- Testing
- `zod` -- Request validation

### Existing Files Needed
- `apps/server/src/services/objective/slo.service.ts` -- SLOService (from IA-2)
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- RBAC enforcement
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `apps/server/src/errors/objective.error.ts` -- `DuplicateObjectiveCodeError` (from IA-2)
- `packages/types/src/objective/slo.types.ts` -- SLO types (from IA-2)

---

## 9. Test Fixtures

```typescript
import { CreateSLORequest, BloomLevel, ObjectiveStatus } from "@journey-os/types";

// Mock InstitutionalAdmin
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Mock Course Director (also has access)
export const COURSE_DIRECTOR_USER = {
  sub: "cd-uuid-1",
  email: "cd@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
};

// Mock course
export const MOCK_COURSE = {
  id: "course-uuid-1",
  name: "Physiology 101",
  institution_id: "inst-uuid-1",
};

// Mock SLOs for table display
export const MOCK_SLO_LIST = [
  {
    id: "slo-uuid-1",
    code: "SLO-PHYS-101-01",
    title: "Describe cardiovascular physiology",
    bloom_level: "understand" as BloomLevel,
    status: "active" as ObjectiveStatus,
    course_id: "course-uuid-1",
    course_name: "Physiology 101",
    fulfills_status: "linked" as const,
    fulfills_ilo_code: "ILO-MSM-01",
    created_at: "2026-02-01T10:00:00Z",
  },
  {
    id: "slo-uuid-2",
    code: "SLO-PHYS-101-02",
    title: "Explain renal physiology",
    bloom_level: "understand" as BloomLevel,
    status: "active" as ObjectiveStatus,
    course_id: "course-uuid-1",
    course_name: "Physiology 101",
    fulfills_status: "unlinked" as const,
    fulfills_ilo_code: null,
    created_at: "2026-02-02T10:00:00Z",
  },
];

// Valid create request
export const VALID_SLO_REQUEST: CreateSLORequest = {
  code: "SLO-PHYS-101-03",
  title: "Apply hemodynamic principles",
  description: "Students will apply knowledge of hemodynamics...",
  bloom_level: "apply" as BloomLevel,
  course_id: "course-uuid-1",
};

// Duplicate code request
export const DUPLICATE_CODE_REQUEST: CreateSLORequest = {
  code: "SLO-PHYS-101-01", // Already exists in course
  title: "Duplicate test",
  description: "Should fail",
  bloom_level: "remember" as BloomLevel,
  course_id: "course-uuid-1",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/slo.controller.test.ts`

```
describe("SLOController")
  describe("GET /api/v1/courses/:courseId/slos")
    it("returns paginated SLO list scoped to course_id for InstitutionalAdmin")
    it("returns SLOs for Course Director with access to the course")
    it("includes FULFILLS link status for each SLO")
    it("filters by bloom_level when provided")
    it("filters by status when provided")
    it("filters by fulfills_status (linked/unlinked) when provided")
    it("searches by title and code (case-insensitive)")
    it("returns 403 for faculty without CD flag for this course")
  describe("POST /api/v1/slos")
    it("creates SLO with valid request and returns 201")
    it("returns 400 for missing course_id")
    it("returns 409 for duplicate code within course")
  describe("PATCH /api/v1/slos/:id")
    it("updates SLO fields and returns 200")
    it("returns 404 for non-existent SLO")
  describe("DELETE /api/v1/slos/:id")
    it("archives SLO (soft delete) and returns 200")
```

**Total: ~14 tests**

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/slo-management.spec.ts`

```
describe("SLO Management")
  it("InstitutionalAdmin can select a course, create an SLO, and view it in the table")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/slos
    3. Select "Physiology 101" from course dropdown
    4. Click "Create SLO" button
    5. Fill form: code, title, description, bloom level
    6. Submit and verify new SLO appears in table
    7. Verify FULFILLS status shows "No ILO" for new SLO
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. SLO list page scoped to selected course
2. Course selector dropdown switches course context
3. Table shows code, title, Bloom level, status, FULFILLS link status, created date
4. Search by title or code works (case-insensitive)
5. Filter by Bloom level, status, and FULFILLS status
6. Create SLO form includes course association
7. Edit SLO inline or via modal
8. Soft-delete with confirmation dialog
9. Duplicate SLO code within course returns 409
10. Faculty Course Directors can access their own courses
11. Non-CD faculty receive 403
12. All 14 API tests pass
13. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| SLO table columns | S-IA-14-4 Acceptance Criteria |
| SLOManagement is an Organism | S-IA-14-4 Notes |
| Course selector at top | S-IA-14-4 Acceptance Criteria |
| FULFILLS link status column | S-IA-14-4 Notes |
| DuplicateSLOCodeError within course | S-IA-14-4 Notes |
| Faculty CD access | S-IA-14-4 Notes |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `student_learning_objectives`, `courses`, and `fulfills_links` tables exist
- **Neo4j:** Instance running with SLO and Course nodes
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **STORY-IA-2 must be complete** -- SLO service, model, repository exist
- **STORY-F-1 should be complete** -- courses must exist for SLOs to reference

---

## 15. Implementation Notes

- **Course scoping:** The SLO list endpoint takes `courseId` as a path parameter: `GET /api/v1/courses/:courseId/slos`. All SLOs returned belong to that course AND the institution from `req.user.institution_id`. Double-scope for security.
- **Permission model:** InstitutionalAdmin can access all courses in their institution. Course Director can only access courses they direct. Verify with a `course_directors` join or `courses.director_id` check.
- **FULFILLS status join:** Use LEFT JOIN with `fulfills_links` to determine if an SLO has an approved FULFILLS link. If the `fulfills_links` table does not exist yet (IA-22 not complete), return `"unlinked"` for all rows.
- **SLOManagement mirrors ILOManagement:** The two organisms share the same component structure (table + form + filters). Consider extracting shared table/form patterns if both are implemented close together.
- **Course selector:** Load the list of courses from `GET /api/v1/courses` (filtered by institution). Store selected `course_id` in URL query parameter for bookmarkability: `/institution/slos?course=course-uuid-1`.
- **Code uniqueness scope:** SLO codes must be unique WITHIN a course, not globally. The unique index on `student_learning_objectives` should be `(course_id, code) WHERE scope='session'`.
- **Private fields pattern:** `SLOController` uses `readonly #sloService: SLOService` with constructor DI.
- **Faculty access check:** For Course Director access, check if the faculty user is the director of the requested course. Use `courses.director_id = req.user.sub` or a `course_directors` junction table.
