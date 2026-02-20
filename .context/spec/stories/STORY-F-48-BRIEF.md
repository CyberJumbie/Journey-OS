# STORY-F-48 Brief: Validation Rule Engine

## 0. Lane & Priority

```yaml
story_id: STORY-F-48
old_id: S-F-21-1
lane: faculty
lane_priority: 3
within_lane_order: 48
sprint: 12
size: L
depends_on:
  - STORY-F-42 (faculty) — Generation pipeline functional (review nodes exist)
blocks:
  - STORY-F-53 — Critic Agent Service (needs validation engine)
  - STORY-F-54 — Auto-Tagging Service (needs validation engine)
  - STORY-F-55 — Self-Correction Retry (needs validation engine)
personas_served: [faculty]
epic: E-21 (Validation & Dedup Engine)
feature: F-10 (Quality Assurance Pipeline)
```

## 1. Summary

Build a **validation rule engine** that applies 30 rules (22 NBME item-writing flaw rules + 8 extended pedagogical rules) with severity levels to generated questions. The engine accepts a `QuestionDraft` and returns a `ValidationResult` containing all violations. Each rule is a pure function that returns `{ ruleId, severity, message, field, suggestion }`. Severity levels are `error` (blocks progression), `warning` (flags for review), and `info` (advisory). The engine supports severity escalation: 3+ warnings on the same field auto-promote to error. Rules are composable and can be enabled/disabled per institution via `institution_settings` in Supabase. Some rules are async (e.g., concept alignment requires Neo4j lookup), so the engine handles mixed sync/async execution. The rule registry uses named exports for each rule function, enabling selective composition.

Key constraints:
- Rules are pure functions for testability; the engine orchestrates execution order
- NBME rules reference Haladyna & Downing taxonomy of item-writing flaws
- Rule config stored per institution in Supabase `institution_settings` table
- Custom error classes: `ValidationEngineError`, `RuleExecutionError` extending `JourneyOSError`
- OOP with JS `#private` fields, constructor DI

## 2. Task Breakdown

1. **Types** -- Create `ValidationRule`, `ValidationResult`, `RuleSeverity`, `RuleViolation`, `RuleConfig` in `packages/types/src/validation/`
2. **Error classes** -- `ValidationEngineError`, `RuleExecutionError` in `apps/server/src/errors/validation.errors.ts`
3. **Validation result model** -- `ValidationResultModel` in `apps/server/src/models/validation-result.model.ts`
4. **NBME rules** -- 22 rule functions in `apps/server/src/services/validation/rules/nbme-rules.ts` covering stem clarity, distractor plausibility, answer-choice homogeneity, negation detection, absolute-term flagging, item-writing flaw detection, etc.
5. **Extended rules** -- 8 rule functions in `apps/server/src/services/validation/rules/extended-rules.ts` covering vignette relevance, rationale completeness, Bloom-level consistency, difficulty calibration, bias language detection, formatting standards, metadata completeness, concept alignment
6. **Rule registry** -- `RuleRegistryService` in `apps/server/src/services/validation/rule-registry.service.ts` for composable rule lookup with enable/disable per institution
7. **Validation engine** -- `ValidationEngineService` in `apps/server/src/services/validation/validation-engine.service.ts` orchestrates rule execution, handles mixed sync/async, severity escalation
8. **Validation config** -- `apps/server/src/config/validation.config.ts` with default rule weights and institution override loading
9. **API tests** -- 15-20 tests covering each rule category, severity escalation, rule composition, config override, error paths
10. **Exports** -- Register types, errors, and services in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/validation/rule.types.ts

/** Severity level for a validation violation */
export type RuleSeverity = "error" | "warning" | "info";

/** A single validation rule definition */
export interface ValidationRule {
  readonly ruleId: string;
  readonly name: string;
  readonly category: "nbme" | "extended";
  readonly description: string;
  readonly defaultSeverity: RuleSeverity;
  readonly isAsync: boolean;
}

/** Result from executing a single rule against a question */
export interface RuleViolation {
  readonly ruleId: string;
  readonly severity: RuleSeverity;
  readonly message: string;
  readonly field: string;
  readonly suggestion: string | null;
}

/** Configuration for which rules are enabled per institution */
export interface RuleConfig {
  readonly institution_id: string;
  readonly enabled_rules: string[];
  readonly disabled_rules: string[];
  readonly severity_overrides: Record<string, RuleSeverity>;
}

// packages/types/src/validation/result.types.ts

import { RuleViolation, RuleSeverity } from "./rule.types";

