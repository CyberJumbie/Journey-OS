# F-21: At-Risk Prediction & Advising (Tier 2)

## Description
The system flags students at risk of academic failure 2–4 weeks before it happens using mastery trajectory analysis and prerequisite graph traversal. Unlike current reactive systems that wait for midterm grades, Journey OS identifies *which specific concepts* a student is struggling with and traces root causes through the prerequisite chain. Advisors see a cohort dashboard with flagged students, concept-level diagnostics, and recommended intervention paths. Interventions are logged for outcome tracking.

## Personas
- **Advisor**: Views cohort at-risk dashboard, receives alert notifications, logs interventions, tracks outcomes.
- **Institutional Admin**: Views cohort analytics across institution, monitors advisor response rates.
- **Student**: Receives at-risk alerts with recommended practice (opt-in).

## Screens
- `AdvisorDashboard` (TBD route) — Cohort at-risk list, flagged students with concept-level diagnostics, intervention log
- Shared: notification system (F-16) delivers alerts

## Data Domains
- **Neo4j**: `(:Student)-[:HAS_MASTERY]->(:ProficiencyVariable)` trajectory analysis, `(:SubConcept)-[:PREREQUISITE_OF]->(:SubConcept)` root cause tracing
- **Python (FastAPI)**: GNN-based risk classification (PyTorch Geometric), prediction model
- **Supabase**: `at_risk_flags` (student_id, flag_date, risk_score, concepts JSONB, resolved), `interventions` (advisor_id, student_id, type, notes, outcome)
- **API**: `GET /api/v1/advisor/cohort`, `GET /api/v1/advisor/students/:id/risk`, `POST /api/v1/advisor/interventions`

## Dependencies
- **F-19**: Adaptive Practice (mastery data for prediction)
- **F-20**: Student Dashboard (student mastery state)
- **F-16**: Notifications (alert delivery)
- **F-03**: User Management (advisor-student cohort assignment)

## Source References
- PRODUCT_BRIEF.md § Fatima Al-Rashid ("Marcus is flagged 3 weeks before exam, weak on 4 SubConcepts in Renal")
- PRODUCT_BRIEF.md § Job 3 (Precision Advising — digital twin, prerequisite graph)
- PRODUCT_BRIEF.md § Tier 2 metrics (at-risk prediction ≥ 2 weeks lead, ≥ 80% precision)
- ARCHITECTURE_v10.md § 1 (Precision Advising description)
- ROADMAP_v2_3.md § Sprint 37-38 (advisor dashboard, admin dashboard)
- PERSONA-MATRIX.md § Student Features (at-risk alerts, view student mastery)
