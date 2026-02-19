# UF-32: Student Dashboard & Progress Tracking

**Feature:** F-20 (Student Dashboard & Progress)
**Persona:** Student — Marcus Williams
**Goal:** View personal learning progress at a glance — concept-level mastery, USMLE system coverage, Step 1 readiness, practice history, and weak areas — replacing opaque single-score results

## Preconditions
- Logged in as student role (`apps/student`)
- At least one practice session completed (mastery data exists)
- ConceptMastery nodes populated in Neo4j
- USMLE framework seeded (system coverage requires mapping)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | /login | Enter student credentials, click Sign In | Redirected to /dashboard |
| 2 | /dashboard | View dashboard overview | GET /api/v1/students/me/dashboard → progress strip (overall mastery %, streak count, sessions this week) |
| 3 | /dashboard | View USMLE system mini-heatmap | Heatmap shows p_mastered per USMLE system (color-coded: red < 0.4, yellow 0.4–0.7, green > 0.7) |
| 4 | /dashboard | View "Recent Practice" section | Last 5 practice sessions with date, accuracy, mastery change |
| 5 | /dashboard | View "Recommended Next" section | Top 3 weakest concepts with "Practice Now" buttons |
| 6 | /dashboard | Click "Weak Areas" card | Navigate to /practice/weak-areas |
| 7 | /practice/weak-areas | View top 5 SubConcepts with lowest mastery | List shows concept name, current p_mastered, linked practice set, prerequisite chain if root cause identified |
| 8 | /dashboard | Click "View Progress" | Navigate to /progress |
| 9 | /progress | View mastery trend over time | Line chart: p_mastered by week for overall and per-course, streak bar, milestone markers |
| 10 | /progress | Toggle between courses | Chart updates to show selected course's concept mastery trends |
| 11 | /dashboard | Click "Analytics" | Navigate to /analytics |
| 12 | /analytics | View deep analytics | GET /api/v1/students/me/mastery → USMLE System × Bloom level matrix, time-on-task chart, comparative percentile (opt-in) |
| 13 | /analytics | Click a USMLE system cell in heatmap | Drill-down shows SubConcepts within that system with individual mastery scores |
| 14 | /dashboard | View Step 1 Readiness card | GET /api/v1/students/me/readiness → readiness score (%) based on mastery vs historical pass benchmarks |
| 15 | /dashboard | Click readiness card for detail | Expanded view shows per-system readiness breakdown, gap areas highlighted |

## Error Paths
- **No practice data**: Dashboard shows empty state with CTA: "Start your first practice session to see mastery progress" and link to /practice
- **USMLE framework not seeded**: Heatmap shows placeholder: "USMLE coverage requires framework setup by your institution"
- **Readiness model unavailable**: Readiness card shows "Coming soon" or "Insufficient data — complete 5+ sessions to generate estimate"
- **Network timeout**: Stale data shown with "Last updated: [timestamp]" indicator and retry button
- **Unauthorized**: Redirect to /login if JWT expired

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | /api/v1/students/me/dashboard | Step 2 — aggregate dashboard data (mastery %, streak, recent sessions) |
| GET | /api/v1/students/me/mastery | Step 12 — detailed mastery per concept/USMLE system |
| GET | /api/v1/students/me/readiness | Step 14 — Step 1 readiness estimate |

## Test Scenario (Playwright outline)
Login as: student test account (Marcus Williams)
Steps:
1. Navigate to /dashboard
2. Verify progress strip displays mastery %, streak
3. Verify USMLE heatmap renders with ≥ 1 system
4. Click "View Progress" → verify /progress loads with chart
5. Navigate to /analytics → verify heatmap matrix
6. Verify readiness card present on dashboard
Assertions:
- Dashboard loads within 3 seconds
- Mastery % is between 0 and 100
- Heatmap has cells for known USMLE systems
- Recent practice section shows ≥ 1 session (precondition: practice data exists)
- Readiness score renders or shows appropriate empty state

## Source References
- PRODUCT_BRIEF.md § Marcus Williams ("see my mastery go up in real time")
- ARCHITECTURE_v10.md § 13.1 (Student Dashboard — mastery heatmap, practice launcher, progress timeline, weak areas)
- ARCHITECTURE_v10.md § 14 (apps/student route map: /dashboard, /progress, /analytics)
- DESIGN_SPEC.md § 5.1 Group C (StudentDashboard)
- DESIGN_SPEC.md § 4.1 Template A (Dashboard Shell)
- NODE_REGISTRY_v1.md § Layer 5 (Student, ConceptMastery — p_mastered, trend, evidence_count)
- PERSONA-MATRIX.md § Student Features
