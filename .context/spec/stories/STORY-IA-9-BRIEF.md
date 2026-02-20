# STORY-IA-9 Brief: Knowledge Graph Browser

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-9
old_id: S-IA-36-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 9
sprint: 9
size: L
depends_on:
  - STORY-U-12 (universal) — Framework Seeding (graph has data to browse)
blocks: []
personas_served: [institutional_admin, superadmin]
epic: E-36 (Admin Dashboard & KPIs)
feature: F-17 (Admin Dashboard)
user_flow: UF-27 (Admin Dashboard & Data Integrity)
```

## 1. Summary

**What to build:** An interactive knowledge graph browser at `/institution/graph-browser` that allows institutional admins and superadmins to visually explore the Neo4j knowledge graph. Features include: typeahead search by label/name/property, D3 force-directed graph visualization, lazy neighbor expansion on click, a detail sidebar showing all properties of a selected node, and a path finder for shortest path between two nodes. The browser enforces a 200-node visible limit to prevent performance degradation.

**Parent epic:** E-36 (Admin Dashboard & KPIs) under F-17 (Admin Dashboard). This provides the graph exploration tool for data integrity auditing and curriculum mapping review.

**User flows satisfied:**
- UF-27 (Admin Dashboard & Data Integrity) — admin inspects graph structure, verifies relationships, finds paths between curriculum elements

**Personas:** Institutional Admin (primary), SuperAdmin (secondary — can access any institution's graph). Both need to verify that seeded framework nodes and user-created relationships form a coherent knowledge graph.

**Why this story matters:** The knowledge graph is the backbone of Journey OS's curriculum mapping, compliance checking, and adaptive learning. Without a visual browser, admins cannot verify data integrity, debug missing relationships, or understand the graph topology. This is the primary tool for graph-level quality assurance.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define graph browser types | `packages/types/src/admin/graph-browser.types.ts` | CREATE |
| 2 | Create admin types barrel export | `packages/types/src/admin/index.ts` | CREATE |
| 3 | Export admin module from types root | `packages/types/src/index.ts` | UPDATE |
| 4 | Create GraphBrowserError custom error | `apps/server/src/errors/graph-browser.error.ts` | CREATE |
| 5 | Implement GraphBrowserRepository | `apps/server/src/repositories/graph-browser.repository.ts` | CREATE |
| 6 | Implement GraphBrowserService | `apps/server/src/services/admin/graph-browser.service.ts` | CREATE |
| 7 | Implement GraphBrowserController | `apps/server/src/controllers/admin/graph-browser.controller.ts` | CREATE |
| 8 | Register graph browser routes | `apps/server/src/index.ts` | UPDATE |
| 9 | Create graph browser page (Next.js) | `apps/web/src/app/(protected)/institution/graph-browser/page.tsx` | CREATE |
| 10 | Create GraphBrowser organism component | `apps/web/src/components/admin/graph-browser.tsx` | CREATE |
| 11 | Create GraphCanvas component (D3) | `apps/web/src/components/admin/graph-canvas.tsx` | CREATE |
| 12 | Create NodeDetailSidebar component | `apps/web/src/components/admin/node-detail-sidebar.tsx` | CREATE |
| 13 | Create useGraphBrowser hook | `apps/web/src/hooks/use-graph-browser.ts` | CREATE |
| 14 | Write GraphBrowserRepository unit tests | `apps/server/src/repositories/__tests__/graph-browser.repository.test.ts` | CREATE |
| 15 | Write GraphBrowserService unit tests | `apps/server/src/services/admin/__tests__/graph-browser.service.test.ts` | CREATE |
| 16 | Write GraphBrowserController unit tests | `apps/server/src/controllers/admin/__tests__/graph-browser.controller.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/admin/graph-browser.types.ts`

```typescript
/**
 * A node in the knowledge graph, returned from Neo4j.
 * Properties are dynamic — different node labels have different properties.
 */
export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly properties: Readonly<Record<string, unknown>>;
}

/**
 * An edge (relationship) in the knowledge graph.
 */
export interface GraphEdge {
  readonly id: string;
  readonly type: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly properties: Readonly<Record<string, unknown>>;
}

