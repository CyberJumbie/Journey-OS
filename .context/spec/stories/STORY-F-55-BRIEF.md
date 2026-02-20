# STORY-F-55 Brief: Self-Correction Retry

## 0. Lane & Priority

```yaml
story_id: STORY-F-55
old_id: S-F-21-2
lane: faculty
lane_priority: 3
within_lane_order: 55
sprint: 12
size: M
depends_on:
  - STORY-F-48 (faculty) — Validation Rule Engine exists
blocks: []
personas_served: [faculty]
epic: E-21 (Validation & Dedup Engine)
feature: F-10 (Quality Assurance Pipeline)
```

## 1. Summary

Build a **self-correction retry service** that automatically retries LLM generation up to 2 times when validation rules produce `error`-severity violations. The service constructs a correction prompt that includes the original draft, specific violations, and suggested fixes. Each retry re-runs the full validation suite on the corrected output. Retry metadata is tracked: attempt count, violations per attempt, and correction diff. Only `error`-severity violations trigger retries (warnings pass through). A circuit breaker flags the question for human review if the same rule fails on all retry attempts. State transitions: `draft` -> `correcting` -> `validated` or `needs_manual_review`. Token usage per correction attempt is tracked for cost monitoring.

Key constraints:
- Max 2 retry attempts before `needs_manual_review`
- Only `error`-severity violations trigger retries
- Correction prompt includes violation details and suggestions
- Circuit breaker: same rule failing across all retries -> human review
- Same LLM provider as generation pipeline (Claude via LangChain)
- Custom error class: `SelfCorrectionError`
- OOP with JS `#private` fields, constructor DI

## 2. Task Breakdown

1. **Types** -- Create `CorrectionAttempt`, `CorrectionResult`, `CorrectionMetadata`, `CircuitBreakerState` in `packages/types/src/validation/`
2. **Error class** -- `SelfCorrectionError` in `apps/server/src/errors/correction.errors.ts`
3. **Correction prompt builder** -- `CorrectionPromptBuilder` formats violation details into LLM prompt
4. **Self-correction service** -- `SelfCorrectionService` orchestrates retry loop with validation re-runs
5. **API tests** -- 8-12 tests covering successful correction, max retries, partial fix, circuit breaker, metadata
6. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/validation/correction.types.ts

import { QuestionDraft } from "./result.types";
import { RuleViolation, ValidationResult } from "./rule.types";

/** Status of a correction attempt */
export type CorrectionStatus = "correcting" | "validated" | "needs_manual_review";

/** A single correction attempt */
export interface CorrectionAttempt {
  readonly attempt_number: number;
  readonly input_violations: readonly RuleViolation[];
  readonly corrected_draft: QuestionDraft;
  readonly output_violations: readonly RuleViolation[];
  readonly resolved_count: number;
  readonly remaining_count: number;
  readonly token_usage: CorrectionTokenUsage;
  readonly attempted_at: string;
}

/** Token usage per correction attempt */
export interface CorrectionTokenUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}

/** Complete correction result */
export interface CorrectionResult {
  readonly question_id: string;
  readonly original_draft: QuestionDraft;
  readonly final_draft: QuestionDraft;
  readonly status: CorrectionStatus;
  readonly attempts: readonly CorrectionAttempt[];
  readonly total_attempts: number;
  readonly max_attempts: number;
  readonly circuit_breaker_triggered: boolean;
  readonly circuit_breaker_rules: readonly string[];
  readonly total_token_usage: CorrectionTokenUsage;
  readonly started_at: string;
  readonly completed_at: string;
}

/** Correction metadata for pipeline tracking */
export interface CorrectionMetadata {
  readonly question_id: string;
  readonly total_attempts: number;
  readonly violations_per_attempt: readonly number[];
  readonly resolved_rules: readonly string[];
  readonly persistent_rules: readonly string[];
  readonly total_tokens: number;
}

/** Circuit breaker state per rule */
export interface CircuitBreakerState {
  readonly rule_id: string;
  readonly consecutive_failures: number;
  readonly is_tripped: boolean;
}

