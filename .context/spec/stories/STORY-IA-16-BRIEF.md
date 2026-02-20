# STORY-IA-16 Brief: Centrality Metrics

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-16
old_id: S-IA-28-5
lane: institutional_admin
lane_priority: 2
within_lane_order: 16
sprint: 8
size: M
depends_on:
  - STORY-IA-3 (institutional_admin) — Coverage Computation Service
blocks:
  - STORY-IA-29 — Concept Graph Visualization (uses centrality for node sizing)
personas_served: [institutional_admin]
epic: E-28 (Coverage Computation & Heatmap)
feature: F-13 (USMLE Coverage Analytics)
user_flow: UF-22 (Institutional Coverage Analysis)
```

---

## 1. Summary

Build a **CentralityMetricsService** that computes PageRank and betweenness centrality for SubConcept nodes in the Neo4j knowledge graph using the Graph Data Science (GDS) library. Results are stored in both Supabase (`concept_metrics` table) and Neo4j (node properties) via DualWrite. High-centrality unassessed concepts are flagged as "critical gaps." Computation is triggered by the nightly job (STORY-IA-15) or on-demand via API.

Key constraints:
- **Neo4j GDS library** for PageRank and betweenness centrality
- **GDS graph projection:** Named graph `concept-graph` with SubConcept nodes and PART_OF, RELATED_TO, PREREQUISITE_OF relationships
- **PageRank params:** dampingFactor 0.85, maxIterations 20, tolerance 0.0001
- **Critical gap threshold:** PageRank > 75th percentile AND coverage = 0
- **DualWrite:** Supabase `concept_metrics` first, Neo4j node properties second
- **Async computation:** 5-15s for 1000 concepts, must not block API

---

## 2. Task Breakdown

Implementation order follows: **Types -> Model -> Repository -> Service -> Controller -> Tests**

### Task 1: Create centrality types
- **File:** `packages/types/src/coverage/centrality.types.ts`
- **Action:** Export `ConceptMetrics`, `CentralityResult`, `CriticalGap`, `CentralityQuery`, `CentralityResponse`

### Task 2: Update coverage barrel export
- **File:** `packages/types/src/coverage/index.ts`
- **Action:** Re-export from `centrality.types.ts`

### Task 3: Build ConceptMetrics model
- **File:** `apps/server/src/models/concept-metrics.model.ts`
- **Action:** OOP class with `#field` private fields, public getters, `static fromRow()` factory

### Task 4: Build ConceptMetricsRepository
- **File:** `apps/server/src/repositories/concept-metrics.repository.ts`
- **Action:** `upsert()`, `findByConcept()`, `findBySystem()`, `findCriticalGaps()`. Supabase operations.

### Task 5: Build CentralityMetricsService
- **File:** `apps/server/src/services/coverage/centrality-metrics.service.ts`
- **Action:** `computePageRank()`, `computeBetweenness()`, `computeAll()`, `flagCriticalGaps()`. Uses GDS API, DualWrite results.

### Task 6: Update CoverageController
- **File:** `apps/server/src/controllers/coverage.controller.ts`
- **Action:** Add `handleGetCentrality()` method for the API endpoint

### Task 7: Register route
- **File:** `apps/server/src/index.ts`
- **Action:** Add `GET /api/v1/coverage/centrality` with InstitutionalAdmin RBAC

### Task 8: Write service tests
- **File:** `apps/server/src/tests/coverage/centrality-metrics.test.ts`
- **Action:** 8-10 tests covering PageRank, betweenness, storage, ranking, critical gap flagging

---

## 3. Data Model

