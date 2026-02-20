---
name: "Fatima Al-Rashid"
role: advisor
lane: advisor
priority: P5
tier: "2"
sources:
  - "PRODUCT_BRIEF §Personas (Fatima Al-Rashid)"
  - "ARCHITECTURE_v10 §4.1 (Role Hierarchy)"
  - "DESIGN_SPEC §Notification routing"
  - "ARCHITECTURE_v10 §Notifications (at_risk_alert)"
---

## Pain Points
- Only knows a student is struggling after they've already failed a midterm — PRODUCT_BRIEF §Personas
- Can't identify *what* the student doesn't understand — only *that* they're behind — PRODUCT_BRIEF §Personas
- Intervention recommendations are generic ("study more") because data is generic — PRODUCT_BRIEF §Personas

## Key Workflows
1. Weekly cohort review: at-risk dashboard with BKT-predicted failure probabilities — ARCHITECTURE_v10 §Student State
2. Student drill-down: full mastery graph, attempt history, prerequisite gaps — ARCHITECTURE_v10 §ConceptMastery
3. Intervention logging: record interventions, track outcomes — PRODUCT_BRIEF §Personas
4. Comparative analytics: student vs cohort performance by USMLE system — ARCHITECTURE_v10 §Analytics
5. At-risk alert review and response — ARCHITECTURE_v10 §Notifications

## Data Needs
- Cohort at-risk flags (2–4 weeks before predicted failure)
- Student mastery state per concept/SubConcept
- Prerequisite gap analysis (root cause, not surface failure)
- Course grades and attempt history
- Intervention history log
- Student vs cohort comparison views

## Permissions
- Read access to student mastery and performance data (within institution)
- Cannot generate questions, manage courses, or access admin/framework tools
- Receives `at_risk_alert` notifications (high priority)
- JWT: `{ role: "advisor", institution_id }`
- RLS scoped by `institution_id`
- Color identifier: `blueLight` #00a8e1
- Tier 2 feature (available Month 10+)

## Test Account
Not defined in source docs. Advisor features arrive in Tier 2.