/** Correction prompt input */
export interface CorrectionPromptInput {
  readonly original_draft: QuestionDraft;
  readonly violations: readonly RuleViolation[];
  readonly attempt_number: number;
  readonly previous_corrections: readonly string[];
}
```

## 4. Database Schema (inline, complete)

No new tables. Correction metadata is stored as part of the question pipeline state (in the existing `generation_sessions` or `questions` table JSONB fields).

```sql
-- No new migration required.
-- Correction metadata stored in questions.pipeline_metadata JSONB column.
-- Example structure:
-- {
--   "correction": {
--     "total_attempts": 2,
--     "violations_per_attempt": [3, 1],
--     "resolved_rules": ["nbme_negation_detection", "ext_metadata_completeness"],
--     "persistent_rules": ["nbme_distractor_plausibility"],
--     "total_tokens": 3200,
--     "status": "needs_manual_review"
--   }
-- }
```

## 5. API Contract (complete request/response)

The self-correction service is an internal service called by the generation pipeline, not a REST endpoint.

### Internal Service API

```typescript
// SelfCorrectionService.correct(draft: QuestionDraft, validationResult: ValidationResult): Promise<CorrectionResult>

// Called by the pipeline when ValidationResult has error-severity violations.
// Returns CorrectionResult with final draft and status.
```

### Pipeline integration point:

```
Generation Pipeline
  └── Validate (STORY-F-48)
      ├── No errors → proceed to auto-tag
      └── Has errors → SelfCorrectionService.correct()
          ├── Corrected → re-validate → proceed
          └── Max retries → needs_manual_review
```

## 6. Frontend Spec

No frontend components in this story. Correction results are internal pipeline state. The workbench chat panel (STORY-F-52) will display correction status in pipeline progress updates.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/validation/correction.types.ts` | Types | Create |
| 2 | `packages/types/src/validation/index.ts` | Types | Edit (add correction exports) |
| 3 | `apps/server/src/errors/correction.errors.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 5 | `apps/server/src/services/validation/correction-prompt.builder.ts` | Prompt | Create |
| 6 | `apps/server/src/services/validation/self-correction.service.ts` | Service | Create |
| 7 | `apps/server/src/__tests__/validation/self-correction.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-48 | faculty | Pending | Validation engine must exist (corrections re-run validation) |
| STORY-U-3 | universal | **DONE** | AuthService (pipeline context) |

### NPM Packages (to install)
- No new packages required. Uses existing LangChain/Anthropic SDK for LLM calls.

### Existing Files Needed
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/services/validation/validation-engine.service.ts` -- For re-running validation (from STORY-F-48)

## 9. Test Fixtures (inline)

```typescript
import type { CorrectionResult, CorrectionAttempt, QuestionDraft, ValidationResult, RuleViolation } from "@journey-os/types";

// Draft with error violations
export const DRAFT_WITH_ERRORS: QuestionDraft = {
  id: "draft-uuid-1",
  type: "single_best_answer",
  vignette: "A patient presents with chest pain.",
  stem: "Which of the following is NOT a treatment for MI?",
  options: [
    { key: "A", text: "Always administer aspirin" },
    { key: "B", text: "PCI" },
    { key: "C", text: "Antibiotics" },
    { key: "D", text: "Thrombolytics" },
    { key: "E", text: "Beta blockers" },
  ],
  correct_answer: "C",
  rationale: "",
  metadata: {
    course_id: "course-uuid-1",
    slo_ids: ["slo-uuid-1"],
    concept_ids: [],
    bloom_level: "Apply",
    difficulty: "medium",
    usmle_system: "Cardiovascular",
    usmle_discipline: "Internal Medicine",
    keywords: [],
  },
};

