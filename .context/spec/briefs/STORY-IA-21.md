# STORY-IA-21: Hierarchy Tree View

**Epic:** E-17 (Framework Browser UI)
**Feature:** F-08 (Framework Management)
**Sprint:** 3
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-17-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need an expandable tree browser for each framework so that I can explore the hierarchical structure of standards, competencies, and objectives.

## Acceptance Criteria
- [ ] Tree view page at `/institution/frameworks/[frameworkId]`
- [ ] Root nodes loaded on page load; children loaded on expand (lazy loading)
- [ ] Each tree node shows: name, ID, level indicator, child count badge
- [ ] Expand/collapse toggle with smooth animation
- [ ] Click node to see detail panel: full description, relationships, metadata
- [ ] Breadcrumb navigation showing current path in hierarchy
- [ ] Tree supports variable depth: 4 levels (USMLE) down to 1 level (Bloom, Miller)
- [ ] Loading indicator on expand for deeper levels
- [ ] RBAC: InstitutionalAdmin and SuperAdmin access

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/FrameworkManagement.tsx` | `apps/web/src/app/(protected)/institution/frameworks/[frameworkId]/page.tsx` | Extract tree view portion from FrameworkManagement. Convert to Next.js App Router with dynamic route param. Replace inline styles with Tailwind + design tokens. Use `@web/*` path alias. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/framework/framework-tree.types.ts` |
| Service | apps/server | `src/services/framework/framework-tree.service.ts` |
| Controller | apps/server | `src/controllers/framework/framework-tree.controller.ts` |
| Routes | apps/server | `src/routes/institution/framework.routes.ts` (update) |
| Page | apps/web | `src/app/(protected)/institution/frameworks/[frameworkId]/page.tsx` |
| Components | apps/web | `src/components/institution/framework-tree.tsx`, `src/components/institution/tree-node.tsx`, `src/components/institution/node-detail-panel.tsx` |
| Tests | apps/server | `src/services/framework/__tests__/framework-tree.service.test.ts` |

## Database Schema

No Supabase changes. All data from Neo4j.

### Neo4j Query Patterns
```cypher
-- Root nodes for a framework
MATCH (n {framework: $frameworkId})
WHERE NOT ()-[:CONTAINS|HAS_ELEMENT]->(n)
RETURN n ORDER BY n.sort_order

-- Children of a node
MATCH (p {id: $parentId})-[:CONTAINS|HAS_ELEMENT]->(c)
RETURN c ORDER BY c.sort_order

-- Breadcrumb path
MATCH path = shortestPath((root)-[:CONTAINS|HAS_ELEMENT*]->(n {id: $nodeId}))
WHERE NOT ()-[:CONTAINS|HAS_ELEMENT]->(root)
RETURN [node IN nodes(path) | {id: node.id, name: node.name}]
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/institution/frameworks/:frameworkId/tree` | InstitutionalAdmin+ | Get root nodes for framework |
| GET | `/api/v1/institution/frameworks/:frameworkId/tree/:nodeId/children` | InstitutionalAdmin+ | Get children of a node |
| GET | `/api/v1/institution/frameworks/:frameworkId/tree/:nodeId` | InstitutionalAdmin+ | Get node detail |

## Dependencies
- **Blocked by:** STORY-IA-6 (Framework List Page -- card click navigates here)
- **Blocks:** None
- **Cross-lane:** STORY-U-12 (USMLE hierarchy is the primary test case)

## Testing Requirements
### API Tests (8)
- Root nodes query: returns correct root nodes for framework
- Children query: returns children of a specific node
- Node detail: returns full description, relationships, metadata
- Empty children: returns empty array for leaf nodes
- Auth enforcement: 403 for non-admin roles
- Framework not found: returns 404 for invalid frameworkId
- Relationship traversal: follows CONTAINS and HAS_ELEMENT relationships
- Lazy loading: children endpoint is called separately (not eager-loaded)

## Implementation Notes
- Lazy loading is essential: USMLE has 227 nodes, loading all at once is unnecessary.
- Neo4j query pattern: `MATCH (p {framework_id: $parentId})-[:CONTAINS|HAS_ELEMENT]->(c) RETURN c ORDER BY c.sort_order`.
- Tree component (organism) should be generic enough for reuse in curriculum mapping views.
- Detail panel slides in from the right (drawer pattern) on node click.
- Breadcrumb uses the path from root to current node, built from Neo4j shortest path query.
- Express `req.params` values (`frameworkId`, `nodeId`) are `string | string[]` -- narrow with `typeof === "string"`.
- Design tokens for tree indentation, node borders, expand/collapse icons.
- Use `@web/*` path alias for all imports in apps/web.
