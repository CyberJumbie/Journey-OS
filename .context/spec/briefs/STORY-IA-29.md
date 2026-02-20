# STORY-IA-29: Concept Graph Visualization

**Epic:** E-28 (Coverage Computation & Heatmap)
**Feature:** F-13
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** L
**Old ID:** S-IA-29-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a force-directed concept graph visualization color-coded by coverage so that I can explore the knowledge structure and identify clusters of under-assessed concepts.

## Acceptance Criteria
- [ ] D3 force-directed graph rendering SubConcept nodes and their relationships
- [ ] Nodes color-coded by coverage: red (unassessed), yellow (partially), green (fully assessed)
- [ ] Node size proportional to centrality score (PageRank)
- [ ] Edge rendering: `PART_OF`, `RELATED_TO`, `PREREQUISITE_OF` with distinct styles (solid, dashed, dotted)
- [ ] Zoom and pan controls with smooth transitions
- [ ] Node click: shows detail panel with concept name, coverage stats, linked SLOs, linked questions count
- [ ] Cluster detection: visually group concepts by USMLE System using force containment
- [ ] Search: find and focus on a specific concept by name
- [ ] Filter by USMLE System or Discipline to reduce graph complexity
- [ ] Performance: handle up to 500 nodes without frame drops (use canvas renderer for large graphs)
- [ ] 12-15 API tests: rendering, color mapping, interactions, search, filter, performance threshold

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/KnowledgeBrowser.tsx` (graph viz section) | `apps/web/src/components/organisms/coverage/concept-graph.tsx` | Prototype shows a tree browser. Production needs a D3 force-directed graph instead. Keep the system filter dropdown and search input from prototype. Replace tree rendering with D3 force simulation (`d3.forceSimulation`). Add canvas renderer fallback for >200 nodes. Remove React Router `useNavigate`. Remove `AdminDashboardLayout`. Use design tokens for node colors. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/concept-graph.types.ts` |
| Atoms | packages/ui | `src/atoms/graph-node.tsx`, `src/atoms/graph-edge.tsx` |
| Molecules | packages/ui | `src/molecules/graph-controls.tsx`, `src/molecules/concept-detail-panel.tsx` |
| Organisms | apps/web | `src/components/organisms/coverage/concept-graph.tsx` |
| Hooks | apps/web | `src/hooks/use-concept-graph-data.ts`, `src/hooks/use-graph-simulation.ts` |
| Utils | apps/web | `src/utils/graph-layout.ts` |
| Tests | apps/web | `src/components/organisms/coverage/__tests__/concept-graph.test.tsx`, `src/utils/__tests__/graph-layout.test.ts` |

## Database Schema
No new tables. Reads from Neo4j graph.

### Neo4j Query
```cypher
MATCH (sc:SubConcept)-[r]-()
WHERE sc.institution_id = $institutionId
RETURN sc, r
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/coverage/concept-graph` | institutional_admin | Get graph nodes and edges |

Query params: `system`, `discipline` (optional filters)

## Dependencies
- **Blocked by:** S-IA-28-1 (coverage data), S-IA-28-5 (centrality metrics for node sizing)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests / Component Tests (14)
1. Graph renders with correct number of nodes
2. Node color maps to coverage: red (0%), yellow (1-99%), green (100%)
3. Node size scales with PageRank centrality
4. Edge styles differ by relationship type
5. Zoom and pan controls work
6. Node click opens detail panel
7. Detail panel shows concept name, coverage, SLOs, question count
8. Search focuses on matching concept node
9. System filter reduces displayed nodes
10. Discipline filter reduces displayed nodes
11. Cluster grouping by USMLE System works
12. Canvas renderer activates for >200 nodes
13. Graph handles 500 nodes without frame drop
14. Empty graph state displayed when no data

## Implementation Notes
- Use D3 force simulation (`d3.forceSimulation`) with React wrapper, not react-force-graph (too heavy)
- For >200 nodes, switch from SVG to Canvas renderer for performance
- Force parameters: charge strength -30, link distance 60, collision radius based on node size
- Cluster containment: use `d3.forceX`/`d3.forceY` with group-specific targets for each USMLE System
- Node detail panel is a slide-over (not a modal) to keep the graph visible
- Graph data fetched from `/api/coverage/concept-graph?system=X&discipline=Y`
- Use design tokens for node colors; chart SVG props use hex with `/* token: --color-name */` comment
