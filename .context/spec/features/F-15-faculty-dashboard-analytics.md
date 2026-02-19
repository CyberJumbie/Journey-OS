# F-15: Faculty Dashboard & Analytics

## Description
The faculty home base showing activity feed, generation statistics, coverage gap alerts, quick actions, and course overview cards. Analytics screens provide deeper views: course-level item analytics, personal teaching analytics, and cross-course comparisons. KPI strips show questions generated, approval rate, coverage %, and time saved.

## Personas
- **Faculty**: Personal analytics (own generation stats, question quality trends).
- **Faculty (Course Director)**: Course analytics + personal analytics + gap alerts.
- **Institutional Admin**: Cross-course analytics, institutional KPIs.

## Screens
- `FacultyDashboard.tsx` — Template A, KPI strip (questions generated, coverage %, approval rate), activity feed, course cards, gap alerts, quick action buttons
- `Analytics.tsx` — Template A, KPI strip, institutional-level analytics
- `CourseAnalytics.tsx` — Template A, per-course KPIs (items by status, Bloom distribution, USMLE coverage)
- `PersonalDashboard.tsx` — Template A, teaching KPI strip (generation velocity, quality trends)

## Data Domains
- **Supabase**: `generation_logs` (timing, cost, model, status), `assessment_items` (aggregated stats), `audit_log`
- **Neo4j**: Graph centrality metrics (PageRank, betweenness), coverage calculations
- **API**: `GET /api/v1/dashboard`, `GET /api/v1/analytics/course/:id`, `GET /api/v1/analytics/personal`

## Dependencies
- **F-04**: Course Management (course context)
- **F-09**: Generation Workbench (generation data)
- **F-13**: Coverage & Gap Detection (coverage metrics)

## Source References
- ROADMAP_v2_3.md § Sprint 8 (faculty dashboard deliverables)
- PRODUCT_BRIEF.md § Dr. Amara Osei (success: "USMLE coverage dashboard is green")
- DESIGN_SPEC.md § 5.1 Group C (FacultyDashboard)
- DESIGN_SPEC.md § 5.1 Group K (4 analytics screens)
- DESIGN_SPEC.md § 4.1 Template A (Dashboard Shell — 52 screens)
