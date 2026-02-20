# STORY-F-65 Brief: Blueprint Definition Model

## 0. Lane & Priority

```yaml
story_id: STORY-F-65
old_id: S-F-26-1
lane: faculty
lane_priority: 3
within_lane_order: 65
sprint: 29
size: M
depends_on:
  - STORY-F-64 (faculty) — Item Bank Browser (item bank exists)
  - STORY-IA-3 (institutional_admin, cross-lane) — Coverage data exists
blocks:
  - STORY-F-68 — Assembly Algorithm (needs blueprint to assemble from)
  - STORY-F-69 — Blueprint UI Editor (needs model to display/edit)
  - STORY-F-70 — Exam Preview (needs blueprint + assembled exam)
personas_served: [faculty]
epic: E-26 (Blueprint & Assembly Engine)
feature: F-12
user_flow: UF-18 (Exam Blueprint & Assembly)
```

## 1. Summary

Build the **blueprint definition model** that allows faculty to define exam blueprints with target distributions across three dimensions: USMLE systems, disciplines, and Bloom's taxonomy levels. Percentages per dimension must sum to 100% (validated). Blueprints include metadata (name, description, total question count, time limit, passing score) and support CRUD operations with versioning -- blueprints become immutable once an exam is built from them. The repository layer uses DualWriteService: Supabase `blueprints` table first, then Neo4j `Blueprint` node with `(Blueprint)-[:TARGETS]->(USMLE_System)` relationships with weight properties. A default USMLE Step 1 blueprint is provided as seed data. Soft delete with audit trail.

Key constraints:
- DualWriteService: Supabase first, Neo4j second, sync_status = 'synced'
- Neo4j: SCREAMING_SNAKE_CASE for USMLE labels (e.g., USMLE_Cardiovascular)
- Blueprint versioning: immutable once exam built from it
- Percentage validation: each dimension sums to 100%
- At least one target per dimension required
- Named exports only, TypeScript strict, JS `#private` fields

## 2. Task Breakdown

1. **Types** -- Create `Blueprint`, `BlueprintTarget`, `BlueprintDimension`, `CreateBlueprintRequest`, `UpdateBlueprintRequest` in `packages/types/src/exam/`
2. **Model** -- `BlueprintModel` with validation logic (percentage sums, dimension requirements)
3. **Repository** -- `BlueprintRepository` with DualWriteService integration (Supabase + Neo4j)
4. **Service** -- `BlueprintService` with CRUD, versioning, immutability checks, soft delete
5. **Controller** -- `BlueprintController` with full REST endpoints
6. **Routes** -- Register under `/api/v1/blueprints`
7. **Seed** -- Default USMLE Step 1 blueprint with standard distributions
8. **API tests** -- 12 tests covering CRUD, validation, versioning, DualWrite, soft delete
9. **Exports** -- Register types in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/exam/blueprint.types.ts

/** Dimensions for blueprint targeting */
export type BlueprintDimension = "usmle_system" | "discipline" | "bloom_level";

/** A single target within a dimension */
export interface BlueprintTarget {
  readonly dimension: BlueprintDimension;
  readonly value: string;
  readonly percentage: number;
}

/** Blueprint status */
export type BlueprintStatus = "draft" | "active" | "locked" | "archived";