```typescript
// packages/types/src/coverage/centrality.types.ts

/** Centrality metrics for a single concept */
export interface ConceptMetrics {
  readonly id: string;
  readonly concept_id: string;
  readonly concept_name: string;
  readonly system: string;           // USMLE system (e.g., "Cardiovascular")
  readonly pagerank: number;
  readonly betweenness: number;
  readonly coverage_score: number;   // From coverage computation (0.0 to 1.0)
  readonly is_critical_gap: boolean; // pagerank > 75th percentile AND coverage = 0
  readonly computed_at: string;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Result from a single centrality algorithm */
export interface CentralityResult {
  readonly concept_id: string;
  readonly score: number;
}

/** A critical gap: high-centrality concept with zero coverage */
export interface CriticalGap {
  readonly concept_id: string;
  readonly concept_name: string;
  readonly system: string;
  readonly pagerank: number;
  readonly betweenness: number;
  readonly connected_concepts: number;  // Degree count
}

/** Query parameters for centrality endpoint */
export interface CentralityQuery {
  readonly system?: string;           // Filter by USMLE system
  readonly critical_only?: boolean;   // Only show critical gaps
  readonly sort_by?: "pagerank" | "betweenness" | "concept_name";
  readonly sort_dir?: "asc" | "desc";
  readonly page?: number;             // Default: 1
  readonly limit?: number;            // Default: 50
}

/** Paginated centrality response */
export interface CentralityResponse {
  readonly metrics: readonly ConceptMetrics[];
  readonly summary: {
    readonly total_concepts: number;
    readonly critical_gaps: number;
    readonly avg_pagerank: number;
    readonly percentile_75_pagerank: number;
  };
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

```sql
-- Migration: create_concept_metrics
CREATE TABLE concept_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id TEXT NOT NULL,            -- Neo4j SubConcept node ID (from Supabase UUID)
  concept_name TEXT NOT NULL,
  system TEXT NOT NULL,                -- USMLE system name
  institution_id UUID NOT NULL REFERENCES institutions(id),
  pagerank NUMERIC NOT NULL DEFAULT 0,
  betweenness NUMERIC NOT NULL DEFAULT 0,
  coverage_score NUMERIC NOT NULL DEFAULT 0,
  is_critical_gap BOOLEAN NOT NULL DEFAULT false,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(concept_id, institution_id)
);

-- Query performance indexes
CREATE INDEX idx_concept_metrics_system
  ON concept_metrics(institution_id, system);
CREATE INDEX idx_concept_metrics_critical_gaps
  ON concept_metrics(institution_id, is_critical_gap) WHERE is_critical_gap = true;
CREATE INDEX idx_concept_metrics_pagerank
  ON concept_metrics(institution_id, pagerank DESC);
CREATE INDEX idx_concept_metrics_computed_at
  ON concept_metrics(computed_at DESC);

-- RLS
ALTER TABLE concept_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY concept_metrics_institution_scope ON concept_metrics
  USING (institution_id = current_setting('app.institution_id')::UUID);
```

**Neo4j schema (node property update):**
```cypher
// Update SubConcept node with centrality metrics
MATCH (sc:SubConcept {id: $conceptId})
SET sc.pagerank = $pagerank,
    sc.betweenness = $betweenness,
    sc.centrality_computed_at = datetime()

// GDS graph projection
CALL gds.graph.project(
  'concept-graph',
  'SubConcept',
  ['PART_OF', 'RELATED_TO', 'PREREQUISITE_OF']
)

// PageRank computation
CALL gds.pageRank.stream('concept-graph', {
  dampingFactor: 0.85,
  maxIterations: 20,
  tolerance: 0.0001
})
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).id AS concept_id, score
ORDER BY score DESC

// Betweenness centrality computation
CALL gds.betweenness.stream('concept-graph')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).id AS concept_id, score
ORDER BY score DESC