/** Complete validation result for a question draft */
export interface ValidationResult {
  readonly question_id: string;
  readonly violations: readonly RuleViolation[];
  readonly has_errors: boolean;
  readonly has_warnings: boolean;
  readonly error_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly escalated_fields: readonly string[];
  readonly validated_at: string;
  readonly rules_applied: number;
  readonly passed: boolean;
}

/** Input to the validation engine */
export interface QuestionDraft {
  readonly id: string;
  readonly type: "single_best_answer" | "extended_matching" | "sequential_set";
  readonly vignette: string;
  readonly stem: string;
  readonly options: readonly QuestionOption[];
  readonly correct_answer: string;
  readonly rationale: string;
  readonly metadata: QuestionDraftMetadata;
}

export interface QuestionOption {
  readonly key: string;
  readonly text: string;
}

export interface QuestionDraftMetadata {
  readonly course_id: string;
  readonly slo_ids: readonly string[];
  readonly concept_ids: readonly string[];
  readonly bloom_level: string | null;
  readonly difficulty: string | null;
  readonly usmle_system: string | null;
  readonly usmle_discipline: string | null;
  readonly keywords: readonly string[];
}

/** Rule function signature (sync) */
export type SyncRuleFunction = (draft: QuestionDraft) => RuleViolation | null;

/** Rule function signature (async, e.g., concept alignment via Neo4j) */
export type AsyncRuleFunction = (draft: QuestionDraft) => Promise<RuleViolation | null>;

/** Union of sync and async rule functions */
export type RuleFunction = SyncRuleFunction | AsyncRuleFunction;
```

## 4. Database Schema (inline, complete)

No new tables. Rule configuration is stored in the existing `institution_settings` JSONB column. Validation results are stored in-memory during pipeline execution and persisted as part of the question record.

```sql
-- No new migration required.
-- Rule config stored in institution_settings.validation_rules (JSONB).
-- Example structure in institution_settings:
-- {
--   "validation_rules": {
--     "enabled_rules": ["nbme_stem_clarity", "nbme_distractor_plausibility", ...],
--     "disabled_rules": [],
--     "severity_overrides": { "ext_bias_detection": "error" }
--   }
-- }
```

## 5. API Contract (complete request/response)

The validation engine is an internal service, not a REST endpoint. It is called by the generation pipeline and self-correction service.

### Internal Service API

```typescript
// ValidationEngineService.validate(draft: QuestionDraft, institutionId?: string): Promise<ValidationResult>

// Input: QuestionDraft object (see Data Model)
// Output: ValidationResult object (see Data Model)
```

### Future REST endpoint (not in this story, but design-forward):

```
POST /api/v1/questions/:questionId/validate
Auth: faculty, institutional_admin
Body: {} (uses stored question draft)
Response (200): { data: ValidationResult, error: null }
Response (404): { data: null, error: { code: "NOT_FOUND", message: "Question not found" } }
```

## 6. Frontend Spec

No frontend components in this story. The validation engine is a server-side service. Validation results will be displayed in the workbench and review UI in later stories.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/validation/rule.types.ts` | Types | Create |
| 2 | `packages/types/src/validation/result.types.ts` | Types | Create |
| 3 | `packages/types/src/validation/index.ts` | Types | Create |
| 4 | `packages/types/src/index.ts` | Types | Edit (add validation export) |
| 5 | `apps/server/src/errors/validation.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 7 | `apps/server/src/models/validation-result.model.ts` | Model | Create |
| 8 | `apps/server/src/services/validation/rules/nbme-rules.ts` | Rules | Create |
| 9 | `apps/server/src/services/validation/rules/extended-rules.ts` | Rules | Create |
| 10 | `apps/server/src/services/validation/rules/index.ts` | Rules | Create |
| 11 | `apps/server/src/services/validation/rule-registry.service.ts` | Service | Create |
| 12 | `apps/server/src/services/validation/validation-engine.service.ts` | Service | Create |
| 13 | `apps/server/src/config/validation.config.ts` | Config | Create |
| 14 | `apps/server/src/__tests__/validation/validation-engine.test.ts` | Tests | Create |
| 15 | `apps/server/src/__tests__/validation/nbme-rules.test.ts` | Tests | Create |
| 16 | `apps/server/src/__tests__/validation/extended-rules.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-42 | faculty | Pending | Generation pipeline must be functional (review nodes exist) |
| STORY-U-3 | universal | **DONE** | AuthService for institution context |
| STORY-U-6 | universal | **DONE** | RBAC middleware pattern |

### NPM Packages (to install)
- No new packages required. All rules are pure TypeScript functions.

