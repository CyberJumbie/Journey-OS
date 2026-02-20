# STORY-IA-21 Brief: Hierarchy Tree View

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-21
old_id: S-IA-17-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 21
sprint: 3
size: M
depends_on:
  - STORY-IA-6 (institutional_admin) — Framework List Page
blocks: []
personas_served: [institutional_admin, superadmin]
epic: E-17 (Framework Browser UI)
feature: F-08 (Framework Browser)
user_flow: UF-13 (Framework Exploration)
```

---

## 1. Summary

Build an **expandable hierarchy tree browser** for educational frameworks at `/institution/frameworks/[frameworkId]`. Root nodes load on page load; children load lazily on expand. Each tree node shows name, ID, level indicator, and child count badge. Clicking a node opens a detail panel (right-side drawer) showing full description, relationships, and metadata. The tree supports variable depth (4 levels for USMLE, 1 level for Bloom/Miller). Breadcrumb navigation shows the current path in the hierarchy.

Key constraints:
- **Lazy loading:** Root nodes on page load, children on expand
- **Neo4j query:** Follows `CONTAINS` and `HAS_ELEMENT` relationships
- **Variable depth:** USMLE (4 levels), ACGME/EPA/Milestones (2-3 levels), Bloom/Miller (1 level)
- **Detail panel:** Right-side drawer on node click
- **Breadcrumb:** Path from root to current node
- **Generic tree component:** Reusable for curriculum mapping views

---

## 2. Task Breakdown

Implementation order follows: **Types -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create framework tree types
- **File:** `packages/types/src/frameworks/framework-tree.types.ts`
- **Action:** Export `FrameworkTreeNode`, `FrameworkNodeDetail`, `FrameworkTreeQuery`, `FrameworkChildrenResponse`

### Task 2: Update frameworks barrel export
- **File:** `packages/types/src/frameworks/index.ts`
- **Action:** Re-export from `framework-tree.types.ts`

### Task 3: Build FrameworkTreeService
- **File:** `apps/server/src/services/framework/framework-tree.service.ts`
- **Action:** `getRootNodes(frameworkId)`, `getChildren(parentNodeId)`, `getNodeDetail(nodeId)`, `getBreadcrumb(nodeId)`. All queries use Neo4j.

### Task 4: Build FrameworkTreeController
- **File:** `apps/server/src/controllers/framework/framework-tree.controller.ts`
- **Action:** `handleGetRootNodes(req, res)`, `handleGetChildren(req, res)`, `handleGetNodeDetail(req, res)`

### Task 5: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add `GET /api/v1/frameworks/:frameworkId/nodes`, `GET /api/v1/frameworks/nodes/:nodeId/children`, `GET /api/v1/frameworks/nodes/:nodeId` with InstitutionalAdmin/SuperAdmin RBAC

### Task 6: Build tree view page
- **File:** `apps/web/src/app/(protected)/institution/frameworks/[frameworkId]/page.tsx`
- **Action:** Default export page component rendering the framework tree

### Task 7: Build FrameworkTree component
- **File:** `apps/web/src/components/framework/framework-tree.tsx`
- **Action:** Organism component managing tree state, expansion, selection

### Task 8: Build TreeNode component
- **File:** `apps/web/src/components/framework/tree-node.tsx`
- **Action:** Recursive node component with expand/collapse toggle, level indicator, child count

### Task 9: Build NodeDetailPanel component
- **File:** `apps/web/src/components/framework/node-detail-panel.tsx`
- **Action:** Right-side drawer showing node description, relationships, metadata

### Task 10: Write service tests
- **File:** `apps/server/src/services/framework/__tests__/framework-tree.service.test.ts`
- **Action:** 8 tests covering root nodes, children, detail, breadcrumb, auth

---

## 3. Data Model

```typescript
// packages/types/src/frameworks/framework-tree.types.ts

/** A node in the framework hierarchy tree */
export interface FrameworkTreeNode {
  readonly id: string;
  readonly name: string;
  readonly level: string;            // "System", "Discipline", "Topic", "SubConcept", etc.
  readonly framework_id: string;
  readonly child_count: number;
  readonly sort_order: number;
  readonly has_children: boolean;
  readonly depth: number;            // 0 = root, 1 = second level, etc.
}