// Validation result with errors
export const VALIDATION_WITH_ERRORS: ValidationResult = {
  question_id: "draft-uuid-1",
  violations: [
    { ruleId: "nbme_negation_detection", severity: "error", message: "Stem contains negation (NOT)", field: "stem", suggestion: "Rephrase to positive form" },
    { ruleId: "nbme_absolute_terms", severity: "error", message: "Option A contains absolute term (Always)", field: "options", suggestion: "Remove absolute qualifier" },
    { ruleId: "ext_rationale_completeness", severity: "error", message: "Rationale is empty", field: "rationale", suggestion: "Add explanation for correct answer" },
  ],
  has_errors: true,
  has_warnings: false,
  error_count: 3,
  warning_count: 0,
  info_count: 0,
  escalated_fields: [],
  validated_at: "2026-02-19T14:00:00Z",
  rules_applied: 30,
  passed: false,
};

// Corrected draft (after 1 attempt, 2 of 3 fixed)
export const PARTIALLY_CORRECTED_DRAFT: QuestionDraft = {
  ...DRAFT_WITH_ERRORS,
  stem: "Which of the following is the most appropriate treatment for acute MI?",
  options: [
    { key: "A", text: "Administer aspirin and prepare for PCI" },
    { key: "B", text: "PCI alone" },
    { key: "C", text: "Antibiotics" },
    { key: "D", text: "Thrombolytics" },
    { key: "E", text: "Beta blockers" },
  ],
  rationale: "Aspirin and PCI are first-line treatments for acute MI per AHA guidelines.",
};

// Fully corrected draft
export const FULLY_CORRECTED_DRAFT: QuestionDraft = {
  ...PARTIALLY_CORRECTED_DRAFT,
  options: [
    { key: "A", text: "Administer aspirin and prepare for PCI" },
    { key: "B", text: "Administer thrombolytics within 30 minutes" },
    { key: "C", text: "Prescribe broad-spectrum antibiotics" },
    { key: "D", text: "Start IV nitroglycerin infusion" },
    { key: "E", text: "Initiate beta-blocker therapy" },
  ],
};

// Successful correction result
export const SUCCESSFUL_CORRECTION: CorrectionResult = {
  question_id: "draft-uuid-1",
  original_draft: DRAFT_WITH_ERRORS,
  final_draft: FULLY_CORRECTED_DRAFT,
  status: "validated",
  attempts: [
    {
      attempt_number: 1,
      input_violations: VALIDATION_WITH_ERRORS.violations,
      corrected_draft: PARTIALLY_CORRECTED_DRAFT,
      output_violations: [
        { ruleId: "nbme_answer_homogeneity", severity: "error", message: "Option lengths vary significantly", field: "options", suggestion: "Make options similar length" },
      ],
      resolved_count: 3,
      remaining_count: 1,
      token_usage: { prompt_tokens: 1200, completion_tokens: 800, total_tokens: 2000 },
      attempted_at: "2026-02-19T14:00:05Z",
    },
    {
      attempt_number: 2,
      input_violations: [{ ruleId: "nbme_answer_homogeneity", severity: "error", message: "Option lengths vary significantly", field: "options", suggestion: "Make options similar length" }],
      corrected_draft: FULLY_CORRECTED_DRAFT,
      output_violations: [],
      resolved_count: 1,
      remaining_count: 0,
      token_usage: { prompt_tokens: 1000, completion_tokens: 600, total_tokens: 1600 },
      attempted_at: "2026-02-19T14:00:10Z",
    },
  ],
  total_attempts: 2,
  max_attempts: 2,
  circuit_breaker_triggered: false,
  circuit_breaker_rules: [],
  total_token_usage: { prompt_tokens: 2200, completion_tokens: 1400, total_tokens: 3600 },
  started_at: "2026-02-19T14:00:00Z",
  completed_at: "2026-02-19T14:00:15Z",
};

