# STORY-IA-34 Brief: Centrality Visualization

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-34
old_id: S-IA-33-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 34
sprint: 18
size: M
depends_on:
  - STORY-IA-11 (institutional_admin) — Analytics Service Infrastructure
blocks: []
personas_served: [institutional_admin]
epic: E-33 (Course & Teaching Analytics)
feature: F-15 (Teaching & Course Analytics)
user_flow: UF-24 (Institutional Curriculum Graph Analysis)
```

---

## 1. Summary

Build **graph centrality visualizations** showing PageRank and betweenness centrality metrics for concepts in the curriculum knowledge graph. The view includes ranked bar charts for top concepts by PageRank and betweenness, an interactive D3 force-directed graph with node size proportional to centrality, selectable node coloring (by course, Bloom level, or centrality metric), edge display for concept relationships, hover tooltips, and scope filtering (institution-wide or per-course).

Key constraints:
- **Neo4j GDS** algorithms: `gds.pageRank.stream`, `gds.betweenness.stream`
- **D3 force-directed graph** with React wrapper (no raw DOM manipulation)
- **Node size:** min 8px, max 40px, scaled linearly by centrality
- **Performance:** limit displayed nodes to top 100 by centrality; expandable on demand
- **Centrality results cached** in Supabase with TTL (recomputed nightly or on-demand)
- Consider **WebGL renderer** for graphs > 500 nodes

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Hook -> Components -> Page -> Tests**

### Task 1: Create centrality types
- **File:** `packages/types/src/analytics/centrality.types.ts`
- **Action:** Export `CentralityConcept`, `CentralityGraphData`, `CentralityFilters`, `CentralityMetricType`

### Task 2: Export types from analytics barrel
- **File:** `packages/types/src/analytics/index.ts`
- **Action:** Edit to re-export from `centrality.types.ts`

### Task 3: Build CentralityService
- **File:** `apps/server/src/services/analytics/centrality.service.ts`
- **Action:** Class with `#neo4jDriver` and `#supabase` private fields. Methods: `computePageRank(institutionId)`, `computeBetweenness(institutionId)`, `getTopConcepts(institutionId, metric, limit)`, `getGraphData(institutionId, filters)`, `getCachedResults(institutionId)`, `cacheResults(institutionId, results)`.

### Task 4: Build CentralityController
- **File:** `apps/server/src/controllers/analytics/centrality.controller.ts`
- **Action:** Handlers for GET /analytics/centrality/top, GET /analytics/centrality/graph. RBAC: institutional_admin.

### Task 5: Build CentralityBarChart component
- **File:** `apps/web/src/components/analytics/CentralityBarChart.tsx`
- **Action:** Named export `CentralityBarChart`. Recharts horizontal bar chart ranking top concepts by centrality score. Toggle between PageRank and Betweenness views.

### Task 6: Build KnowledgeGraphViz component
- **File:** `apps/web/src/components/analytics/KnowledgeGraphViz.tsx`
- **Action:** Named export `KnowledgeGraphViz`. D3 force-directed graph with centrality-proportional node sizes. Color mode selector. Hover tooltips. Zoom/pan. Limited to top 100 nodes by default with "Load More" expansion.

### Task 7: Build GraphControls component
- **File:** `apps/web/src/components/analytics/GraphControls.tsx`
- **Action:** Named export `GraphControls`. Color mode selector (by course, Bloom, centrality), scope filter (institution/course), metric selector (PageRank/Betweenness), zoom controls.

### Task 8: Build centrality page
- **File:** `apps/web/src/app/(dashboard)/admin/analytics/graph/page.tsx`
- **Action:** Default export page. Renders CentralityBarChart and KnowledgeGraphViz with GraphControls.

### Task 9: Write API tests
- **File:** `apps/server/src/tests/analytics/centrality.test.ts`
- **Action:** 8-12 tests for service and controller.

---

## 3. Data Model

