# STORY-F-11 Brief: Course Hierarchy

## 0. Lane & Priority

```yaml
story_id: STORY-F-11
old_id: S-F-08-2
lane: faculty
lane_priority: 3
within_lane_order: 11
sprint: 4
size: M
depends_on:
  - STORY-F-1 (faculty) — Course Model (course types + table must exist)
blocks:
  - STORY-F-20 — Course Creation Wizard (needs hierarchy CRUD)
personas_served: [faculty, institutional_admin]
epic: E-08 (Course CRUD & Hierarchy)
feature: F-04 (Course Management)
user_flow: UF-09 (Course Setup & Configuration)
```

## 1. Summary

Build the **course hierarchy layer** supporting the structure: Institution > Program > Course > Section > Session. This story introduces three new entity types (Program, Section, Session) with full CRUD through the MVC stack. Each entity is scoped to its parent: Programs belong to an institution, Sections belong to a Course (with position-based ordering), and Sessions belong to a Section (with scheduling fields). All three entities are dual-written to Supabase and Neo4j with relationships: `(Program)-[:OFFERS]->(Course)-[:HAS_SECTION]->(Section)-[:HAS_SESSION]->(Session)`. A cascading read endpoint returns a full nested hierarchy for a given course.

Key constraints:
- DualWrite pattern: Supabase first, Neo4j second, `sync_status = 'synced'`
- Section ordering via `position` integer (for drag-and-drop reordering)
- Session scheduling: `week_number`, `day_of_week`, `start_time`, `end_time`
- Neo4j traversal: single Cypher query for full course hierarchy subtree
- Hierarchy validation: section must belong to its course, session must belong to its section

## 2. Task Breakdown

1. **Types** -- Create `Program`, `Section`, `Session`, hierarchy DTOs in `packages/types/src/course/`
2. **Migration** -- Create `programs`, `sections`, `sessions` tables in Supabase
3. **Error classes** -- `HierarchyValidationError`, `HierarchyNotFoundError` in `apps/server/src/errors/`
4. **Repositories** -- `ProgramRepository`, `SectionRepository`, `SessionRepository` with CRUD
5. **Service** -- `HierarchyService` enforcing parent-child constraints, cascading reads, DualWrite
6. **Controller** -- `HierarchyController` with endpoints for all three entities
7. **Routes** -- Protected routes under `/api/v1/programs`, `/api/v1/courses/:id/sections`, `/api/v1/sections/:id/sessions`
8. **Neo4j seeding** -- Relationship creation in DualWrite
9. **API tests** -- 16 tests covering CRUD, constraints, cascading reads, DualWrite
10. **Wire up** -- Register routes in `apps/server/src/index.ts`

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/course/hierarchy.types.ts

/** Days of the week for session scheduling */
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

/** Sync status for dual-write entities */
export type SyncStatus = "synced" | "pending" | "failed";