/**
 * Search results from graph search endpoint.
 */
export interface GraphSearchResult {
  readonly nodes: readonly GraphNode[];
  readonly total: number;
}

/**
 * Query params for graph search.
 */
export interface GraphSearchQuery {
  readonly q: string;
  readonly label?: GraphNodeLabel;
  readonly limit?: number;
}

/**
 * Neighbors response — center node's immediate connections.
 */
export interface GraphNeighbors {
  readonly center_id: string;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
}

/**
 * Shortest path between two nodes.
 */
export interface GraphPath {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly length: number;
}

/**
 * Path finder query params.
 */
export interface GraphPathQuery {
  readonly from: string;
  readonly to: string;
}

/**
 * Full detail of a single node including all properties.
 */
export interface GraphNodeDetail {
  readonly node: GraphNode;
  readonly neighbor_count: number;
  readonly labels: readonly string[];
}

/**
 * Known node labels in the knowledge graph.
 * Used for search filtering and visual differentiation.
 */
export type GraphNodeLabel =
  | "Course"
  | "SLO"
  | "ILO"
  | "Concept"
  | "SubConcept"
  | "USMLE_Topic"
  | "USMLE_System"
  | "USMLE_Discipline"
  | "USMLE_Task"
  | "LCME_Standard"
  | "LCME_Element"
  | "ACGME_Domain"
  | "ACGME_Subdomain"
  | "AAMC_Domain"
  | "AAMC_Competency"
  | "EPA"
  | "UME_Competency"
  | "UME_Subcompetency"
  | "BloomLevel"
  | "MillerLevel"
  | "Question";

/**
 * Known relationship types for filtering.
 */
export type GraphRelationshipType =
  | "HAS_TOPIC"
  | "HAS_SUBTOPIC"
  | "MAPS_TO_COMPETENCY"
  | "MAPS_TO_EPA"
  | "MAPS_TO_UME"
  | "ADDRESSES_LCME"
  | "AT_BLOOM"
  | "FULFILLS"
  | "OFFERS"
  | "PREREQUISITE_OF"
  | "RELATED_TO";

/**
 * Visual configuration for each node label.
 */
export interface NodeVisualConfig {
  readonly shape: "circle" | "square" | "diamond" | "triangle";
  readonly color: string;
  readonly size: number;
}
```

### `packages/types/src/admin/index.ts`

```typescript
export type {
  GraphNode,
  GraphEdge,
  GraphSearchResult,
  GraphSearchQuery,
  GraphNeighbors,
  GraphPath,
  GraphPathQuery,
  GraphNodeDetail,
  GraphNodeLabel,
  GraphRelationshipType,
  NodeVisualConfig,
} from "./graph-browser.types";
```

## 4. Database Schema (inline, complete)

**No new tables or migrations.** This story reads from Neo4j only. All queries are read-only.

**Neo4j node labels queried:**
- Framework nodes (seeded, read-only): `USMLE_System`, `USMLE_Discipline`, `USMLE_Task`, `USMLE_Topic`, `LCME_Standard`, `LCME_Element`, `ACGME_Domain`, `ACGME_Subdomain`, `AAMC_Domain`, `AAMC_Competency`, `EPA`, `UME_Competency`, `UME_Subcompetency`, `BloomLevel`, `MillerLevel`
- User-created nodes: `Course`, `SLO`, `ILO`, `Concept`, `SubConcept`, `Question`

**Neo4j relationships queried:**
- `HAS_TOPIC`, `HAS_SUBTOPIC`, `MAPS_TO_COMPETENCY`, `MAPS_TO_EPA`, `MAPS_TO_UME`, `ADDRESSES_LCME`, `AT_BLOOM`, `FULFILLS`, `OFFERS`, `PREREQUISITE_OF`, `RELATED_TO`

**No Supabase tables involved.** This is a pure Neo4j read-only browser.

## 5. API Contract (complete request/response)

### GET /api/v1/institution/graph/search

**Auth:** Required. Roles: `institutional_admin`, `superadmin`.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search term (min 2 chars). Matches name, code, or title properties |
| `label` | string | No | Filter by node label (e.g., "USMLE_Topic") |
| `limit` | number | No | Max results (default 20, max 50) |

**200 Success:**
```json
{
  "data": {
    "nodes": [
      {
        "id": "neo4j-id-1",
        "label": "USMLE_Topic",
        "properties": {
          "name": "Cardiovascular System Anatomy",
          "code": "CVS-001"
        }
      }
    ],
    "total": 12
  },
  "error": null
}
```

**400 Validation Error:**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Search query must be at least 2 characters"
  }
}
```

