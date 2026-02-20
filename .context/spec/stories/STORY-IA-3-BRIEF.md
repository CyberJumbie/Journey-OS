# STORY-IA-3 Brief: Coverage Computation Service

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-3
old_id: S-IA-28-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 3
sprint: 8
size: M
depends_on:
  - STORY-F-34 (faculty) — TEACHES relationships exist
  - STORY-U-12 (universal) — Frameworks seeded
blocks:
  - STORY-IA-11 — Course Analytics Page
  - STORY-IA-13 — USMLE Heatmap Component
  - STORY-IA-15 — Nightly Coverage Job
  - STORY-IA-16 — Centrality Metrics
  - STORY-IA-29 — Concept Graph Visualization
  - STORY-F-65 — (downstream)
personas_served: [institutional_admin, faculty]
epic: E-28 (Coverage Computation & Heatmap)
feature: F-13 (USMLE Coverage Analytics)
user_flow: UF-22 (Institutional Coverage Analysis)
```

---

## 1. Summary

Build a **CoverageComputationService** that traverses Neo4j to compute a 16x7 USMLE coverage matrix (Systems x Disciplines). Each cell contains a score = `assessed_count / total_count` representing how many SubConcepts in that intersection are covered by approved assessment items. Results are cached in a Supabase `coverage_snapshots` table for fast retrieval. Supports filtering by institution, program, course, and academic year. Includes incremental mode that recomputes only cells affected by recent changes.

Key constraints:
- **Neo4j is the source of truth** for graph traversals (coverage is a graph problem)
- Supabase stores snapshot results for fast dashboard reads
- 16 USMLE Systems x 7 Disciplines = 112 cells per matrix
- Score per cell: `assessed_count / total_count` (0.0 to 1.0, 0 when total is 0)
- Institution-scoped by default (InstitutionalAdmin sees only their data)
- API requires InstitutionalAdmin or SuperAdmin role

---

## 2. Task Breakdown

Implementation order follows: **Types -> Migration -> Model -> Repository -> Service -> Controller -> Routes -> Tests**

### Task 1: Create coverage types
- **File:** `packages/types/src/coverage/coverage.types.ts`
- **Action:** Export `CoverageCell`, `CoverageMatrix`, `CoverageFilters`, `CoverageSnapshot`, `CoverageComputeRequest`

### Task 2: Create coverage barrel export
- **File:** `packages/types/src/coverage/index.ts`
- **Action:** Create barrel re-exporting from `coverage.types.ts`

### Task 3: Update root barrel
- **File:** `packages/types/src/index.ts`
- **Action:** Edit to add `export * from "./coverage"` line

### Task 4: Apply coverage_snapshots migration
- **Action:** Supabase MCP migration to create `coverage_snapshots` table with indexes

### Task 5: Build CoverageSnapshot model
- **File:** `apps/server/src/models/coverage-snapshot.model.ts`
- **Action:** OOP class with `#field` private fields, `static fromRow()`, `toJSON()`

### Task 6: Build CoverageRepository
- **File:** `apps/server/src/repositories/coverage.repository.ts`
- **Action:** `saveSnapshot()`, `getLatestSnapshot()`, `getSnapshotsByInstitution()` methods against Supabase

### Task 7: Build CoverageComputationService
- **File:** `apps/server/src/services/coverage/coverage-computation.service.ts`
- **Action:** Core service with `computeMatrix(filters)` using Neo4j traversal, `computeIncremental(filters, since)` for delta updates, `getOrCompute(filters)` that checks cache first

### Task 8: Build CoverageController
- **File:** `apps/server/src/controllers/coverage/coverage.controller.ts`
- **Action:** `handleGetCoverage(req, res)` and `handleComputeCoverage(req, res)` methods

### Task 9: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add protected routes: `GET /api/v1/coverage` and `POST /api/v1/coverage/compute`

### Task 10: Write service tests
- **File:** `apps/server/src/services/coverage/__tests__/coverage-computation.service.test.ts`
- **Action:** 8 tests for computation, caching, incremental, filtering

### Task 11: Write repository tests
- **File:** `apps/server/src/repositories/__tests__/coverage.repository.test.ts`
- **Action:** 4 tests for snapshot CRUD

---

## 3. Data Model

