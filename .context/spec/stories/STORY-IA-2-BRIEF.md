# STORY-IA-2 Brief: SLO Model & Repository

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-2
old_id: S-IA-14-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 2
sprint: 5
size: M
depends_on:
  - STORY-F-1 (faculty) — Course CRUD (courses must exist for SLOs)
blocks:
  - STORY-IA-14 — FULFILLS Workflow
  - STORY-IA-22 — SLO-to-ILO Linking
  - STORY-IA-24 — SLO Management UI
  - STORY-F-33 — (downstream)
personas_served: [institutional_admin, faculty]
epic: E-14 (ILO & SLO CRUD)
feature: F-07 (Learning Objectives)
user_flow: UF-12 (SLO Management)
```

---

## 1. Summary

Build the **SLO (Student Learning Objective)** domain layer: TypeScript types, OOP model class, repository with CRUD + soft-delete, and service with DualWrite. SLOs are **course-scoped** -- each SLO belongs to exactly one course. The Supabase table is `student_learning_objectives` (with `scope='session'` to distinguish from ILOs). The Neo4j label is `SLO` with relationship `(Course)-[:HAS_SLO]->(SLO)`.

Key constraints:
- **ILO and SLO are SEPARATE node types** in Neo4j (architecture rule)
- DualWrite: Supabase first, Neo4j second, `sync_status` tracked
- Code uniqueness enforced within course scope (not globally)
- Bloom taxonomy validation (6 levels)
- Soft-delete via `status='archived'` (not hard delete)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Model -> Repository -> Service -> Tests**

### Task 1: Create SLO types
- **File:** `packages/types/src/objective/slo.types.ts`
- **Action:** Export `BloomLevel`, `ObjectiveStatus`, `SLO`, `CreateSLORequest`, `UpdateSLORequest`, `SLOListQuery`, `SLOListResponse`

### Task 2: Create objective barrel export
- **File:** `packages/types/src/objective/index.ts`
- **Action:** Create barrel re-exporting from `slo.types.ts`

### Task 3: Update root barrel
- **File:** `packages/types/src/index.ts`
- **Action:** Edit to add `export * from "./objective"` line

### Task 4: Create objective error classes
- **File:** `apps/server/src/errors/objective.error.ts`
- **Action:** Create `ObjectiveError`, `DuplicateObjectiveCodeError`, `ObjectiveNotFoundError`, `InvalidBloomLevelError` extending `JourneyOSError`

### Task 5: Build SLO model class
- **File:** `apps/server/src/models/slo.model.ts`
- **Action:** OOP class with `#field` private fields, public getters, `static fromRow(row)` factory, `toJSON()` method

### Task 6: Build SLO repository
- **File:** `apps/server/src/repositories/slo.repository.ts`
- **Action:** `SLORepository` with `create()`, `findById()`, `findByCourseId()`, `update()`, `archive()`, `existsByCode()` methods. All queries include `scope='session'` filter.

### Task 7: Build SLO service with DualWrite
- **File:** `apps/server/src/services/objective/slo.service.ts`
- **Action:** `SLOService` with constructor DI for Supabase + Neo4j. `create()` writes Supabase first, then Neo4j with `(Course)-[:HAS_SLO]->(SLO)`. `sync_status` set to `'synced'` on success, `'failed'` on Neo4j error (Supabase record still persists).

### Task 8: Write service tests
- **File:** `apps/server/src/services/objective/__tests__/slo.service.test.ts`
- **Action:** 8 tests covering CRUD, DualWrite, validation, error handling

### Task 9: Write repository tests
- **File:** `apps/server/src/repositories/__tests__/slo.repository.test.ts`
- **Action:** 4 tests covering query building, scope filtering, code uniqueness

---

## 3. Data Model

```typescript
// packages/types/src/objective/slo.types.ts

/** Bloom's taxonomy cognitive levels */
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

/** Lifecycle status for learning objectives */
export type ObjectiveStatus = "draft" | "active" | "archived";

/** Sync status for DualWrite tracking */
export type SyncStatus = "pending" | "synced" | "failed";

/** Student Learning Objective -- course-scoped */
export interface SLO {
  readonly id: string;
  readonly course_id: string;
  readonly institution_id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
  readonly status: ObjectiveStatus;
  readonly created_by: string;
  readonly graph_node_id: string | null;
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Request to create a new SLO */
export interface CreateSLORequest {
  readonly course_id: string;
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
}

/** Request to update an existing SLO */
export interface UpdateSLORequest {
  readonly title?: string;
  readonly description?: string;
  readonly bloom_level?: BloomLevel;
  readonly status?: ObjectiveStatus;
}

/** Query parameters for SLO list */
export interface SLOListQuery {
  readonly course_id: string;        // Required -- SLOs are always course-scoped
  readonly status?: ObjectiveStatus;  // Filter by status
  readonly bloom_level?: BloomLevel;  // Filter by bloom level
  readonly page?: number;             // Default: 1
  readonly limit?: number;            // Default: 50
}

/** Paginated SLO list response */
export interface SLOListResponse {
  readonly objectives: readonly SLO[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

---

## 4. Database Schema

Uses existing `student_learning_objectives` table. SLOs use `scope='session'`.

```sql
-- Existing table (from DDL -- do NOT recreate)
-- student_learning_objectives (
--   id UUID PK DEFAULT gen_random_uuid(),
--   course_id UUID FK -> courses(id),
--   institution_id UUID FK -> institutions(id),
--   code TEXT NOT NULL,
--   title TEXT NOT NULL,
--   description TEXT,
--   bloom_level TEXT CHECK ('remember'|'understand'|'apply'|'analyze'|'evaluate'|'create'),
--   scope TEXT CHECK ('institutional'|'session') DEFAULT 'session',
--   status TEXT CHECK ('draft'|'active'|'archived') DEFAULT 'draft',
--   created_by UUID FK -> profiles(id),
--   graph_node_id TEXT,
--   sync_status TEXT CHECK ('pending'|'synced'|'failed') DEFAULT 'pending',
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- )

