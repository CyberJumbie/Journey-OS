# STORY-IA-4 Brief: ILO Model & Repository

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-4
old_id: S-IA-14-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 4
sprint: 5
size: M
depends_on:
  - STORY-SA-5 (superadmin) — Approval Workflow (institution must exist)
blocks:
  - STORY-IA-10 — Framework Linking Service
  - STORY-IA-14 — FULFILLS Workflow
  - STORY-IA-23 — ILO Management UI
  - STORY-IA-27 — Compliance Computation Service
personas_served: [institutional_admin]
epic: E-14 (ILO & SLO CRUD)
feature: F-07 (Learning Objectives)
user_flow: UF-11 (ILO Management & Framework Mapping)
```

---

## 1. Summary

Build the **ILO (Institutional Learning Objective)** domain layer: TypeScript types, OOP model class, repository with CRUD + soft-delete, and service with DualWrite. ILOs are **institution-scoped** -- each ILO belongs to an institution, not a course. The Supabase table is `student_learning_objectives` with `scope='institutional'`. The Neo4j label is `ILO` with relationship `(Institution)-[:DEFINES]->(ILO)`.

ILOs represent what an institution expects all graduates to achieve. They are distinct from SLOs (course-level objectives). The architecture rule is explicit: **ILO and SLO are SEPARATE node types** in Neo4j.

Key constraints:
- ILOs use the same `student_learning_objectives` table as SLOs, differentiated by `scope='institutional'`
- Neo4j label is `ILO` (not `InstitutionalLearningObjective`)
- Relationship: `(Institution)-[:DEFINES]->(ILO)`
- DualWrite: Supabase first, Neo4j second, `sync_status` tracked
- Code uniqueness enforced within institution scope (not globally)
- Bloom taxonomy validation (6 levels)
- Shares `BloomLevel`, `ObjectiveStatus`, `SyncStatus` types with SLO (from `packages/types/src/objective/`)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Errors -> Model -> Repository -> Service -> Tests**

### Task 1: Create ILO types
- **File:** `packages/types/src/objective/ilo.types.ts`
- **Action:** Export `ILO`, `CreateILORequest`, `UpdateILORequest`, `ILOListQuery`, `ILOListResponse`. Import shared types (`BloomLevel`, `ObjectiveStatus`, `SyncStatus`) from `slo.types.ts` or a shared `objective-common.types.ts`.

### Task 2: Update objective barrel export
- **File:** `packages/types/src/objective/index.ts`
- **Action:** Edit to re-export from `ilo.types.ts`

### Task 3: Create or update objective error classes
- **File:** `apps/server/src/errors/objective.error.ts`
- **Action:** If created by IA-2, edit to add any ILO-specific errors. If IA-2 is not yet done, create with `ObjectiveError`, `DuplicateObjectiveCodeError`, `ObjectiveNotFoundError`, `InvalidBloomLevelError`.

### Task 4: Build ILO model class
- **File:** `apps/server/src/models/ilo.model.ts`
- **Action:** OOP class with `#field` private fields, public getters, `static fromRow(row)` factory, `toJSON()` method. Similar structure to SLO model but without `course_id`.

### Task 5: Build ILO repository
- **File:** `apps/server/src/repositories/ilo.repository.ts`
- **Action:** `ILORepository` with `create()`, `findById()`, `findByInstitutionId()`, `update()`, `archive()`, `existsByCode()`. All queries include `scope='institutional'` filter.

### Task 6: Build ILO service with DualWrite
- **File:** `apps/server/src/services/objective/ilo.service.ts`
- **Action:** `ILOService` with constructor DI for Supabase + Neo4j. `create()` writes Supabase first, then Neo4j with `(Institution)-[:DEFINES]->(ILO)`. Tracks `sync_status`.

### Task 7: Write service tests
- **File:** `apps/server/src/services/objective/__tests__/ilo.service.test.ts`
- **Action:** 8 tests covering CRUD, DualWrite, validation, error handling

### Task 8: Write repository tests
- **File:** `apps/server/src/repositories/__tests__/ilo.repository.test.ts`
- **Action:** 4 tests covering query building, scope filtering, code uniqueness

---

## 3. Data Model