```typescript
// packages/types/src/analytics/centrality.types.ts

export type CentralityMetricType = 'pagerank' | 'betweenness';
export type ColorMode = 'course' | 'bloom_level' | 'centrality';

/** A concept with centrality metrics */
export interface CentralityConcept {
  readonly id: string;
  readonly name: string;
  readonly pagerank_score: number;        // 0-1 (normalized)
  readonly betweenness_score: number;     // 0-1 (normalized)
  readonly course_ids: readonly string[];
  readonly course_names: readonly string[];
  readonly bloom_level?: string;
  readonly connected_slos: readonly {
    readonly slo_id: string;
    readonly slo_code: string;
  }[];
}

/** Edge in centrality graph */
export interface CentralityEdge {
  readonly source: string;
  readonly target: string;
  readonly type: 'prerequisite' | 'related' | 'part_of';
  readonly weight?: number;
}

/** Complete centrality graph data */
export interface CentralityGraphData {
  readonly nodes: readonly CentralityConcept[];
  readonly edges: readonly CentralityEdge[];
  readonly total_nodes: number;
  readonly displayed_nodes: number;       // may be < total (top 100 default)
  readonly computed_at: string;
}

/** Filter parameters */
export interface CentralityFilters {
  readonly scope: 'institution' | 'course';
  readonly course_id?: string;
  readonly metric: CentralityMetricType;
  readonly limit?: number;                // default 100
}
```

---

## 4. Database Schema

### Centrality cache table

```sql
CREATE TABLE centrality_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('pagerank', 'betweenness')),
  results JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  UNIQUE(institution_id, metric_type)
);

CREATE INDEX idx_centrality_cache_institution
  ON centrality_cache(institution_id, metric_type);

ALTER TABLE centrality_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view own institution centrality"
  ON centrality_cache FOR SELECT
  USING (institution_id = (auth.jwt() ->> 'institution_id')::uuid);
```

**Neo4j GDS queries:**
```cypher
-- PageRank
CALL gds.pageRank.stream('concept-graph', {
  maxIterations: 20,
  dampingFactor: 0.85,
  relationshipWeightProperty: 'weight'
})
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS node, score
WHERE node.institution_id = $institutionId
RETURN node.id AS id, node.name AS name, score
ORDER BY score DESC LIMIT $limit;

-- Betweenness Centrality
CALL gds.betweenness.stream('concept-graph')
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS node, score
WHERE node.institution_id = $institutionId
RETURN node.id AS id, node.name AS name, score
ORDER BY score DESC LIMIT $limit;
```

---

## 5. API Contract

### GET /api/v1/analytics/centrality/top (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `metric` | string | `pagerank` | `pagerank` or `betweenness` |
| `limit` | number | 20 | Number of top concepts |
| `course_id` | UUID | -- | Filter by course |

**Success Response (200):**
```json
{
  "data": {
    "concepts": [
      {
        "id": "concept-uuid-1",
        "name": "Atherosclerosis",
        "pagerank_score": 0.92,
        "betweenness_score": 0.78,
        "course_ids": ["course-uuid-1"],
        "course_names": ["Pathology I"],
        "bloom_level": "Analyze",
        "connected_slos": [
          { "slo_id": "slo-uuid-1", "slo_code": "SLO-101" }
        ]
      }
    ],
    "metric": "pagerank",
    "computed_at": "2026-02-19T02:00:00Z"
  },
  "error": null
}
```

### GET /api/v1/analytics/centrality/graph (Auth: InstitutionalAdmin)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `metric` | string | `pagerank` | Metric for node sizing |
| `limit` | number | 100 | Max nodes to display |
| `course_id` | UUID | -- | Filter by course |