-- Migration: add_slo_indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_slo_code_per_course
  ON student_learning_objectives(course_id, code) WHERE scope = 'session';
CREATE INDEX IF NOT EXISTS idx_slo_course_id_status
  ON student_learning_objectives(course_id, status) WHERE scope = 'session';
CREATE INDEX IF NOT EXISTS idx_slo_institution_id
  ON student_learning_objectives(institution_id) WHERE scope = 'session';
CREATE INDEX IF NOT EXISTS idx_slo_bloom_level
  ON student_learning_objectives(bloom_level) WHERE scope = 'session';
```

**Neo4j schema:**
```cypher
// Create SLO node
CREATE (s:SLO {
  id: $id,
  code: $code,
  title: $title,
  description: $description,
  bloom_level: $bloom_level,
  status: $status
})

// Create relationship to course
MATCH (c:Course {id: $courseId})
CREATE (c)-[:HAS_SLO]->(s:SLO {
  id: $id,
  code: $code,
  title: $title,
  description: $description,
  bloom_level: $bloom_level,
  status: $status
})
```

---

## 5. API Contract

No API endpoints in this story. This is a **model + repository + service** story. The API layer (controller + routes) will be added in STORY-IA-24 (SLO Management UI).

The service exposes these methods for downstream consumers:

```typescript
class SLOService {
  async create(request: CreateSLORequest, createdBy: string, institutionId: string): Promise<SLO>;
  async findById(id: string): Promise<SLO>;
  async findByCourseId(query: SLOListQuery): Promise<SLOListResponse>;
  async update(id: string, request: UpdateSLORequest): Promise<SLO>;
  async archive(id: string): Promise<void>;
}
```

---

## 6. Frontend Spec

No frontend components in this story. The SLO Management UI is STORY-IA-24.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/objective/slo.types.ts` | Types | Create |
| 2 | `packages/types/src/objective/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add objective export) |
| 4 | Supabase migration via MCP (indexes) | Database | Apply |
| 5 | `apps/server/src/errors/objective.error.ts` | Errors | Create |
| 6 | `apps/server/src/models/slo.model.ts` | Model | Create |
| 7 | `apps/server/src/repositories/slo.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/objective/slo.service.ts` | Service | Create |
| 9 | `apps/server/src/services/objective/__tests__/slo.service.test.ts` | Tests | Create |
| 10 | `apps/server/src/repositories/__tests__/slo.repository.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-1 | faculty | **PENDING** | Course CRUD -- courses must exist for SLOs to reference |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig` for driver access
- `apps/server/src/services/dual-write/dual-write.service.ts` -- DualWrite pattern (if exists, otherwise implement inline)
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`

---

## 9. Test Fixtures

```typescript
import { BloomLevel, ObjectiveStatus, SLO, CreateSLORequest } from "@journey-os/types";

// Mock course for SLO association
export const MOCK_COURSE = {
  id: "course-uuid-1",
  institution_id: "inst-uuid-1",
  code: "MED-101",
  title: "Introduction to Medicine",
};

// Mock user creating the SLO
export const MOCK_CREATOR = {
  sub: "faculty-uuid-1",
  institution_id: "inst-uuid-1",
};

// Valid SLO create request
export const VALID_SLO_REQUEST: CreateSLORequest = {
  course_id: "course-uuid-1",
  code: "SLO-MED101-01",
  title: "Identify major organ systems",
  description: "Student can identify and describe the major organ systems of the human body",
  bloom_level: "remember" as BloomLevel,
};

// Mock SLO database row
export const MOCK_SLO_ROW = {
  id: "slo-uuid-1",
  course_id: "course-uuid-1",
  institution_id: "inst-uuid-1",
  code: "SLO-MED101-01",
  title: "Identify major organ systems",
  description: "Student can identify and describe the major organ systems of the human body",
  bloom_level: "remember",
  scope: "session",
  status: "draft",
  created_by: "faculty-uuid-1",
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock SLO after DualWrite sync
export const MOCK_SLO_SYNCED = {
  ...MOCK_SLO_ROW,
  graph_node_id: "neo4j-node-123",
  sync_status: "synced",
};

// Second SLO for list tests
export const MOCK_SLO_ROW_2 = {
  ...MOCK_SLO_ROW,
  id: "slo-uuid-2",
  code: "SLO-MED101-02",
  title: "Explain homeostasis mechanisms",
  description: "Student can explain the mechanisms of homeostasis",
  bloom_level: "understand",
};

// Duplicate code request (should fail)
export const DUPLICATE_CODE_REQUEST: CreateSLORequest = {
  ...VALID_SLO_REQUEST,
  code: "SLO-MED101-01", // Same code as existing
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/objective/__tests__/slo.service.test.ts`

