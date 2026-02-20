---
name: "Marcus Williams"
role: student
lane: student
priority: P4
tier: "2"
sources:
  - "PRODUCT_BRIEF §Personas (Marcus Williams)"
  - "ARCHITECTURE_v10 §4.1 (Role Hierarchy), §14 (Student Routes)"
  - "DESIGN_SPEC §Student screens, §Student App"
  - "ARCHITECTURE_v10 §Student State (BKT, ConceptMastery)"
---

## Pain Points
- Can't tell which course concepts map to which USMLE systems — PRODUCT_BRIEF §Personas
- Practices blindly with no adaptive targeting of weak areas — PRODUCT_BRIEF §Personas
- Gets exam results as a single score, not a concept-level breakdown — PRODUCT_BRIEF §Personas
- No way to know if on track for Step 1 until taking a practice NBME — PRODUCT_BRIEF §Personas

## Key Workflows
1. Student onboarding: dashboard tour → first practice → mastery explanation — DESIGN_SPEC §StudentOnboarding
2. Adaptive practice: select mode/topics/difficulty → answer questions → view results — DESIGN_SPEC §StudentPractice, §StudentQuestionView
3. Review results: concept-level breakdown, correct answers with Toulmin rationale — DESIGN_SPEC §StudentResults
4. Track mastery progress: per-concept and per-USMLE-system trends — DESIGN_SPEC §StudentProgress
5. Weak area identification: system highlights SubConcepts below mastery threshold — ARCHITECTURE_v10 §Student State
6. Exam prep mode: targeted practice for upcoming assessments — DESIGN_SPEC §StudentPractice

## Data Needs
- Personal mastery by concept and USMLE system
- Weak area identification with targeted question sets
- Practice session results with concept-level breakdown
- Streak/engagement metrics
- Course-concept-to-USMLE-system mapping
- At-risk alerts from system (Bayesian Knowledge Tracing predictions)

## Permissions
- Practice, assessment, mastery tracking only
- Read access to enrolled course content and own mastery state
- Cannot see other students' data
- Cannot generate questions, manage courses, or access admin tools
- Separate application: `apps/student` (isolated from faculty/admin app)
- JWT: `{ role: "student", institution_id }`
- RLS scoped by `institution_id` + own user ID for mastery data
- Color identifier: `green` #69a338
- Receives `exam_available` (Normal) and `at_risk_alert` (High) notifications
- Tier 2 feature (available Month 10+)

## Test Account
Not defined in source docs. Student features arrive in Tier 2.