/** Program: institution-scoped container for courses */
export interface Program {
  readonly id: string;
  readonly institution_id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly is_active: boolean;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Section: course-scoped, ordered container for sessions */
export interface Section {
  readonly id: string;
  readonly course_id: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly is_active: boolean;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Session: section-scoped, scheduled teaching unit */
export interface Session {
  readonly id: string;
  readonly section_id: string;
  readonly title: string;
  readonly description: string;
  readonly week_number: number;
  readonly day_of_week: DayOfWeek;
  readonly start_time: string;   // HH:mm format (24h)
  readonly end_time: string;     // HH:mm format (24h)
  readonly is_active: boolean;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Create DTOs */
export interface CreateProgramRequest {
  readonly institution_id: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
}

export interface CreateSectionRequest {
  readonly course_id: string;
  readonly title: string;
  readonly description?: string;
  readonly position?: number;  // auto-assigned if omitted (max + 1)
}

export interface CreateSessionRequest {
  readonly section_id: string;
  readonly title: string;
  readonly description?: string;
  readonly week_number: number;
  readonly day_of_week: DayOfWeek;
  readonly start_time: string;
  readonly end_time: string;
}

/** Update DTOs (all fields optional) */
export interface UpdateProgramRequest {
  readonly name?: string;
  readonly code?: string;
  readonly description?: string;
  readonly is_active?: boolean;
}

export interface UpdateSectionRequest {
  readonly title?: string;
  readonly description?: string;
  readonly position?: number;
  readonly is_active?: boolean;
}

export interface UpdateSessionRequest {
  readonly title?: string;
  readonly description?: string;
  readonly week_number?: number;
  readonly day_of_week?: DayOfWeek;
  readonly start_time?: string;
  readonly end_time?: string;
  readonly is_active?: boolean;
}

/** Nested hierarchy response (cascading read) */
export interface CourseHierarchy {
  readonly course_id: string;
  readonly course_name: string;
  readonly course_code: string;
  readonly sections: ReadonlyArray<SectionWithSessions>;
}

export interface SectionWithSessions {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly position: number;
  readonly sessions: ReadonlyArray<Session>;
}

/** Reorder sections request */
export interface ReorderSectionsRequest {
  readonly section_ids: ReadonlyArray<string>;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_course_hierarchy_tables

-- Programs: institution-scoped containers for courses
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

-- Sections: course-scoped, ordered containers for sessions
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions: section-scoped, scheduled teaching units
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    week_number INTEGER NOT NULL CHECK (week_number > 0),
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('synced', 'pending', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX idx_programs_institution_id ON programs(institution_id);
CREATE INDEX idx_programs_code ON programs(code);
CREATE INDEX idx_sections_course_id ON sections(course_id);
CREATE INDEX idx_sections_position ON sections(course_id, position);
CREATE INDEX idx_sessions_section_id ON sessions(section_id);
CREATE INDEX idx_sessions_schedule ON sessions(section_id, week_number, day_of_week);

-- RLS: scoped by institution via auth context
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Programs: institution members can read, admins/faculty can write
CREATE POLICY "Institution members read programs" ON programs
    FOR SELECT USING (
        institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
        OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "Admins and faculty write programs" ON programs
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'institutional_admin')
    );

-- Sections: accessible via course's institution scope
CREATE POLICY "Institution members read sections" ON sections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses c
            JOIN programs p ON c.program_id = p.id
            WHERE c.id = sections.course_id
            AND (
                p.institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
                OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
            )
        )
    );

CREATE POLICY "Faculty write sections" ON sections
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'institutional_admin', 'faculty')
    );

-- Sessions: accessible via section's course's institution scope
CREATE POLICY "Institution members read sessions" ON sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sections s
            JOIN courses c ON s.course_id = c.id
            JOIN programs p ON c.program_id = p.id
            WHERE s.id = sessions.section_id
            AND (
                p.institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
                OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
            )
        )
    );

CREATE POLICY "Faculty write sessions" ON sessions
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'institutional_admin', 'faculty')
    );
```

**Neo4j schema:**
```cypher
// Node labels (PascalCase per convention)
(:Program {id, institution_id, name, code})
(:Section {id, course_id, title, position})
(:Session {id, section_id, title, week_number, day_of_week, start_time, end_time})