// Failed correction (max retries exhausted)
export const FAILED_CORRECTION: CorrectionResult = {
  ...SUCCESSFUL_CORRECTION,
  status: "needs_manual_review",
  final_draft: PARTIALLY_CORRECTED_DRAFT,
  circuit_breaker_triggered: true,
  circuit_breaker_rules: ["nbme_distractor_plausibility"],
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/validation/self-correction.test.ts`

```
describe("SelfCorrectionService")
  describe("correct")
    > successfully corrects draft on first attempt when all errors resolved
    > retries up to 2 times when errors persist after first correction
    > marks as needs_manual_review after max retries exhausted
    > only triggers retry for error-severity violations (not warnings)
    > passes through draft unchanged when only warnings present
    > tracks attempt count and violations per attempt in metadata
    > records correction diff between original and corrected draft
    > triggers circuit breaker when same rule fails on all attempts
    > tracks token usage per correction attempt

  describe("correction prompt")
    > includes violation details and suggestions in correction prompt
    > includes original draft content in prompt
    > includes attempt number for context

  describe("state transitions")
    > transitions from draft -> correcting -> validated on success
    > transitions from draft -> correcting -> needs_manual_review on failure
```

**Total: ~13 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Self-correction is an internal pipeline service. The workbench will display correction progress via pipeline events.

## 12. Acceptance Criteria

1. Self-correction accepts a `QuestionDraft` + `ValidationResult` with error violations
2. Constructs correction prompt with violation details, suggestions, and original draft
3. Up to 2 retry attempts before marking as `needs_manual_review`
4. Each retry re-runs full validation suite on corrected output
5. Retry metadata tracked: attempt count, violations per attempt, correction diff
6. Only `error`-severity violations trigger retries (warnings pass through)
7. Circuit breaker: same rule failing on all retries flags for human review
8. Token usage tracked per correction attempt for cost monitoring
9. `SelfCorrectionError` extends `JourneyOSError`
10. All 13 API tests pass
11. TypeScript strict, named exports only, OOP with constructor DI and JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| Up to 2 retries | S-F-21-2 Acceptance Criteria: "Up to 2 retry attempts" |
| Only error-severity triggers retry | S-F-21-2 Acceptance Criteria |
| Circuit breaker on persistent failures | S-F-21-2 Acceptance Criteria: "if same rule fails on all retries" |
| Correction prompt with violations | S-F-21-2 Notes: "include the specific rule violations and their suggestions" |
| Same LLM provider | S-F-21-2 Notes: "Claude via LangChain" |
| Token usage tracking | S-F-21-2 Notes: "Track token usage per correction attempt" |
| State transitions | S-F-21-2 Notes: "draft -> correcting -> validated or needs_manual_review" |
| No retry delay | S-F-21-2 Notes: "immediate (no backoff needed)" |

## 14. Environment Prerequisites

- **Express:** Server running on port 3001
- **Anthropic API key:** For Claude LLM correction calls
- **Validation engine:** STORY-F-48 must be implemented (for re-running validation)
- **No Supabase or Neo4j needed** for the correction service itself (metadata stored in pipeline state)

## 15. Implementation Notes

- **SelfCorrectionService:** OOP class with `#validationEngine: ValidationEngineService`, `#llmClient` (Anthropic/LangChain), `#maxAttempts: number` (default 2) injected via constructor DI. `correct(draft, validationResult)` method: (1) filter error-severity violations, (2) if none, return draft as-is with status `validated`, (3) build correction prompt, (4) call LLM, (5) parse corrected draft, (6) re-run validation, (7) if still errors and attempts < max, loop, (8) check circuit breaker, (9) return CorrectionResult.
- **CorrectionPromptBuilder:** Formats a prompt with: original question fields, list of violations with rule IDs, severity, messages, and suggestions, attempt number ("This is correction attempt 2 of 2"), and instruction to fix only the flagged issues without changing other aspects.
- **Circuit breaker logic:** Track which rule IDs fail per attempt. After max attempts, if any rule_id appears in all attempt failure lists, trip the circuit breaker for that rule. Include tripped rule IDs in the result.
- **No retry delay:** Corrections are independent LLM calls, so no backoff is needed. Immediate retry after validation check.
- **LLM response parsing:** The correction prompt requests structured JSON output matching `QuestionDraft` schema. Parse with Zod validation. If parsing fails, count as a failed attempt.
- **vi.hoisted() for mocks:** LLM client and ValidationEngineService mocks must use `vi.hoisted()`.
- **No default exports:** All services, types, and error classes use named exports only.
