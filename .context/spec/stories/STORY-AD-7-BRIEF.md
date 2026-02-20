# STORY-AD-7: Intervention Recommendation Engine — BRIEF

## 0. Lane & Priority

```yaml
story_id: STORY-AD-7
old_id: S-AD-45-2
lane: advisor
lane_priority: 5
within_lane_order: 7
epic: E-45 (Advisor Cohort Dashboard & Interventions)
feature: F-21
sprint: 38
size: M
depends_on:
  - STORY-AD-5 (advisor) — Advisor Dashboard Page (dashboard context)
  - STORY-AD-2 (advisor) — Root-Cause Tracing (root cause data)
blocks:
  - STORY-AD-8 — Intervention Logging (accepted recommendations become logged interventions)
personas_served: [advisor]
```

## 1. Summary

Build a rule-based intervention recommendation engine that generates ranked, personalized intervention suggestions based on each student's root-cause analysis. Given root-cause concepts and their severity, the engine applies configurable recommendation rules to produce actionable suggestions (study material, practice focus, tutoring referral, faculty meeting). Advisors can accept, modify, or dismiss recommendations, and accepted recommendations feed into the intervention logging system (STORY-AD-8).

**Parent epic:** E-45 (Advisor Cohort Dashboard & Interventions)
**Parent feature:** F-21
**User flows satisfied:** Advisor selects targeted intervention for at-risk student
**Personas involved:** Advisor (primary user)

**Product context:** From [PRODUCT_BRIEF §Fatima Al-Rashid]: Interventions currently "generic ('study more') because data is generic." This engine provides specific, root-cause-driven recommendations.

## 2. Task Breakdown

1. Define intervention types in `packages/types/src/advisor/intervention.types.ts`
2. Create recommendation rules configuration in `apps/server/src/modules/advisor/services/recommendation-rules.ts`
3. Create intervention recommendation service in `apps/server/src/modules/advisor/services/intervention-recommendation.service.ts`
4. Create intervention recommendation controller in `apps/server/src/modules/advisor/controllers/intervention-recommendation.controller.ts`
5. Create intervention routes in `apps/server/src/modules/advisor/routes/intervention.routes.ts`
6. Create intervention recommendations UI in `apps/web/src/components/advisor/intervention-recommendations.tsx`
7. Create recommendation card component in `apps/web/src/components/advisor/recommendation-card.tsx`
8. Write service tests
9. Write rules tests

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/advisor/intervention.types.ts

export type RecommendationType = "study_material" | "practice_focus" | "tutoring_referral" | "faculty_meeting";
export type RecommendationPriority = "high" | "medium" | "low";
export type RecommendationDecision = "accepted" | "modified" | "dismissed";

export interface InterventionRecommendation {
  readonly id: string;
  readonly student_id: string;
  readonly recommendation_type: RecommendationType;
  readonly action: string;
  readonly rationale: string;
  readonly expected_impact: string;
  readonly priority: RecommendationPriority;
  readonly root_cause_concept_id: string;
  readonly root_cause_concept_name: string;
  readonly root_cause_mastery: number;
}

export interface RecommendationResponse {
  readonly student_id: string;
  readonly student_name: string;
  readonly risk_level: string;
  readonly recommendations: readonly InterventionRecommendation[];
  readonly generated_at: string;
}

export interface RecommendationDecisionRequest {
  readonly recommendation_id: string;
  readonly decision: RecommendationDecision;
  readonly modified_action?: string;
  readonly notes?: string;
}

export interface RecommendationRule {
  readonly id: string;
  readonly name: string;
  readonly condition: RuleCondition;
  readonly action: RuleAction;
  readonly priority: RecommendationPriority;
}

export interface RuleCondition {
  readonly root_cause_type?: "foundational" | "clinical" | "integrative";
  readonly mastery_below?: number;
  readonly impact_score_above?: number;
  readonly is_inactive?: boolean;
  readonly risk_level?: string;
}

