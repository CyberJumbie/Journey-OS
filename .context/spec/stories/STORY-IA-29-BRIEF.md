# STORY-IA-29 Brief: Concept Graph Visualization

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-29
old_id: S-IA-28-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 29
sprint: 8
size: L
depends_on:
  - STORY-IA-3 (institutional_admin) — Coverage Computation Service (coverage data)
  - STORY-IA-16 (institutional_admin) — Centrality Metrics (PageRank for node sizing)
blocks: []
personas_served: [institutional_admin, faculty]
epic: E-28 (Coverage Computation & Heatmap)
feature: F-13 (USMLE Coverage Analytics)
user_flow: UF-22 (Institutional Coverage Analysis)
```

---

## 1. Summary

Build an interactive **force-directed concept graph visualization** using D3.js that displays SubConcept nodes color-coded by coverage status. Node size is proportional to PageRank centrality. Edges represent PART_OF, RELATED_TO, and PREREQUISITE_OF relationships with distinct visual styles. The visualization supports zoom/pan, node click for detail panels, cluster grouping by USMLE System, search, and filtering by System or Discipline.

Key constraints:
- **D3 force simulation** (`d3.forceSimulation`) with React wrapper -- not react-force-graph
- **SVG for <= 200 nodes**, switch to **Canvas** renderer for > 200 nodes (performance)
- **Force parameters:** charge -30, link distance 60, collision radius based on node size
- **Cluster containment** via `d3.forceX`/`d3.forceY` with group-specific targets per USMLE System
- **Node detail panel** is a slide-over (not modal) to keep graph visible
- **Performance:** handle up to 500 nodes without frame drops
- Graph data from `/api/v1/coverage/concept-graph`

---

## 2. Task Breakdown

Implementation order follows: **Types -> Utilities -> Hooks -> Atoms -> Molecules -> Organisms -> Tests**

### Task 1: Create concept graph types
- **File:** `packages/types/src/coverage/concept-graph.types.ts`
- **Action:** Export `GraphNode`, `GraphEdge`, `GraphData`, `GraphFilters`, `NodeDetail`

### Task 2: Export types from coverage barrel
- **File:** `packages/types/src/coverage/index.ts`
- **Action:** Edit to re-export from `concept-graph.types.ts`

### Task 3: Build graph layout utilities
- **File:** `apps/web/src/utils/graph-layout.ts`
- **Action:** Named exports: `createForceSimulation(nodes, edges, config)`, `getNodeColor(coverageStatus)`, `getNodeRadius(centrality, min, max)`, `getEdgeStyle(relType)`, `getClusterTarget(systemName, width, height)`.

### Task 4: Build useConceptGraphData hook
- **File:** `apps/web/src/hooks/use-concept-graph-data.ts`
- **Action:** Named export `useConceptGraphData(filters)`. Fetches graph data from API, returns `{ data, isLoading, error, refetch }`.

### Task 5: Build useGraphSimulation hook
- **File:** `apps/web/src/hooks/use-graph-simulation.ts`
- **Action:** Named export `useGraphSimulation(containerRef, data, config)`. Initializes and manages D3 force simulation lifecycle, handles resize, returns simulation controls `{ zoomIn, zoomOut, resetZoom, focusNode }`.

### Task 6: Build GraphNode atom
- **File:** `packages/ui/src/atoms/graph-node.tsx`
- **Action:** Named export `GraphNode`. SVG `<circle>` with fill from coverage color, radius from centrality, hover highlight, click handler.

### Task 7: Build GraphEdge atom
- **File:** `packages/ui/src/atoms/graph-edge.tsx`
- **Action:** Named export `GraphEdge`. SVG `<line>` with distinct styles: PART_OF (solid), RELATED_TO (dashed), PREREQUISITE_OF (dotted).

### Task 8: Build GraphControls molecule
- **File:** `packages/ui/src/molecules/graph-controls.tsx`
- **Action:** Named export `GraphControls`. Zoom in/out/reset buttons, search input, system/discipline filter dropdowns.

### Task 9: Build ConceptDetailPanel molecule
- **File:** `packages/ui/src/molecules/concept-detail-panel.tsx`
- **Action:** Named export `ConceptDetailPanel`. Slide-over panel showing concept name, coverage stats, linked SLOs, question count.

### Task 10: Build ConceptGraph organism
- **File:** `apps/web/src/components/coverage/concept-graph.tsx`
- **Action:** Named export `ConceptGraph`. Main component wrapping D3 visualization. Uses `useRef` for SVG/canvas container, `useEffect` for D3 rendering. Manages node selection, zoom, search focus.

### Task 11: Write graph layout tests
- **File:** `apps/web/src/__tests__/coverage/graph-layout.test.ts`
- **Action:** 5-6 tests for utility functions: color mapping, radius scaling, edge styles.

### Task 12: Write concept graph component tests
- **File:** `apps/web/src/__tests__/coverage/concept-graph.test.tsx`
- **Action:** 8-10 tests for rendering, interactions, search, filter, performance.

---

## 3. Data Model

```typescript
// packages/types/src/coverage/concept-graph.types.ts