**Success Response (200):**
```json
{
  "data": {
    "nodes": [
      {
        "id": "concept-uuid-1",
        "name": "Atherosclerosis",
        "pagerank_score": 0.92,
        "betweenness_score": 0.78,
        "course_ids": ["course-uuid-1"],
        "course_names": ["Pathology I"],
        "connected_slos": []
      }
    ],
    "edges": [
      { "source": "concept-uuid-1", "target": "concept-uuid-2", "type": "prerequisite" }
    ],
    "total_nodes": 450,
    "displayed_nodes": 100,
    "computed_at": "2026-02-19T02:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin |
| 500 | `INTERNAL_ERROR` | GDS computation failure |

---

## 6. Frontend Spec

### Page: `/admin/analytics/graph`

**Component hierarchy:**
```
CentralityPage (page.tsx -- default export)
  ├── PageHeader ("Knowledge Graph Centrality")
  ├── GraphControls (Molecule)
  │     ├── MetricSelector (PageRank / Betweenness toggle)
  │     ├── ColorModeSelector (Course / Bloom / Centrality)
  │     ├── ScopeFilter (Institution / specific Course)
  │     └── ZoomControls (In / Out / Reset)
  ├── CentralityBarChart (Recharts horizontal bar)
  │     └── Toggle: PageRank / Betweenness tabs
  └── KnowledgeGraphViz (D3 force-directed)
        ├── SVG/Canvas container
        │     ├── Edges (lines with type-specific styles)
        │     └── Nodes (circles, sized by centrality)
        ├── HoverTooltip (concept name, scores, SLOs)
        └── LoadMoreButton (expand beyond top 100)
```

**States:**
1. **Loading** -- Skeleton bar chart + centered spinner for graph
2. **Data** -- Bar chart ranked + graph rendered with nodes
3. **Node Hover** -- Tooltip with concept name, centrality scores, connected SLOs
4. **Color Mode** -- Nodes recolored based on selected mode
5. **Expanded** -- More nodes loaded beyond initial 100

**Design tokens:**
- Node size: min 8px, max 40px, linearly scaled
- Centrality color scale: `#ebedf0` (low) -> `#002c76` (high)
- Course colors: distinct palette per course (max 10 colors)
- Bloom colors: Remember (1) `#93c5fd`, Understand (2) `#60a5fa`, Apply (3) `#3b82f6`, Analyze (4) `#2563eb`, Evaluate (5) `#1d4ed8`, Create (6) `#1e3a8a`
- Edge: `#d1d5db` (gray), 1px, type-specific dash patterns
- Bar chart: `#002c76` (navy) bars, `--spacing-2` gap
- Tooltip: `--color-surface-secondary`, `--shadow-md`

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/analytics/centrality.types.ts` | Types | Create |
| 2 | `packages/types/src/analytics/index.ts` | Types | Edit (add export) |
| 3 | `apps/server/src/services/analytics/centrality.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/analytics/centrality.controller.ts` | Controller | Create |
| 5 | `apps/web/src/components/analytics/CentralityBarChart.tsx` | Component | Create |
| 6 | `apps/web/src/components/analytics/KnowledgeGraphViz.tsx` | Component | Create |
| 7 | `apps/web/src/components/analytics/GraphControls.tsx` | Component | Create |
| 8 | `apps/web/src/app/(dashboard)/admin/analytics/graph/page.tsx` | Page | Create |
| 9 | `apps/server/src/tests/analytics/centrality.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-11 | institutional_admin | **PENDING** | Analytics service infrastructure provides base patterns |

### NPM Packages
- `d3` -- D3.js for force-directed graph (likely already installed)
- `@types/d3` -- TypeScript definitions (likely already installed)
- `recharts` -- already installed for bar charts
- No new packages expected

### Existing Files Needed
- `apps/server/src/config/neo4j-client.config.ts` -- Neo4j driver for GDS queries
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/select.tsx` -- shadcn/ui Select for filters
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button for controls
- `apps/web/src/components/ui/tabs.tsx` -- shadcn/ui Tabs for metric toggle

---

## 9. Test Fixtures

```typescript
export const MOCK_CENTRALITY_CONCEPTS: CentralityConcept[] = [
  {
    id: "concept-uuid-1", name: "Atherosclerosis",
    pagerank_score: 0.92, betweenness_score: 0.78,
    course_ids: ["course-uuid-1"], course_names: ["Pathology I"],
    bloom_level: "Analyze",
    connected_slos: [{ slo_id: "slo-uuid-1", slo_code: "SLO-101" }],
  },
  {
    id: "concept-uuid-2", name: "Myocardial Infarction",
    pagerank_score: 0.85, betweenness_score: 0.65,
    course_ids: ["course-uuid-1", "course-uuid-2"],
    course_names: ["Pathology I", "Emergency Med"],
    bloom_level: "Apply",
    connected_slos: [{ slo_id: "slo-uuid-2", slo_code: "SLO-102" }],
  },
  {
    id: "concept-uuid-3", name: "Glucose Metabolism",
    pagerank_score: 0.55, betweenness_score: 0.90,
    course_ids: ["course-uuid-3"], course_names: ["Biochemistry I"],
    bloom_level: "Understand",
    connected_slos: [],
  },
];