/** Detailed view of a single node */
export interface FrameworkNodeDetail {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly level: string;
  readonly framework_id: string;
  readonly framework_name: string;
  readonly child_count: number;
  readonly parent_id: string | null;
  readonly parent_name: string | null;
  readonly breadcrumb: readonly BreadcrumbItem[];
  readonly relationships: readonly NodeRelationship[];
  readonly metadata: Record<string, string | number | boolean>;
}

/** Breadcrumb item for navigation */
export interface BreadcrumbItem {
  readonly id: string;
  readonly name: string;
  readonly level: string;
}

/** A relationship from/to this node */
export interface NodeRelationship {
  readonly type: string;             // e.g., "CONTAINS", "HAS_ELEMENT", "FULFILLS"
  readonly direction: "incoming" | "outgoing";
  readonly target_id: string;
  readonly target_name: string;
  readonly target_level: string;
}

/** Query parameters for root nodes */
export interface FrameworkTreeQuery {
  readonly framework_id: string;
}

/** Response for children request */
export interface FrameworkChildrenResponse {
  readonly parent_id: string;
  readonly children: readonly FrameworkTreeNode[];
  readonly total: number;
}
```

---

## 4. Database Schema

No new Supabase tables. All tree data comes from Neo4j.

**Neo4j queries:**

```cypher
// Get root nodes for a framework (nodes with no parent in this framework)
MATCH (n)
WHERE n.framework_id = $frameworkId
  AND NOT ()-[:CONTAINS|HAS_ELEMENT]->(n)
WITH n
OPTIONAL MATCH (n)-[:CONTAINS|HAS_ELEMENT]->(child)
RETURN n.id AS id,
       n.name AS name,
       labels(n)[0] AS level,
       n.framework_id AS framework_id,
       n.sort_order AS sort_order,
       COUNT(child) AS child_count
ORDER BY n.sort_order

// Get children of a node
MATCH (parent {id: $parentId})-[:CONTAINS|HAS_ELEMENT]->(child)
OPTIONAL MATCH (child)-[:CONTAINS|HAS_ELEMENT]->(grandchild)
RETURN child.id AS id,
       child.name AS name,
       labels(child)[0] AS level,
       child.framework_id AS framework_id,
       child.sort_order AS sort_order,
       COUNT(grandchild) AS child_count
ORDER BY child.sort_order

// Get node detail
MATCH (n {id: $nodeId})
OPTIONAL MATCH (parent)-[:CONTAINS|HAS_ELEMENT]->(n)
RETURN n, parent.id AS parent_id, parent.name AS parent_name

// Get breadcrumb (path from root to node)
MATCH path = (root)-[:CONTAINS|HAS_ELEMENT*]->(target {id: $nodeId})
WHERE NOT ()-[:CONTAINS|HAS_ELEMENT]->(root)
RETURN [node IN nodes(path) | {id: node.id, name: node.name, level: labels(node)[0]}] AS breadcrumb

// Get node relationships
MATCH (n {id: $nodeId})-[r]-(other)
RETURN type(r) AS type,
       CASE WHEN startNode(r) = n THEN 'outgoing' ELSE 'incoming' END AS direction,
       other.id AS target_id,
       other.name AS target_name,
       labels(other)[0] AS target_level