```typescript
// packages/types/src/objective/ilo.types.ts

import { BloomLevel, ObjectiveStatus, SyncStatus } from "./slo.types";

/** Institutional Learning Objective -- institution-scoped */
export interface ILO {
  readonly id: string;
  readonly institution_id: string;
  readonly code: string;              // Unique within institution (e.g., "ILO-MSM-01")
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
  readonly status: ObjectiveStatus;
  readonly created_by: string;        // UUID of the user who created it
  readonly graph_node_id: string | null;  // Neo4j internal node ID
  readonly sync_status: SyncStatus;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Request to create a new ILO */
export interface CreateILORequest {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly bloom_level: BloomLevel;
}

/** Request to update an existing ILO */
export interface UpdateILORequest {
  readonly title?: string;
  readonly description?: string;
  readonly bloom_level?: BloomLevel;
  readonly status?: ObjectiveStatus;
}

/** Query parameters for ILO list */
export interface ILOListQuery {
  readonly institution_id: string;       // Required -- ILOs are always institution-scoped
  readonly status?: ObjectiveStatus;     // Filter by status
  readonly bloom_level?: BloomLevel;     // Filter by bloom level
  readonly search?: string;              // Search title/code (ILIKE)
  readonly page?: number;                // Default: 1
  readonly limit?: number;               // Default: 50
}

/** Paginated ILO list response */
export interface ILOListResponse {
  readonly objectives: readonly ILO[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

**Shared types (from `slo.types.ts` or refactored to `objective-common.types.ts`):**
```typescript
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
export type ObjectiveStatus = "draft" | "active" | "archived";
export type SyncStatus = "pending" | "synced" | "failed";
```

---

## 4. Database Schema

Uses existing `student_learning_objectives` table. ILOs use `scope='institutional'`.

```sql
-- Existing table (from DDL -- do NOT recreate)
-- student_learning_objectives (
--   id UUID PK DEFAULT gen_random_uuid(),
--   course_id UUID FK -> courses(id),         -- NULL for ILOs (institution-scoped)
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

-- Migration: add_ilo_indexes
-- ILO code uniqueness within institution (scope='institutional')
CREATE UNIQUE INDEX IF NOT EXISTS idx_ilo_code_per_institution
  ON student_learning_objectives(institution_id, code) WHERE scope = 'institutional';

-- ILO query performance indexes
CREATE INDEX IF NOT EXISTS idx_ilo_institution_id_status
  ON student_learning_objectives(institution_id, status) WHERE scope = 'institutional';
CREATE INDEX IF NOT EXISTS idx_ilo_bloom_level
  ON student_learning_objectives(bloom_level) WHERE scope = 'institutional';
CREATE INDEX IF NOT EXISTS idx_ilo_search
  ON student_learning_objectives(institution_id, title, code) WHERE scope = 'institutional';
```

**Key difference from SLOs:**
- ILOs: `scope='institutional'`, `course_id=NULL`, scoped by `institution_id`
- SLOs: `scope='session'`, `course_id` required, scoped by `course_id`

**Neo4j schema:**
```cypher
// Create ILO node
CREATE (i:ILO {
  id: $id,
  code: $code,
  title: $title,
  description: $description,
  bloom_level: $bloom_level,
  status: $status
})

// Create relationship to institution
MATCH (inst:Institution {id: $institutionId})
CREATE (inst)-[:DEFINES]->(i:ILO {
  id: $id,
  code: $code,
  title: $title,
  description: $description,
  bloom_level: $bloom_level,
  status: $status
})

// Update ILO node
MATCH (i:ILO {id: $id})
SET i.title = $title, i.description = $description,
    i.bloom_level = $bloom_level, i.status = $status

// Archive ILO (soft delete in Neo4j)
MATCH (i:ILO {id: $id})
SET i.status = 'archived'
```

---

## 5. API Contract

No API endpoints in this story. This is a **model + repository + service** story. The API layer (controller + routes) will be added in STORY-IA-23 (ILO Management UI).

The service exposes these methods for downstream consumers:

```typescript
class ILOService {
  async create(request: CreateILORequest, createdBy: string, institutionId: string): Promise<ILO>;
  async findById(id: string): Promise<ILO>;
  async findByInstitutionId(query: ILOListQuery): Promise<ILOListResponse>;
  async update(id: string, request: UpdateILORequest): Promise<ILO>;
  async archive(id: string): Promise<void>;
}
```

---

## 6. Frontend Spec

No frontend components in this story. The ILO Management UI is STORY-IA-23.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/objective/ilo.types.ts` | Types | Create |
| 2 | `packages/types/src/objective/index.ts` | Types | Edit (add ilo export) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add objective export if not already) |
| 4 | Supabase migration via MCP (ILO indexes) | Database | Apply |
| 5 | `apps/server/src/errors/objective.error.ts` | Errors | Create or Edit |
| 6 | `apps/server/src/models/ilo.model.ts` | Model | Create |
| 7 | `apps/server/src/repositories/ilo.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/objective/ilo.service.ts` | Service | Create |
| 9 | `apps/server/src/services/objective/__tests__/ilo.service.test.ts` | Tests | Create |
| 10 | `apps/server/src/repositories/__tests__/ilo.repository.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-5 | superadmin | **PENDING** | Institution must exist (DEFINES relationship target) |
| STORY-IA-2 | institutional_admin | **Same sprint** | Shares objective types. If IA-2 is done first, reuse `BloomLevel` etc. If not, create shared types here. |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig` for driver access
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`
- `packages/types/src/objective/slo.types.ts` -- `BloomLevel`, `ObjectiveStatus`, `SyncStatus` (if IA-2 is done first)

---

## 9. Test Fixtures

```typescript
import { BloomLevel, ObjectiveStatus, ILO, CreateILORequest } from "@journey-os/types";

