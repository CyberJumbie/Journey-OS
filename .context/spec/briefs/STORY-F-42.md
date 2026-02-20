# STORY-F-42: Review Nodes

**Epic:** E-18 (LangGraph.js Generation Pipeline)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 6
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-18-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need automated review nodes that validate, score, and self-correct generated questions so that only high-quality items reach my review queue.

## Acceptance Criteria
- [ ] `ValidationCheckNode`: structural validation (vignette length, stem clarity, distractor plausibility, answer key present)
- [ ] `QualityScoreNode`: LLM-as-judge scoring on 5 dimensions (clinical accuracy, pedagogical alignment, distractor quality, SLO coverage, Bloom's level match)
- [ ] `SelfCorrectionNode`: takes quality feedback and regenerates weak components (vignette, stem, or distractors)
- [ ] Quality threshold configurable per institution (default: 0.7 composite score)
- [ ] Maximum self-correction loops: 2 (prevent infinite retry)
- [ ] Conditional routing: score >= threshold -> `format-output`, score < threshold -> `self-correction`, max retries exceeded -> flag for human review
- [ ] Review results persisted in generation state for audit trail
- [ ] 10-12 API tests: pass/fail routing, score calculation, self-correction improvement, max retry enforcement, edge cases
- [ ] Named exports only, TypeScript strict

## Reference Screens
No UI screens. Backend review nodes only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/review.types.ts` |
| Nodes | apps/server | `src/services/generation/nodes/validation-check.node.ts`, `src/services/generation/nodes/quality-score.node.ts`, `src/services/generation/nodes/self-correction.node.ts` |
| Prompts | apps/server | `src/services/generation/prompts/review-prompts.ts` |
| Tests | apps/server | `src/services/generation/nodes/__tests__/validation-check.test.ts`, `src/services/generation/nodes/__tests__/quality-score.test.ts`, `src/services/generation/nodes/__tests__/self-correction.test.ts` |

## Database Schema
No new tables. Review results stored in `GenerationState.reviewHistory[]` managed by LangGraph checkpointer (STORY-F-33).

## API Endpoints
No REST endpoints. Review nodes are invoked by the LangGraph pipeline (STORY-F-33).

## Dependencies
- **Blocked by:** STORY-F-37 (generation nodes must produce output to review)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 10-12 API tests: ValidationCheckNode passes valid question, ValidationCheckNode fails missing answer key, QualityScoreNode 5-dimension scoring, composite score calculation (weighted average), pass routing (>= 0.7 -> format-output), fail routing (< 0.7 -> self-correction), SelfCorrectionNode regenerates weak component only, max retry enforcement (2 loops), flag for human review after max retries, review history appended to state, configurable threshold override
- 0 E2E tests

## Implementation Notes
- `QualityScoreNode` uses a separate LLM call with a rubric prompt (LLM-as-judge pattern).
- 5 scoring dimensions each rated 0-1, composite = weighted average.
- Weights configurable: `clinical_accuracy` (0.3), `pedagogical_alignment` (0.2), `distractor_quality` (0.2), `slo_coverage` (0.2), `blooms_match` (0.1).
- `SelfCorrectionNode` receives the specific dimension feedback and only regenerates the weak component, not the entire question.
- Audit trail: each review cycle appends to `state.reviewHistory[]` with scores, feedback, and correction actions.
- Items that fail after max retries get `status: 'needs_human_review'` and appear in faculty review queue.
- Constructor DI with `#llmProvider` private field per node class.
