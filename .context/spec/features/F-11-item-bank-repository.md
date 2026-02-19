# F-11: Item Bank & Repository

## Description
A searchable, filterable repository of all assessment items (AI-generated and legacy-imported). Faculty browse by course, concept, framework tag, Bloom level, difficulty, and approval status. Items can be exported for use in external exam delivery systems (ExamSoft). Legacy questions can be imported via Pipeline C, tagged, and integrated into the knowledge graph.

## Personas
- **Faculty**: Browses own course items, exports for exam delivery.
- **Faculty (Course Director)**: Full item bank management, legacy import, tag management.
- **Institutional Admin**: Cross-course item bank access, institutional export.

## Screens
- `Repository.tsx` — Template A, repo stats strip (total items, approved %, coverage), search/filter
- `ItemBankBrowser.tsx` — Template A, advanced filtering (concept, framework, Bloom, difficulty, status)

## Data Domains
- **Supabase**: `assessment_items` (all fields), `options`, `question_embeddings`
- **Neo4j**: `(:AssessmentItem)` with all relationship edges for graph-based filtering
- **Pipeline C**: Legacy import — parse legacy items → tag → embed → dual-write
- **API**: `GET /api/v1/items`, `GET /api/v1/items/:id`, `POST /api/v1/items/import`, `GET /api/v1/items/export`

## Dependencies
- **F-09**: Generation Workbench (items created via generation)
- **F-10**: Question Review (items must be reviewed before appearing as approved)

## Source References
- ROADMAP_v2_3.md § Sprint 17 (legacy import + item bank)
- ROADMAP_v2_3.md § Sprint 18 (item analytics + tag manager)
- API_CONTRACT_v1.md § Assessment Items endpoints
- DESIGN_SPEC.md § 5.1 Group H (2 repository screens)