// Relationships (typed with direction)
(Program)-[:OFFERS]->(Course)
(Course)-[:HAS_SECTION]->(Section)
(Section)-[:HAS_SESSION]->(Session)
```

## 5. API Contract (complete request/response)

### POST /api/v1/programs (Auth: institutional_admin+)

**Request:**
```json
{
  "institution_id": "inst-uuid-1",
  "name": "Doctor of Medicine",
  "code": "MD-2026",
  "description": "4-year MD program"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "prog-uuid-1",
    "institution_id": "inst-uuid-1",
    "name": "Doctor of Medicine",
    "code": "MD-2026",
    "description": "4-year MD program",
    "is_active": true,
    "sync_status": "synced",
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/courses/:courseId/sections (Auth: faculty+)

**Request:**
```json
{
  "course_id": "course-uuid-1",
  "title": "Cardiovascular System",
  "description": "Anatomy, physiology, and pathology of the cardiovascular system",
  "position": 1
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "section-uuid-1",
    "course_id": "course-uuid-1",
    "title": "Cardiovascular System",
    "description": "Anatomy, physiology, and pathology of the cardiovascular system",
    "position": 1,
    "is_active": true,
    "sync_status": "synced",
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/sections/:sectionId/sessions (Auth: faculty+)

**Request:**
```json
{
  "section_id": "section-uuid-1",
  "title": "Cardiac Anatomy Lecture",
  "description": "Heart chambers, valves, great vessels",
  "week_number": 3,
  "day_of_week": "monday",
  "start_time": "09:00",
  "end_time": "10:30"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "session-uuid-1",
    "section_id": "section-uuid-1",
    "title": "Cardiac Anatomy Lecture",
    "description": "Heart chambers, valves, great vessels",
    "week_number": 3,
    "day_of_week": "monday",
    "start_time": "09:00",
    "end_time": "10:30",
    "is_active": true,
    "sync_status": "synced",
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/courses/:courseId/hierarchy (Auth: faculty+)

**Success Response (200) -- cascading read:**
```json
{
  "data": {
    "course_id": "course-uuid-1",
    "course_name": "Medical Sciences I",
    "course_code": "MS-101",
    "sections": [
      {
        "id": "section-uuid-1",
        "title": "Cardiovascular System",
        "description": "...",
        "position": 1,
        "sessions": [
          {
            "id": "session-uuid-1",
            "section_id": "section-uuid-1",
            "title": "Cardiac Anatomy Lecture",
            "description": "...",
            "week_number": 3,
            "day_of_week": "monday",
            "start_time": "09:00",
            "end_time": "10:30",
            "is_active": true,
            "sync_status": "synced",
            "created_at": "2026-02-19T12:00:00Z",
            "updated_at": "2026-02-19T12:00:00Z"
          }
        ]
      }
    ]
  },
  "error": null
}
```

### PUT /api/v1/courses/:courseId/sections/reorder (Auth: faculty+)

**Request:**
```json
{
  "section_ids": ["section-uuid-3", "section-uuid-1", "section-uuid-2"]
}
```

**Success Response (200):**
```json
{
  "data": { "reordered": 3 },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 400 | `HIERARCHY_VALIDATION_ERROR` | Invalid data, constraint violation (e.g., end_time <= start_time) |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Insufficient role or wrong institution |
| 404 | `HIERARCHY_NOT_FOUND` | Parent entity does not exist |
| 409 | `DUPLICATE_CODE` | Program code already exists in institution |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

No frontend pages are introduced in this story. The hierarchy CRUD API is consumed by STORY-F-20 (Course Creation Wizard). The cascading read endpoint powers the course detail view in future stories.

### Future consumer reference:
```
CourseCreationWizard (STORY-F-20)
  ├── Step 1: Course basics (existing course model)
  ├── Step 2: Section builder (uses POST/PUT /sections)
  ├── Step 3: Session scheduler (uses POST/PUT /sessions)
  └── Step 4: Review & publish
```

**Design tokens:** N/A for this story (API-only).

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/course/hierarchy.types.ts` | Types | Create |
| 2 | `packages/types/src/course/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add course export) |
| 4 | Supabase migration via MCP (3 tables) | Database | Apply |
| 5 | `apps/server/src/errors/hierarchy.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 7 | `apps/server/src/repositories/program.repository.ts` | Repository | Create |
| 8 | `apps/server/src/repositories/section.repository.ts` | Repository | Create |
| 9 | `apps/server/src/repositories/session.repository.ts` | Repository | Create |
| 10 | `apps/server/src/services/course/hierarchy.service.ts` | Service | Create |
| 11 | `apps/server/src/controllers/course/hierarchy.controller.ts` | Controller | Create |
| 12 | `apps/server/src/index.ts` | Routes | Edit (add hierarchy routes) |
| 13 | `apps/server/src/__tests__/hierarchy/hierarchy.service.test.ts` | Tests | Create |
| 14 | `apps/server/src/__tests__/hierarchy/hierarchy.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-1 | faculty | **DONE** | Course model + `courses` table must exist (sections FK to courses) |
| STORY-U-3 | universal | **DONE** | AuthMiddleware for protected routes |
| STORY-U-6 | universal | **DONE** | RbacMiddleware for role enforcement |
| STORY-U-4 | universal | **DONE** | Neo4j client config for DualWrite |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver for DualWrite
- `express` -- Server framework
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig` for graph operations
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`, `rbac.require()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `AuthTokenPayload`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
import { AuthRole } from "@journey-os/types";

// Mock faculty user (can create sections/sessions)
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

// Mock institutional admin (can create programs)
export const ADMIN_USER = {
  ...FACULTY_USER,
  sub: "admin-uuid-1",
  email: "admin@msm.edu",
  role: AuthRole.INSTITUTIONAL_ADMIN,
};

// Mock student (should be denied write access)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: AuthRole.STUDENT,
};

// Valid program
export const VALID_PROGRAM = {
  institution_id: "inst-uuid-1",
  name: "Doctor of Medicine",
  code: "MD-2026",
  description: "4-year MD program",
};

// Valid section
export const VALID_SECTION = {
  course_id: "course-uuid-1",
  title: "Cardiovascular System",
  description: "Anatomy, physiology, and pathology of the cardiovascular system",
  position: 1,
};

// Valid session
export const VALID_SESSION = {
  section_id: "section-uuid-1",
  title: "Cardiac Anatomy Lecture",
  description: "Heart chambers, valves, great vessels",
  week_number: 3,
  day_of_week: "monday" as const,
  start_time: "09:00",
  end_time: "10:30",
};

// Invalid session (end before start)
export const INVALID_SESSION_TIME = {
  ...VALID_SESSION,
  start_time: "14:00",
  end_time: "10:00",
};

// Invalid session (bad day)
export const INVALID_SESSION_DAY = {
  ...VALID_SESSION,
  day_of_week: "funday" as string,
};

// Mock stored entities
export const STORED_PROGRAM = {
  id: "prog-uuid-1",
  ...VALID_PROGRAM,
  is_active: true,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

export const STORED_SECTION = {
  id: "section-uuid-1",
  ...VALID_SECTION,
  is_active: true,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

export const STORED_SESSION = {
  id: "session-uuid-1",
  ...VALID_SESSION,
  is_active: true,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Mock nested hierarchy response
export const MOCK_COURSE_HIERARCHY = {
  course_id: "course-uuid-1",
  course_name: "Medical Sciences I",
  course_code: "MS-101",
  sections: [
    {
      ...STORED_SECTION,
      sessions: [STORED_SESSION],
    },
  ],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/hierarchy/hierarchy.controller.test.ts`

```
describe("HierarchyController")
  describe("createProgram")
    > creates program with valid data and DualWrites to Neo4j (201)
    > rejects missing required fields (400 HIERARCHY_VALIDATION_ERROR)
    > rejects duplicate program code within institution (409)
    > rejects student role (403 FORBIDDEN)

  describe("createSection")
    > creates section with auto-assigned position if omitted (201)
    > creates section with explicit position (201)
    > rejects if course_id does not exist (404 HIERARCHY_NOT_FOUND)
    > DualWrites Section node and HAS_SECTION relationship

  describe("createSession")
    > creates session with valid schedule (201)
    > rejects end_time <= start_time (400 HIERARCHY_VALIDATION_ERROR)
    > rejects invalid day_of_week (400 HIERARCHY_VALIDATION_ERROR)
    > rejects if section_id does not exist (404 HIERARCHY_NOT_FOUND)
    > DualWrites Session node and HAS_SESSION relationship

  describe("getCourseHierarchy")
    > returns nested sections with sessions ordered by position (200)
    > returns empty sections array for course with no sections
    > rejects unauthenticated request (401)
```

**File:** `apps/server/src/__tests__/hierarchy/hierarchy.service.test.ts`

```
describe("HierarchyService")
  describe("reorderSections")
    > updates position for each section in provided order
    > throws HierarchyValidationError if section_ids contain invalid IDs

  describe("DualWrite")
    > sets sync_status to 'synced' when both Supabase and Neo4j succeed
    > sets sync_status to 'failed' when Neo4j write fails (Supabase still persists)
```

**Total: ~18 tests** (15 controller + 3 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The hierarchy API is backend-only with no user-facing UI. E2E coverage will be added with STORY-F-20 (Course Creation Wizard) which consumes this API.

## 12. Acceptance Criteria

1. Programs can be created, read, updated within institution scope
2. Sections can be created, read, updated, reordered within course scope
3. Sessions can be created, read, updated within section scope with scheduling fields
4. All three entities dual-write to Neo4j with correct relationships
5. `sync_status` is `synced` on successful DualWrite, `failed` if Neo4j write fails
6. Cascading read: `GET /api/v1/courses/:id/hierarchy` returns nested sections and sessions
7. Section position is auto-assigned (max + 1) when omitted from create request
8. Session schedule validation: `end_time` must be after `start_time`
9. Parent existence validated: 404 if course_id or section_id does not exist
10. Role enforcement: students cannot create/update hierarchy entities
11. Neo4j traversal: single query fetches full hierarchy subtree
12. All 18 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Course hierarchy structure | ARCHITECTURE_v10 SS 5.2: "Institution > Program > Course > Section > Session" |
| Neo4j relationships | S-F-08-2 SS Acceptance Criteria: "(Program)-[:OFFERS]->(Course)-[:HAS_SECTION]->(Section)-[:HAS_SESSION]->(Session)" |
| DualWrite pattern | ARCHITECTURE_v10 SS 5.4: "Supabase first, Neo4j second, sync_status = synced" |
| Section ordering | S-F-08-2 SS Notes: "position integer field for drag-and-drop reordering" |
| Session scheduling fields | S-F-08-2 SS Notes: "week_number, day_of_week, start_time, end_time" |
| Cascading read | S-F-08-2 SS Notes: "fetching a course returns its sections and sessions in a nested structure" |
| Neo4j traversal query | S-F-08-2 SS Notes: "single query to fetch full hierarchy subtree" |
| Blocks Course Creation Wizard | FULL-DEPENDENCY-GRAPH: S-F-08-2 -> S-F-08-3 |

## 14. Environment Prerequisites

- **Supabase:** Project running, `courses` table exists (STORY-F-1), `programs`/`sections`/`sessions` tables created via migration
- **Neo4j:** Running and accessible, `Course` nodes exist (STORY-F-1)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **No frontend needed** for this story (API-only)

## 15. Implementation Notes

- **DualWrite pattern:** Follow the existing pattern -- Supabase insert first, then Neo4j `CREATE` node and relationship. If Neo4j fails, update `sync_status = 'failed'` on the Supabase record but do NOT roll back the Supabase insert.
- **Neo4j node labels:** PascalCase per convention: `Program`, `Section`, `Session`. Relationships: `OFFERS`, `HAS_SECTION`, `HAS_SESSION` (SCREAMING_SNAKE_CASE).
- **Auto-position for sections:** When `position` is omitted, query `SELECT MAX(position) FROM sections WHERE course_id = ?` and assign `max + 1` (or 0 if no sections exist).
- **Reorder sections:** Accept array of section_ids in desired order. Update each section's `position` to its index in the array. Use a transaction for atomicity.
- **Time validation:** `start_time` and `end_time` are stored as `TIME` in Postgres. Validate format `HH:mm` server-side before insert.
- **OOP pattern:** All repositories and services use JS `#private` fields for internal state (`#supabaseClient`, `#neo4jClient`). Constructor DI for all dependencies.
- **Express `req.params` narrowing:** Always use `typeof courseId === "string"` guard before passing params to service methods.
- **vi.hoisted() for mocks:** Neo4j driver mocks must use `vi.hoisted()` since `vi.mock()` hoists before variable declarations.
- **Named exports only** for all services, repositories, types, and error classes.
