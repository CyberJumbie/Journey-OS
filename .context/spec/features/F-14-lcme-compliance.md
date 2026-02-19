# F-14: LCME Compliance Reporting

## Description
Programmatic LCME compliance evidence generation via knowledge graph traversals. Instead of weeks of manual narrative assembly, admins click a standard to see which ILOs, courses, and content address it — with direct links to evidence. A compliance heatmap shows coverage by standard/element. Element drill-down shows specific evidence chains. Reports can be exported for site visit preparation.

## Personas
- **Institutional Admin**: Primary user — generates compliance reports, monitors coverage, prepares for site visits.
- **Faculty (Course Director)**: Views compliance for own courses, contributes evidence.
- **Faculty**: Views compliance mapping for own content.

## Screens
- `LCMEComplianceHeatmap.tsx` — Template B (Admin Shell), compliance % strip, heatmap by standard (12 rows) x element status
- `LCMEElementDrillDown.tsx` — Template B, evidence chain for a specific LCME element: which ILOs → which courses → which content → which assessments address it

## Data Domains
- **Neo4j**: Coverage chain traversal: `(:LCME_Element)<-[:ADDRESSES_LCME]-(:ILO)<-[:FULFILLS]-(:SLO)<-[:OFFERS]-(:Course)`, evidence count per element
- **Supabase**: Compliance report snapshots, export history
- **API**: `GET /api/v1/compliance/lcme`, `GET /api/v1/compliance/lcme/:elementId`, `POST /api/v1/compliance/lcme/export`

## Dependencies
- **F-07**: Learning Objectives (ILO→LCME ADDRESSES_LCME links)
- **F-08**: Framework Management (LCME standards/elements must be seeded)
- **F-04**: Course Management (courses in hierarchy)

## Source References
- PRODUCT_BRIEF.md § Job 2 (Accreditation Compliance — "LCME compliance reports are graph traversals")
- PRODUCT_BRIEF.md § Dr. Kenji Takahashi ("answer 'are we covering LCME Standard 7?' without weeks of work")
- PRODUCT_BRIEF.md § Tier 1 metrics (LCME evidence generation < 5 min per standard)
- ARCHITECTURE_v10.md § Changelog (R-009: coverage chain branching)
- ROADMAP_v2_3.md § Sprint 39 (LCME compliance, report builder)
- NODE_REGISTRY_v1.md § LCME_Standard, LCME_Element
- DESIGN_SPEC.md § 5.1 Group L (LCMEComplianceHeatmap, LCMEElementDrillDown)
