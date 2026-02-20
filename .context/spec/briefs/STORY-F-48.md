# STORY-F-48: Validation Rule Engine

**Epic:** E-21 (Validation & Dedup Engine)
**Feature:** F-10 (Question Review & Quality)
**Sprint:** 12
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-21-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a validation engine that applies 30 rules (22 NBME + 8 extended) with severity levels to generated questions so that only structurally and pedagogically sound items proceed to review.

## Acceptance Criteria
- [ ] 22 NBME rules implemented: stem clarity, distractor plausibility, answer-choice homogeneity, negation detection, absolute-term flagging, item-writing flaw detection, etc.
- [ ] 8 extended rules: vignette relevance, rationale completeness, Bloom-level consistency, difficulty calibration, bias language detection, formatting standards, metadata completeness, concept alignment
- [ ] Each rule returns `{ ruleId, severity: 'error' | 'warning' | 'info', message, field, suggestion }`
- [ ] Severity levels: `error` blocks progression, `warning` flags for review, `info` is advisory
- [ ] Rule engine accepts a `QuestionDraft` and returns `ValidationResult` with all violations
- [ ] Rules are composable and can be enabled/disabled per institution config
- [ ] Rule registry with named exports for each rule function
- [ ] Severity escalation: 3+ warnings on same field auto-promote to error
- [ ] Custom error classes: `ValidationEngineError`, `RuleExecutionError`
- [ ] 15-20 API tests: each rule category, severity escalation, rule composition, config override, error paths
- [ ] TypeScript strict, named exports only, OOP with constructor DI

## Reference Screens
No UI screens. Backend validation engine only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/validation/rule.types.ts`, `src/validation/result.types.ts` |
| Model | apps/server | `src/models/validation-result.model.ts` |
| Rules - NBME | apps/server | `src/services/validation/rules/nbme-rules.ts` |
| Rules - Extended | apps/server | `src/services/validation/rules/extended-rules.ts` |
| Service - Engine | apps/server | `src/services/validation/validation-engine.service.ts` |
| Service - Registry | apps/server | `src/services/validation/rule-registry.service.ts` |
| Config | apps/server | `src/config/validation.config.ts` |
| Errors | apps/server | `src/errors/validation.errors.ts` |
| Tests | apps/server | `src/services/validation/__tests__/validation-engine.test.ts`, `src/services/validation/__tests__/nbme-rules.test.ts`, `src/services/validation/__tests__/extended-rules.test.ts` |

## Database Schema
Rule configuration stored per institution:
```sql
-- Uses existing institution_settings table
-- Key: 'validation_rules_config'
-- Value: JSONB with enabled/disabled rules and custom thresholds
```

No new tables. Validation results are returned in-memory and stored as part of generation state (STORY-F-33 checkpointer).

## API Endpoints
No REST endpoints. Called internally by the generation pipeline review nodes (STORY-F-42) and batch pipeline (STORY-F-39).

## Dependencies
- **Blocked by:** STORY-F-42 (review nodes exist, pipeline functional)
- **Blocks:** STORY-F-32
- **Cross-lane:** STORY-F-42 (Sprint 6 pipeline)

## Testing Requirements
- 15-20 API tests: stem clarity rule, distractor plausibility rule, answer-choice homogeneity, negation detection, absolute-term flagging, vignette relevance, rationale completeness, Bloom-level consistency, bias language detection, concept alignment (async Neo4j lookup), severity escalation (3 warnings -> error), rule enable/disable via config, rule registry completeness (30 rules), ValidationEngineError on engine failure, RuleExecutionError on individual rule failure, composite ValidationResult structure, empty QuestionDraft handling, mixed sync/async rule execution
- 0 E2E tests

## Implementation Notes
- NBME item-writing flaws reference: Haladyna & Downing taxonomy of item-writing flaws.
- Rules should be pure functions for testability; the engine orchestrates execution order.
- Some rules require async (e.g., concept alignment needs Neo4j lookup) — engine must handle mixed sync/async rules with `Promise.all` where independent.
- Rule config stored per institution in Supabase `institution_settings` table.
- Severity escalation: 3+ warnings on same field auto-promote to error.
- See `docs/solutions/pluggable-rule-engine-pattern.md` for the rule engine architecture pattern.
- Constructor DI with `#ruleRegistry`, `#config` private fields.
- Grep `packages/types/src` for existing type names before creating new ones to avoid duplicate exports.