export type CoverageStatus = 'unassessed' | 'partial' | 'full';
export type RelationshipType = 'PART_OF' | 'RELATED_TO' | 'PREREQUISITE_OF';

/** A node in the concept graph */
export interface GraphNode {
  readonly id: string;
  readonly name: string;
  readonly coverage_status: CoverageStatus;
  readonly centrality_score: number;       // PageRank 0-1
  readonly system: string;                 // USMLE System for clustering
  readonly discipline: string;
  readonly slo_count: number;
  readonly question_count: number;
  // Mutable D3 simulation fields (set at runtime)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

/** An edge in the concept graph */
export interface GraphEdge {
  readonly source: string;                 // source node ID
  readonly target: string;                 // target node ID
  readonly type: RelationshipType;
  readonly weight?: number;
}

/** Complete graph dataset */
export interface GraphData {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly total_nodes: number;
  readonly total_edges: number;
}

/** Filter parameters for graph data */
export interface GraphFilters {
  readonly system?: string;
  readonly discipline?: string;
  readonly search?: string;
}

/** Detail for a selected node */
export interface NodeDetail {
  readonly id: string;
  readonly name: string;
  readonly coverage_status: CoverageStatus;
  readonly centrality_score: number;
  readonly linked_slos: readonly {
    readonly slo_id: string;
    readonly slo_code: string;
    readonly slo_title: string;
  }[];
  readonly question_count: number;
  readonly related_concepts: readonly {
    readonly id: string;
    readonly name: string;
    readonly relationship: RelationshipType;
  }[];
}
```

---

## 4. Database Schema

No new tables. Graph data is queried from Neo4j:

**Neo4j query:**
```cypher
MATCH (sc:SubConcept)
WHERE sc.institution_id = $institutionId
OPTIONAL MATCH (sc)-[r:PART_OF|RELATED_TO|PREREQUISITE_OF]-(other:SubConcept)
OPTIONAL MATCH (sc)<-[:ASSESSES]-(q:Question)
OPTIONAL MATCH (sc)<-[:COVERS]-(slo:SLO)
RETURN sc {
  .id, .name, .centrality_score, .system, .discipline,
  slo_count: COUNT(DISTINCT slo),
  question_count: COUNT(DISTINCT q),
  coverage_status: CASE
    WHEN COUNT(q) = 0 THEN 'unassessed'
    WHEN COUNT(q) < 3 THEN 'partial'
    ELSE 'full'
  END
} AS node,
collect(DISTINCT {source: sc.id, target: other.id, type: type(r)}) AS edges
```

---

## 5. API Contract

### GET /api/v1/coverage/concept-graph (Auth: InstitutionalAdmin or Faculty)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `system` | string | -- | Filter by USMLE System |
| `discipline` | string | -- | Filter by USMLE Discipline |

**Success Response (200):**
```json
{
  "data": {
    "nodes": [
      {
        "id": "sc-uuid-1",
        "name": "Atherosclerosis pathogenesis",
        "coverage_status": "full",
        "centrality_score": 0.85,
        "system": "Cardiovascular",
        "discipline": "Pathology",
        "slo_count": 3,
        "question_count": 8
      }
    ],
    "edges": [
      {
        "source": "sc-uuid-1",
        "target": "sc-uuid-2",
        "type": "PREREQUISITE_OF"
      }
    ],
    "total_nodes": 245,
    "total_edges": 512
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not InstitutionalAdmin or Faculty |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

### Component hierarchy

```
ConceptGraph (Organism)
  ├── GraphControls (Molecule)
  │     ├── SearchInput (find and focus concept)
  │     ├── SystemFilter (dropdown)
  │     ├── DisciplineFilter (dropdown)
  │     ├── ZoomIn / ZoomOut / ResetZoom buttons
  │     └── ColorLegend (inline: red=unassessed, yellow=partial, green=full)
  ├── SVG/Canvas Container (responsive, D3-managed)
  │     ├── GraphEdge × N (Atom, with zoom-dependent rendering)
  │     └── GraphNode × N (Atom, with zoom-dependent rendering)
  └── ConceptDetailPanel (Molecule, slide-over on right)
        ├── Concept name and coverage status
        ├── Centrality score
        ├── Linked SLOs list
        ├── Question count
        └── Related concepts list
```

**States:**
1. **Loading** -- Centered spinner with "Loading concept graph..."
2. **Data** -- Force-directed graph with interactive nodes
3. **Node Selected** -- Detail panel slides in from right
4. **Search Focus** -- Found node centered and highlighted, others dimmed
5. **Filtered** -- Only nodes matching system/discipline shown
6. **Empty** -- "No concepts found" message
7. **Performance Mode** -- Canvas renderer active for >200 nodes

**Design tokens:**
- Node colors: unassessed (#dc2626), partial (#eab308), full (#69a338)
- Node size: min 8px, max 40px, scaled linearly by centrality
- Edge styles: PART_OF (solid, 1px), RELATED_TO (dashed 4-2, 1px), PREREQUISITE_OF (dotted 2-2, 1px)
- Edge color: `#9ca3af` (neutral gray)
- Detail panel: 320px wide, `--color-surface-primary`, `--shadow-lg`
- Controls bar: `--color-surface-secondary`, `--spacing-2` gap between controls
- Search highlight: `#2563eb` (blue ring around found node)

**D3 Force Configuration:**
```typescript
{
  charge: d3.forceManyBody().strength(-30),
  link: d3.forceLink(edges).distance(60),
  collision: d3.forceCollide().radius(d => getNodeRadius(d.centrality_score) + 2),
  center: d3.forceCenter(width / 2, height / 2),
  clusterX: d3.forceX().x(d => getClusterTarget(d.system).x).strength(0.1),
  clusterY: d3.forceY().y(d => getClusterTarget(d.system).y).strength(0.1),
}
```

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/coverage/concept-graph.types.ts` | Types | Create |
| 2 | `packages/types/src/coverage/index.ts` | Types | Edit (add export) |
| 3 | `apps/web/src/utils/graph-layout.ts` | Utility | Create |
| 4 | `apps/web/src/hooks/use-concept-graph-data.ts` | Hook | Create |
| 5 | `apps/web/src/hooks/use-graph-simulation.ts` | Hook | Create |
| 6 | `packages/ui/src/atoms/graph-node.tsx` | Atom | Create |
| 7 | `packages/ui/src/atoms/graph-edge.tsx` | Atom | Create |
| 8 | `packages/ui/src/molecules/graph-controls.tsx` | Molecule | Create |
| 9 | `packages/ui/src/molecules/concept-detail-panel.tsx` | Molecule | Create |
| 10 | `apps/web/src/components/coverage/concept-graph.tsx` | Component | Create |
| 11 | `apps/web/src/__tests__/coverage/graph-layout.test.ts` | Tests | Create |
| 12 | `apps/web/src/__tests__/coverage/concept-graph.test.tsx` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-3 | institutional_admin | **PENDING** | Coverage Computation provides coverage data for node coloring |
| STORY-IA-16 | institutional_admin | **PENDING** | Centrality Metrics provides PageRank scores for node sizing |

### NPM Packages
- `d3` -- D3.js force simulation and rendering (**likely already installed** from STORY-IA-13 heatmap)
- `@types/d3` -- TypeScript definitions (**likely already installed**)
- No new packages expected

### Existing Files Needed
- `apps/web/src/lib/api-client.ts` -- authenticated fetch wrapper
- `apps/web/src/components/ui/input.tsx` -- shadcn/ui Input for search
- `apps/web/src/components/ui/select.tsx` -- shadcn/ui Select for filters
- `apps/web/src/components/ui/button.tsx` -- shadcn/ui Button for zoom controls
- `apps/web/src/components/ui/sheet.tsx` -- shadcn/ui Sheet for slide-over detail panel

---

## 9. Test Fixtures

```typescript
export const MOCK_GRAPH_NODES: GraphNode[] = [
  {
    id: "sc-uuid-1", name: "Atherosclerosis pathogenesis",
    coverage_status: "full", centrality_score: 0.85,
    system: "Cardiovascular", discipline: "Pathology",
    slo_count: 3, question_count: 8,
  },
  {
    id: "sc-uuid-2", name: "Myocardial infarction",
    coverage_status: "partial", centrality_score: 0.72,
    system: "Cardiovascular", discipline: "Pathology",
    slo_count: 2, question_count: 2,
  },
  {
    id: "sc-uuid-3", name: "Pulmonary embolism",
    coverage_status: "unassessed", centrality_score: 0.45,
    system: "Respiratory", discipline: "Pathology",
    slo_count: 1, question_count: 0,
  },
  {
    id: "sc-uuid-4", name: "Coronary artery anatomy",
    coverage_status: "full", centrality_score: 0.60,
    system: "Cardiovascular", discipline: "Anatomy",
    slo_count: 2, question_count: 5,
  },
];

export const MOCK_GRAPH_EDGES: GraphEdge[] = [
  { source: "sc-uuid-1", target: "sc-uuid-2", type: "PREREQUISITE_OF" },
  { source: "sc-uuid-4", target: "sc-uuid-1", type: "RELATED_TO" },
  { source: "sc-uuid-1", target: "sc-uuid-3", type: "PART_OF" },
];

export const MOCK_GRAPH_DATA: GraphData = {
  nodes: MOCK_GRAPH_NODES,
  edges: MOCK_GRAPH_EDGES,
  total_nodes: 4,
  total_edges: 3,
};

export const MOCK_NODE_DETAIL: NodeDetail = {
  id: "sc-uuid-1",
  name: "Atherosclerosis pathogenesis",
  coverage_status: "full",
  centrality_score: 0.85,
  linked_slos: [
    { slo_id: "slo-uuid-1", slo_code: "SLO-101", slo_title: "Describe atherosclerosis mechanisms" },
    { slo_id: "slo-uuid-2", slo_code: "SLO-102", slo_title: "Identify risk factors" },
  ],
  question_count: 8,
  related_concepts: [
    { id: "sc-uuid-2", name: "Myocardial infarction", relationship: "PREREQUISITE_OF" },
    { id: "sc-uuid-4", name: "Coronary artery anatomy", relationship: "RELATED_TO" },
  ],
};
```

---

## 10. API Test Spec

**File:** `apps/web/src/__tests__/coverage/graph-layout.test.ts`

```
describe("graph-layout utilities")
  describe("getNodeColor")
    it("returns red for unassessed coverage status")
    it("returns yellow for partial coverage status")
    it("returns green for full coverage status")
  describe("getNodeRadius")
    it("returns min radius for centrality 0")
    it("returns max radius for centrality 1")
    it("scales linearly between min and max")
  describe("getEdgeStyle")
    it("returns solid style for PART_OF")
    it("returns dashed style for RELATED_TO")
    it("returns dotted style for PREREQUISITE_OF")
```

**File:** `apps/web/src/__tests__/coverage/concept-graph.test.tsx`

```
describe("ConceptGraph")
  it("renders nodes with correct coverage colors")
  it("renders edges with distinct line styles per relationship type")
  it("shows detail panel on node click")
  it("filters nodes by USMLE System")
  it("filters nodes by USMLE Discipline")
  it("searches and focuses on concept by name")
  it("renders loading state while data is fetching")
  it("renders empty state when no nodes exist")
  it("zoom controls increase/decrease/reset the transform")
```

**Total: ~15 tests**

---

## 11. E2E Test Spec (Playwright)

No E2E tests for this story. The concept graph is a visualization component. Testing D3 force simulations in E2E is unreliable. Coverage via unit and component tests is sufficient.

---

## 12. Acceptance Criteria

1. D3 force-directed graph renders SubConcept nodes and their relationships
2. Nodes color-coded: red (unassessed), yellow (partial), green (full)
3. Node size proportional to PageRank centrality score (min 8px, max 40px)
4. Edge rendering: PART_OF (solid), RELATED_TO (dashed), PREREQUISITE_OF (dotted)
5. Zoom and pan controls with smooth transitions
6. Node click shows slide-over detail panel with concept name, coverage stats, linked SLOs, question count
7. Cluster detection: concepts grouped by USMLE System using force containment
8. Search finds and focuses on a concept by name
9. Filter by USMLE System or Discipline reduces graph complexity
10. Performance: handles up to 500 nodes (Canvas renderer for >200 nodes)
11. All ~15 tests pass
12. Named exports only, TypeScript strict, design tokens only

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Force-directed concept graph | S-IA-28-3 User Story |
| D3 force simulation approach | S-IA-28-3 Notes |
| Coverage color coding | S-IA-28-3 Acceptance Criteria |
| Node size from centrality | S-IA-28-3 Acceptance Criteria |
| Edge style per relationship type | S-IA-28-3 Acceptance Criteria |
| Canvas renderer for >200 nodes | S-IA-28-3 Notes |
| Force parameters | S-IA-28-3 Notes |
| Cluster containment via forceX/Y | S-IA-28-3 Notes |
| Slide-over detail panel | S-IA-28-3 Notes |

---

## 14. Environment Prerequisites

- **Next.js:** Web app running on port 3000
- **Coverage API:** `GET /api/v1/coverage/concept-graph` endpoint must exist
- **D3.js:** Must be installed in apps/web (likely already from STORY-IA-13)
- **Neo4j:** SubConcept nodes with relationships and centrality scores populated
- **Auth:** InstitutionalAdmin or Faculty JWT

---

## 15. Figma Make Prototype

No Figma prototype for this story. Reference D3 force-directed graph examples from d3-gallery. The detail panel follows shadcn/ui Sheet (slide-over) pattern.