export interface RuleAction {
  readonly recommendation_type: RecommendationType;
  readonly action_template: string;  // "Schedule tutoring session for {concept_name}"
  readonly rationale_template: string;
  readonly expected_impact_template: string;
}
```

## 4. Database Schema (inline, complete)

### Supabase — No new tables for this story

Recommendations are generated in-memory from rules + root cause data. Accepted recommendations create intervention records (STORY-AD-8). The rules themselves are stored as a JSON/YAML configuration file, not in the database.

### Recommendation Rules Configuration

```typescript
// apps/server/src/modules/advisor/services/recommendation-rules.ts

export const RECOMMENDATION_RULES: readonly RecommendationRule[] = [
  {
    id: "rule-01",
    name: "Foundational gap tutoring",
    condition: {
      root_cause_type: "foundational",
      mastery_below: 0.3,
    },
    action: {
      recommendation_type: "tutoring_referral",
      action_template: "Refer student to tutoring for {concept_name}",
      rationale_template: "{concept_name} is a foundational concept with mastery at {mastery}%. This gap affects {impact_score} downstream topics.",
      expected_impact_template: "Resolving this foundational gap should improve performance across {impact_score} related concepts within 2-3 weeks.",
    },
    priority: "high",
  },
  {
    id: "rule-02",
    name: "Practice focus for moderate gaps",
    condition: {
      mastery_below: 0.5,
      impact_score_above: 2,
    },
    action: {
      recommendation_type: "practice_focus",
      action_template: "Assign targeted practice on {concept_name}",
      rationale_template: "Student's mastery of {concept_name} is at {mastery}%, affecting {impact_score} downstream concepts. Focused practice should close this gap.",
      expected_impact_template: "10-15 targeted practice questions should improve mastery by 15-25% within 1-2 weeks.",
    },
    priority: "medium",
  },
  {
    id: "rule-03",
    name: "Study material for clinical gaps",
    condition: {
      root_cause_type: "clinical",
      mastery_below: 0.5,
    },
    action: {
      recommendation_type: "study_material",
      action_template: "Share study materials for {concept_name}",
      rationale_template: "Clinical concept {concept_name} requires additional study resources. Current mastery is {mastery}%.",
      expected_impact_template: "Supplementary materials should help reinforce clinical reasoning within 2 weeks.",
    },
    priority: "medium",
  },
  {
    id: "rule-04",
    name: "Faculty meeting for critical risk",
    condition: {
      risk_level: "critical",
      impact_score_above: 4,
    },
    action: {
      recommendation_type: "faculty_meeting",
      action_template: "Schedule meeting with course director to discuss {concept_name} remediation plan",
      rationale_template: "Student is at critical risk with {impact_score} concepts affected. Course director input needed for comprehensive remediation.",
      expected_impact_template: "Collaborative remediation plan with faculty should address systemic gaps within 3-4 weeks.",
    },
    priority: "high",
  },
  {
    id: "rule-05",
    name: "Inactivity intervention",
    condition: {
      is_inactive: true,
    },
    action: {
      recommendation_type: "faculty_meeting",
      action_template: "Schedule check-in meeting — student has not practiced {concept_name} in over 7 days",
      rationale_template: "Inactivity on {concept_name} is a strong risk signal. Student may need engagement support.",
      expected_impact_template: "Re-engagement through personal outreach typically resumes practice within 3-5 days.",
    },
    priority: "high",
  },
] as const;
```

## 5. API Contract (complete request/response)

### GET /api/v1/advisor/interventions/recommend/:studentId

**Role access:** advisor (own institution), superadmin
**Auth:** Bearer token
**RBAC:** `rbac.require(AuthRole.ADVISOR, AuthRole.SUPERADMIN)`

**Response (200):**
```json
{
    "data": {
        "student_id": "student-uuid-123",
        "student_name": "Marcus Williams",
        "risk_level": "critical",
        "recommendations": [
            {
                "id": "rec-001",
                "student_id": "student-uuid-123",
                "recommendation_type": "tutoring_referral",
                "action": "Refer student to tutoring for Acid-Base Physiology",
                "rationale": "Acid-Base Physiology is a foundational concept with mastery at 15%. This gap affects 5 downstream topics.",
                "expected_impact": "Resolving this foundational gap should improve performance across 5 related concepts within 2-3 weeks.",
                "priority": "high",
                "root_cause_concept_id": "acid-base",
                "root_cause_concept_name": "Acid-Base Physiology",
                "root_cause_mastery": 0.15
            },
            {
                "id": "rec-002",
                "student_id": "student-uuid-123",
                "recommendation_type": "practice_focus",
                "action": "Assign targeted practice on Renal Tubular Function",
                "rationale": "Student's mastery of Renal Tubular Function is at 22%, affecting 3 downstream concepts. Focused practice should close this gap.",
                "expected_impact": "10-15 targeted practice questions should improve mastery by 15-25% within 1-2 weeks.",
                "priority": "medium",
                "root_cause_concept_id": "renal-tubular",
                "root_cause_concept_name": "Renal Tubular Function",
                "root_cause_mastery": 0.22
            }
        ],
        "generated_at": "2026-02-19T14:30:00Z"
    },
    "error": null
}
```

### POST /api/v1/advisor/interventions/recommend/:studentId/decide

**Role access:** advisor (own institution)

**Request:**
```json
{
    "recommendation_id": "rec-001",
    "decision": "accepted",
    "notes": "Scheduling tutoring for next Tuesday."
}
```

**Response (200):**
```json
{
    "data": {
        "recommendation_id": "rec-001",
        "decision": "accepted",
        "intervention_created": true,
        "intervention_id": "intervention-uuid-001"
    },
    "error": null
}
```

**Error responses:**
- 404: Student not found or not in advisor's institution
- 400: Invalid decision value

## 6. Frontend Spec

### Component Hierarchy

```
Organism: InterventionRecommendations
  ├── Molecule: RecommendationHeader (student name, risk level, count)
  └── Molecule: RecommendationCard (repeating)
        ├── Atom: RecommendationTypeBadge (icon + type label)
        ├── Atom: PriorityIndicator (high/medium/low dot)
        ├── Molecule: RecommendationContent
        │     ├── Atom: ActionText (bold action)
        │     ├── Atom: RationaleText (italic rationale)
        │     └── Atom: ImpactText (expected impact)
        └── Molecule: DecisionButtons
              ├── Atom: AcceptButton (primary, green accent)
              ├── Atom: ModifyButton (secondary, blueMid)
              └── Atom: DismissButton (ghost, textMuted)
