# F-07: Learning Objective Management

## Description
Faculty and admins manage Institutional Learning Objectives (ILOs) and Student Learning Objectives (SLOs) as separate node types. SLOs are course-level and link to ILOs via FULFILLS relationships (requiring Course Director or Admin approval). Both ILO and SLO types link to educational frameworks through typed relationships (AT_BLOOM, MAPS_TO_COMPETENCY, ADDRESSES_LCME, MAPS_TO_EPA, MAPS_TO_UME).

## Personas
- **Institutional Admin**: Creates and manages ILOs. Approves SLO→ILO FULFILLS mappings. Maps ILOs to frameworks.
- **Faculty (Course Director)**: Creates SLOs for courses. Proposes SLO→ILO FULFILLS links. Maps SLOs to frameworks.
- **Faculty**: Views SLOs for own courses, verifies TEACHES edges.

## Screens
- `OutcomeMapping.tsx` — Template E (Focus), visual mapping of SLOs to frameworks with drag-and-drop
- `ILOManagement.tsx` — Template B (Admin Shell), ILO CRUD with framework linking
- `FULFILLSReviewQueue.tsx` — Template B, approval queue for SLO→ILO FULFILLS proposals

## Data Domains
- **Supabase**: `student_learning_objectives` (id, course_id, text, bloom_level, institution_id, graph_node_id, sync_status), `slo_embeddings`
- **Neo4j**: `(:ILO)`, `(:SLO)` as separate node types. Relationships: `(:SLO)-[:FULFILLS]->(:ILO)`, `(:SLO)-[:ADDRESSED_BY]->(:SubConcept)`, `(:Session)-[:HAS_SLO]->(:SLO)`, `(:ILO)-[:AT_BLOOM]->(:BloomLevel)`, `(:ILO)-[:MAPS_TO_COMPETENCY]->(:ACGME_Domain)`, `(:ILO)-[:ADDRESSES_LCME]->(:LCME_Element)`, `(:ILO)-[:MAPS_TO_EPA]->(:EPA)`, `(:ILO)-[:MAPS_TO_UME]->(:UME_Subcompetency)`
- **API**: `GET /api/v1/courses/:id/slos`, `POST /api/v1/courses/:id/slos`, `GET /api/v1/ilos`, `POST /api/v1/ilos`, `POST /api/v1/slos/:id/fulfills` (propose link)

## Dependencies
- **F-04**: Course Management (SLOs belong to courses)
- **F-08**: Framework Management (frameworks must exist for linking)
- **F-06**: Concept Extraction (SubConcepts for SLO→SubConcept ADDRESSED_BY)

## Source References
- ARCHITECTURE_v10.md § Changelog (R-019: ILO/SLO split, separate node types)
- ARCHITECTURE_v10.md § Changelog (R-010: typed relationships restored)
- ROADMAP_v2_3.md § Sprint 5 (LO management deliverables)
- NODE_REGISTRY_v1.md § ILO, SLO nodes, FULFILLS relationship
- SUPABASE_DDL_v1.md § student_learning_objectives table
- PERSONA-MATRIX.md § Curriculum capabilities (SLO→ILO FULFILLS approval)
