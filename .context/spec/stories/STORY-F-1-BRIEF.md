# STORY-F-1 Brief: Course Model & Repository

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-1
old_id: S-F-08-1
epic: E-08 (Course CRUD & Hierarchy)
feature: F-04 (Course & Section Management)
sprint: 4
lane: faculty
lane_priority: 3
within_lane_order: 1
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
  - STORY-IA-1 (institutional_admin) — Institution Users (NOT YET)
blocks:
  - STORY-F-9 — Section CRUD
  - STORY-F-11 — Course ILO Mapping
  - STORY-F-12 — Curriculum Structure View
  - STORY-F-13 — Course Assignment
personas_served: [faculty, institutional_admin]
```

---

## Section 1: Summary

**What to build:** A Course domain model with full CRUD, backed by DualWriteService writing to Supabase (primary) and Neo4j (secondary). Faculty course directors and institutional admins can create, read, update, and soft-delete courses. Each course belongs to a program within an institution.

**Parent epic:** E-08 (Course CRUD & Hierarchy) under F-04 (Course & Section Management). This is the foundational story for all course-related functionality. Without Course CRUD, no sections, ILO mappings, or curriculum views can exist.

**User story:** As a faculty course director, I need to create and manage courses so that I can organize my curriculum content within the institutional hierarchy.

**User flows affected:** UF-12 (Course Setup), UF-14 (Curriculum Management).

**Personas:** Faculty (creates/edits own courses), Institutional Admin (manages all courses in institution).

**Why this story is first in faculty lane:** Courses are the foundational entity for all faculty work. Sections, ILOs, content uploads, and assessments all hang off Course nodes.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Course types and DTOs | `packages/types/src/course/course.types.ts` | 1h |
| 2 | Course types barrel export | `packages/types/src/course/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | Supabase migration: courses table | Supabase MCP | 30m |
| 5 | Course error classes | `apps/server/src/errors/course.error.ts` | 20m |
| 6 | Update errors barrel | `apps/server/src/errors/index.ts` | 5m |
| 7 | CourseRepository (Supabase) | `apps/server/src/repositories/course.repository.ts` | 2h |
| 8 | CourseNeo4jRepository | `apps/server/src/repositories/course-neo4j.repository.ts` | 1.5h |
| 9 | CourseService (DualWrite) | `apps/server/src/services/course/course.service.ts` | 2h |
| 10 | CourseController | `apps/server/src/controllers/course/course.controller.ts` | 1.5h |
| 11 | Register routes in index.ts | `apps/server/src/index.ts` | 15m |
| 12 | API tests: CourseService | `apps/server/src/services/course/__tests__/course.service.test.ts` | 2h |
| 13 | API tests: CourseController | `apps/server/src/controllers/course/__tests__/course.controller.test.ts` | 2h |

**Total estimate:** ~13h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/course/course.types.ts

/** Course status in its lifecycle */
export type CourseStatus = "draft" | "active" | "archived";

/** Sort fields for course listing */
export type CourseSortField = "title" | "code" | "created_at" | "updated_at" | "status";

/** Sort direction */
export type CourseSortDirection = "asc" | "desc";

/** Course creation request DTO */
export interface CreateCourseRequest {
  readonly title: string;
  readonly code: string;
  readonly description: string;
  readonly credits: number;
  readonly academic_year: string;
  readonly program_id: string;
}

/** Course update request DTO (all fields optional) */
export interface UpdateCourseRequest {
  readonly title?: string;
  readonly code?: string;
  readonly description?: string;
  readonly credits?: number;
  readonly academic_year?: string;
  readonly status?: CourseStatus;
}

/** Course list query parameters */
export interface CourseListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly sort_by?: CourseSortField;
  readonly sort_direction?: CourseSortDirection;
  readonly status?: CourseStatus;
  readonly program_id?: string;
  readonly search?: string;
}

/** Stored course record (Supabase row) */
export interface Course {
  readonly id: string;
  readonly institution_id: string;
  readonly program_id: string;
  readonly course_director_id: string;
  readonly title: string;
  readonly code: string;
  readonly description: string;
  readonly credits: number;
  readonly academic_year: string;
  readonly status: CourseStatus;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Sync status for DualWriteService pattern */
export type SyncStatus = "pending" | "synced" | "failed";

/** Course response with computed fields (for API) */
export interface CourseResponse {
  readonly id: string;
  readonly institution_id: string;
  readonly program_id: string;
  readonly course_director_id: string;
  readonly title: string;
  readonly code: string;
  readonly description: string;
  readonly credits: number;
  readonly academic_year: string;
  readonly status: CourseStatus;
  readonly sync_status: SyncStatus;
  readonly section_count: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Course list response item with coverage stats */
export interface CourseListItem {
  readonly id: string;
  readonly title: string;
  readonly code: string;
  readonly credits: number;
  readonly academic_year: string;
  readonly status: CourseStatus;
  readonly course_director_id: string;
  readonly section_count: number;
  readonly created_at: string;
}

/** Neo4j Course node properties */
export interface CourseNodeProperties {
  readonly id: string;
  readonly title: string;
  readonly code: string;
  readonly description: string;
  readonly credits: number;
  readonly academic_year: string;
  readonly status: string;
  readonly institution_id: string;
  readonly program_id: string;
  readonly course_director_id: string;
}
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_courses_table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    program_id UUID NOT NULL,
    course_director_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    credits INTEGER NOT NULL CHECK (credits > 0 AND credits <= 20),
    academic_year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, code, academic_year)
);

