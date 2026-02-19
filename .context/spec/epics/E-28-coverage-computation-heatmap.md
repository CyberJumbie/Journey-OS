# E-28: Coverage Computation & Heatmap

**Feature:** F-13
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 8

## Definition of Done
- 16x7 USMLE heatmap (Systems x Disciplines) computed from graph
- D3 force-directed SubConcept concept graph (color-coded by coverage)
- Gap identification: under-assessed or un-mapped concepts
- Click-to-drill: gap cell → USMLE_Topics → blind spots
- Nightly Inngest job recalculates coverage and alerts on new gaps
- PageRank + betweenness centrality metrics computed

## User Flows Enabled
- UF-21: USMLE Coverage Gap & Generation — partially enabled (visualization only)
- UF-22: Institutional Coverage Analysis — fully enabled

## Story Preview
- Story: Coverage computation service — Neo4j graph traversal for coverage stats
- Story: USMLE heatmap component — D3 16x7 interactive heatmap
- Story: Concept graph visualization — force-directed SubConcept graph
- Story: Nightly coverage job — Inngest scheduled recalculation
- Story: Centrality metrics — PageRank + betweenness computation

## Source References
- F-13 feature definition
- UF-21, UF-22 user flows