```

### Props Interfaces

```typescript
interface InterventionRecommendationsProps {
  readonly studentId: string;
  readonly studentName: string;
  readonly recommendations: readonly InterventionRecommendation[];
  readonly onDecision: (decision: RecommendationDecisionRequest) => void;
  readonly isLoading: boolean;
}

interface RecommendationCardProps {
  readonly recommendation: InterventionRecommendation;
  readonly onAccept: () => void;
  readonly onModify: (modifiedAction: string) => void;
  readonly onDismiss: () => void;
}
```

### Design Tokens

- **Recommendation card:** `parchment` bg, `borderLight` border, `radius-lg` (8px), `padding 16px 20px`
- **Type badge colors:**
  - `tutoring_referral`: `danger/10%` bg, `danger` text
  - `practice_focus`: `blueMid/10%` bg, `blueMid` text
  - `study_material`: `green/10%` bg, `greenDark` text
  - `faculty_meeting`: `warning/10%` bg, `warning` text
- **Priority indicator:** 8px dot — high: `danger`, medium: `warning`, low: `green`
- **Accept button:** `green` bg, `white` text
- **Modify button:** `blueMid` outline
- **Dismiss button:** ghost, `textMuted`

## 7. Files to Create (exact paths, implementation order)

| # | Path | Layer | Purpose |
|---|------|-------|---------|
| 1 | `packages/types/src/advisor/intervention.types.ts` | Types | Intervention type interfaces |
| 2 | `apps/server/src/modules/advisor/services/recommendation-rules.ts` | Config | Configurable rule definitions |
| 3 | `apps/server/src/modules/advisor/services/intervention-recommendation.service.ts` | Service | Rule engine + recommendation generation |
| 4 | `apps/server/src/modules/advisor/controllers/intervention-recommendation.controller.ts` | Controller | HTTP handlers |
| 5 | `apps/server/src/modules/advisor/routes/intervention.routes.ts` | Route | Express routes + RBAC |
| 6 | `apps/web/src/components/advisor/intervention-recommendations.tsx` | Component | Recommendations organism |
| 7 | `apps/web/src/components/advisor/recommendation-card.tsx` | Component | Individual recommendation card |
| 8 | `apps/server/src/modules/advisor/__tests__/intervention-recommendation.service.test.ts` | Test | Service tests |
| 9 | `apps/server/src/modules/advisor/__tests__/recommendation-rules.test.ts` | Test | Rules tests |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | What It Provides |
|-------|------|--------|-----------------|
| STORY-AD-5 (Advisor Dashboard) | advisor | NOT STARTED | Dashboard context, UI integration point |
| STORY-AD-2 (Root-Cause Tracing) | advisor | NOT STARTED | Root cause data for recommendations |
| STORY-U-6 (RBAC) | universal | DONE | Role-based access |

### NPM Packages
- No new packages needed

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts`
- `apps/server/src/middleware/rbac.middleware.ts`
- Root cause service/API (STORY-AD-2) — called to get root causes
- Risk flag data (STORY-AD-4) — risk level context