### Existing Files Needed
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/index.ts` -- Barrel file for type exports
- `apps/server/src/config/supabase.config.ts` -- For loading institution settings

## 9. Test Fixtures (inline)

```typescript
// Valid question draft for testing
export const VALID_SBA_DRAFT: QuestionDraft = {
  id: "draft-uuid-1",
  type: "single_best_answer",
  vignette: "A 45-year-old male presents to the emergency department with acute onset chest pain radiating to the left arm. He has a history of hypertension and type 2 diabetes. ECG shows ST-segment elevation in leads II, III, and aVF.",
  stem: "Which of the following is the most appropriate initial management?",
  options: [
    { key: "A", text: "Administer aspirin and prepare for percutaneous coronary intervention" },
    { key: "B", text: "Order a chest CT with contrast" },
    { key: "C", text: "Prescribe oral antibiotics" },
    { key: "D", text: "Recommend outpatient follow-up in one week" },
    { key: "E", text: "Begin IV heparin and admit for observation" },
  ],
  correct_answer: "A",
  rationale: "ST-elevation myocardial infarction (STEMI) in the inferior leads requires immediate dual antiplatelet therapy and primary PCI. Aspirin is the first-line antiplatelet agent.",
  metadata: {
    course_id: "course-uuid-1",
    slo_ids: ["slo-uuid-1"],
    concept_ids: ["concept-uuid-1"],
    bloom_level: "Apply",
    difficulty: "medium",
    usmle_system: "Cardiovascular",
    usmle_discipline: "Internal Medicine",
    keywords: ["STEMI", "PCI", "aspirin"],
  },
};

// Draft with NBME violations
export const DRAFT_WITH_NEGATION: QuestionDraft = {
  ...VALID_SBA_DRAFT,
  id: "draft-uuid-2",
  stem: "Which of the following is NOT a symptom of myocardial infarction?",
};

// Draft with absolute terms
export const DRAFT_WITH_ABSOLUTES: QuestionDraft = {
  ...VALID_SBA_DRAFT,
  id: "draft-uuid-3",
  options: [
    { key: "A", text: "Always administer aspirin immediately" },
    { key: "B", text: "Never delay reperfusion therapy" },
    { key: "C", text: "Prescribe oral antibiotics" },
    { key: "D", text: "Recommend follow-up" },
    { key: "E", text: "Begin IV heparin" },
  ],
};

// Draft with heterogeneous answer lengths
export const DRAFT_WITH_HETEROGENEOUS_OPTIONS: QuestionDraft = {
  ...VALID_SBA_DRAFT,
  id: "draft-uuid-4",
  options: [
    { key: "A", text: "Administer aspirin and prepare for percutaneous coronary intervention with door-to-balloon time under 90 minutes" },
    { key: "B", text: "CT scan" },
    { key: "C", text: "Antibiotics" },
    { key: "D", text: "Follow-up" },
    { key: "E", text: "Observe" },
  ],
};

// Draft missing metadata (extended rule violations)
export const DRAFT_MISSING_METADATA: QuestionDraft = {
  ...VALID_SBA_DRAFT,
  id: "draft-uuid-5",
  rationale: "",
  metadata: {
    course_id: "course-uuid-1",
    slo_ids: [],
    concept_ids: [],
    bloom_level: null,
    difficulty: null,
    usmle_system: null,
    usmle_discipline: null,
    keywords: [],
  },
};

// Institution rule config override
export const STRICT_INSTITUTION_CONFIG: RuleConfig = {
  institution_id: "inst-uuid-1",
  enabled_rules: [],
  disabled_rules: [],
  severity_overrides: {
    "ext_bias_detection": "error",
    "nbme_negation_detection": "error",
  },
};

