# F-19: Adaptive Practice (Tier 2)

## Description
Students practice with AI-selected questions that adapt to their demonstrated mastery. Bayesian Knowledge Tracing (BKT) maintains a per-concept mastery estimate updated after each response. IRT-calibrated item parameters (difficulty, discrimination) drive selection. The prerequisite graph identifies root-cause gaps — if a student fails Renal Pharmacology, the system traces back to prerequisite gaps in acid-base physiology. Practice sessions target weakest concepts first.

## Personas
- **Student**: Launches practice sessions, answers questions, views mastery updates in real-time.

## Screens
- `StudentPractice.tsx` — Template A, practice launcher (topic/concept selection, session length)
- `StudentQuestionView.tsx` — Template E (Focus), question display with timer, answer submission, immediate feedback
- `StudentResults.tsx` — Template A, score strip, per-concept breakdown, mastery changes
- `StudentProgress.tsx` — Template A, streak bar, mastery trends over time
- `StudentAnalytics.tsx` — Template A, KPI strip, concept-level mastery heatmap

## Data Domains
- **Python (FastAPI)**: IRT calibration (3PL model: difficulty, discrimination, guessing), BKT parameter estimation
- **Supabase**: `student_attempts` (student_id, item_id, response, correct, latency_ms), `mastery_estimates` (student_id, subconcept_id, p_mastery, updated_at)
- **Neo4j**: `(:Student)-[:HAS_MASTERY]->(:ProficiencyVariable)`, `(:SubConcept)-[:PREREQUISITE_OF]->(:SubConcept)` prerequisite chain
- **API**: `POST /api/v1/practice/start`, `POST /api/v1/practice/:id/answer`, `GET /api/v1/practice/:id/results`

## Dependencies
- **F-11**: Item Bank (calibrated items required, ≥ 500 target)
- **F-06**: Concept Extraction (SubConcepts for mastery tracking)
- **F-01**: Authentication (student role)

## Source References
- PRODUCT_BRIEF.md § Marcus Williams ("tells me I'm weak in Renal Pharmacology, gives me 10 targeted questions")
- PRODUCT_BRIEF.md § Tier 2 metrics (adaptive > static, effect size ≥ 0.3)
- ARCHITECTURE_v10.md § 1 (Job 3: Precision Advising, digital twin)
- ROADMAP_v2_3.md § Sprint 31-32 (adaptive practice, BKT mastery)
- NODE_REGISTRY_v1.md § Layer 5 (Student, ProficiencyVariable, HAS_MASTERY)
- DESIGN_SPEC.md § 5.1 Group D (5 student learning screens)
