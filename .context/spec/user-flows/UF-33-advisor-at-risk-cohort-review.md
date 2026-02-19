# UF-33: Advisor At-Risk Cohort Review & Intervention

**Feature:** F-21 (At-Risk Prediction & Advising)
**Persona:** Advisor — Fatima Al-Rashid
**Goal:** Review cohort at-risk dashboard, drill into flagged students to understand concept-level root causes, log interventions, and track outcomes over time

## Preconditions
- Logged in as advisor role
- Advisor is assigned to ≥ 1 student cohort
- BKT prediction pipeline has run (at-risk flags generated)
- Students have practice history with ConceptMastery data in Neo4j
- Notification system (F-16) delivers `at_risk_alert` events

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | /login | Enter advisor credentials, click Sign In | Redirected to advisor dashboard |
| 2 | /dashboard | View cohort overview | GET /api/v1/advisor/cohort → class mastery distribution with percentile bands, count of at-risk students |
| 3 | /dashboard | View at-risk alerts section | List of flagged students sorted by risk_score (highest first), each showing: name, risk_score %, flagged concepts, flag_date |
| 4 | /dashboard | Click on a flagged student (e.g., Marcus Williams) | Navigate to student drill-down view |
| 5 | /students/:id/risk | View student risk detail | GET /api/v1/advisor/students/:id/risk → full mastery graph, concept-level diagnostics, prerequisite gap trace |
| 6 | /students/:id/risk | View prerequisite chain analysis | System shows: "Weak in Renal Pharmacology → root cause: gap in Acid-Base Physiology (prerequisite)" |
| 7 | /students/:id/risk | View attempt history timeline | Chronological list of practice sessions, accuracy trends, mastery trajectory |
| 8 | /students/:id/risk | View student vs cohort comparison | Side-by-side: student mastery per USMLE system vs cohort median |
| 9 | /students/:id/risk | Click "Log Intervention" | Intervention form opens: type (meeting, referral, resource, practice plan), notes, recommended actions |
| 10 | /students/:id/risk | Fill in intervention details, click "Save" | POST /api/v1/advisor/interventions → intervention recorded with timestamp, linked to student and flagged concepts |
| 11 | /students/:id/risk | View intervention history | Previous interventions listed with type, date, notes, and outcome (pending/improved/no-change/escalated) |
| 12 | /students/:id/risk | Update intervention outcome | Select outcome from dropdown, add follow-up notes, save |
| 13 | /dashboard | Return to cohort view, review next flagged student | Repeat steps 4–12 for other at-risk students |
| 14 | /dashboard | View resolved alerts | Filter toggle: Active / Resolved / All — resolved students show intervention that led to improvement |

## Error Paths
- **No at-risk students**: Dashboard shows "No students currently flagged — cohort is on track" with historical summary
- **Insufficient data for prediction**: Student card shows "Insufficient practice data for risk prediction — need ≥ 10 sessions"
- **Cohort not assigned**: Advisor sees "No cohorts assigned to your account. Contact your institutional admin."
- **Network timeout**: Stale data indicator with last-updated timestamp and retry
- **Unauthorized**: Advisor cannot see students outside their assigned cohort — 403 returned, UI shows "Access restricted"

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | /api/v1/advisor/cohort | Step 2 — cohort overview with at-risk flags |
| GET | /api/v1/advisor/students/:id/risk | Step 5 — individual student risk detail and diagnostics |
| POST | /api/v1/advisor/interventions | Step 10 — log a new intervention |
| PATCH | /api/v1/advisor/interventions/:id | Step 12 — update intervention outcome |

## Test Scenario (Playwright outline)
Login as: advisor test account (Fatima Al-Rashid)
Steps:
1. Navigate to advisor dashboard
2. Verify cohort overview shows student count and distribution
3. Verify at-risk section shows ≥ 1 flagged student
4. Click on flagged student → verify drill-down loads
5. Verify prerequisite gap analysis is visible
6. Log an intervention (type: meeting, notes: "Discussed study plan")
7. Verify intervention appears in history
Assertions:
- Cohort overview renders with mastery distribution chart
- At-risk list sorted by risk_score descending
- Student drill-down shows mastery graph and concept diagnostics
- Intervention POST returns 201
- Intervention appears in history list immediately

## Source References
- PRODUCT_BRIEF.md § Fatima Al-Rashid ("Marcus is flagged 3 weeks before exam, weak on 4 SubConcepts in Renal")
- ARCHITECTURE_v10.md § 13.4 (Advisor Dashboard — cohort overview, at-risk alerts, drill-down, intervention tracking)
- ARCHITECTURE_v10.md § 10.3 (BKT mastery update pipeline)
- NODE_REGISTRY_v1.md § Layer 5 (Student, ConceptMastery, HAS_MASTERY, prerequisite chain)
- SUPABASE_DDL_v1.md § at_risk_flags, interventions tables
