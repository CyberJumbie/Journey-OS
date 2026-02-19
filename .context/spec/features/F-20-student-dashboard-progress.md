# F-20: Student Dashboard & Progress (Tier 2)

## Description
Students see their learning progress at a glance: concept-level mastery breakdown, Step 1 readiness tracking, USMLE system coverage, and practice session history. The dashboard replaces the opaque single-score exam result with a detailed concept map showing exactly what the student knows and where gaps remain. Step 1 readiness is estimated by comparing mastery across USMLE systems to historical pass benchmarks.

## Personas
- **Student**: Views own mastery, Step 1 readiness, practice history, concept-level breakdown.

## Screens
- `StudentDashboard.tsx` — Template A, progress strip (overall mastery %, streak), USMLE system mini-heatmap, recent practice, recommended next topics
- `StudentAnalytics.tsx` — Template A, deep analytics: mastery per USMLE system, trend charts, time-on-task, comparative percentile (opt-in)

## Data Domains
- **Supabase**: `mastery_estimates`, `student_attempts`, Step 1 readiness score (computed)
- **Neo4j**: `(:Student)-[:HAS_MASTERY]->(:ProficiencyVariable)-[:MEASURES]->(:SubConcept)`, coverage chain to USMLE
- **API**: `GET /api/v1/students/me/dashboard`, `GET /api/v1/students/me/mastery`, `GET /api/v1/students/me/readiness`

## Dependencies
- **F-19**: Adaptive Practice (mastery data from practice sessions)
- **F-13**: Coverage & Gap Detection (USMLE coverage framework)
- **F-01**: Authentication (student role)

## Source References
- PRODUCT_BRIEF.md § Marcus Williams ("see my mastery go up in real time")
- PRODUCT_BRIEF.md § Tier 2 metrics (student engagement ≥ 3 sessions/week)
- ROADMAP_v2_3.md § Sprint 27-28 (student app: dashboard, practice launcher)
- DESIGN_SPEC.md § 5.1 Group C (StudentDashboard)
- DESIGN_SPEC.md § 4.1 Template A (Dashboard Shell)
- PERSONA-MATRIX.md § Student Features