/** Full blueprint definition */
export interface Blueprint {
  readonly id: string;
  readonly institution_id: string;
  readonly name: string;
  readonly description: string;
  readonly total_questions: number;
  readonly time_limit_minutes: number;
  readonly passing_score: number;
  readonly status: BlueprintStatus;
  readonly version: number;
  readonly locked_at: string | null;
  readonly locked_by_exam_id: string | null;
  readonly targets: BlueprintTarget[];
  readonly sync_status: "pending" | "synced" | "failed";
  readonly created_by: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

/** Create blueprint request */
export interface CreateBlueprintRequest {
  readonly name: string;
  readonly description: string;
  readonly total_questions: number;
  readonly time_limit_minutes: number;
  readonly passing_score: number;
  readonly targets: BlueprintTarget[];
}

/** Update blueprint request */
export interface UpdateBlueprintRequest {
  readonly name?: string;
  readonly description?: string;
  readonly total_questions?: number;
  readonly time_limit_minutes?: number;
  readonly passing_score?: number;
  readonly targets?: BlueprintTarget[];
}

/** Blueprint list item (lighter than full Blueprint) */
export interface BlueprintListItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly total_questions: number;
  readonly status: BlueprintStatus;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Validation result for blueprint targets */
export interface BlueprintValidationResult {
  readonly valid: boolean;
  readonly errors: BlueprintValidationError[];
}

/** Validation error */
export interface BlueprintValidationError {
  readonly dimension: BlueprintDimension;
  readonly message: string;
  readonly actual_sum: number;
  readonly expected_sum: 100;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_blueprints_table

CREATE TABLE IF NOT EXISTS blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  time_limit_minutes INTEGER NOT NULL CHECK (time_limit_minutes > 0),
  passing_score NUMERIC(5,2) NOT NULL CHECK (passing_score >= 0 AND passing_score <= 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'locked', 'archived')),
  version INTEGER NOT NULL DEFAULT 1,
  locked_at TIMESTAMPTZ,
  locked_by_exam_id UUID,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Blueprint targets (one row per dimension-value pair)
CREATE TABLE IF NOT EXISTS blueprint_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('usmle_system', 'discipline', 'bloom_level')),
  value TEXT NOT NULL,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blueprint_id, dimension, value)
);

