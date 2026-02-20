# STORY-IA-16: Centrality Metrics

**Epic:** E-28 (Coverage Computation & Heatmap)
**Feature:** F-13 (USMLE Coverage & Gap Detection)
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-28-5

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need PageRank and betweenness centrality computed for concepts in the knowledge graph so that I can identify which concepts are most critical for curriculum coverage and prioritize gap remediation.

## Acceptance Criteria
- [ ] CentralityMetricsService computes PageRank for all SubConcept nodes in Neo4j
- [ ] CentralityMetricsService computes betweenness centrality for all SubConcept nodes
- [ ] Results stored per concept: `{ concept_id, pagerank, betweenness, computed_at }`
- [ ] Centrality data stored in Supabase `concept_metrics` table AND as Neo4j node properties
- [ ] API endpoint `GET /api/v1/coverage/centrality?system=X` returns ranked concepts
- [ ] High-centrality unassessed concepts flagged as "critical gaps"
- [ ] Computation triggered by nightly job (piggybacks on STORY-IA-15) or on-demand via API
- [ ] Critical gap threshold: concept with pagerank > 75th percentile AND coverage = 0

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/centrality.types.ts` |
| Model | apps/server | `src/models/concept-metrics.model.ts` |
| Repository | apps/server | `src/repositories/concept-metrics.repository.ts` |
| Service | apps/server | `src/services/coverage/centrality-metrics.service.ts` |
| Controller | apps/server | `src/controllers/coverage/coverage.controller.ts` (update) |
| Tests | apps/server | `src/services/coverage/__tests__/centrality-metrics.test.ts` |

## Database Schema

### Supabase -- `concept_metrics` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `concept_id` | varchar(100) | NOT NULL, UNIQUE (Neo4j node reference) |
| `concept_name` | varchar(255) | NOT NULL |
| `system` | varchar(100) | NULL (USMLE system) |
| `discipline` | varchar(100) | NULL (USMLE discipline) |
| `pagerank` | numeric(10,8) | NOT NULL |
| `betweenness` | numeric(10,8) | NOT NULL |
| `coverage_score` | numeric(5,4) | NULL (from coverage computation) |
| `is_critical_gap` | boolean | NOT NULL, DEFAULT false |
| `computed_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j -- Node property updates
```
SET sc.pagerank = $pagerank, sc.betweenness = $betweenness
```

Uses Neo4j GDS library:
```cypher
CALL gds.graph.project('concept-graph', 'SubConcept', ['PART_OF', 'RELATED_TO', 'PREREQUISITE_OF'])
CALL gds.pageRank.stream('concept-graph', {dampingFactor: 0.85, maxIterations: 20, tolerance: 0.0001})
CALL gds.betweenness.stream('concept-graph')
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/coverage/centrality` | InstitutionalAdmin+ | Get ranked concepts with centrality scores |
| POST | `/api/v1/coverage/centrality/compute` | InstitutionalAdmin+ | Trigger on-demand computation |

## Dependencies
- **Blocked by:** STORY-IA-3 (Coverage Computation Service must exist)
- **Blocks:** None (concept graph visualization uses centrality for node sizing in future stories)
- **Cross-lane:** None

## Testing Requirements
### API Tests (8-10)
- PageRank computation: returns valid scores for SubConcept nodes
- Betweenness computation: returns valid scores for SubConcept nodes
- Storage: metrics written to Supabase `concept_metrics` AND Neo4j node properties
- Ranking: concepts returned in descending pagerank order
- Critical gap flagging: high-centrality unassessed concepts flagged correctly
- System filter: `?system=Cardiovascular` returns only matching concepts
- Auth enforcement: 403 for non-admin roles
- On-demand trigger: POST endpoint triggers computation asynchronously
- DualWrite: Supabase written first, Neo4j updated second

## Implementation Notes
- Use Neo4j Graph Data Science (GDS) library for PageRank and betweenness.
- GDS requires a named graph projection before running algorithms.
- PageRank parameters: dampingFactor 0.85, maxIterations 20, tolerance 0.0001.
- Computation takes ~5-15s for 1000 concepts; run async, not blocking API response.
- DualWriteService pattern: write centrality to Supabase `concept_metrics` first, then update Neo4j node properties.
- Critical gap threshold: concept with pagerank > 75th percentile AND coverage = 0.
- Service uses `readonly #neo4jRepository` and `readonly #supabaseClient` with constructor DI.