// Mock institution
export const MOCK_INSTITUTION = {
  id: "inst-uuid-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
};

// Mock user creating the ILO
export const MOCK_CREATOR = {
  sub: "ia-uuid-1",
  institution_id: "inst-uuid-1",
  role: "institutional_admin" as const,
};

// Valid ILO create request
export const VALID_ILO_REQUEST: CreateILORequest = {
  code: "ILO-MSM-01",
  title: "Demonstrate patient-centered communication",
  description: "Graduates will demonstrate effective, empathetic, patient-centered communication skills across diverse patient populations",
  bloom_level: "apply" as BloomLevel,
};

// Second ILO request for list tests
export const VALID_ILO_REQUEST_2: CreateILORequest = {
  code: "ILO-MSM-02",
  title: "Apply foundational biomedical sciences",
  description: "Graduates will apply foundational biomedical sciences to clinical reasoning and medical practice",
  bloom_level: "apply" as BloomLevel,
};

// Mock ILO database row
export const MOCK_ILO_ROW = {
  id: "ilo-uuid-1",
  course_id: null,                // ILOs have no course_id
  institution_id: "inst-uuid-1",
  code: "ILO-MSM-01",
  title: "Demonstrate patient-centered communication",
  description: "Graduates will demonstrate effective, empathetic, patient-centered communication skills across diverse patient populations",
  bloom_level: "apply",
  scope: "institutional",          // Key differentiator from SLOs
  status: "draft",
  created_by: "ia-uuid-1",
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock ILO after DualWrite sync
export const MOCK_ILO_SYNCED = {
  ...MOCK_ILO_ROW,
  graph_node_id: "neo4j-node-456",
  sync_status: "synced",
};

// Second ILO row for list tests
export const MOCK_ILO_ROW_2 = {
  ...MOCK_ILO_ROW,
  id: "ilo-uuid-2",
  code: "ILO-MSM-02",
  title: "Apply foundational biomedical sciences",
  description: "Graduates will apply foundational biomedical sciences to clinical reasoning and medical practice",
};

// Duplicate code request (should fail)
export const DUPLICATE_CODE_REQUEST: CreateILORequest = {
  ...VALID_ILO_REQUEST,
  code: "ILO-MSM-01", // Same code as existing
};

// Invalid bloom level (for validation test)
export const INVALID_BLOOM_REQUEST = {
  ...VALID_ILO_REQUEST,
  bloom_level: "memorize" as BloomLevel, // Invalid -- should be "remember"
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/objective/__tests__/ilo.service.test.ts`

```
describe("ILOService")
  describe("create")
    it("creates ILO in Supabase with scope='institutional' and course_id=null")
    it("creates ILO node in Neo4j with DEFINES relationship to institution")
    it("sets sync_status to 'synced' after successful DualWrite")
    it("sets sync_status to 'failed' when Neo4j write fails (Supabase record persists)")
    it("throws DuplicateObjectiveCodeError when code exists for same institution")
    it("throws InvalidBloomLevelError for invalid bloom level")
  describe("findById")
    it("returns ILO model from Supabase by id with scope='institutional'")
    it("throws ObjectiveNotFoundError when id does not exist")
  describe("findByInstitutionId")
    it("returns paginated ILOs filtered by institution_id")
    it("filters by status when provided")
    it("filters by bloom_level when provided")
    it("searches by title and code (case-insensitive)")
  describe("update")
    it("updates allowed fields in Supabase and Neo4j")
    it("throws ObjectiveNotFoundError when id does not exist")
  describe("archive")
    it("sets status to 'archived' in Supabase and Neo4j")
    it("throws ObjectiveNotFoundError when id does not exist")
```

**File:** `apps/server/src/repositories/__tests__/ilo.repository.test.ts`

```
describe("ILORepository")
  describe("create")
    it("inserts row with scope='institutional' and course_id=null")
  describe("findByInstitutionId")
    it("filters by institution_id and scope='institutional'")
    it("applies pagination correctly")
  describe("existsByCode")
    it("returns true when code exists for institution_id with scope='institutional'")
    it("returns false when code does not exist")
    it("returns false when same code exists but in different institution")
```

**Total: ~21 tests** (16 service + 5 repository)

---

## 11. E2E Test Spec

Not required for this story. This is a backend-only model/repository/service story with no UI.

---

## 12. Acceptance Criteria

1. ILO types are exported from `@journey-os/types`
2. ILO model class uses `#field` JS private syntax with public getters
3. Repository filters by `scope='institutional'` on all queries (to exclude SLOs)
4. Repository sets `course_id=null` on all inserts (ILOs are not course-scoped)
5. `create()` performs DualWrite: Supabase first, Neo4j second
6. Neo4j node has label `ILO` (not `InstitutionalLearningObjective`, not `SLO`)
7. Neo4j relationship `(Institution)-[:DEFINES]->(ILO)` is created correctly
8. `sync_status` tracks DualWrite result: `'synced'` or `'failed'`
9. Code uniqueness is enforced within institution scope
10. Bloom level is validated against 6 allowed values
11. Soft-delete via `archive()` sets `status='archived'`
12. `findByInstitutionId()` never returns SLOs (scope filter is enforced)
13. All 21 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| ILO is institution-scoped | ARCHITECTURE_v10 4.3: ILO/SLO separation |
| ILO and SLO are separate node types | CLAUDE.md Architecture Rules |
| DualWrite pattern | CLAUDE.md Database Rules |
| Bloom taxonomy 6 levels | Anderson & Krathwohl (2001) |
| student_learning_objectives table | SUPABASE_DDL_v1 |
| scope column: 'institutional' vs 'session' | SUPABASE_DDL_v1 student_learning_objectives |
| DEFINES relationship | NEO4J_SCHEMA_v1 Institution relationships |
| ILO represents graduate competencies | S-IA-14-1 Acceptance Criteria |
| ILO code unique per institution | S-IA-14-1 Task Breakdown |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `student_learning_objectives` and `institutions` tables exist
- **Neo4j:** Instance running with Institution nodes created (from SA-5)
- **Express:** Server running on port 3001
- **STORY-SA-5 must be complete** -- institutions must exist before ILOs can reference them

---

## 15. Implementation Notes

- **scope='institutional' for ILOs:** Every repository method MUST include `scope='institutional'` in its WHERE clause. This is the mirror of SLO's `scope='session'`. Never omit this filter.
- **course_id is NULL:** ILOs are institution-scoped, not course-scoped. The repository must explicitly set `course_id: null` on insert. The Supabase column is nullable.
- **Shared types with SLO:** If STORY-IA-2 is implemented first, import `BloomLevel`, `ObjectiveStatus`, `SyncStatus` from `slo.types.ts`. If IA-4 is implemented first, consider creating `packages/types/src/objective/objective-common.types.ts` for shared types, then have both `slo.types.ts` and `ilo.types.ts` import from it.
- **Private fields pattern:** `ILOModel` uses `#id`, `#institutionId`, `#code` etc. with public getters. No `#courseId` field (ILOs do not have courses).
- **DualWrite error handling:** If Neo4j write fails, catch the error, update `sync_status='failed'` in Supabase, and log. Do NOT rollback the Supabase insert.
- **Code format convention:** ILO codes follow `ILO-{INSTITUTION_CODE}-{SEQ}` pattern (e.g., `ILO-MSM-01`). This is a convention, not system-enforced.
- **No controller/routes:** This story builds the domain layer only. The API surface is added in STORY-IA-23.
- **DEFINES vs HAS_ILO:** The relationship is `(Institution)-[:DEFINES]->(ILO)`, NOT `(Institution)-[:HAS_ILO]->(ILO)`. This aligns with the semantic meaning: institutions define their learning objectives.
- **Ordering with SLO story:** Both IA-2 and IA-4 are in Sprint 5. If implemented sequentially, do IA-2 first (it creates the shared types). If implemented in parallel, coordinate on `packages/types/src/objective/` to avoid conflicts.