-- Indexes
CREATE INDEX idx_blueprints_institution ON blueprints(institution_id);
CREATE INDEX idx_blueprints_status ON blueprints(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_blueprints_created_by ON blueprints(created_by);
CREATE INDEX idx_blueprint_targets_blueprint ON blueprint_targets(blueprint_id);

-- RLS
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view blueprints for their institution"
  ON blueprints FOR SELECT
  USING (
    institution_id IN (
      SELECT institution_id FROM profiles WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Faculty can create blueprints for their institution"
  ON blueprints FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND institution_id IN (
      SELECT institution_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Faculty can update unlocked blueprints they created"
  ON blueprints FOR UPDATE
  USING (
    created_by = auth.uid()
    AND status != 'locked'
    AND deleted_at IS NULL
  );

CREATE POLICY "Faculty can view targets for accessible blueprints"
  ON blueprint_targets FOR SELECT
  USING (
    blueprint_id IN (
      SELECT id FROM blueprints WHERE institution_id IN (
        SELECT institution_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Faculty can manage targets for their blueprints"
  ON blueprint_targets FOR ALL
  USING (
    blueprint_id IN (
      SELECT id FROM blueprints WHERE created_by = auth.uid() AND status != 'locked'
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/blueprints (Auth: faculty)

**Request Body:**
```json
{
  "name": "Cardiology Final Exam Blueprint",
  "description": "End-of-rotation exam covering all cardiovascular topics",
  "total_questions": 100,
  "time_limit_minutes": 180,
  "passing_score": 70.0,
  "targets": [
    { "dimension": "usmle_system", "value": "Cardiovascular", "percentage": 40 },
    { "dimension": "usmle_system", "value": "Respiratory", "percentage": 30 },
    { "dimension": "usmle_system", "value": "Renal", "percentage": 30 },
    { "dimension": "discipline", "value": "Medicine", "percentage": 60 },
    { "dimension": "discipline", "value": "Pharmacology", "percentage": 40 },
    { "dimension": "bloom_level", "value": "Apply", "percentage": 50 },
    { "dimension": "bloom_level", "value": "Analyze", "percentage": 30 },
    { "dimension": "bloom_level", "value": "Evaluate", "percentage": 20 }
  ]
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "blueprint-uuid-1",
    "institution_id": "inst-uuid-1",
    "name": "Cardiology Final Exam Blueprint",
    "description": "End-of-rotation exam covering all cardiovascular topics",
    "total_questions": 100,
    "time_limit_minutes": 180,
    "passing_score": 70.0,
    "status": "draft",
    "version": 1,
    "locked_at": null,
    "locked_by_exam_id": null,
    "targets": [
      { "dimension": "usmle_system", "value": "Cardiovascular", "percentage": 40 },
      { "dimension": "usmle_system", "value": "Respiratory", "percentage": 30 },
      { "dimension": "usmle_system", "value": "Renal", "percentage": 30 }
    ],
    "sync_status": "synced",
    "created_by": "faculty-uuid-1",
    "created_at": "2026-02-19T14:30:00Z",
    "updated_at": "2026-02-19T14:30:00Z",
    "deleted_at": null
  },
  "error": null
}
```

### GET /api/v1/blueprints (Auth: faculty)

**Query Parameters:** `page`, `page_size`, `status`

**Success Response (200):**
```json
{
  "data": {
    "items": [
      {
        "id": "blueprint-uuid-1",
        "name": "Cardiology Final Exam Blueprint",
        "description": "End-of-rotation exam covering all cardiovascular topics",
        "total_questions": 100,
        "status": "draft",
        "version": 1,
        "created_at": "2026-02-19T14:30:00Z",
        "updated_at": "2026-02-19T14:30:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  },
  "error": null
}
```

### GET /api/v1/blueprints/:id (Auth: faculty)

Returns full `Blueprint` object (same as create response).

### PUT /api/v1/blueprints/:id (Auth: faculty)

Same structure as POST. Returns updated `Blueprint`.

### DELETE /api/v1/blueprints/:id (Auth: faculty)

Soft delete (sets `deleted_at`).

**Success Response (200):**
```json
{
  "data": { "id": "blueprint-uuid-1", "deleted_at": "2026-02-19T15:00:00Z" },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 200/201 | - | Success |
| 400 | `VALIDATION_ERROR` | Percentage sums != 100, missing dimension, invalid values |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Not creator or non-faculty role |
| 404 | `NOT_FOUND` | Blueprint not found |
| 409 | `BLUEPRINT_LOCKED` | Attempt to modify locked blueprint |
| 500 | `INTERNAL_ERROR` | Unexpected error / DualWrite failure |

## 6. Frontend Spec

Frontend UI for blueprints is handled by STORY-F-69 (Blueprint UI Editor). This story focuses on the backend model, repository, service, and controller layers. No frontend files needed.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/exam/blueprint.types.ts` | Types | Create |
| 2 | `packages/types/src/exam/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add exam export) |
| 4 | Supabase migration via MCP (blueprints + blueprint_targets tables) | Database | Apply |
| 5 | `apps/server/src/modules/exam/models/blueprint.model.ts` | Model | Create |
| 6 | `apps/server/src/modules/exam/repositories/blueprint.repository.ts` | Repository | Create |
| 7 | `apps/server/src/modules/exam/services/blueprint.service.ts` | Service | Create |
| 8 | `apps/server/src/modules/exam/controllers/blueprint.controller.ts` | Controller | Create |
| 9 | `apps/server/src/modules/exam/routes/blueprint.routes.ts` | Routes | Create |
| 10 | `apps/server/src/routes/index.ts` | Routes | Edit (register exam/blueprint routes) |
| 11 | `apps/server/src/modules/exam/seeds/default-blueprint.seed.ts` | Seed | Create |
| 12 | `apps/server/src/modules/exam/__tests__/blueprint.service.test.ts` | Tests | Create |
| 13 | `apps/server/src/modules/exam/__tests__/blueprint.repository.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-64 | faculty | Pending | Item bank must exist (blueprints reference question pool) |
| STORY-IA-3 | institutional_admin | Pending | Coverage data exists for curriculum mapping |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |
| STORY-U-7 | universal | **DONE** | USMLE seed data (systems/disciplines for targets) |

### NPM Packages
- None additional required

### Existing Files Needed
- `apps/server/src/services/dual-write.service.ts` -- DualWriteService for Supabase + Neo4j sync
- `apps/server/src/config/neo4j.config.ts` -- Neo4j client for TARGETS relationships
- `apps/server/src/config/supabase.config.ts` -- Supabase client
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Valid blueprint creation request
export const VALID_BLUEPRINT_REQUEST = {
  name: "Cardiology Final Exam Blueprint",
  description: "End-of-rotation exam covering all cardiovascular topics",
  total_questions: 100,
  time_limit_minutes: 180,
  passing_score: 70.0,
  targets: [
    { dimension: "usmle_system" as const, value: "Cardiovascular", percentage: 40 },
    { dimension: "usmle_system" as const, value: "Respiratory", percentage: 30 },
    { dimension: "usmle_system" as const, value: "Renal", percentage: 30 },
    { dimension: "discipline" as const, value: "Medicine", percentage: 60 },
    { dimension: "discipline" as const, value: "Pharmacology", percentage: 40 },
    { dimension: "bloom_level" as const, value: "Apply", percentage: 50 },
    { dimension: "bloom_level" as const, value: "Analyze", percentage: 30 },
    { dimension: "bloom_level" as const, value: "Evaluate", percentage: 20 },
  ],
};

// Blueprint with invalid percentages (doesn't sum to 100)
export const INVALID_PERCENTAGE_REQUEST = {
  ...VALID_BLUEPRINT_REQUEST,
  targets: [
    { dimension: "usmle_system" as const, value: "Cardiovascular", percentage: 40 },
    { dimension: "usmle_system" as const, value: "Respiratory", percentage: 30 },
    // Missing 30% -- sums to 70
    { dimension: "discipline" as const, value: "Medicine", percentage: 100 },
    { dimension: "bloom_level" as const, value: "Apply", percentage: 100 },
  ],
};

// Blueprint with missing dimension
export const MISSING_DIMENSION_REQUEST = {
  ...VALID_BLUEPRINT_REQUEST,
  targets: [
    { dimension: "usmle_system" as const, value: "Cardiovascular", percentage: 100 },
    { dimension: "discipline" as const, value: "Medicine", percentage: 100 },
    // Missing bloom_level dimension entirely
  ],
};

// Stored blueprint (after creation)
export const STORED_BLUEPRINT = {
  id: "blueprint-uuid-1",
  institution_id: "inst-uuid-1",
  ...VALID_BLUEPRINT_REQUEST,
  status: "draft" as const,
  version: 1,
  locked_at: null,
  locked_by_exam_id: null,
  sync_status: "synced" as const,
  created_by: "faculty-uuid-1",
  created_at: "2026-02-19T14:30:00Z",
  updated_at: "2026-02-19T14:30:00Z",
  deleted_at: null,
};

// Locked blueprint (exam built from it)
export const LOCKED_BLUEPRINT = {
  ...STORED_BLUEPRINT,
  id: "blueprint-uuid-2",
  status: "locked" as const,
  locked_at: "2026-02-20T10:00:00Z",
  locked_by_exam_id: "exam-uuid-1",
};

// Faculty user
export const FACULTY_USER = {
  id: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Default USMLE Step 1 blueprint seed
export const DEFAULT_STEP1_BLUEPRINT = {
  name: "USMLE Step 1 Standard Blueprint",
  description: "Default distribution based on USMLE Step 1 content outline",
  total_questions: 280,
  time_limit_minutes: 480,
  passing_score: 60.0,
  targets: [
    { dimension: "usmle_system" as const, value: "Cardiovascular", percentage: 12 },
    { dimension: "usmle_system" as const, value: "Respiratory", percentage: 10 },
    { dimension: "usmle_system" as const, value: "Gastrointestinal", percentage: 10 },
    { dimension: "usmle_system" as const, value: "Renal", percentage: 8 },
    { dimension: "usmle_system" as const, value: "Nervous", percentage: 15 },
    { dimension: "usmle_system" as const, value: "Endocrine", percentage: 10 },
    { dimension: "usmle_system" as const, value: "Musculoskeletal", percentage: 8 },
    { dimension: "usmle_system" as const, value: "Hematology", percentage: 8 },
    { dimension: "usmle_system" as const, value: "Reproductive", percentage: 7 },
    { dimension: "usmle_system" as const, value: "Immune", percentage: 7 },
    { dimension: "usmle_system" as const, value: "Multisystem", percentage: 5 },
  ],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/modules/exam/__tests__/blueprint.service.test.ts`

```
describe("BlueprintService")
  describe("create")
    > creates blueprint with valid targets
    > validates percentage sums to 100 per dimension
    > returns validation error when percentages dont sum to 100
    > requires at least one target per dimension
    > triggers DualWriteService (Supabase + Neo4j)

  describe("getById")
    > returns blueprint with all targets
    > returns 404 for non-existent or soft-deleted blueprint

  describe("update")
    > updates blueprint metadata and targets
    > increments version number on update
    > returns 409 when updating a locked blueprint

  describe("delete")
    > soft-deletes blueprint (sets deleted_at)
    > returns 409 when deleting a locked blueprint
```

**File:** `apps/server/src/modules/exam/__tests__/blueprint.repository.test.ts`

```
describe("BlueprintRepository")
  describe("DualWrite")
    > writes Blueprint node to Neo4j with TARGETS relationships
    > sets sync_status to synced on success
    > sets sync_status to failed on Neo4j error
```

**Total: ~14 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Blueprint model is backend-only; E2E coverage will be added with the Blueprint UI Editor story (STORY-F-69).

## 12. Acceptance Criteria

1. Blueprint model with target percentages per dimension: USMLE system, discipline, Bloom level
2. Percentages per dimension sum to 100% (validated, returns error if not)
3. Blueprint metadata includes name, description, total question count, time limit, passing score
4. Full CRUD operations work (create, read, update, delete)
5. Blueprint versioning: version increments on update
6. Immutable once locked by an exam (409 on modify/delete)
7. DualWriteService: Supabase first, Neo4j second, sync_status tracked
8. Neo4j relationships: (Blueprint)-[:TARGETS]->(USMLE_System) with weight property
9. Default USMLE Step 1 blueprint seed data exists
10. At least one target per dimension required (validation)
11. Soft delete with audit trail
12. All 14 API tests pass
13. TypeScript strict, named exports only, JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| DualWriteService pattern | ARCHITECTURE rules: "DualWriteService: Supabase first -> Neo4j second -> sync_status = 'synced'" |
| SCREAMING_SNAKE_CASE for USMLE | ARCHITECTURE rules: "SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix (USMLE_System)" |
| Typed relationships with direction | ARCHITECTURE rules: "Typed relationships with direction (Course)-[:OFFERS]->(SLO)" |
| Blueprint TARGETS relationship | S-F-26-1 SS Acceptance Criteria: "(Blueprint)-[:TARGETS]->(USMLE_System) with weight property" |
| Immutable once exam built | S-F-26-1 SS Acceptance Criteria: "immutable once an exam is built from it" |
| Default Step 1 blueprint | S-F-26-1 SS Acceptance Criteria: "Seed data: default USMLE Step 1 blueprint" |
| Bloom levels | S-F-26-1 SS Notes: "Remember, Understand, Apply, Analyze, Evaluate, Create" |
| Foundation for assembly pipeline | S-F-26-1 SS Notes: "Blueprint is the foundation for the entire exam assembly pipeline" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions`, `profiles` tables exist
- **Neo4j:** Running, USMLE seed data loaded (STORY-U-7) with system nodes
- **Express:** Server running on port 3001
- **STORY-U-7 (USMLE Seed Data):** Complete -- USMLE system nodes in Neo4j
- **STORY-F-64 (Item Bank):** Complete -- item bank exists for blueprint to reference
- **DualWriteService:** Must exist for Supabase + Neo4j sync

## 15. Figma Make Prototype

No frontend UI for this story. Backend model, repository, service, and controller only. UI handled by STORY-F-69 (Blueprint UI Editor).
