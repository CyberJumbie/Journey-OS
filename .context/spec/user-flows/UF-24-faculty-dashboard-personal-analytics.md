# UF-24: Faculty Dashboard & Personal Analytics

**Feature:** F-15 (Faculty Dashboard & Analytics)
**Persona:** Faculty — Dr. Amara Osei
**Goal:** View personal teaching analytics, track question generation velocity, monitor quality trends, and navigate to quick actions from the faculty dashboard

## Preconditions
- Faculty is logged in
- Has generated at least some questions (F-09)
- Assigned to at least one course (F-04)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` (FacultyDashboard) | Land on dashboard after login | Dashboard loads with all sections |
| 2 | `/dashboard` | See KPI strip: Questions Generated (47), Coverage % (72%), Approval Rate (89%), Time Saved (12 hrs) | Real-time metrics from API |
| 3 | `/dashboard` | See activity feed: recent generation events, review decisions, upload completions | Chronological activity log |
| 4 | `/dashboard` | See course cards: each course with mini coverage ring and item count | Quick overview of all assigned courses |
| 5 | `/dashboard` | See gap alerts: "3 new coverage gaps detected in MEDI 531" | Alert banner with link to coverage view (UF-21) |
| 6 | `/dashboard` | See quick action buttons: "Generate Question", "Upload Material", "Review Queue" | One-click navigation to key workflows |
| 7 | `/dashboard` | Click "Generate Question" quick action | Navigate to `/generate` (UF-14) |
| 8 | `/dashboard` | Click course card for MEDI 531 | Navigate to `/courses/medi531` (course dashboard) |
| 9 | `/analytics/personal` (PersonalDashboard) | Click "My Analytics" in sidebar | Navigate to personal analytics |
| 10 | `/analytics/personal` | See teaching KPI strip: generation velocity (items/week), quality trend, time savings | Personal metrics |
| 11 | `/analytics/personal` | See generation velocity chart: items generated per week over time | Trend line showing productivity |
| 12 | `/analytics/personal` | See quality trend: average critic score over time | Quality improving/declining |
| 13 | `/analytics/personal` | See Bloom distribution pie chart: breakdown of generated items by level | Balance across cognitive levels |

### Course Analytics
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| C1 | `/analytics/course/:id` (CourseAnalytics) | Navigate to specific course analytics | Course-level deep dive |
| C2 | `/analytics/course/:id` | See course KPIs: items by status (draft, pending, approved, rejected) | Status distribution bar chart |
| C3 | `/analytics/course/:id` | See Bloom distribution for this course | Breakdown showing balance |
| C4 | `/analytics/course/:id` | See USMLE coverage for this course | Mini heatmap or coverage % |

## Error Paths
- **No data yet**: Step 2 — KPIs show "—" with "Get started: upload your first syllabus" prompt
- **No courses assigned**: Step 4 — "No courses assigned. Contact your institutional admin."
- **Analytics loading slow**: Step 10 — Skeleton loaders for charts, "Loading analytics..." state
- **Gap alert stale**: Step 5 — "Last scan: 2 days ago" timestamp shown

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/dashboard` | Step 1 — fetch dashboard data (KPIs, activity, courses, alerts) |
| GET | `/api/v1/analytics/personal` | Step 9 — fetch personal analytics |
| GET | `/api/v1/analytics/course/:id` | Step C1 — fetch course analytics |

## Test Scenario (Playwright outline)
Login as: Faculty
Steps:
1. Navigate to `/dashboard`
2. Verify KPI strip renders with non-zero values (for seeded demo data)
3. Verify course cards show
4. Navigate to `/analytics/personal`
5. Verify charts render
Assertions:
- KPI strip shows real data from API (not hardcoded)
- Activity feed shows recent events
- Course cards link to correct course dashboards
- Analytics charts render with data points

## Source References
- DESIGN_SPEC.md § 5.1 Group C (FacultyDashboard)
- DESIGN_SPEC.md § 5.1 Group K (Analytics, CourseAnalytics, PersonalDashboard)
- DESIGN_SPEC.md § 4.1 Template A (Dashboard Shell)
- PRODUCT_BRIEF.md § Dr. Amara Osei ("USMLE coverage dashboard is green")
- ROADMAP_v2_3.md § Sprint 8 (faculty dashboard)