// Drop graph projection after computation
CALL gds.graph.drop('concept-graph')
```

---

## 5. API Contract

### GET /api/v1/coverage/centrality (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `system` | string | -- | Filter by USMLE system name |
| `critical_only` | boolean | false | Show only critical gaps |
| `sort_by` | string | `pagerank` | Sort field |
| `sort_dir` | string | `desc` | Sort direction |
| `page` | number | 1 | Page number |
| `limit` | number | 50 | Items per page (max 100) |

**Success Response (200):**
```json
{
  "data": {
    "metrics": [
      {
        "id": "cm-uuid-1",
        "concept_id": "sc-uuid-1",
        "concept_name": "Myocardial Infarction Pathophysiology",
        "system": "Cardiovascular",
        "pagerank": 0.0342,
        "betweenness": 0.156,
        "coverage_score": 0.0,
        "is_critical_gap": true,
        "computed_at": "2026-02-19T02:05:00Z",
        "created_at": "2026-02-19T02:05:00Z",
        "updated_at": "2026-02-19T02:05:00Z"
      }
    ],
    "summary": {
      "total_concepts": 200,
      "critical_gaps": 12,
      "avg_pagerank": 0.005,
      "percentile_75_pagerank": 0.015
    },
    "meta": {
      "page": 1,
      "limit": 50,
      "total": 200,
      "total_pages": 4
    }
  },
  "error": null
}
```

### POST /api/v1/coverage/centrality/compute (Auth: InstitutionalAdmin)

Triggers on-demand centrality computation. Returns immediately with job status.

**Success Response (202):**
```json
{
  "data": { "status": "computing", "estimated_duration_ms": 10000 },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin |
| 400 | `VALIDATION_ERROR` | Invalid system name or sort field |
| 503 | `SERVICE_UNAVAILABLE` | GDS library not available or computation in progress |

---

## 6. Frontend Spec

No dedicated frontend page in this story. Centrality data is consumed by the Concept Graph Visualization (STORY-IA-29) for node sizing.

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/centrality.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Edit (add centrality export) |
| 3 | Supabase migration via MCP (concept_metrics table) | Database | Apply |
| 4 | `apps/server/src/models/concept-metrics.model.ts` | Model | Create |
| 5 | `apps/server/src/repositories/concept-metrics.repository.ts` | Repository | Create |
| 6 | `apps/server/src/services/coverage/centrality-metrics.service.ts` | Service | Create |
| 7 | `apps/server/src/controllers/coverage.controller.ts` | Controller | Edit (add centrality handler) |
| 8 | `apps/server/src/index.ts` | Routes | Edit (add centrality routes) |
| 9 | `apps/server/src/tests/coverage/centrality-metrics.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-3 | institutional_admin | **PENDING** | Coverage computation service provides coverage_score data |

### NPM Packages (already installed)
- `neo4j-driver` -- Neo4j driver (GDS procedures called via Cypher)
- `@supabase/supabase-js` -- Supabase client
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `apps/server/src/services/coverage/coverage-computation.service.ts` -- coverage_score data

### External Requirements
- **Neo4j GDS plugin** must be installed on the Neo4j instance

---

## 9. Test Fixtures

```typescript
import { ConceptMetrics, CentralityResult, CriticalGap } from "@journey-os/types";

// Mock SubConcept nodes from Neo4j
export const MOCK_SUBCONCEPTS = [
  { id: "sc-uuid-1", name: "Myocardial Infarction Pathophysiology", system: "Cardiovascular" },
  { id: "sc-uuid-2", name: "Heart Failure Mechanism", system: "Cardiovascular" },
  { id: "sc-uuid-3", name: "Pulmonary Embolism", system: "Respiratory" },
  { id: "sc-uuid-4", name: "Asthma Pathology", system: "Respiratory" },
  { id: "sc-uuid-5", name: "Renal Tubular Acidosis", system: "Renal" },
];

// Mock PageRank results from GDS
export const MOCK_PAGERANK_RESULTS: CentralityResult[] = [
  { concept_id: "sc-uuid-1", score: 0.0342 },
  { concept_id: "sc-uuid-2", score: 0.0256 },
  { concept_id: "sc-uuid-3", score: 0.0189 },
  { concept_id: "sc-uuid-4", score: 0.0045 },
  { concept_id: "sc-uuid-5", score: 0.0032 },
];

// Mock betweenness results from GDS
export const MOCK_BETWEENNESS_RESULTS: CentralityResult[] = [
  { concept_id: "sc-uuid-1", score: 0.156 },
  { concept_id: "sc-uuid-3", score: 0.134 },
  { concept_id: "sc-uuid-2", score: 0.089 },
  { concept_id: "sc-uuid-5", score: 0.023 },
  { concept_id: "sc-uuid-4", score: 0.011 },
];

// Mock concept metrics row (after computation)
export const MOCK_CONCEPT_METRICS: ConceptMetrics = {
  id: "cm-uuid-1",
  concept_id: "sc-uuid-1",
  concept_name: "Myocardial Infarction Pathophysiology",
  system: "Cardiovascular",
  pagerank: 0.0342,
  betweenness: 0.156,
  coverage_score: 0.0,
  is_critical_gap: true,
  computed_at: "2026-02-19T02:05:00Z",
  created_at: "2026-02-19T02:05:00Z",
  updated_at: "2026-02-19T02:05:00Z",
};

// Mock critical gap
export const MOCK_CRITICAL_GAP: CriticalGap = {
  concept_id: "sc-uuid-1",
  concept_name: "Myocardial Infarction Pathophysiology",
  system: "Cardiovascular",
  pagerank: 0.0342,
  betweenness: 0.156,
  connected_concepts: 8,
};

// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/coverage/centrality-metrics.test.ts`

```
describe("CentralityMetricsService")
  describe("computePageRank")
    it("creates GDS graph projection and runs PageRank algorithm")
    it("returns ranked concept_id + score pairs")
    it("drops GDS graph projection after computation")
  describe("computeBetweenness")
    it("runs betweenness centrality on concept-graph projection")
    it("returns ranked concept_id + score pairs")
  describe("computeAll")
    it("computes both PageRank and betweenness and stores via DualWrite")
    it("writes to Supabase concept_metrics table first")
    it("updates Neo4j SubConcept node properties second")
    it("sets sync_status correctly on success and failure")
  describe("flagCriticalGaps")
    it("flags concepts with pagerank > 75th percentile AND coverage_score = 0")
    it("does not flag concepts with non-zero coverage")
    it("correctly calculates 75th percentile threshold")
```

**Total: ~10 tests**

---

## 11. E2E Test Spec

Not required for this story. Centrality computation is a backend service.

---

## 12. Acceptance Criteria

1. CentralityMetricsService computes PageRank for all SubConcept nodes using GDS
2. CentralityMetricsService computes betweenness centrality using GDS
3. Results stored in Supabase `concept_metrics` table via DualWrite
4. Neo4j SubConcept nodes updated with `pagerank` and `betweenness` properties
5. GDS graph projection created before computation and dropped after
6. PageRank uses dampingFactor=0.85, maxIterations=20, tolerance=0.0001
7. Critical gaps flagged: pagerank > 75th percentile AND coverage = 0
8. API endpoint returns ranked concepts with filtering by system
9. Computation is async (does not block API response)
10. All 10 API tests pass

---

## 13. Source References

| Claim | Source |
|-------|--------|
| GDS PageRank and betweenness | S-IA-28-5 Notes |
| Graph projection parameters | S-IA-28-5 Notes |
| PageRank parameters | S-IA-28-5 Notes: dampingFactor 0.85 |
| Critical gap threshold | S-IA-28-5 Notes: 75th percentile + zero coverage |
| DualWrite pattern | CLAUDE.md Database Rules |
| Computation duration estimate | S-IA-28-5 Notes: 5-15s for 1000 concepts |
| Piggybacking on nightly job | S-IA-28-5 Acceptance Criteria |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `institutions` table exists
- **Neo4j:** Instance running with GDS plugin installed, SubConcept nodes seeded
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **STORY-IA-3 must be complete** -- coverage_score data needed for critical gap flagging

---

## 15. Implementation Notes

- **GDS graph projection lifecycle:** Create the projection before computation, reuse it for both PageRank and betweenness, then drop it. Do NOT leave projections lingering in memory.
- **GDS procedure calls:** Use `gds.pageRank.stream()` (not `.write()`) so we can process results in the service layer before DualWrite. Same for `gds.betweenness.stream()`.
- **75th percentile calculation:** After computing all PageRank scores, sort descending and find the score at index `Math.floor(scores.length * 0.25)`. Concepts above this score with `coverage_score = 0` are critical gaps.
- **Upsert pattern:** Use `ON CONFLICT (concept_id, institution_id) DO UPDATE` in Supabase to handle recomputation without duplicates.
- **Async execution:** The `POST /centrality/compute` endpoint triggers computation asynchronously. Return 202 immediately. The client can poll `GET /centrality` to see updated results.
- **Private fields pattern:** `CentralityMetricsService` uses `readonly #neo4jClient`, `readonly #supabaseClient`, `readonly #coverageService` with constructor DI.
- **Error class:** Create `CentralityComputationError` extending `JourneyOSError` for GDS failures.
- **GDS availability check:** Before running GDS procedures, verify the plugin is installed with `CALL gds.version()`. If unavailable, throw `CentralityComputationError` with helpful message.
