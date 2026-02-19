# UF-34: Institutional Admin Cohort Analytics & At-Risk Monitoring

**Feature:** F-21 (At-Risk Prediction & Advising)
**Persona:** Institutional Admin — Dr. Kenji Takahashi
**Goal:** Monitor cohort-level at-risk analytics across the institution, track advisor response rates, and ensure early intervention SLAs are being met

## Preconditions
- Logged in as institutional_admin role
- Institution has ≥ 1 active student cohort with practice data
- BKT prediction pipeline has generated at-risk flags
- Advisors are assigned to cohorts and may have logged interventions
- Notification system active for at_risk_alert events

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | /login | Enter admin credentials, click Sign In | Redirected to /admin |
| 2 | /admin | View admin dashboard KPI strip | Existing KPIs + new "At-Risk Students" count and "Advisor Response Rate %" |
| 3 | /admin | Click "At-Risk Analytics" section/tab | Navigate to at-risk analytics view |
| 4 | /admin/at-risk | View institution-wide at-risk summary | Total flagged students, breakdown by cohort, trend over past 4 weeks |
| 5 | /admin/at-risk | View cohort comparison table | Table: cohort name, student count, at-risk count, at-risk %, avg risk_score, advisor assigned, response rate |
| 6 | /admin/at-risk | Click on a cohort row | Drill-down shows individual flagged students in that cohort with risk scores and intervention status |
| 7 | /admin/at-risk | View advisor response metrics | Table: advisor name, assigned cohort(s), flagged students, interventions logged, avg response time (days from flag to first intervention) |
| 8 | /admin/at-risk | Filter by date range | At-risk data updates to selected time window |
| 9 | /admin/at-risk | Export at-risk report | Download CSV with flagged students, risk scores, intervention status, advisor assigned |
| 10 | /admin/at-risk | View intervention outcomes summary | Pie chart: improved / no-change / escalated / pending breakdown across institution |

## Error Paths
- **No at-risk data**: Show "No at-risk flags generated yet. Ensure students have completed ≥ 10 practice sessions for prediction eligibility."
- **No advisors assigned**: Warning banner: "Some cohorts have no advisor assigned. At-risk alerts will not be routed."
- **Prediction model unavailable**: Show "At-risk prediction service temporarily unavailable. Last data from [timestamp]."
- **Unauthorized**: 403 if accessing cross-institution data — admin scoped to own institution via RLS
- **Empty cohort**: Cohort row shows "No students enrolled" with visual indicator

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | /api/v1/admin/at-risk/summary | Step 4 — institution-wide at-risk aggregates |
| GET | /api/v1/admin/at-risk/cohorts | Step 5 — per-cohort breakdown with advisor metrics |
| GET | /api/v1/admin/at-risk/cohorts/:id | Step 6 — individual cohort drill-down |
| GET | /api/v1/admin/at-risk/advisors | Step 7 — advisor response rate metrics |
| GET | /api/v1/admin/at-risk/export | Step 9 — CSV export |

## Test Scenario (Playwright outline)
Login as: institutional admin test account (Dr. Kenji Takahashi)
Steps:
1. Navigate to /admin
2. Verify KPI strip shows "At-Risk Students" metric
3. Navigate to at-risk analytics section
4. Verify institution-wide summary renders
5. Verify cohort comparison table has ≥ 1 row
6. Click a cohort → verify drill-down loads
7. Verify advisor response metrics visible
Assertions:
- At-risk summary loads with total count
- Cohort table shows cohort names and at-risk %
- Advisor metrics show response rate
- Data scoped to admin's institution only
- Export button present and functional

## Source References
- PRODUCT_BRIEF.md § Dr. Kenji Takahashi (institutional quality oversight)
- PRODUCT_BRIEF.md § Job 3 (Precision Advising — institutional monitoring)
- ARCHITECTURE_v10.md § 13.4 (Advisor Dashboard — admin also monitors advisor performance)
- ROADMAP_v2_3.md § Sprint 37-38 (advisor dashboard, admin dashboard)
- PERSONA-MATRIX.md § Institutional Admin Features (cohort analytics)
