# STORY-IA-34: Centrality Visualization

**Epic:** E-33 (Course & Teaching Analytics)
**Feature:** F-15
**Sprint:** 18
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-33-4

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need graph centrality visualizations showing PageRank and betweenness metrics so that I can identify the most critical and interconnected concepts in the curriculum knowledge graph.

## Acceptance Criteria
- [ ] PageRank visualization: bar chart ranking top concepts by PageRank score
- [ ] Betweenness centrality: bar chart ranking concepts by betweenness score
- [ ] Interactive graph view: D3 force-directed graph with node size proportional to centrality
- [ ] Node coloring: color by course, Bloom level, or centrality metric (selectable)
- [ ] Edge display: shows relationships between concepts (prerequisite, related, part-of)
- [ ] Hover details: tooltip showing concept name, centrality scores, connected SLOs
- [ ] Scope filter: institution-wide or per-course graph view
- [ ] Centrality metrics computed via Neo4j GDS (Graph Data Science) algorithms
- [ ] 8-12 API tests: centrality queries, graph data assembly, scope filtering

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/analytics/QuestionPerformanceMetrics.tsx` | `apps/web/src/app/(protected)/analytics/graph/page.tsx` | Prototype shows question performance table. Production replaces with centrality bar charts and force-directed graph. Keep the filter/status controls pattern. Replace `C` color constants and font refs with design tokens. Remove `useBreakpoint`, `useNavigate`, `useLocation`. Convert `export default` (required for page.tsx). Add recharts BarChart for PageRank/betweenness rankings. Add D3 force-directed graph component. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/analytics/centrality.types.ts` |
| Service | apps/server | `src/services/analytics/centrality.service.ts` |
| Controller | apps/server | `src/controllers/analytics/centrality.controller.ts` |
| Route | apps/server | `src/routes/analytics/centrality.routes.ts` |
| View - Page | apps/web | `src/app/(protected)/analytics/graph/page.tsx` |
| View - Bar Charts | apps/web | `src/components/organisms/analytics/centrality-bar-chart.tsx` |
| View - Graph | apps/web | `src/components/organisms/analytics/knowledge-graph-viz.tsx` |
| View - Controls | apps/web | `src/components/molecules/graph-controls.tsx` |
| Hook | apps/web | `src/hooks/use-centrality-data.ts` |
| Tests | apps/server | `src/controllers/analytics/__tests__/centrality.test.ts` |

## Database Schema
No new tables. Centrality results cached in Supabase with TTL.

### Centrality Cache -- extend existing or use `centrality_cache` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK |
| `institution_id` | uuid | FK -> institutions |
| `concept_id` | uuid | NOT NULL |
| `pagerank_score` | numeric(10,6) | NOT NULL |
| `betweenness_score` | numeric(10,6) | NOT NULL |
| `computed_at` | timestamptz | NOT NULL |

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/analytics/centrality` | institutional_admin | Get centrality metrics |
| GET | `/api/v1/analytics/centrality/graph` | institutional_admin | Get graph data for visualization |

Query params: `scope` (institution/course), `courseId` (optional), `metric` (pagerank/betweenness)

## Dependencies
- **Blocked by:** S-IA-33-1 (analytics infrastructure exists)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /analytics/centrality returns PageRank scores for concepts
2. GET /analytics/centrality returns betweenness scores
3. Results sorted by score descending
4. Scope filter: institution-wide returns all concepts
5. Scope filter: per-course returns course-specific concepts
6. Graph data includes nodes and edges
7. Node data includes centrality scores and connected SLOs
8. Cache hit returns stored results
9. Cache miss triggers Neo4j GDS computation
10. Unauthorized user gets 403

## Implementation Notes
- Neo4j GDS algorithms: `gds.pageRank.stream`, `gds.betweenness.stream` -- require GDS plugin
- D3 force-directed graph: use `d3-force` with React wrapper (no raw DOM manipulation)
- Graph rendering performance: limit displayed nodes to top 100 by centrality; expandable on demand
- Node size: min 8px, max 40px, scaled linearly by centrality score
- Edge thickness: proportional to relationship weight (if available)
- Consider WebGL renderer (e.g., `@react-sigma/core`) for graphs > 500 nodes
- Centrality results cached in Supabase with TTL (recomputed nightly or on-demand)
- Recharts BarChart: use hex with `/* token: --color-name */` comments for SVG bar fill props
- Color-by selector: course (distinct colors per course), Bloom (6-level scale), centrality (gradient)