## 9. Test Fixtures (inline)

```typescript
export const MOCK_ROOT_CAUSES = [
  {
    concept_id: "acid-base",
    concept_name: "Acid-Base Physiology",
    p_mastered: 0.15,
    depth: 3,
    impact_score: 5,
    downstream_concepts: ["renal-tubular", "electrolytes", "fluid-reg", "nephron", "diuretics"],
  },
  {
    concept_id: "renal-tubular",
    concept_name: "Renal Tubular Function",
    p_mastered: 0.22,
    depth: 1,
    impact_score: 3,
    downstream_concepts: ["electrolytes", "fluid-reg", "diuretics"],
  },
];

export const MOCK_RECOMMENDATIONS: InterventionRecommendation[] = [
  {
    id: "rec-001",
    student_id: "student-001",
    recommendation_type: "tutoring_referral",
    action: "Refer student to tutoring for Acid-Base Physiology",
    rationale: "Acid-Base Physiology is a foundational concept with mastery at 15%. This gap affects 5 downstream topics.",
    expected_impact: "Resolving this foundational gap should improve performance across 5 related concepts within 2-3 weeks.",
    priority: "high",
    root_cause_concept_id: "acid-base",
    root_cause_concept_name: "Acid-Base Physiology",
    root_cause_mastery: 0.15,
  },
  {
    id: "rec-002",
    student_id: "student-001",
    recommendation_type: "practice_focus",
    action: "Assign targeted practice on Renal Tubular Function",
    rationale: "Student's mastery of Renal Tubular Function is at 22%, affecting 3 downstream concepts.",
    expected_impact: "10-15 targeted practice questions should improve mastery by 15-25% within 1-2 weeks.",
    priority: "medium",
    root_cause_concept_id: "renal-tubular",
    root_cause_concept_name: "Renal Tubular Function",
    root_cause_mastery: 0.22,
  },
];

// Inactive student (triggers inactivity rule)
export const MOCK_INACTIVE_ROOT_CAUSE = {
  concept_id: "hepatic",
  concept_name: "Hepatic Metabolism",
  p_mastered: 0.42,
  depth: 1,
  impact_score: 1,
  is_inactive: true,
  days_since_practice: 12,
};

// No root causes (should return empty recommendations)
export const MOCK_NO_ROOT_CAUSES: never[] = [];

// Decision fixtures
export const MOCK_ACCEPT_DECISION: RecommendationDecisionRequest = {
  recommendation_id: "rec-001",
  decision: "accepted",
  notes: "Scheduling tutoring for next Tuesday.",
};

export const MOCK_MODIFY_DECISION: RecommendationDecisionRequest = {
  recommendation_id: "rec-002",
  decision: "modified",
  modified_action: "Assign 20 practice questions instead of 10-15.",
};

export const MOCK_DISMISS_DECISION: RecommendationDecisionRequest = {
  recommendation_id: "rec-002",
  decision: "dismissed",
  notes: "Student already receiving tutoring.",
};
```

