# UF-35: Student At-Risk Alert & Recommended Practice

**Feature:** F-21 (At-Risk Prediction & Advising)
**Persona:** Student — Marcus Williams
**Goal:** Receive an at-risk alert notification identifying specific weak concepts, understand root causes through prerequisite chain visualization, and launch targeted practice to remediate gaps

## Preconditions
- Logged in as student role (`apps/student`)
- Student has opted in to at-risk notifications (default: opt-in)
- BKT prediction pipeline has flagged the student (risk_score above threshold)
- At-risk flag includes specific SubConcepts and prerequisite chain
- Notification system (F-16) has delivered `at_risk_alert` notification

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | /dashboard | View notification badge (bell icon shows count) | `at_risk_alert` notification visible in notification panel |
| 2 | /notifications | Click notification bell, view at-risk alert | Alert shows: "You may be at risk in [Course]. Focus areas: Renal Pharmacology, Acid-Base Physiology" |
| 3 | /notifications | Click "View Details" on the alert | Navigate to at-risk detail view |
| 4 | /at-risk-detail | View concept-level breakdown | Flagged SubConcepts listed with current p_mastered, target threshold, and gap size |
| 5 | /at-risk-detail | View prerequisite chain visualization | Graph shows: "Renal Pharmacology depends on Acid-Base Physiology (your weakest prerequisite)" |
| 6 | /at-risk-detail | View recommended practice plan | System suggests: "Start with Acid-Base Physiology (root cause) → then Renal Pharmacology" with estimated session counts |
| 7 | /at-risk-detail | Click "Start Recommended Practice" | Navigate to /practice with weak concepts pre-selected and adaptive mode configured |
| 8 | /practice/session | Complete targeted practice session (follows UF-31 flow) | Mastery updates focus on flagged concepts |
| 9 | /dashboard | Return to dashboard after practice | At-risk card shows updated status: mastery change since alert, remaining gap |
| 10 | /dashboard | View at-risk resolution over time | As mastery improves past threshold, at-risk flag resolves and card shows "Resolved" status |

## Error Paths
- **Notification opt-out**: Student does not receive at-risk alerts. Dashboard still shows weak areas passively via UF-32 flow
- **No practice items for flagged concepts**: Alert shows "Your institution hasn't created enough practice items for [concept]. Advisor has been notified."
- **Alert dismissed**: Student can dismiss alert but it remains in notification history and dashboard weak-areas
- **Network failure**: Alert cached locally, detail view loads from cached mastery data with "Offline" indicator
- **Unauthorized**: Student can only see own at-risk data — cannot view cohort or peer data

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | /api/v1/notifications | Step 2 — fetch notifications including at_risk_alert |
| GET | /api/v1/students/me/risk | Step 4 — student's own at-risk detail with flagged concepts |
| GET | /api/v1/students/me/mastery | Step 5 — mastery data for prerequisite chain visualization |
| POST | /api/v1/practice/start | Step 7 — start targeted practice with pre-selected weak concepts |

## Test Scenario (Playwright outline)
Login as: student test account (Marcus Williams) — with at-risk flag seeded
Steps:
1. Navigate to /dashboard
2. Verify notification badge shows count > 0
3. Open notifications → verify at-risk alert present
4. Click alert → verify detail view loads
5. Verify flagged concepts listed with mastery values
6. Verify prerequisite chain visualization renders
7. Click "Start Recommended Practice" → verify practice launches with correct concepts
Assertions:
- At-risk notification appears in notification list
- Detail view shows ≥ 1 flagged SubConcept with p_mastered value
- Prerequisite chain shows ≥ 1 dependency
- Practice session starts with flagged concepts pre-selected
- Mastery values displayed are between 0 and 1

## Source References
- PRODUCT_BRIEF.md § Marcus Williams (receives at-risk alerts with targeted remediation)
- PRODUCT_BRIEF.md § Fatima Al-Rashid ("Marcus is flagged 3 weeks before exam")
- ARCHITECTURE_v10.md § 10.3 (BKT mastery pipeline — prediction triggers alerts)
- ARCHITECTURE_v10.md § 11 Notifications (at_risk_alert: High priority, delivered to advisor + student)
- ARCHITECTURE_v10.md § 13.1 (Student Dashboard — weak areas)
- NODE_REGISTRY_v1.md § Layer 5 (ConceptMastery, prerequisite chain: PREREQUISITE_OF)
- PERSONA-MATRIX.md § Student Features (at-risk alerts)