export const MOCK_CENTRALITY_EDGES: CentralityEdge[] = [
  { source: "concept-uuid-1", target: "concept-uuid-2", type: "prerequisite" },
  { source: "concept-uuid-3", target: "concept-uuid-1", type: "related" },
];

export const MOCK_GRAPH_DATA: CentralityGraphData = {
  nodes: MOCK_CENTRALITY_CONCEPTS,
  edges: MOCK_CENTRALITY_EDGES,
  total_nodes: 450,
  displayed_nodes: 3,
  computed_at: "2026-02-19T02:00:00Z",
};

export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/tests/analytics/centrality.test.ts`

```
describe("CentralityService")
  describe("computePageRank")
    it("calls Neo4j GDS pageRank.stream and returns ranked results")
    it("normalizes PageRank scores to 0-1 range")
  describe("computeBetweenness")
    it("calls Neo4j GDS betweenness.stream and returns ranked results")
  describe("getTopConcepts")
    it("returns top N concepts by specified metric")
    it("filters by course_id when provided")
  describe("getGraphData")
    it("returns nodes and edges limited to top 100 by default")
    it("respects custom limit parameter")
  describe("caching")
    it("returns cached results when within TTL")
    it("recomputes when cache is expired")

describe("CentralityController")
  it("GET /centrality/top returns 200 with ranked concepts")
  it("GET /centrality/graph returns 200 with graph data")
  it("returns 401 for unauthenticated requests")
  it("returns 403 for non-institutional_admin roles")
```

**Total: ~12 API tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. Graph visualizations are unreliable in E2E due to D3 force simulation non-determinism. API and component tests provide sufficient coverage.

---

## 12. Acceptance Criteria

1. PageRank bar chart ranks top concepts by PageRank score
2. Betweenness bar chart ranks concepts by betweenness score
3. Interactive D3 force-directed graph with node size proportional to centrality
4. Node coloring selectable: by course, Bloom level, or centrality metric
5. Edges display relationships: prerequisite, related, part-of
6. Hover tooltip shows concept name, centrality scores, connected SLOs
7. Scope filter: institution-wide or per-course graph view
8. Centrality computed via Neo4j GDS algorithms (PageRank, Betweenness)
9. Results cached with 24-hour TTL
10. Graph limited to top 100 nodes by default, expandable
11. All ~12 API tests pass
12. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Centrality visualization concept | S-IA-33-4 User Story |
| Neo4j GDS algorithms | S-IA-33-4 Notes |
| D3 force-directed with React wrapper | S-IA-33-4 Notes |
| Node size min 8px max 40px | S-IA-33-4 Notes |
| Top 100 node limit | S-IA-33-4 Notes |
| Cached in Supabase with TTL | S-IA-33-4 Notes |
| WebGL consideration for >500 nodes | S-IA-33-4 Notes |
| Blocked by analytics infrastructure | S-IA-33-4 Dependencies |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Express:** Server running with analytics routes
- **Neo4j:** Running with GDS plugin installed and configured
- **Supabase:** centrality_cache table created
- **Auth:** InstitutionalAdmin JWT with `institution_id` claim
- **D3.js:** Must be installed in apps/web

---

## 15. Figma Make Prototype

No Figma prototype for this story. Reference D3 force-directed graph examples and Recharts horizontal bar chart patterns. The GraphControls follow existing filter/toolbar patterns in the admin UI.