export const LENIENT_INSTITUTION_CONFIG: RuleConfig = {
  institution_id: "inst-uuid-2",
  enabled_rules: [],
  disabled_rules: ["ext_bias_detection", "nbme_absolute_terms"],
  severity_overrides: {},
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/validation/validation-engine.test.ts`

```
describe("ValidationEngineService")
  describe("validate")
    > returns passed=true with 0 violations for a valid question draft
    > returns error violation for stem with negation ("NOT", "EXCEPT")
    > returns warning violation for absolute terms ("always", "never") in options
    > returns warning for heterogeneous answer-choice lengths
    > escalates to error when 3+ warnings on same field
    > respects institution config to disable specific rules
    > respects institution severity overrides
    > handles async rules (concept alignment) alongside sync rules
    > returns correct counts (error_count, warning_count, info_count)
    > throws ValidationEngineError when rule registry is empty
    > throws RuleExecutionError when individual rule throws

  describe("severity escalation")
    > promotes warnings to error when 3+ on same field
    > does not escalate when warnings are on different fields
    > lists escalated fields in result
```

**File:** `apps/server/src/__tests__/validation/nbme-rules.test.ts`

```
describe("NBME Rules")
  > stemClarityRule: flags vague stems without clinical context
  > distractorPlausibilityRule: flags implausible distractors
  > answerChoiceHomogeneityRule: flags heterogeneous option lengths
  > negationDetectionRule: flags negation in stem
  > absoluteTermFlaggingRule: flags "always", "never", "all", "none" in options
  > itemWritingFlawRule: flags "all of the above" and "none of the above" options
```

**File:** `apps/server/src/__tests__/validation/extended-rules.test.ts`

```
describe("Extended Rules")
  > vignetteRelevanceRule: flags vignette not relevant to stem
  > rationaleCompletenessRule: flags empty or too-short rationale
  > bloomLevelConsistencyRule: flags mismatch between bloom level and stem verb
  > difficultyCalibractionRule: flags difficulty mismatch with concept depth
  > biasLanguageDetectionRule: flags gender/racial/cultural bias language
  > formattingStandardsRule: flags formatting violations
  > metadataCompletenessRule: flags missing required metadata fields
  > conceptAlignmentRule: flags concepts not in Neo4j graph (async)
```

**Total: ~25 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The validation engine is an internal service with no direct UI. E2E coverage will be added when the workbench displays validation results.

## 12. Acceptance Criteria

1. 22 NBME rules implemented as pure functions covering stem clarity, distractor plausibility, answer-choice homogeneity, negation detection, absolute-term flagging, item-writing flaw detection
2. 8 extended rules implemented covering vignette relevance, rationale completeness, Bloom-level consistency, difficulty calibration, bias language detection, formatting standards, metadata completeness, concept alignment
3. Each rule returns `{ ruleId, severity, message, field, suggestion }`
4. Severity levels work correctly: `error` blocks, `warning` flags, `info` is advisory
5. Severity escalation: 3+ warnings on same field auto-promote to error
6. Rules composable and enable/disable per institution config in `institution_settings`
7. Rule registry provides named exports for each rule function
8. Engine handles mixed sync/async rules correctly
9. `ValidationEngineError` and `RuleExecutionError` extend `JourneyOSError`
10. All 25 API tests pass
11. TypeScript strict, named exports only, OOP with constructor DI and JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| 30 rules (22 NBME + 8 extended) | S-F-21-1 Acceptance Criteria |
| Haladyna & Downing taxonomy | S-F-21-1 Notes |
| Severity escalation (3+ warnings) | S-F-21-1 Notes: "3+ warnings on same field auto-promote to error" |
| Institution config in institution_settings | S-F-21-1 Notes: "Rule config stored per institution in Supabase institution_settings table" |
| Mixed sync/async rules | S-F-21-1 Notes: "Some rules require async (e.g., concept alignment needs Neo4j lookup)" |
| Pure functions for testability | S-F-21-1 Notes |
| Blocks S-F-21-2, S-F-22-1 | S-F-21-1 Dependencies |
| Validation dedup 0.85 flag, 0.95 reject | Project context: shared architecture |

## 14. Environment Prerequisites

- **Supabase:** Project running, `institution_settings` table exists with JSONB `validation_rules` column
- **Neo4j:** Running for async concept alignment rule (optional -- rule gracefully skips if Neo4j unavailable)
- **Express:** Server running on port 3001
- **No new NPM packages required**

## 15. Implementation Notes

- **Rule function pattern:** Each rule is a standalone named export pure function. Sync rules return `RuleViolation | null`. Async rules return `Promise<RuleViolation | null>`. Null means no violation.
- **RuleRegistryService:** OOP class with `#rules: Map<string, RuleFunction>`. Register rules in constructor. `getRules(config?: RuleConfig)` returns filtered rule list. Constructor DI for Neo4j client (needed by concept alignment rule).
- **ValidationEngineService:** OOP class with `#registry: RuleRegistryService` and `#supabaseClient` injected via constructor. `validate(draft, institutionId?)` loads config, gets filtered rules, executes all via `Promise.allSettled()`, collects violations, applies severity escalation, returns `ValidationResult`.
- **Severity escalation logic:** After all rules execute, group violations by field. If any field has 3+ `warning` violations, promote all warnings on that field to `error`.
- **NBME rule IDs:** Use prefix `nbme_` (e.g., `nbme_stem_clarity`, `nbme_negation_detection`). Extended rule IDs use prefix `ext_` (e.g., `ext_bias_detection`).
- **vi.hoisted() for mocks:** Neo4j client mock and Supabase client mock must use `vi.hoisted()` since `vi.mock()` hoists before variable declarations.
- **No default exports:** All rules, services, types, and error classes use named exports only.
