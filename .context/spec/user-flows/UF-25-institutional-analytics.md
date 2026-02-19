# UF-25: Institutional Analytics

**Feature:** F-15 (Faculty Dashboard & Analytics)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** View cross-course institutional analytics, compare faculty productivity, and monitor assessment quality across the institution

## Preconditions
- Inst Admin is logged in at `/admin`
- Multiple courses with generated items exist
- Faculty have been active in generation and review

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/admin` (AdminDashboard) | See institutional KPI strip: Total Items (324), Avg Quality (0.82), Active Faculty (8), Coverage (68%) | Institution-wide metrics |
| 2 | `/admin` | Click "Analytics" in sidebar | Navigate to `/admin/analytics` |
| 3 | `/admin/analytics` (Analytics) | See institutional KPI strip with trend indicators (↑↓) | Performance trending |
| 4 | `/admin/analytics` | See faculty productivity table: name, items generated, approval rate, avg quality | Ranked by productivity |
| 5 | `/admin/analytics` | See course comparison: per-course item counts, coverage %, quality | Identify underperforming courses |
| 6 | `/admin/analytics` | See institutional Bloom distribution: aggregate across all courses | Balance assessment |
| 7 | `/admin/analytics` | See quality trend chart: institution-wide average critic score over time | Quality monitoring |
| 8 | `/admin/analytics` | Click on a faculty row | See that faculty member's personal analytics (read-only admin view) |
| 9 | `/admin/analytics` | Click on a course | Navigate to course analytics (same as UF-24 C1-C4 but admin scope) |

## Error Paths
- **No data**: Step 1 — KPIs show "—" with "No assessment data yet. Faculty need to start generating."
- **Single faculty only**: Step 4 — Table shows one row, "Invite more faculty" prompt
- **Analytics computation timeout**: Step 3 — "Computing analytics... This may take a moment for large institutions."

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/admin/dashboard` | Step 1 — fetch admin dashboard KPIs |
| GET | `/api/v1/analytics/institutional` | Step 3 — fetch institutional analytics |
| GET | `/api/v1/analytics/faculty` | Step 4 — fetch per-faculty stats |
| GET | `/api/v1/analytics/course/:id` | Step 9 — course drill-down |

## Test Scenario (Playwright outline)
Login as: Inst Admin
Steps:
1. Navigate to `/admin/analytics`
2. Verify institutional KPI strip renders
3. Verify faculty table shows all institution faculty
4. Click a faculty row for drill-down
Assertions:
- KPIs aggregate across all institution courses
- Faculty table shows all institution members (not just own courses)
- Course comparison matches per-course data
- Admin can view any faculty's analytics

## Source References
- DESIGN_SPEC.md § 5.1 Group K (Analytics)
- PERSONA-MATRIX.md § Analytics (institutional admin: cohort analytics)
- PERSONA-INSTITUTIONAL-ADMIN.md § Data Needs (admin dashboard KPIs)
