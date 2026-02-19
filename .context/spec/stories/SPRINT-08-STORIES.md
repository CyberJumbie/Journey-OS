# Sprint 8 — Stories

**Stories:** 12
**Epics:** E-28, E-29, E-32

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-IA-28-1 | Coverage Computation Service | institutional_admin | M |
| 2 | S-IA-28-2 | USMLE Heatmap Component | institutional_admin | L |
| 3 | S-IA-28-3 | Concept Graph Visualization | institutional_admin | L |
| 4 | S-IA-28-4 | Nightly Coverage Job | institutional_admin | S |
| 5 | S-IA-28-5 | Centrality Metrics | institutional_admin | M |
| 6 | S-IA-29-1 | Gap Drill-Down UI | institutional_admin | M |
| 7 | S-IA-29-2 | Gap-to-Workbench Handoff | institutional_admin | M |
| 8 | S-IA-29-3 | Gap Alert Service | institutional_admin | S |
| 9 | S-F-32-1 | Activity Feed Component | faculty | M |
| 10 | S-F-32-2 | KPI Strip Component | faculty | M |
| 11 | S-F-32-3 | Course Cards | faculty | M |
| 12 | S-F-32-4 | Role-Based Dashboard Variants | faculty | M |

## Sprint Goals
- Build curriculum coverage computation with USMLE heatmap and concept graph visualizations
- Enable gap-driven generation by linking coverage gaps directly to the workbench with alert notifications
- Deliver the faculty dashboard with activity feed, KPI strip, course cards, and role-based variants

## Entry Criteria
- Sprint 7 exit criteria complete (workbench UI operational)
- Sufficient concept and SLO data in Neo4j for meaningful coverage computation

## Exit Criteria
- Coverage heatmap renders USMLE system coverage with nightly refresh
- Institutional admins can drill into gaps and hand off to workbench for targeted generation
- Faculty dashboard displays personalized activity, KPIs, and course overview
