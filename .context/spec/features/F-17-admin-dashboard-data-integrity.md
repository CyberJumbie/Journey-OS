# F-17: Admin Dashboard & Data Integrity

## Description
Institutional admins and SuperAdmins monitor system health through a dashboard with system-wide KPIs, institution status, and data integrity metrics. Nine KaizenML lint rules run as nightly Inngest jobs to detect graph inconsistencies, orphan nodes, broken dual-write sync, and schema violations. A knowledge graph browser allows direct exploration of nodes and relationships. A golden dataset of 50 items runs nightly regression to detect quality drift.

## Personas
- **Institutional Admin**: Institution-level dashboard, data integrity monitoring, knowledge browser.
- **SuperAdmin**: System-wide health across all institutions.

## Screens
- `AdminDashboard.tsx` — Template B (Admin Shell), system KPI strip (users, courses, items, sync health), institution overview
- `DataIntegrityDash.tsx` — Template B, health strip, lint rule results, sync_status distribution, error log
- `KnowledgeBrowser.tsx` — Template E (Focus) nested in admin shell, graph visualization, node search, relationship explorer
- `SubConceptDetail.tsx` — Template E (Focus), individual concept view with all edges, provenance, embeddings

## Data Domains
- **Supabase**: `audit_log`, sync_status columns across dual-written tables, lint results
- **Neo4j**: Full graph exploration, node/relationship counts, constraint validation
- **Inngest**: `journey/lint.run` (nightly), `journey/regression.run` (nightly golden dataset check)
- **API**: `GET /api/v1/admin/dashboard`, `GET /api/v1/admin/integrity`, `GET /api/v1/admin/graph/search`, `GET /api/v1/admin/graph/node/:id`

## Dependencies
- **F-02**: Institution Management (institution context)
- **F-08**: Framework Management (graph nodes must exist for browsing)
- **F-06**: Concept Extraction (SubConcepts for knowledge browser)

## Source References
- ROADMAP_v2_3.md § Sprint 9 (SuperAdmin polish)
- ROADMAP_v2_3.md § Sprint 15 (data linting, golden dataset)
- ARCHITECTURE_v10.md § 2 (sync_status pattern)
- PERSONA-MATRIX.md § Administration (data integrity monitoring)
- DESIGN_SPEC.md § 5.1 Group L (AdminDashboard, DataIntegrityDash, KnowledgeBrowser, SubConceptDetail)