```
describe("SLOService")
  describe("create")
    it("creates SLO in Supabase with scope='session'")
    it("creates SLO node in Neo4j with HAS_SLO relationship to course")
    it("sets sync_status to 'synced' after successful DualWrite")
    it("sets sync_status to 'failed' when Neo4j write fails (Supabase record persists)")
    it("throws DuplicateObjectiveCodeError when code exists for same course")
    it("throws InvalidBloomLevelError for invalid bloom level")
  describe("findById")
    it("returns SLO model from Supabase by id")
    it("throws ObjectiveNotFoundError when id does not exist")
  describe("findByCourseId")
    it("returns paginated SLOs filtered by course_id")
    it("filters by status when provided")
    it("filters by bloom_level when provided")
  describe("update")
    it("updates allowed fields in Supabase and Neo4j")
    it("throws ObjectiveNotFoundError when id does not exist")
  describe("archive")
    it("sets status to 'archived' in Supabase and Neo4j")
    it("throws ObjectiveNotFoundError when id does not exist")
```

**File:** `apps/server/src/repositories/__tests__/slo.repository.test.ts`

```
describe("SLORepository")
  describe("create")
    it("inserts row with scope='session' and returns SLO")
  describe("findByCourseId")
    it("filters by course_id and scope='session'")
    it("applies pagination correctly")
  describe("existsByCode")
    it("returns true when code exists for course_id")
    it("returns false when code does not exist for course_id")
```

**Total: ~19 tests** (15 service + 4 repository)

---

## 11. E2E Test Spec

Not required for this story. This is a backend-only model/repository/service story with no UI.

---

## 12. Acceptance Criteria

1. SLO types are exported from `@journey-os/types`
2. SLO model class uses `#field` JS private syntax with public getters
3. Repository filters by `scope='session'` on all queries (to exclude ILOs)
4. `create()` performs DualWrite: Supabase first, Neo4j second
5. Neo4j node has label `SLO` (not `StudentLearningObjective`)
6. Neo4j relationship `(Course)-[:HAS_SLO]->(SLO)` is created correctly
7. `sync_status` tracks DualWrite result: `'synced'` or `'failed'`
8. Code uniqueness is enforced within course scope
9. Bloom level is validated against 6 allowed values
10. Soft-delete via `archive()` sets `status='archived'`
11. All 19 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| SLO is course-scoped | ARCHITECTURE_v10 4.3: ILO/SLO separation |
| ILO and SLO are separate node types | CLAUDE.md Architecture Rules |
| DualWrite pattern | CLAUDE.md Database Rules |
| Bloom taxonomy 6 levels | Anderson & Krathwohl (2001) |
| student_learning_objectives table | SUPABASE_DDL_v1 |
| HAS_SLO relationship | NEO4J_SCHEMA_v1 Course relationships |
| scope column differentiates ILO/SLO | S-IA-14-2 Acceptance Criteria |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `student_learning_objectives` and `courses` tables exist
- **Neo4j:** Instance running with Course nodes seeded (from F-1)
- **Express:** Server running on port 3001
- **STORY-F-1 must be complete** -- courses must exist before SLOs can reference them

---

## 15. Implementation Notes

- **scope='session' for SLOs:** The `student_learning_objectives` table uses a `scope` column to differentiate SLOs (`scope='session'`) from ILOs (`scope='institutional'`). Every repository method MUST include `scope='session'` in its WHERE clause.
- **Private fields pattern:** `SLOModel` uses `#id`, `#courseId`, `#code` etc. with public getters `get id()`, `get courseId()`.
- **DualWrite error handling:** If Neo4j write fails, catch the error, update `sync_status='failed'` in Supabase, and log. Do NOT rollback the Supabase insert -- the record is still valid, just out of sync.
- **Code format convention:** SLO codes follow `SLO-{COURSE_CODE}-{SEQ}` pattern (e.g., `SLO-MED101-01`). This is a convention, not enforced by the system -- the code field is free text.
- **No controller/routes:** This story builds the domain layer only. The API surface is added in STORY-IA-24.
- **Partial index:** The unique index on `(course_id, code)` uses a WHERE clause `scope='session'` to avoid conflicts with ILO codes.