```

---

## 5. API Contract

### GET /api/v1/frameworks/:frameworkId/nodes (Auth: InstitutionalAdmin/SuperAdmin)

Returns root nodes for a framework.

**Success Response (200):**
```json
{
  "data": {
    "framework_id": "usmle",
    "nodes": [
      {
        "id": "sys-uuid-1",
        "name": "Cardiovascular",
        "level": "USMLE_System",
        "framework_id": "usmle",
        "child_count": 7,
        "sort_order": 1,
        "has_children": true,
        "depth": 0
      }
    ],
    "total": 16
  },
  "error": null
}
```

### GET /api/v1/frameworks/nodes/:nodeId/children (Auth: InstitutionalAdmin/SuperAdmin)

Returns children of a node.

**Success Response (200):**
```json
{
  "data": {
    "parent_id": "sys-uuid-1",
    "children": [
      {
        "id": "disc-uuid-1",
        "name": "Anatomy",
        "level": "USMLE_Discipline",
        "framework_id": "usmle",
        "child_count": 4,
        "sort_order": 1,
        "has_children": true,
        "depth": 1
      }
    ],
    "total": 7
  },
  "error": null
}
```

### GET /api/v1/frameworks/nodes/:nodeId (Auth: InstitutionalAdmin/SuperAdmin)

Returns full node detail.

**Success Response (200):**
```json
{
  "data": {
    "id": "sys-uuid-1",
    "name": "Cardiovascular",
    "description": "Cardiovascular system including heart, blood vessels, and lymphatics",
    "level": "USMLE_System",
    "framework_id": "usmle",
    "framework_name": "USMLE Content Outline",
    "child_count": 7,
    "parent_id": null,
    "parent_name": null,
    "breadcrumb": [
      { "id": "sys-uuid-1", "name": "Cardiovascular", "level": "USMLE_System" }
    ],
    "relationships": [
      {
        "type": "CONTAINS",
        "direction": "outgoing",
        "target_id": "disc-uuid-1",
        "target_name": "Anatomy",
        "target_level": "USMLE_Discipline"
      }
    ],
    "metadata": {}
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin/SuperAdmin |
| 404 | `NOT_FOUND` | Framework or node not found |

---

## 6. Frontend Spec

### Page: `/institution/frameworks/[frameworkId]` (Tree View)

**Route:** `apps/web/src/app/(protected)/institution/frameworks/[frameworkId]/page.tsx`

**Component hierarchy:**
```
FrameworkTreePage (page.tsx -- default export)
  ├── BreadcrumbNav (framework name > parent > current)
  ├── FrameworkTree (organism, client component)
  │     └── TreeNode[] (recursive)
  │           ├── ExpandToggle (chevron icon, rotates on expand)
  │           ├── LevelIndicator (indentation + colored line)
  │           ├── NodeName (clickable text)
  │           ├── ChildCountBadge (e.g., "7 children")
  │           └── LoadingSpinner (shown while children load)
  └── NodeDetailPanel (right-side drawer, shown on node click)
        ├── PanelHeader (node name + close button)
        ├── DescriptionSection (full description text)
        ├── MetadataTable (level, framework, parent)
        ├── RelationshipList (incoming/outgoing relationships)
        └── NavigateToChildButton (if node has children)
```

**States:**
1. **Loading** -- Skeleton tree while root nodes load
2. **Idle** -- Tree displayed with root nodes, all collapsed
3. **Expanding** -- Spinner on node toggle while children load
4. **Expanded** -- Children visible with indentation
5. **Selected** -- Node highlighted, detail panel open
6. **Highlighted** -- Node from search result (STORY-IA-19) auto-expanded and highlighted
7. **Error** -- Error message with retry for failed node loads

**Design tokens:**
- Tree indent: `--spacing-6` per level (24px per depth level)
- Expand chevron: Lucide `ChevronRight` (rotates 90deg on expand)
- Node name: `--font-weight-medium`, clickable with hover underline
- Child count badge: `--badge-variant-outline`, `--color-text-muted`
- Level indicator colors: System=navy, Discipline=green, Topic=amber, SubConcept=slate
- Detail panel: width 400px, `--shadow-xl`, slide-in from right
- Breadcrumb: `--color-text-muted`, Lucide `ChevronRight` separator

**Animation:**
- Expand/collapse: 200ms ease-in-out height transition
- Detail panel: 300ms slide-in from right
- Chevron rotation: 200ms ease

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/frameworks/framework-tree.types.ts` | Types | Create |
| 2 | `packages/types/src/frameworks/index.ts` | Types | Edit (add tree export) |
| 3 | `apps/server/src/services/framework/framework-tree.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/framework/framework-tree.controller.ts` | Controller | Create |
| 5 | `apps/server/src/index.ts` | Routes | Edit (add tree routes) |
| 6 | `apps/web/src/app/(protected)/institution/frameworks/[frameworkId]/page.tsx` | View | Create |
| 7 | `apps/web/src/components/framework/framework-tree.tsx` | Component | Create |
| 8 | `apps/web/src/components/framework/tree-node.tsx` | Component | Create |
| 9 | `apps/web/src/components/framework/node-detail-panel.tsx` | Component | Create |
| 10 | `apps/server/src/services/framework/__tests__/framework-tree.service.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-6 | institutional_admin | **PENDING** | Framework list page provides navigation to tree view |

### NPM Packages (already installed)
- `neo4j-driver` -- Neo4j driver for tree queries
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `apps/server/src/services/framework/framework.service.ts` -- framework metadata (from IA-6)

---

## 9. Test Fixtures

```typescript
import { FrameworkTreeNode, FrameworkNodeDetail, BreadcrumbItem } from "@journey-os/types";

// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
};

// Mock USMLE root nodes (Systems)
export const MOCK_ROOT_NODES: FrameworkTreeNode[] = [
  { id: "sys-1", name: "Cardiovascular", level: "USMLE_System", framework_id: "usmle", child_count: 7, sort_order: 1, has_children: true, depth: 0 },
  { id: "sys-2", name: "Respiratory", level: "USMLE_System", framework_id: "usmle", child_count: 7, sort_order: 2, has_children: true, depth: 0 },
  { id: "sys-3", name: "Renal", level: "USMLE_System", framework_id: "usmle", child_count: 7, sort_order: 3, has_children: true, depth: 0 },
];

// Mock children of Cardiovascular system (Disciplines)
export const MOCK_CARDIOVASCULAR_CHILDREN: FrameworkTreeNode[] = [
  { id: "disc-1", name: "Anatomy", level: "USMLE_Discipline", framework_id: "usmle", child_count: 4, sort_order: 1, has_children: true, depth: 1 },
  { id: "disc-2", name: "Pathology", level: "USMLE_Discipline", framework_id: "usmle", child_count: 6, sort_order: 2, has_children: true, depth: 1 },
];

// Mock Bloom's Taxonomy root nodes (no children -- depth 1 framework)
export const MOCK_BLOOM_NODES: FrameworkTreeNode[] = [
  { id: "bloom-1", name: "Remember", level: "BloomLevel", framework_id: "bloom", child_count: 0, sort_order: 1, has_children: false, depth: 0 },
  { id: "bloom-2", name: "Understand", level: "BloomLevel", framework_id: "bloom", child_count: 0, sort_order: 2, has_children: false, depth: 0 },
  { id: "bloom-3", name: "Apply", level: "BloomLevel", framework_id: "bloom", child_count: 0, sort_order: 3, has_children: false, depth: 0 },
];

// Mock node detail
export const MOCK_NODE_DETAIL: FrameworkNodeDetail = {
  id: "sys-1",
  name: "Cardiovascular",
  description: "Cardiovascular system including heart, blood vessels, and lymphatics",
  level: "USMLE_System",
  framework_id: "usmle",
  framework_name: "USMLE Content Outline",
  child_count: 7,
  parent_id: null,
  parent_name: null,
  breadcrumb: [{ id: "sys-1", name: "Cardiovascular", level: "USMLE_System" }],
  relationships: [
    { type: "CONTAINS", direction: "outgoing", target_id: "disc-1", target_name: "Anatomy", target_level: "USMLE_Discipline" },
  ],
  metadata: {},
};

// Mock breadcrumb for a deep node
export const MOCK_DEEP_BREADCRUMB: BreadcrumbItem[] = [
  { id: "sys-1", name: "Cardiovascular", level: "USMLE_System" },
  { id: "disc-2", name: "Pathology", level: "USMLE_Discipline" },
  { id: "topic-1", name: "Ischemic Heart Disease", level: "USMLE_Topic" },
  { id: "sc-1", name: "Myocardial Infarction", level: "SubConcept" },
];
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/framework/__tests__/framework-tree.service.test.ts`

```
describe("FrameworkTreeService")
  describe("getRootNodes")
    it("returns root nodes for USMLE framework (16 systems)")
    it("returns root nodes for Bloom's Taxonomy (6 levels, no children)")
    it("includes child_count for each root node")
    it("throws NotFoundError for unknown framework_id")
  describe("getChildren")
    it("returns children of a parent node with correct depth")
    it("returns empty array for leaf nodes (no children)")
    it("includes grandchild_count for lazy loading decision")
  describe("getNodeDetail")
    it("returns full node detail including description and relationships")
    it("includes breadcrumb path from root to node")
    it("throws NotFoundError for unknown node_id")
  describe("getBreadcrumb")
    it("returns correct path for a 4-level deep USMLE node")
    it("returns single-item path for a root node")
```

**Total: ~11 tests**

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/framework-tree.spec.ts`

```
describe("Framework Tree View")
  it("InstitutionalAdmin can browse USMLE hierarchy and view node details")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/frameworks
    3. Click on "USMLE Content Outline" card
    4. Verify 16 root system nodes are displayed
    5. Expand "Cardiovascular" node
    6. Verify discipline children appear
    7. Click on "Pathology" node
    8. Verify detail panel opens with description
    9. Verify breadcrumb shows "Cardiovascular > Pathology"
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Tree view page at `/institution/frameworks/[frameworkId]`
2. Root nodes loaded on page load; children loaded on expand (lazy loading)
3. Each tree node shows name, ID, level indicator, and child count badge
4. Expand/collapse toggle with smooth animation
5. Click node to open detail panel with full description, relationships, metadata
6. Breadcrumb navigation showing current path in hierarchy
7. Tree supports variable depth: 4 levels (USMLE) down to 1 level (Bloom, Miller)
8. Loading indicator shown during child node loading
9. Tree component is generic enough for reuse in curriculum mapping views
10. All 11 API tests pass
11. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Lazy loading pattern | S-IA-17-2 Notes: USMLE has 227 nodes |
| Neo4j query pattern | S-IA-17-2 Notes: CONTAINS/HAS_ELEMENT relationships |
| Variable depth support | S-IA-17-2 Acceptance Criteria |
| Detail panel drawer pattern | S-IA-17-2 Notes |
| Breadcrumb from shortest path | S-IA-17-2 Notes |
| Generic tree component | S-IA-17-2 Notes: reuse in curriculum mapping |

---

## 14. Environment Prerequisites

- **Neo4j:** Instance running with framework nodes seeded (USMLE 227 nodes from U-7)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **STORY-IA-6 must be complete** -- framework list page provides navigation to tree view

---

## 15. Implementation Notes

- **Lazy loading is essential:** USMLE has 227 nodes across 4 levels. Loading all at once is unnecessary and slow. Only load root nodes initially, then children on expand.
- **Neo4j query optimization:** The children query should include `OPTIONAL MATCH (child)-[:CONTAINS|HAS_ELEMENT]->(grandchild)` to count grandchildren. This lets the frontend know if a child node has an expand toggle.
- **Sort order:** Nodes should be returned in `sort_order` (set during seeding). If `sort_order` is not set, fall back to alphabetical by name.
- **Detail panel drawer:** Use a right-side sliding panel (400px wide) that overlays the tree content. Close on Escape or clicking the X button. Do NOT navigate away from the page.
- **Breadcrumb via shortest path:** Use Neo4j `shortestPath()` to build the breadcrumb from root to current node. Cache this in the node detail response.
- **Highlight from search:** If the URL has `?highlight=nodeId` (from IA-19 search), auto-expand the tree to that node and scroll it into view. Build the expansion path from the breadcrumb.
- **Tree component reusability:** Design the `FrameworkTree` organism with generic props: `onLoadChildren(parentId)`, `onSelectNode(nodeId)`, `renderNode(node)`. This allows reuse in curriculum mapping views.
- **Private fields pattern:** `FrameworkTreeService` uses `readonly #neo4jClient` with constructor DI.
- **No Supabase needed:** This story is Neo4j-only for all read operations.