### GET /api/v1/institution/graph/node/:id/neighbors

**Auth:** Required. Roles: `institutional_admin`, `superadmin`.

**Path Parameters:**
- `id` (string) — Neo4j node ID

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max neighbor nodes (default 50, max 200) |
| `rel_type` | string | No | Filter by relationship type |

**200 Success:**
```json
{
  "data": {
    "center_id": "neo4j-id-1",
    "nodes": [
      {
        "id": "neo4j-id-2",
        "label": "USMLE_System",
        "properties": { "name": "Cardiovascular" }
      }
    ],
    "edges": [
      {
        "id": "rel-id-1",
        "type": "HAS_TOPIC",
        "source_id": "neo4j-id-2",
        "target_id": "neo4j-id-1",
        "properties": {}
      }
    ]
  },
  "error": null
}
```

**404 Not Found:**
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Node not found"
  }
}
```

### GET /api/v1/institution/graph/node/:id

**Auth:** Required. Roles: `institutional_admin`, `superadmin`.

**200 Success:**
```json
{
  "data": {
    "node": {
      "id": "neo4j-id-1",
      "label": "USMLE_Topic",
      "properties": {
        "name": "Cardiovascular System Anatomy",
        "code": "CVS-001",
        "created_at": "2026-01-15T10:00:00Z"
      }
    },
    "neighbor_count": 8,
    "labels": ["USMLE_Topic"]
  },
  "error": null
}
```

### GET /api/v1/institution/graph/path

**Auth:** Required. Roles: `institutional_admin`, `superadmin`.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `from` | string | Yes | Source node ID |
| `to` | string | Yes | Target node ID |

**200 Success:**
```json
{
  "data": {
    "nodes": [
      { "id": "neo4j-id-1", "label": "SLO", "properties": { "name": "SLO-A" } },
      { "id": "neo4j-id-2", "label": "ILO", "properties": { "name": "ILO-B" } },
      { "id": "neo4j-id-3", "label": "ACGME_Domain", "properties": { "name": "Patient Care" } }
    ],
    "edges": [
      { "id": "rel-1", "type": "FULFILLS", "source_id": "neo4j-id-1", "target_id": "neo4j-id-2", "properties": {} },
      { "id": "rel-2", "type": "MAPS_TO_COMPETENCY", "source_id": "neo4j-id-2", "target_id": "neo4j-id-3", "properties": {} }
    ],
    "length": 2
  },
  "error": null
}
```

**404 No Path Found:**
```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "No path found between the specified nodes"
  }
}
```

## 6. Frontend Spec

### Route: `/institution/graph-browser`

**Layout:** `(protected)` group layout — requires authentication, shows admin navigation.

### Component Hierarchy

```
app/(protected)/institution/graph-browser/page.tsx (Server Component — metadata only)
  └── GraphBrowser (Client Component — "use client")
        ├── Search bar (typeahead autocomplete)
        │   ├── Text input with debounce (300ms)
        │   ├── Label filter dropdown
        │   └── Autocomplete results dropdown
        ├── Toolbar
        │   ├── Node type filter checkboxes
        │   ├── Relationship type filter checkboxes
        │   ├── Visible node count badge (N / 200 max)
        │   ├── "Clear graph" button
        │   └── "Find path" toggle button
        ├── GraphCanvas (D3 force simulation)
        │   ├── SVG container (responsive, fills available space)
        │   ├── Nodes: different shapes/colors per label
        │   ├── Edges: lines with arrow markers
        │   ├── Labels: node name text (truncated)
        │   ├── Hover: tooltip with relationship type on edges
        │   ├── Click node: load neighbors (lazy expand)
        │   ├── Double-click node: collapse (remove non-pinned neighbors)
        │   ├── Drag: reposition nodes
        │   └── Zoom/pan: scroll + drag on background
        ├── NodeDetailSidebar (right panel, collapsible)
        │   ├── Node label badge
        │   ├── All properties (key-value list)
        │   ├── Neighbor count
        │   ├── "Expand neighbors" button
        │   ├── "Set as path start" / "Set as path end" buttons
        │   └── Close button
        └── Path result highlight (when path finder active)
            ├── Highlighted nodes and edges in path
            └── Path length display