```typescript
// packages/types/src/coverage/coverage.types.ts

/** Single cell in the 16x7 USMLE coverage matrix */
export interface CoverageCell {
  readonly system: string;        // USMLE System name (e.g., "Cardiovascular")
  readonly discipline: string;    // USMLE Discipline name (e.g., "Pharmacology")
  readonly score: number;         // 0.0 to 1.0 (assessed_count / total_count)
  readonly assessed_count: number; // SubConcepts with approved assessment items
  readonly total_count: number;    // Total SubConcepts in this intersection
  readonly gap_count: number;      // total_count - assessed_count
}

/** Complete coverage matrix result */
export interface CoverageMatrix {
  readonly cells: readonly CoverageCell[];
  readonly systems: readonly string[];     // Ordered list of 16 systems
  readonly disciplines: readonly string[]; // Ordered list of 7 disciplines
  readonly computed_at: string;            // ISO timestamp
  readonly filters: CoverageFilters;
}

/** Filters for scoping coverage computation */
export interface CoverageFilters {
  readonly institution_id: string;          // Required -- always institution-scoped
  readonly program_id?: string;
  readonly course_id?: string;
  readonly academic_year?: string;          // e.g., "2025-2026"
}

/** Persisted snapshot in Supabase */
export interface CoverageSnapshot {
  readonly id: string;
  readonly institution_id: string;
  readonly matrix: CoverageMatrix;
  readonly filters: CoverageFilters;
  readonly is_incremental: boolean;
  readonly created_at: string;
}

/** Request to trigger a new computation */
export interface CoverageComputeRequest {
  readonly institution_id?: string; // Defaults to req.user.institution_id
  readonly program_id?: string;
  readonly course_id?: string;
  readonly academic_year?: string;
  readonly force?: boolean;         // Skip cache, recompute from scratch
}

/** Coverage API query parameters */
export interface CoverageQuery {
  readonly institution_id?: string;
  readonly program_id?: string;
  readonly course_id?: string;
  readonly academic_year?: string;
  readonly max_age_hours?: number;  // Return cached if younger than N hours (default: 24)
}
```

---

## 4. Database Schema

```sql
-- Migration: create_coverage_snapshots
CREATE TABLE coverage_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    matrix JSONB NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}',
    is_incremental BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by institution (most recent first)
CREATE INDEX idx_coverage_snapshots_institution_created
  ON coverage_snapshots(institution_id, created_at DESC);

-- Index for filtering by specific scope
CREATE INDEX idx_coverage_snapshots_filters
  ON coverage_snapshots USING gin(filters);

-- RLS policy: InstitutionalAdmin sees only own institution
ALTER TABLE coverage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY coverage_snapshots_institution_read ON coverage_snapshots
  FOR SELECT USING (
    institution_id = (
      SELECT institution_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY coverage_snapshots_institution_insert ON coverage_snapshots
  FOR INSERT WITH CHECK (
    institution_id = (
      SELECT institution_id FROM profiles WHERE id = auth.uid()
    )
  );
```

**Neo4j graph pattern (source of truth for computation):**
```
(SubConcept)-[:MAPS_TO]->(USMLE_System)
(SubConcept)-[:MAPS_TO]->(USMLE_Discipline)
(AssessmentItem)-[:TARGETS]->(SubConcept)
(Course)-[:CONTAINS]->(AssessmentItem)
(Institution)-[:OFFERS]->(Course)
```

---

## 5. API Contract

### GET /api/v1/coverage (Auth: InstitutionalAdmin or SuperAdmin)

Returns the most recent coverage snapshot, or computes one if none exists or cache is stale.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `institution_id` | string | `req.user.institution_id` | Institution to scope (SuperAdmin can specify any) |
| `program_id` | string | -- | Filter to specific program |
| `course_id` | string | -- | Filter to specific course |
| `academic_year` | string | -- | Filter by academic year |
| `max_age_hours` | number | 24 | Max cache age before recompute |

**Success Response (200):**
```json
{
  "data": {
    "id": "snap-uuid-1",
    "institution_id": "inst-uuid-1",
    "matrix": {
      "cells": [
        {
          "system": "Cardiovascular",
          "discipline": "Pharmacology",
          "score": 0.75,
          "assessed_count": 15,
          "total_count": 20,
          "gap_count": 5
        },
        {
          "system": "Cardiovascular",
          "discipline": "Pathology",
          "score": 0.60,
          "assessed_count": 12,
          "total_count": 20,
          "gap_count": 8
        }
      ],
      "systems": [
        "Cardiovascular", "Respiratory", "Renal/Urinary", "Gastrointestinal",
        "Reproductive", "Endocrine", "Hematopoietic/Lymphoreticular",
        "Nervous System/Special Senses", "Skin/Subcutaneous Tissue",
        "Musculoskeletal", "Immune System", "Biostatistics/Epidemiology",
        "Behavioral Health", "Multisystem Processes", "General Principles",
        "Social Sciences"
      ],
      "disciplines": [
        "Anatomy", "Biochemistry", "Microbiology", "Pathology",
        "Pharmacology", "Physiology", "Behavioral Sciences"
      ],
      "computed_at": "2026-02-19T10:00:00Z",
      "filters": {
        "institution_id": "inst-uuid-1"
      }
    },
    "is_incremental": false,
    "created_at": "2026-02-19T10:00:00Z"
  },
  "error": null
}
```

