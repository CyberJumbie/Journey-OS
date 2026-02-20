# STORY-IA-3: Coverage Computation Service

**Epic:** E-28 (Coverage Computation & Heatmap)
**Feature:** F-13 (USMLE Coverage & Gap Detection)
**Sprint:** 8
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-28-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a coverage computation service that traverses the Neo4j knowledge graph to calculate assessment coverage statistics so that I can understand how well our question bank covers the USMLE curriculum.

## Acceptance Criteria
- [ ] CoverageComputationService with constructor DI for Neo4j repository
- [ ] Computes coverage matrix: 16 USMLE Systems x 7 USMLE Disciplines
- [ ] Coverage score per cell = (assessed concepts / total concepts) for that system-discipline intersection
- [ ] Coverage data includes: score (0-1), assessed_count, total_count, gap_count per cell
- [ ] Supports filtering by institution, program, course, and academic year
- [ ] Results cached in Supabase `coverage_snapshots` table with timestamp
- [ ] Incremental computation: only recalculate cells affected by new questions since last snapshot
- [ ] Cache TTL: 24 hours default, invalidated on new question creation
- [ ] Coverage snapshot stored as JSONB matrix for fast retrieval

## Reference Screens
**None** -- backend-only story. The heatmap UI consuming this data is STORY-IA-13.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/coverage/coverage.types.ts` |
| Model | apps/server | `src/models/coverage-snapshot.model.ts` |
| Repository | apps/server | `src/repositories/coverage.repository.ts` |
| Service | apps/server | `src/services/coverage/coverage-computation.service.ts` |
| Controller | apps/server | `src/controllers/coverage/coverage.controller.ts` |
| Tests | apps/server | `src/services/coverage/__tests__/coverage-computation.test.ts`, `src/repositories/__tests__/coverage.repository.test.ts` |

## Database Schema

### Supabase -- `coverage_snapshots` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `institution_id` | uuid | NOT NULL, FK -> institutions(id) |
| `program_id` | uuid | NULL, FK -> programs(id) |
| `course_id` | uuid | NULL, FK -> courses(id) |
| `academic_year` | varchar(10) | NULL |
| `matrix` | jsonb | NOT NULL (16x7 coverage cells) |
| `computed_at` | timestamptz | NOT NULL, DEFAULT now() |
| `total_assessed` | integer | NOT NULL |
| `total_concepts` | integer | NOT NULL |
| `overall_score` | numeric(5,4) | NOT NULL |

### Neo4j -- Traversal Path
```
(Question)-[:ASSESSES]->(SubConcept)-[:PART_OF]->(Concept)-[:BELONGS_TO]->(USMLE_Topic)-[:IN_SYSTEM]->(USMLE_System)
(USMLE_Topic)-[:IN_DISCIPLINE]->(USMLE_Discipline)
```

**USMLE Systems (16):** Cardiovascular, Respiratory, Renal/Urinary, Gastrointestinal, Endocrine, Reproductive, Musculoskeletal, Skin/Subcutaneous, Nervous/Special Senses, Hematopoietic/Lymphoreticular, Immune, Behavioral/Emotional, Biostatistics/Epidemiology, Multisystem, Nutrition, Pharmacology

**USMLE Disciplines (7):** Anatomy, Biochemistry, Pathology, Pharmacology, Physiology, Microbiology, Behavioral Science

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/coverage` | InstitutionalAdmin | Get coverage matrix with optional filters |
| POST | `/api/v1/coverage/compute` | InstitutionalAdmin | Trigger manual recomputation |

## Dependencies
- **Blocked by:** STORY-F-25 (TEACHES relationships in Neo4j), STORY-U-12 (frameworks seeded)
- **Blocks:** STORY-IA-13 (USMLE Heatmap), STORY-IA-15 (Nightly Coverage Job), STORY-IA-16 (Centrality Metrics)
- **Cross-lane:** Faculty lane (questions must exist for coverage to compute)

## Testing Requirements
### API Tests (10-12)
- Full computation: correctly computes 16x7 matrix from Neo4j graph
- Filtered computation: institution filter, program filter, course filter, academic year filter
- Caching: returns cached snapshot within TTL, recomputes after TTL expiry
- Incremental update: only recalculates affected cells after new question
- Edge cases: empty graph returns all-zero matrix, single course computation
- Snapshot storage: JSONB matrix stored correctly, overall_score computed
- Cache invalidation: new question creation invalidates cache

## Implementation Notes
- Neo4j traversal uses a single Cypher query with aggregation for the 16x7 matrix.
- Coverage snapshot stored as JSONB for fast retrieval -- avoid N+1 queries.
- Incremental computation tracks last snapshot timestamp and only processes questions created after that.
- Institution scoping: all queries MUST include `institution_id` filter.
- Service uses `readonly #neo4jRepository` with constructor DI.
- Consider `Promise.all` for independent Supabase + Neo4j queries when fetching metadata.
