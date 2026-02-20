# STORY-IA-9: Knowledge Graph Browser

**Epic:** E-36 (Admin Dashboard & KPIs)
**Feature:** F-17 (Admin Dashboard & Data Integrity)
**Sprint:** 9
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-36-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a knowledge graph browser to explore nodes and relationships directly so that I can understand the curriculum data structure, verify data integrity, and investigate unexpected linkages.

## Acceptance Criteria
- [ ] GraphBrowser page at `/admin/graph-browser`: search bar + graph canvas + detail sidebar
- [ ] Search: find nodes by label, name, or property value (typeahead autocomplete, debounced 300ms)
- [ ] Supported node types: Course, SLO, ILO, Concept, SubConcept, USMLE_Topic, USMLE_System, USMLE_Discipline, Question
- [ ] Node rendering: different shapes/colors per label (circles for concepts, squares for courses, diamonds for SLOs, triangles for questions)
- [ ] Relationship rendering: labeled directed edges with relationship type visible on hover
- [ ] Expand/collapse: click a node to load its neighbors (lazy loading, not full graph)
- [ ] Detail sidebar: shows all properties of selected node/relationship with copy-to-clipboard for IDs
- [ ] Path finder: select two nodes and show shortest path between them
- [ ] Max visible nodes: 200 (with "load more neighbors" prompt)
- [ ] Filter by node type and relationship type
- [ ] Scoped to institution: all queries include institution_id filter where applicable
- [ ] Export: download visible graph as PNG or SVG
- [ ] Accessibility: ARIA labels on interactive elements

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/KnowledgeBrowser.tsx` | `apps/web/src/app/(protected)/admin/graph-browser/page.tsx` | Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract graph canvas into organism using D3 force simulation. Extract search and sidebar into molecules. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/graph-browser.types.ts` |
| Service | apps/server | `src/services/admin/graph-browser.service.ts` |
| Repository | apps/server | `src/repositories/graph-browser.repository.ts` |
| Controller | apps/server | `src/controllers/admin/graph-browser.controller.ts` |
| Routes | apps/server | `src/routes/admin/graph-browser.routes.ts` |
| Organisms | apps/web | `src/components/admin/graph-browser.tsx`, `src/components/admin/graph-canvas.tsx` |
| Molecules | apps/web | `src/components/admin/node-detail-sidebar.tsx`, `src/components/admin/graph-filter-panel.tsx`, `src/components/admin/graph-search-input.tsx` |
| Page | apps/web | `src/app/(protected)/admin/graph-browser/page.tsx` |
| Hooks | apps/web | `src/hooks/use-graph-browser.ts`, `src/hooks/use-graph-search.ts` |
| Tests | apps/server | `src/services/admin/__tests__/graph-browser.test.ts` |

## Database Schema

No Supabase tables. All data from Neo4j.

### Neo4j Query Patterns
```cypher
-- Search nodes
MATCH (n) WHERE n.name =~ '(?i).*' + $query + '.*' RETURN n LIMIT 20

-- Expand neighbors
MATCH (n)-[r]-(m) WHERE id(n) = $nodeId RETURN n, r, m LIMIT 50

-- Shortest path
MATCH path = shortestPath((a)-[*..10]-(b))
WHERE id(a) = $startId AND id(b) = $endId
RETURN path
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/graph/search` | InstitutionalAdmin+ | Search nodes by name/label |
| GET | `/api/v1/admin/graph/nodes/:id/neighbors` | InstitutionalAdmin+ | Get neighbors of a node |
| GET | `/api/v1/admin/graph/nodes/:id` | InstitutionalAdmin+ | Get node detail |
| GET | `/api/v1/admin/graph/path` | InstitutionalAdmin+ | Shortest path between two nodes |

## Dependencies
- **Blocked by:** STORY-U-12 (frameworks seeded -- graph has data to browse)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (12-15)
- Search: returns matching nodes, respects label filter, handles empty query
- Node detail: returns all properties of a node
- Expand: returns neighbors with relationship data, respects limit
- Path finder: returns shortest path, handles disconnected nodes
- Filtering: by node type, by relationship type
- Auth enforcement: 403 for non-admin roles
- Institution scoping: queries include institution_id filter
- Performance: neighbor expansion completes within acceptable latency
- Edge cases: node with no neighbors, cyclic paths, max depth

## Implementation Notes
- Graph canvas uses D3 force simulation (`d3-force`) within a React wrapper (useRef + useEffect pattern).
- Node shapes: use D3 symbol generators -- circle (Concept), square (Course), diamond (SLO), triangle (Question).
- Lazy loading: only fetch immediate neighbors on expand, not full subgraph.
- Detail sidebar: JSON-like property display with copy-to-clipboard for IDs. Slides in from right (drawer pattern).
- Max 200 visible nodes to prevent browser performance degradation.
- D3 force simulation props may use hex with `/* token: --color-name */` comment per architecture rules.
- Debounced search prevents excessive Neo4j queries during typing.
- Express `req.params.id` is `string | string[]` -- narrow with `typeof === "string"`.