### POST /api/v1/coverage/compute (Auth: InstitutionalAdmin or SuperAdmin)

Force a fresh computation (ignores cache).

**Request Body:**
```json
{
  "institution_id": "inst-uuid-1",
  "program_id": "prog-uuid-1",
  "force": true
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "snap-uuid-2",
    "institution_id": "inst-uuid-1",
    "matrix": { "..." },
    "is_incremental": false,
    "created_at": "2026-02-19T10:05:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-admin role or wrong institution |
| 400 | `VALIDATION_ERROR` | Invalid filter params |
| 500 | `INTERNAL_ERROR` | Neo4j query failure or unexpected error |

---

## 6. Frontend Spec

No frontend components in this story. The USMLE Heatmap visualization is STORY-IA-13, and the Course Analytics Page is STORY-IA-11. This story builds the backend computation engine only.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/coverage.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add coverage export) |
| 4 | Supabase migration via MCP (coverage_snapshots) | Database | Apply |
| 5 | `apps/server/src/models/coverage-snapshot.model.ts` | Model | Create |
| 6 | `apps/server/src/repositories/coverage.repository.ts` | Repository | Create |
| 7 | `apps/server/src/services/coverage/coverage-computation.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/coverage/coverage.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add 2 protected routes) |
| 10 | `apps/server/src/services/coverage/__tests__/coverage-computation.service.test.ts` | Tests | Create |
| 11 | `apps/server/src/repositories/__tests__/coverage.repository.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-34 | faculty | **PENDING** | TEACHES relationships must exist in Neo4j for traversal |
| STORY-U-12 | universal | **NOT DONE** | USMLE framework nodes (Systems, Disciplines) must be seeded |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client for snapshot storage
- `neo4j-driver` -- Neo4j driver for graph traversal
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig` for driver access
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.require()`, `rbac.requireScoped()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`

---

## 9. Test Fixtures

```typescript
import { CoverageCell, CoverageMatrix, CoverageFilters, CoverageSnapshot } from "@journey-os/types";

// Mock filters
export const MOCK_FILTERS: CoverageFilters = {
  institution_id: "inst-uuid-1",
};

export const MOCK_FILTERS_WITH_COURSE: CoverageFilters = {
  institution_id: "inst-uuid-1",
  course_id: "course-uuid-1",
};

// Mock coverage cells (subset for testing)
export const MOCK_CELLS: CoverageCell[] = [
  {
    system: "Cardiovascular",
    discipline: "Pharmacology",
    score: 0.75,
    assessed_count: 15,
    total_count: 20,
    gap_count: 5,
  },
  {
    system: "Cardiovascular",
    discipline: "Pathology",
    score: 0.60,
    assessed_count: 12,
    total_count: 20,
    gap_count: 8,
  },
  {
    system: "Respiratory",
    discipline: "Pharmacology",
    score: 0.0,
    assessed_count: 0,
    total_count: 18,
    gap_count: 18,
  },
  {
    system: "Respiratory",
    discipline: "Pathology",
    score: 1.0,
    assessed_count: 15,
    total_count: 15,
    gap_count: 0,
  },
];

// Mock matrix
export const MOCK_MATRIX: CoverageMatrix = {
  cells: MOCK_CELLS,
  systems: ["Cardiovascular", "Respiratory"],
  disciplines: ["Pharmacology", "Pathology"],
  computed_at: "2026-02-19T10:00:00Z",
  filters: MOCK_FILTERS,
};

// Mock snapshot
export const MOCK_SNAPSHOT: CoverageSnapshot = {
  id: "snap-uuid-1",
  institution_id: "inst-uuid-1",
  matrix: MOCK_MATRIX,
  filters: MOCK_FILTERS,
  is_incremental: false,
  created_at: "2026-02-19T10:00:00Z",
};

// Mock Neo4j query result row
export const MOCK_NEO4J_RESULT = [
  { system: "Cardiovascular", discipline: "Pharmacology", concept_count: 20, item_count: 15 },
  { system: "Cardiovascular", discipline: "Pathology", concept_count: 20, item_count: 12 },
  { system: "Respiratory", discipline: "Pharmacology", concept_count: 18, item_count: 0 },
  { system: "Respiratory", discipline: "Pathology", concept_count: 15, item_count: 15 },
];

// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock stale snapshot (older than 24 hours)
export const MOCK_STALE_SNAPSHOT: CoverageSnapshot = {
  ...MOCK_SNAPSHOT,
  created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/coverage/__tests__/coverage-computation.service.test.ts`

```
describe("CoverageComputationService")
  describe("computeMatrix")
    it("executes Neo4j traversal query and returns 112-cell matrix for full scope")
    it("computes score as assessed_count / total_count per cell")
    it("returns score=0 when total_count is 0 for a cell")
    it("returns score=1 when all concepts are assessed")
    it("filters by course_id when provided in filters")
    it("filters by program_id when provided in filters")
  describe("getOrCompute")
    it("returns cached snapshot when fresh (within max_age_hours)")
    it("recomputes when cached snapshot is stale")
    it("recomputes when no cached snapshot exists")
    it("recomputes when force=true regardless of cache")
  describe("computeIncremental")
    it("recomputes only cells affected by changes since timestamp")
    it("merges incremental results with previous full snapshot")
```

**File:** `apps/server/src/repositories/__tests__/coverage.repository.test.ts`

```
describe("CoverageRepository")
  describe("saveSnapshot")
    it("inserts coverage snapshot with matrix as JSONB")
  describe("getLatestSnapshot")
    it("returns most recent snapshot for institution_id")
    it("returns null when no snapshots exist")
  describe("getSnapshotsByInstitution")
    it("returns snapshots ordered by created_at DESC")
```

**Total: ~15 tests** (12 service + 3 repository)

---

## 11. E2E Test Spec

Not required for this story. The coverage computation is a backend service. E2E tests will be written for STORY-IA-13 (Heatmap UI).

---

## 12. Acceptance Criteria

1. `CoverageComputationService.computeMatrix()` traverses Neo4j and returns a valid `CoverageMatrix`
2. Matrix contains cells for all 16 Systems x 7 Disciplines (112 cells)
3. Each cell score = `assessed_count / total_count`, range 0.0 to 1.0
4. `gap_count` = `total_count - assessed_count` for every cell
5. Results are saved to `coverage_snapshots` table as JSONB
6. `getOrCompute()` returns cached snapshot when younger than `max_age_hours`
7. `getOrCompute()` triggers recomputation when cache is stale
8. Filters correctly scope computation by institution, program, course, academic year
9. Incremental computation recomputes only affected cells
10. API endpoint returns coverage data for authenticated admin users
11. Non-admin roles receive 403 Forbidden
12. All 15 tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| 16 USMLE Systems | USMLE Content Outline / STORY-U-7 seed data |
| 7 USMLE Disciplines | USMLE Content Outline / STORY-U-7 seed data |
| Coverage matrix concept | UF-22 Institutional Coverage Analysis |
| SubConcept-to-System mapping | NEO4J_SCHEMA_v1 MAPS_TO relationship |
| AssessmentItem TARGETS SubConcept | NEO4J_SCHEMA_v1 TARGETS relationship |
| Snapshot caching pattern | S-IA-28-1 Acceptance Criteria |
| Institution scoping | ARCHITECTURE_v10 4.1: scoped roles |
| Incremental computation | S-IA-28-1 Task Breakdown |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions` table exists, `coverage_snapshots` migration applied
- **Neo4j:** Instance running with USMLE framework nodes seeded (U-7/U-12), SubConcept/AssessmentItem nodes exist (from F-34+)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Both STORY-F-34 and STORY-U-12 must be complete** for meaningful coverage data

---

## 15. Implementation Notes

- **Neo4j query performance:** The traversal query aggregates across all SubConcepts. For large graphs, use `PROFILE` to check query plan. Consider adding a Neo4j index on `SubConcept.id` and `AssessmentItem.status`.
- **JSONB storage:** The entire `CoverageMatrix` is stored as a single JSONB column. This is intentional -- coverage snapshots are read as whole units, never queried at the cell level.
- **Score edge case:** When `total_count = 0` for a cell (no SubConcepts mapped to that System/Discipline intersection), set `score = 0` and `gap_count = 0`. Do not divide by zero.
- **Cache invalidation:** The `max_age_hours` parameter controls staleness. Default is 24 hours. The nightly job (STORY-IA-15) will call `computeMatrix()` with `force=true` to refresh.
- **Incremental mode:** Tracks which SubConcepts changed since the last full computation. Queries only those cells in the matrix. Merges results with the previous full snapshot.
- **Private fields pattern:** Service uses `readonly #supabaseClient: SupabaseClient` and `readonly #neo4jDriver: Driver` with constructor DI.
- **InstitutionalAdmin scoping:** The controller extracts `institution_id` from `req.user.institution_id`. SuperAdmin can override by passing `institution_id` as a query param.