## 10. API Test Spec (vitest — PRIMARY)

```typescript
// apps/server/src/modules/advisor/__tests__/intervention-recommendation.service.test.ts
describe("InterventionRecommendationService", () => {
  it("generates tutoring recommendation for foundational gap < 30% mastery");
  it("generates practice recommendation for moderate gap with impact > 2");
  it("generates study material recommendation for clinical gaps");
  it("generates faculty meeting recommendation for critical risk + high impact");
  it("generates inactivity intervention for inactive concepts");
  it("ranks recommendations by priority (high first)");
  it("personalizes recommendation text with concept name and mastery %");
  it("returns empty recommendations when no root causes found");
  it("applies multiple matching rules for a single root cause");
  it("deduplicates recommendations for same concept");
  it("accept decision creates intervention record");
  it("dismiss decision does not create intervention");
  it("modify decision creates intervention with modified action");
});

// apps/server/src/modules/advisor/__tests__/recommendation-rules.test.ts
describe("RecommendationRules", () => {
  it("foundational rule matches when root_cause_type=foundational AND mastery < 0.3");
  it("foundational rule does NOT match when mastery >= 0.3");
  it("practice rule matches when mastery < 0.5 AND impact_score > 2");
  it("critical rule matches when risk_level=critical AND impact > 4");
  it("inactivity rule matches when is_inactive=true");
  it("all rules have valid templates with {concept_name} and {mastery} placeholders");
});
```

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not a standalone critical journey. Recommendation interaction is covered as part of the advisor dashboard E2E in STORY-AD-5.

## 12. Acceptance Criteria

1. Given root-cause concepts, generates ranked intervention recommendations
2. Four recommendation types: study material, practice focus, tutoring referral, faculty meeting
3. Each recommendation includes: action, rationale, expected impact, priority
4. Recommendations personalized by root-cause type, severity, and mastery level
5. Rule-based engine with configurable recommendation rules (JSON/code config)
6. Rules map root-cause patterns to intervention actions with template expansion
7. GET /api/v1/advisor/interventions/recommend/:studentId returns recommendations
8. Advisor can accept, modify, or dismiss each recommendation
9. Accepted recommendations create intervention records (feeds STORY-AD-8)
10. Empty recommendations returned when no root causes found
11. All tests pass with >= 80% coverage

## 13. Source References

| Claim | Source |
|-------|--------|
| Recommendation types | [S-AD-45-2 §AC] |
| Rule-based engine initially | [S-AD-45-2 §Notes] |
| Advisor pain: generic interventions | [PRODUCT_BRIEF §Fatima Al-Rashid] |
| Accept/modify/dismiss flow | [S-AD-45-2 §AC] |
| Recommendations drive intervention logging | [S-AD-45-2 §Dependencies "S-AD-45-3"] |
| Inactivity as strong predictor | [S-AD-44-2 §Notes] |
| Rules stored as configuration | [S-AD-45-2 §Notes] |

## 14. Environment Prerequisites

- Express server with auth + RBAC middleware
- Root cause API accessible (STORY-AD-2)
- Risk flags populated (STORY-AD-4)
- Advisor dashboard context (STORY-AD-5)

## 15. Figma Make Prototype (Optional)

**Optional:** Prototype the recommendation card layout to validate decision button placement and information hierarchy. Integrate into the advisor dashboard expanded student view.
