# STORY-AD-7: Intervention Recommendation Engine

**Epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Feature:** F-21
**Sprint:** 38
**Lane:** advisor (P5)
**Size:** M
**Old ID:** S-AD-45-2

---

## User Story
As an **academic advisor**, I need suggested intervention actions based on each student's root-cause analysis so that I can provide targeted, evidence-based support instead of generic advice.

## Acceptance Criteria
- [ ] Given root-cause concepts, generate ranked intervention recommendations
- [ ] Recommendation types: study_material, practice_focus, tutoring_referral, faculty_meeting, peer_study_group
- [ ] Each recommendation includes: action, rationale, expected_impact (high/medium/low), priority (1-5)
- [ ] Recommendations personalized by root-cause type, severity, and student trajectory
- [ ] Rule-based engine with configurable recommendation rules (JSON/YAML config)
- [ ] Rules map root-cause patterns to intervention actions
- [ ] API endpoint: GET /api/interventions/recommend/:studentId
- [ ] Advisor can accept, modify, or dismiss each recommendation
- [ ] Accepted recommendations create intervention records (feeds STORY-AD-8)
- [ ] Recommendation effectiveness tracking: correlate accepted recommendations with student outcomes
- [ ] Dual output: advisor-facing (clinical language) and student-facing (supportive language)

## Reference Screens
> **None** -- backend AI service. UI rendered as recommendation cards within the Advisor Dashboard (STORY-AD-5) and Student Alert View (STORY-AD-6).

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/advisor/intervention.types.ts`, `src/advisor/index.ts` |
| Rules Config | apps/server | `src/modules/advisor/config/recommendation-rules.yaml` |
| Service | apps/server | `src/modules/advisor/services/intervention-recommendation.service.ts` |
| Service | apps/server | `src/modules/advisor/services/recommendation-rules-engine.ts` |
| Controller | apps/server | `src/modules/advisor/controllers/intervention-recommendation.controller.ts` |
| Route | apps/server | `src/modules/advisor/routes/intervention.routes.ts` |
| Organism | apps/web | `src/components/advisor/intervention-recommendations.tsx` |
| Molecule | apps/web | `src/components/advisor/recommendation-card.tsx` |
| API Tests | apps/server | `src/modules/advisor/__tests__/intervention-recommendation.service.test.ts` |
| API Tests | apps/server | `src/modules/advisor/__tests__/recommendation-rules-engine.test.ts` |

## Database Schema

**Supabase:**
```sql
CREATE TABLE recommendation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  condition JSONB NOT NULL,           -- {root_cause_type, severity_min, trajectory, mastery_threshold}
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'study_material', 'practice_focus', 'tutoring_referral',
    'faculty_meeting', 'peer_study_group'
  )),
  action_template JSONB NOT NULL,     -- {advisor_text, student_text, expected_impact, default_priority}
  is_active BOOLEAN DEFAULT true,
  institution_id UUID REFERENCES institutions(id), -- NULL = global rule
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE recommendation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  advisor_id UUID REFERENCES profiles(id),
  risk_flag_id UUID REFERENCES risk_flags(id),
  rule_id UUID REFERENCES recommendation_rules(id),
  action_type VARCHAR(50) NOT NULL,
  action_detail JSONB NOT NULL,        -- full recommendation payload
  advisor_decision VARCHAR(20) CHECK (advisor_decision IN ('accepted', 'modified', 'dismissed')),
  modification_notes TEXT,
  intervention_id UUID REFERENCES interventions(id),  -- links to logged intervention if accepted
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_recommendation_log_student ON recommendation_log(student_id, created_at DESC);
CREATE INDEX idx_recommendation_log_rule ON recommendation_log(rule_id, advisor_decision);
```

**No new Neo4j schema.**

## API Endpoints
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/interventions/recommend/:studentId` | Get recommendations for student | advisor |
| POST | `/api/interventions/recommend/:recommendationId/decide` | Accept, modify, or dismiss recommendation | advisor |
| GET | `/api/interventions/rules` | List active recommendation rules | institutional_admin |
| PUT | `/api/interventions/rules/:ruleId` | Update a recommendation rule | institutional_admin |
| GET | `/api/interventions/effectiveness` | Recommendation effectiveness metrics | institutional_admin |

## Dependencies
- **Blocked by:** STORY-AD-5 (dashboard context for displaying recommendations), STORY-AD-2 (root-cause data is the primary input)
- **Blocks:** STORY-AD-8 (accepted recommendations become logged interventions)
- **Cross-epic:** None

## Testing Requirements
- 7 API tests: rule matching engine (condition evaluation), recommendation ranking by priority, accept/modify/dismiss flow, effectiveness correlation query, student-facing vs advisor-facing text generation, empty recommendations (no matching rules), rule CRUD for institutional_admin
- 0 E2E tests

## Implementation Notes
- Rule-based engine initially; can be upgraded to ML-based recommendations in a future iteration.
- Rule matching: iterate active rules, evaluate conditions against student's root-cause data, trajectory, and mastery levels. Multiple rules can match; rank by priority and expected_impact.
- Example rule: `{ condition: { root_cause_type: "foundational", mastery_threshold: 0.3 }, action_type: "tutoring_referral", action_template: { advisor_text: "Refer student to tutoring center for {concept_name}", student_text: "Visit the tutoring center for help with {concept_name}", expected_impact: "high", default_priority: 1 } }`.
- Rules stored as YAML config file for version control, with database override for institution-specific customizations.
- Effectiveness tracking is longitudinal: compare student's mastery trajectory in the 4 weeks after intervention vs 4 weeks before. Simple delta analysis, not causal inference.
- Dual output text uses template variables: `{concept_name}`, `{mastery_level}`, `{student_name}` interpolated at generation time.
- OOP: RecommendationRulesEngine class with `#rules` private field, public `evaluate(rootCauses, trajectory)` method, constructor DI for rule source.
