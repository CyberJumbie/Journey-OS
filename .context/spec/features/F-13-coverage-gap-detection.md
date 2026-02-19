# F-13: USMLE Coverage & Gap Detection

## Description
Visualizes curriculum coverage against the USMLE content outline via a 16x7 heatmap (Systems x Disciplines) and a D3 force-directed concept graph. Identifies coverage gaps where SubConcepts are under-assessed or un-mapped. Faculty can click a gap cell to drill into USMLE_Topics, identify blind spots, and launch gap-driven generation directly from the coverage view. Nightly Inngest job recalculates coverage and alerts on new gaps.

## Personas
- **Faculty**: Views coverage for own courses, launches gap-driven generation.
- **Faculty (Course Director)**: Same + blueprint coverage for exam planning.
- **Institutional Admin**: Cross-course coverage view, institutional gap analysis.

## Screens
- `BlueprintCoverage.tsx` — Template A, coverage % strip, 16x7 Recharts heatmap, cell click → topic drill-down
- `CoverageMapView` — D3 force-directed SubConcept graph (embedded in workbench context panel), nodes colored by coverage, click gap → pre-fill generation

## Data Domains
- **Neo4j**: Graph traversal for coverage chain: `(:Course)->[:OFFERS]->(:SLO)->[:ADDRESSED_BY]->(:SubConcept)->[:MAPS_TO_COMPETENCY]->(:USMLE_System)`, PageRank + betweenness centrality
- **Supabase**: Coverage cache (materialized from graph queries), gap alerts
- **Inngest**: `journey/gap.scan` (nightly cron), coverage recalculation
- **API**: `GET /api/v1/courses/:id/coverage`, `GET /api/v1/courses/:id/gaps`, `GET /api/v1/coverage/heatmap`

## Dependencies
- **F-06**: Concept Extraction (SubConcepts must exist)
- **F-07**: Learning Objectives (SLO→SubConcept ADDRESSED_BY links)
- **F-08**: Framework Management (USMLE axis nodes for heatmap)

## Source References
- ROADMAP_v2_3.md § Sprint 8 (USMLE gap detection, heatmap, coverage map)
- ARCHITECTURE_v10.md § Changelog (R-009: coverage chain branching — LCME + ACGME/UME dual terminus)
- PRODUCT_BRIEF.md § Tier 0 metrics ("USMLE gap heatmap renders with real data")
- PRODUCT_BRIEF.md § Dr. Amara Osei ("USMLE coverage dashboard is green")
- DESIGN_SPEC.md § 3.4 (Charts: heatmap, force-directed graph)