```

### useGraphBrowser Hook

```typescript
// apps/web/src/hooks/use-graph-browser.ts
interface UseGraphBrowserReturn {
  // State
  readonly nodes: Map<string, GraphNode>;
  readonly edges: Map<string, GraphEdge>;
  readonly selectedNode: GraphNode | null;
  readonly searchResults: GraphSearchResult | null;
  readonly pathResult: GraphPath | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly visibleNodeCount: number;

  // Actions
  search: (query: string, label?: GraphNodeLabel) => Promise<void>;
  addNode: (node: GraphNode) => void;
  expandNeighbors: (nodeId: string) => Promise<void>;
  collapseNeighbors: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  findPath: (fromId: string, toId: string) => Promise<void>;
  clearGraph: () => void;
  clearPath: () => void;
}
```

### Node Visual Configuration

```typescript
const NODE_VISUALS: Record<GraphNodeLabel, NodeVisualConfig> = {
  Course:            { shape: "square",   color: "#2b71b9", size: 14 },
  SLO:               { shape: "circle",   color: "#69a338", size: 10 },
  ILO:               { shape: "circle",   color: "#3b9c5e", size: 12 },
  Concept:           { shape: "diamond",  color: "#8b5cf6", size: 10 },
  SubConcept:        { shape: "diamond",  color: "#a78bfa", size: 8 },
  USMLE_Topic:       { shape: "circle",   color: "#dc2626", size: 8 },
  USMLE_System:      { shape: "square",   color: "#ef4444", size: 14 },
  USMLE_Discipline:  { shape: "square",   color: "#f87171", size: 12 },
  USMLE_Task:        { shape: "triangle", color: "#b91c1c", size: 10 },
  LCME_Standard:     { shape: "square",   color: "#f59e0b", size: 14 },
  LCME_Element:      { shape: "circle",   color: "#fbbf24", size: 8 },
  ACGME_Domain:      { shape: "square",   color: "#06b6d4", size: 14 },
  ACGME_Subdomain:   { shape: "circle",   color: "#22d3ee", size: 10 },
  AAMC_Domain:       { shape: "square",   color: "#14b8a6", size: 14 },
  AAMC_Competency:   { shape: "circle",   color: "#2dd4bf", size: 10 },
  EPA:               { shape: "triangle", color: "#ec4899", size: 12 },
  UME_Competency:    { shape: "square",   color: "#a855f7", size: 12 },
  UME_Subcompetency: { shape: "circle",   color: "#c084fc", size: 8 },
  BloomLevel:        { shape: "diamond",  color: "#78716c", size: 10 },
  MillerLevel:       { shape: "diamond",  color: "#a8a29e", size: 10 },
  Question:          { shape: "triangle", color: "#0ea5e9", size: 10 },
};
```

### Design Tokens
- Canvas background: `bg-gray-50`
- Sidebar: `bg-white border-l border-gray-200 w-80`
- Search input: `border-gray-300 rounded-md focus:ring-[#2b71b9]`
- Selected node: golden glow (`stroke: #f59e0b`, `stroke-width: 3`)
- Path highlight: `stroke: #2b71b9`, `stroke-width: 3`, `stroke-dasharray: none`
- Edge lines: `stroke: #9ca3af`, `stroke-width: 1`
- Edge hover: `stroke: #2b71b9`, `stroke-width: 2`
- Tooltip: `bg-gray-800 text-white text-xs rounded px-2 py-1`

### States
1. **Initial:** Empty canvas with search bar. "Search for a node to begin exploring."
2. **Searching:** Loading spinner in search dropdown
3. **Browsing:** Nodes and edges rendered on canvas, sidebar closed
4. **Node selected:** Sidebar open with node detail, node highlighted
5. **Expanding:** Loading indicator on the expanding node
6. **Path finding:** Two nodes selected as start/end, path highlighted
7. **Max nodes reached:** Warning banner "Maximum 200 nodes visible. Clear some nodes to continue exploring."
8. **Error:** Red banner with retry button

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/admin/graph-browser.types.ts` | CREATE | GraphNode, GraphEdge, search/path types |
| 2 | Types | `packages/types/src/admin/index.ts` | CREATE | Barrel export for admin types |
| 3 | Types | `packages/types/src/index.ts` | UPDATE | Add `export * from "./admin"` |
| 4 | Errors | `apps/server/src/errors/graph-browser.error.ts` | CREATE | GraphBrowserError, NodeNotFoundError |
| 5 | Repository | `apps/server/src/repositories/graph-browser.repository.ts` | CREATE | Neo4j Cypher queries |
| 6 | Service | `apps/server/src/services/admin/graph-browser.service.ts` | CREATE | Business logic, 200-node limit |
| 7 | Controller | `apps/server/src/controllers/admin/graph-browser.controller.ts` | CREATE | Request parsing, response formatting |
| 8 | App | `apps/server/src/index.ts` | UPDATE | Register 4 graph browser routes |
| 9 | View | `apps/web/src/app/(protected)/institution/graph-browser/page.tsx` | CREATE | Server component with metadata |
| 10 | Hook | `apps/web/src/hooks/use-graph-browser.ts` | CREATE | State management, API calls |
| 11 | Component | `apps/web/src/components/admin/graph-browser.tsx` | CREATE | Organism: search + toolbar + canvas + sidebar |
| 12 | Component | `apps/web/src/components/admin/graph-canvas.tsx` | CREATE | D3 force simulation SVG |
| 13 | Component | `apps/web/src/components/admin/node-detail-sidebar.tsx` | CREATE | Selected node properties panel |
| 14 | Tests | `apps/server/src/repositories/__tests__/graph-browser.repository.test.ts` | CREATE | Repository unit tests |
| 15 | Tests | `apps/server/src/services/admin/__tests__/graph-browser.service.test.ts` | CREATE | Service unit tests |
| 16 | Tests | `apps/server/src/controllers/admin/__tests__/graph-browser.controller.test.ts` | CREATE | Controller unit tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-U-12 | universal | PENDING | Framework Seeding — ensures graph has nodes to browse |
| STORY-U-1 | universal | DONE | Supabase Auth Setup |
| STORY-U-3 | universal | DONE | Express Auth Middleware |
| STORY-U-4 | universal | DONE | Seed Script Infrastructure — Neo4jClientConfig |
| STORY-U-6 | universal | DONE | RBAC Middleware |
| STORY-U-7 | universal | DONE | USMLE Seed Data — 227 USMLE nodes already in graph |

### NPM Packages

| Package | Version | Purpose |
|---------|---------|---------|
| `neo4j-driver` | ^5.x | Neo4j Cypher queries |
| `d3` | ^7.x | Force-directed graph visualization (NEW — install in apps/web) |
| `@types/d3` | ^7.x | TypeScript types for D3 (NEW — install in apps/web devDeps) |
| `express` | ^5.2.1 | Request/Response types |
| `zod` | ^4.3.6 | Query parameter validation |
| `vitest` | ^4.0.18 | Test runner |
| `next` | 16.1.6 | App Router |
| `react` | 19.2.3 | UI |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `apps/server/src/config/neo4j.config.ts` | `Neo4jClientConfig` for database connection |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/middleware/auth.middleware.ts` | Auth middleware |
| `apps/server/src/middleware/rbac.middleware.ts` | RBAC middleware |
| `packages/types/src/auth/roles.types.ts` | `AuthRole` enum |

## 9. Test Fixtures (inline)

### Graph Nodes

```typescript
export const MOCK_NODES: GraphNode[] = [
  {
    id: "node-1",
    label: "USMLE_System",
    properties: { name: "Cardiovascular", code: "CVS" },
  },
  {
    id: "node-2",
    label: "USMLE_Topic",
    properties: { name: "Heart Failure", code: "CVS-HF-001" },
  },
  {
    id: "node-3",
    label: "SLO",
    properties: { name: "Diagnose heart failure", course_id: "course-1" },
  },
  {
    id: "node-4",
    label: "ILO",
    properties: { name: "Manage cardiovascular diseases" },
  },
  {
    id: "node-5",
    label: "ACGME_Domain",
    properties: { name: "Patient Care", code: "PC" },
  },
];

export const MOCK_EDGES: GraphEdge[] = [
  {
    id: "rel-1",
    type: "HAS_TOPIC",
    source_id: "node-1",
    target_id: "node-2",
    properties: {},
  },
  {
    id: "rel-2",
    type: "FULFILLS",
    source_id: "node-3",
    target_id: "node-4",
    properties: {},
  },
  {
    id: "rel-3",
    type: "MAPS_TO_COMPETENCY",
    source_id: "node-4",
    target_id: "node-5",
    properties: {},
  },
];
```

### Mock Neo4j Session

```typescript
export function mockNeo4jSession() {
  return {
    run: vi.fn().mockResolvedValue({
      records: [],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

export function mockNeo4jDriver() {
  const session = mockNeo4jSession();
  return {
    driver: {
      session: vi.fn().mockReturnValue(session),
    },
    session,
  };
}
```

### Mock Express Objects

```typescript
import { Request, Response } from "express";

export function mockRequest(
  params?: Record<string, string>,
  query?: Record<string, string>,
): Partial<Request> {
  return {
    params: params ?? {},
    query: query ?? {},
    user: {
      sub: "user-uuid-1",
      email: "admin@example.edu",
      role: "institutional_admin",
      institution_id: "inst-uuid-1",
      is_course_director: false,
      aud: "authenticated",
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    },
  };
}

export function mockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/repositories/__tests__/graph-browser.repository.test.ts`

```
describe("GraphBrowserRepository")
  describe("search")
    it("runs MATCH query with CONTAINS filter on name property")
    it("filters by label when label param is provided")
    it("limits results to the specified limit")
    it("returns total count alongside node results")
    it("closes Neo4j session after query")

  describe("getNeighbors")
    it("returns connected nodes and relationships for a given node ID")
    it("filters by relationship type when rel_type param is provided")
    it("limits neighbor count to the specified limit")
    it("closes Neo4j session after query")

  describe("getNodeDetail")
    it("returns node with all properties and neighbor count")
    it("returns null when node ID does not exist")
    it("closes Neo4j session after query")

  describe("findShortestPath")
    it("returns shortest path between two nodes using shortestPath()")
    it("returns null when no path exists")
    it("closes Neo4j session after query")
```

### `apps/server/src/services/admin/__tests__/graph-browser.service.test.ts`

```
describe("GraphBrowserService")
  describe("search")
    it("delegates to repository with validated params")
    it("throws ValidationError when query is less than 2 characters")
    it("clamps limit to max 50")

  describe("getNeighbors")
    it("delegates to repository with node ID")
    it("throws NodeNotFoundError when node does not exist")
    it("clamps neighbor limit to max 200")

  describe("getNodeDetail")
    it("returns node detail from repository")
    it("throws NodeNotFoundError when node does not exist")

  describe("findPath")
    it("returns shortest path from repository")
    it("throws NodeNotFoundError when source node does not exist")
    it("throws NodeNotFoundError when target node does not exist")
    it("returns NOT_FOUND error when no path exists")
```

### `apps/server/src/controllers/admin/__tests__/graph-browser.controller.test.ts`

```
describe("GraphBrowserController")
  describe("handleSearch")
    it("returns 200 with GraphSearchResult for valid query")
    it("returns 400 for missing q parameter")
    it("returns 400 for q shorter than 2 characters")
    it("passes label filter when provided")

  describe("handleGetNeighbors")
    it("returns 200 with GraphNeighbors for valid node ID")
    it("returns 404 when node does not exist")
    it("narrows req.params.id with typeof check")

  describe("handleGetNodeDetail")
    it("returns 200 with GraphNodeDetail for valid node ID")
    it("returns 404 when node does not exist")

  describe("handleFindPath")
    it("returns 200 with GraphPath for valid from/to params")
    it("returns 400 when from or to is missing")
    it("returns 404 when no path exists")
    it("response bodies match ApiResponse envelope")
```

**Total: ~30 test cases** (exceeds 12-15 minimum).

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

**Not applicable for this story.** The graph browser depends on Neo4j being seeded with framework data (STORY-U-12). E2E tests would require a running Neo4j instance with seed data. This will be deferred to integration testing once the full seeding pipeline is stable. API-level tests with mocked Neo4j sessions provide sufficient coverage.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Graph browser page exists at `/institution/graph-browser` | Manual: navigate to page |
| AC-2 | Typeahead search returns matching nodes with debounce (300ms) | Code review + manual test |
| AC-3 | Search supports filtering by node label | Test: label param passed to query |
| AC-4 | D3 force-directed graph renders nodes with different shapes/colors per label | Code review: NODE_VISUALS config applied |
| AC-5 | Clicking a node loads and displays its neighbors (lazy expansion) | Test: getNeighbors called, nodes added to canvas |
| AC-6 | Double-clicking a node collapses its non-pinned neighbors | Code review: collapse logic |
| AC-7 | Selecting a node opens the detail sidebar with all properties | Code review: sidebar rendering |
| AC-8 | Path finder: selecting two nodes and clicking "Find path" highlights the shortest path | Test: findShortestPath query runs, path highlighted |
| AC-9 | Maximum 200 visible nodes enforced with warning banner | Code review: node count check |
| AC-10 | Relationship labels visible on edge hover (tooltip) | Code review: hover handler |
| AC-11 | Filter by node type works (checkbox toggles visibility) | Code review: filter state |
| AC-12 | Filter by relationship type works | Code review: rel_type param |
| AC-13 | Routes protected — requires `institutional_admin` or `superadmin` role | Test: RBAC middleware applied |
| AC-14 | JS `#private` fields used (not TS `private`) | Code review |
| AC-15 | Constructor DI: Neo4j driver injected into repository | Code review: constructor signature |
| AC-16 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-17 | Express `req.params` values narrowed with `typeof === "string"` | Code review |
| AC-18 | 12+ API tests pass | Test suite: ~30 tests in vitest |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| Node labels: USMLE_System, LCME_Standard, etc. | NODE_REGISTRY (seed data) | Framework hierarchy |
| Cross-layer relationships: MAPS_TO_COMPETENCY, AT_BLOOM, etc. | ARCHITECTURE_v10.md | SS 5.4 |
| ILO and SLO are separate node types | CLAUDE.md | Architecture Rules |
| SCREAMING_SNAKE_CASE for Neo4j labels with acronym prefix | CLAUDE.md | Architecture Rules |
| Neo4j env vars are optional in zod (validate at instantiation) | CLAUDE.md | Monorepo Conventions |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Express req.params narrowing | CLAUDE.md | Monorepo Conventions |
| Named exports only | CLAUDE.md | Architecture Rules |
| API response envelope: `{ data, error, meta? }` | API_CONTRACT_v1.md | Conventions |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Neo4j | Graph queries — mocked in tests | For manual testing only |
| Supabase | Auth only (no data queries) | For manual testing only |

### Environment Variables

No new environment variables. Uses existing Neo4j and Supabase config:

**Server (`apps/server/.env`):**
- `NEO4J_URI` — already configured (optional in zod schema)
- `NEO4J_USERNAME` — already configured
- `NEO4J_PASSWORD` — already configured
- `SUPABASE_URL` — already configured
- `SUPABASE_SERVICE_ROLE_KEY` — already configured

**Web (`apps/web/.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` — already configured
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already configured

### New Package Installation

```bash
# D3 for graph visualization
pnpm --filter @journey-os/web add d3
pnpm --filter @journey-os/web add -D @types/d3
```

### Dev Setup

```bash
pnpm install
pnpm --filter @journey-os/types build
pnpm --filter @journey-os/server test
```

## 15. Figma Make Prototype (Optional)

**Recommended.** The D3 force-directed graph visualization is complex enough to benefit from a visual prototype. Key things to prototype:
- Node shape/color legend
- Sidebar layout with property key-value pairs
- Path highlight styling
- Search autocomplete dropdown
- 200-node warning banner placement

If time is limited, sketch the layout on paper and code directly using the design tokens above.