-- Indexes for common queries
CREATE INDEX idx_courses_institution_id ON courses(institution_id);
CREATE INDEX idx_courses_program_id ON courses(program_id);
CREATE INDEX idx_courses_course_director_id ON courses(course_director_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_code ON courses(code);

-- RLS: Faculty sees own courses + institution courses; InstAdmin sees institution courses
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty reads own courses" ON courses
    FOR SELECT USING (
        course_director_id = auth.uid()
        OR (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('institutional_admin', 'superadmin')
        AND institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
    );

CREATE POLICY "Course director or inst admin creates courses" ON courses
    FOR INSERT WITH CHECK (
        (
            course_director_id = auth.uid()
            AND (SELECT is_course_director FROM user_profiles WHERE id = auth.uid()) = true
        )
        OR (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'institutional_admin'
    );

CREATE POLICY "Course director or inst admin updates courses" ON courses
    FOR UPDATE USING (
        course_director_id = auth.uid()
        OR (
            (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'institutional_admin'
            AND institution_id = (SELECT institution_id FROM user_profiles WHERE id = auth.uid())
        )
    );

-- SuperAdmin can do anything
CREATE POLICY "SuperAdmin full access to courses" ON courses
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

**Neo4j Schema:**
```cypher
// Course node creation
CREATE (c:Course {
  id: $id,
  title: $title,
  code: $code,
  description: $description,
  credits: $credits,
  academic_year: $academic_year,
  status: $status,
  institution_id: $institution_id,
  program_id: $program_id,
  course_director_id: $course_director_id
})

// Relationships
(p:Program)-[:OFFERS]->(c:Course)
(u:User)-[:DIRECTS]->(c:Course)
(i:Institution)-[:HAS_COURSE]->(c:Course)
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/courses (Auth: faculty, institutional_admin, superadmin)

**Query params:** `?page=1&limit=25&sort_by=title&sort_direction=asc&status=active&program_id=uuid&search=pharma`

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "title": "Pharmacology I",
      "code": "PHARM-101",
      "credits": 4,
      "academic_year": "2026-2027",
      "status": "active",
      "course_director_id": "user-uuid",
      "section_count": 3,
      "created_at": "2026-02-19T12:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 12,
    "total_pages": 1
  }
}
```

### POST /api/v1/courses (Auth: faculty is_course_director, institutional_admin)

**Request:**
```json
{
  "title": "Pharmacology I",
  "code": "PHARM-101",
  "description": "Introduction to pharmacological principles",
  "credits": 4,
  "academic_year": "2026-2027",
  "program_id": "program-uuid"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "uuid-new",
    "institution_id": "inst-uuid",
    "program_id": "program-uuid",
    "course_director_id": "user-uuid",
    "title": "Pharmacology I",
    "code": "PHARM-101",
    "description": "Introduction to pharmacological principles",
    "credits": 4,
    "academic_year": "2026-2027",
    "status": "draft",
    "sync_status": "synced",
    "section_count": 0,
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/courses/:id (Auth: faculty, institutional_admin, superadmin)

**Success Response (200):**
```json
{
  "data": {
    "id": "uuid-1",
    "institution_id": "inst-uuid",
    "program_id": "program-uuid",
    "course_director_id": "user-uuid",
    "title": "Pharmacology I",
    "code": "PHARM-101",
    "description": "Introduction to pharmacological principles",
    "credits": 4,
    "academic_year": "2026-2027",
    "status": "active",
    "sync_status": "synced",
    "section_count": 3,
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### PATCH /api/v1/courses/:id (Auth: course director or institutional_admin)

**Request:**
```json
{
  "title": "Pharmacology I — Revised",
  "credits": 5
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "uuid-1",
    "title": "Pharmacology I — Revised",
    "credits": 5,
    "status": "active",
    "sync_status": "synced",
    "updated_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

### DELETE /api/v1/courses/:id (Auth: course director or institutional_admin)

Soft-delete: sets `status = 'archived'`.

**Success Response (200):**
```json
{
  "data": {
    "id": "uuid-1",
    "status": "archived",
    "updated_at": "2026-02-19T15:00:00Z"
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing required fields, invalid credits range |
| 401 | `UNAUTHORIZED` | No valid JWT |
| 403 | `FORBIDDEN` | User lacks required role or not course director |
| 404 | `COURSE_NOT_FOUND` | Course ID does not exist or is archived |
| 409 | `DUPLICATE_COURSE` | course code + academic_year + institution already exists |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 500 | `SYNC_FAILED` | Supabase succeeded but Neo4j write failed (sync_status = 'failed') |

---

## Section 6: Frontend Spec

Not applicable for this story. STORY-F-1 is a backend-only model and API story. Frontend course views are covered in STORY-F-12 (Curriculum Structure View).

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/course/course.types.ts` | Types | Create |
| 2 | `packages/types/src/course/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add course export) |
| 4 | Supabase migration via MCP | Database | Apply |
| 5 | `apps/server/src/errors/course.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add course errors) |
| 7 | `apps/server/src/repositories/course.repository.ts` | Repository | Create |
| 8 | `apps/server/src/repositories/course-neo4j.repository.ts` | Repository | Create |
| 9 | `apps/server/src/services/course/course.service.ts` | Service | Create |
| 10 | `apps/server/src/controllers/course/course.controller.ts` | Controller | Create |
| 11 | `apps/server/src/index.ts` | Routes | Edit (add course routes) |
| 12 | `apps/server/src/services/course/__tests__/course.service.test.ts` | Tests | Create |
| 13 | `apps/server/src/controllers/course/__tests__/course.controller.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for role-based access control |
| STORY-IA-1 | institutional_admin | **NOT YET** | Institution user management (program_id foreign key). Can stub with seed data. |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client for course table operations
- `neo4j-driver` — Neo4j driver for graph operations
- `express` — Server framework
- `zod` — Request validation
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` — `Neo4jClientConfig`
- `apps/server/src/middleware/auth.middleware.ts` — `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` — `RbacMiddleware` with `AuthRole` enum
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `PaginationMeta`
- `packages/types/src/auth/roles.types.ts` — `AuthRole` enum

### Does NOT Depend On
- Neo4j MCP (uses neo4j-driver directly in repository)
- Frontend/Next.js (no UI in this story)
- DualWriteService as a shared utility (implements dual-write inline in CourseService)

---

## Section 9: Test Fixtures (inline)

```typescript
// Valid course creation
export const VALID_COURSE = {
  title: "Pharmacology I",
  code: "PHARM-101",
  description: "Introduction to pharmacological principles and drug mechanisms",
  credits: 4,
  academic_year: "2026-2027",
  program_id: "program-uuid-001",
};

// Minimal valid course
export const MINIMAL_COURSE = {
  title: "Anatomy Lab",
  code: "ANAT-100",
  description: "",
  credits: 1,
  academic_year: "2026-2027",
  program_id: "program-uuid-001",
};

// Full stored course record
export const STORED_COURSE = {
  id: "course-uuid-001",
  institution_id: "inst-uuid-001",
  program_id: "program-uuid-001",
  course_director_id: "user-uuid-director",
  title: "Pharmacology I",
  code: "PHARM-101",
  description: "Introduction to pharmacological principles",
  credits: 4,
  academic_year: "2026-2027",
  status: "active" as const,
  sync_status: "synced" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Invalid courses
export const MISSING_TITLE = { ...VALID_COURSE, title: "" };
export const MISSING_CODE = { ...VALID_COURSE, code: "" };
export const ZERO_CREDITS = { ...VALID_COURSE, credits: 0 };
export const EXCESSIVE_CREDITS = { ...VALID_COURSE, credits: 25 };
export const MISSING_PROGRAM = { ...VALID_COURSE, program_id: "" };
export const DUPLICATE_CODE = { ...VALID_COURSE, code: "PHARM-101" }; // same code + year + institution

// Auth context fixtures
export const COURSE_DIRECTOR_USER = {
  id: "user-uuid-director",
  email: "director@med.edu",
  role: "faculty" as const,
  is_course_director: true,
  institution_id: "inst-uuid-001",
};

export const NON_DIRECTOR_FACULTY = {
  id: "user-uuid-faculty",
  email: "faculty@med.edu",
  role: "faculty" as const,
  is_course_director: false,
  institution_id: "inst-uuid-001",
};

export const INST_ADMIN_USER = {
  id: "user-uuid-admin",
  email: "admin@med.edu",
  role: "institutional_admin" as const,
  is_course_director: false,
  institution_id: "inst-uuid-001",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/services/course/__tests__/course.service.test.ts`

```
describe("CourseService")
  describe("create")
    ✓ creates course in Supabase with status=draft
    ✓ creates Course node in Neo4j with OFFERS relationship
    ✓ creates DIRECTS relationship from User to Course in Neo4j
    ✓ sets sync_status to 'synced' on success
    ✓ sets sync_status to 'failed' if Neo4j write fails
    ✓ sets course_director_id from authenticated user
    ✓ sets institution_id from authenticated user context
    ✓ rejects missing title (400 VALIDATION_ERROR)
    ✓ rejects missing code (400 VALIDATION_ERROR)
    ✓ rejects credits out of range (400 VALIDATION_ERROR)
    ✓ rejects duplicate code+year+institution (409 DUPLICATE_COURSE)
    ✓ rejects non-course-director faculty (403 FORBIDDEN)

  describe("findById")
    ✓ returns course with section_count
    ✓ returns null for non-existent course
    ✓ returns null for archived course (soft-deleted)
    ✓ scopes to user's institution for non-superadmin

  describe("list")
    ✓ returns paginated courses with meta
    ✓ filters by status
    ✓ filters by program_id
    ✓ searches by title or code (case-insensitive)
    ✓ sorts by specified field and direction
    ✓ defaults to page=1, limit=25, sort_by=created_at desc

  describe("update")
    ✓ updates course in Supabase and Neo4j
    ✓ only allows course director or inst admin
    ✓ rejects update by non-director faculty (403)
    ✓ rejects update of archived course (404)
    ✓ updates sync_status on dual-write

  describe("archive")
    ✓ sets status to 'archived' (soft-delete)
    ✓ updates Neo4j node status
    ✓ rejects archive by non-director faculty (403)
    ✓ returns 404 for already-archived course
```

**File:** `apps/server/src/controllers/course/__tests__/course.controller.test.ts`

```
describe("CourseController")
  describe("POST /api/v1/courses")
    ✓ returns 201 with course data on success
    ✓ returns 400 for invalid request body
    ✓ returns 403 for unauthorized role
    ✓ returns 409 for duplicate course

  describe("GET /api/v1/courses")
    ✓ returns 200 with paginated list
    ✓ passes query params to service

  describe("GET /api/v1/courses/:id")
    ✓ returns 200 with course data
    ✓ returns 404 for non-existent course
    ✓ narrows req.params.id with typeof check

  describe("PATCH /api/v1/courses/:id")
    ✓ returns 200 with updated course
    ✓ returns 403 for non-director

  describe("DELETE /api/v1/courses/:id")
    ✓ returns 200 with archived status
    ✓ returns 404 for already-archived course
```

**Total: ~44 tests** (31 service + 13 controller)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. Course Model & Repository is a backend story. E2E tests for course management will be added when the Course UI story (F-12) is complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | POST /api/v1/courses creates course in Supabase with status='draft' | API test |
| 2 | Course node created in Neo4j with (Program)-[:OFFERS]->(Course) relationship | API test |
| 3 | (User)-[:DIRECTS]->(Course) relationship created in Neo4j | API test |
| 4 | sync_status='synced' when both writes succeed | API test |
| 5 | sync_status='failed' when Neo4j write fails (Supabase still committed) | API test |
| 6 | GET /api/v1/courses returns paginated list with section_count | API test |
| 7 | GET /api/v1/courses/:id returns full course detail | API test |
| 8 | PATCH /api/v1/courses/:id updates both Supabase and Neo4j | API test |
| 9 | DELETE soft-deletes by setting status='archived' | API test |
| 10 | Only course directors and institutional admins can create/update/delete | API test |
| 11 | Non-course-director faculty gets 403 on write operations | API test |
| 12 | Duplicate course code + academic_year + institution returns 409 | API test |
| 13 | All query filters work (status, program_id, search, sort) | API test |
| 14 | req.params.id narrowed with typeof check before passing to service | Code review |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Course CRUD endpoints | API_CONTRACT_v1 SS Course Management |
| Course fields (title, code, credits, etc.) | S-F-08-1 SS Acceptance Criteria |
| DualWrite pattern | ARCHITECTURE_v10 SS 3.2: "Supabase first, Neo4j second, sync_status" |
| Neo4j Course node, OFFERS relationship | NEO4J_SCHEMA_v1 SS Academic Layer |
| DIRECTS relationship | NEO4J_SCHEMA_v1 SS User-Course Links |
| Soft-delete via status='archived' | S-F-08-1 SS Non-Functional: "No hard deletes" |
| RBAC: course director + inst admin | PERMISSION_MATRIX SS course.create, course.update |
| PascalCase Neo4j labels | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `institutions` and `user_profiles` tables exist, `courses` migration applied
- **Neo4j:** Running with existing Institution, Program nodes (from seed or IA-1)
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend model and API only). Frontend prototype needed when F-12 (Curriculum Structure View) is implemented.
