# STORY-F-42 Brief: Review Nodes

## 0. Lane & Priority

```yaml
story_id: STORY-F-42
old_id: S-F-18-3
lane: faculty
lane_priority: 3
within_lane_order: 42
sprint: 6
size: M
depends_on:
  - STORY-F-37 (faculty) — Generation Nodes (must produce output to review)
blocks: []
personas_served: [faculty]
epic: E-18 (LangGraph.js Generation Pipeline)
feature: F-09 (AI Generation)
user_flow: UF-18 (Generation Pipeline)
```

## 1. Summary

Build three **automated review nodes** for the LangGraph.js generation pipeline: `ValidationCheckNode` (structural validation), `QualityScoreNode` (LLM-as-judge scoring on 5 dimensions), and `SelfCorrectionNode` (targeted regeneration of weak components). These nodes form the quality gate in the pipeline — items scoring above threshold (default 0.7) proceed to output, items below threshold are self-corrected (max 2 loops), and items that fail after max retries are flagged for human review.

Key constraints:
- **5 scoring dimensions** — clinical_accuracy (0.3), pedagogical_alignment (0.2), distractor_quality (0.2), slo_coverage (0.2), blooms_match (0.1)
- Composite score = weighted average of 5 dimensions, each rated 0-1
- Quality threshold configurable per institution (default: 0.7)
- Maximum 2 self-correction loops (prevent infinite retry)
- Conditional routing: score >= threshold -> format-output, score < threshold -> self-correction, max retries -> human review
- SelfCorrectionNode regenerates only the weak component (not entire question)
- Review history appended to `state.reviewHistory[]` for audit trail

## 2. Task Breakdown

1. **Types** — Create `ValidationResult`, `QualityScore`, `QualityDimension`, `SelfCorrectionFeedback`, `ReviewHistory`, `ReviewNodeConfig` in `packages/types/src/generation/review.types.ts`
2. **ValidationCheckNode** — Structural validation: vignette length, stem clarity, distractor plausibility, answer key present
3. **QualityScoreNode** — LLM-as-judge with rubric prompt scoring 5 dimensions
4. **SelfCorrectionNode** — Takes dimension feedback, regenerates only weak component
5. **Review Prompts** — Rubric prompt for QualityScoreNode, correction prompt for SelfCorrectionNode
6. **Conditional Routing** — Score-based routing logic for the pipeline graph
7. **API tests** — 11 tests covering pass/fail routing, score calculation, self-correction, max retry, edge cases

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/review.types.ts

/** Quality scoring dimensions */
export type QualityDimensionName =
  | "clinical_accuracy"
  | "pedagogical_alignment"
  | "distractor_quality"
  | "slo_coverage"
  | "blooms_match";

/** Default dimension weights (must sum to 1.0) */
export const DEFAULT_DIMENSION_WEIGHTS: Record<QualityDimensionName, number> = {
  clinical_accuracy: 0.3,
  pedagogical_alignment: 0.2,
  distractor_quality: 0.2,
  slo_coverage: 0.2,
  blooms_match: 0.1,
} as const;

/** Individual dimension score */
export interface QualityDimension {
  readonly name: QualityDimensionName;
  readonly score: number;           // 0-1
  readonly feedback: string;        // LLM explanation of score
  readonly weight: number;          // Dimension weight
}

/** Composite quality score result */
export interface QualityScore {
  readonly dimensions: readonly QualityDimension[];
  readonly compositeScore: number;  // Weighted average 0-1
  readonly passesThreshold: boolean;
  readonly threshold: number;
}

/** Structural validation result */
export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly ValidationError[];
}

/** Individual validation error */
export interface ValidationError {
  readonly field: "vignette" | "stem" | "distractors" | "answer_key" | "explanation";
  readonly message: string;
  readonly severity: "error" | "warning";
}

/** Feedback for self-correction node */
export interface SelfCorrectionFeedback {
  readonly weakDimensions: readonly QualityDimension[];  // Dimensions below threshold
  readonly targetComponent: "vignette" | "stem" | "distractors" | "explanation";
  readonly correctionPrompt: string;
  readonly attemptNumber: number;   // 1 or 2 (max 2)
}

/** Review history entry appended to pipeline state */
export interface ReviewHistoryEntry {
  readonly cycle: number;           // 1, 2, or 3 (initial + 2 corrections)
  readonly validationResult: ValidationResult;
  readonly qualityScore: QualityScore;
  readonly correctionApplied: boolean;
  readonly correctionTarget: string | null;
  readonly timestamp: string;
}

/** Configuration for review nodes */
export interface ReviewNodeConfig {
  readonly qualityThreshold: number;      // Default: 0.7
  readonly maxCorrectionLoops: number;    // Default: 2
  readonly dimensionWeights: Record<QualityDimensionName, number>;
}

/** Pipeline state additions for review nodes */
export interface ReviewState {
  readonly reviewHistory: readonly ReviewHistoryEntry[];
  readonly currentReviewCycle: number;
  readonly finalStatus: "passed" | "corrected" | "needs_human_review" | "pending";
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Review results are stored in the pipeline state (in-memory during generation, persisted by the output node). Review history is part of the generated item record.

```sql
-- No migration required for this story.
-- Review history is persisted as part of the generation result JSON
-- in the generated_items table (created by pipeline scaffold F-33).
```

## 5. API Contract (complete request/response)

No new API endpoints. These are internal pipeline nodes invoked by the LangGraph.js graph. The review nodes are registered in the pipeline graph definition and called automatically during generation.

**Node Interface (LangGraph.js):**

```typescript
// Each node receives and returns the pipeline state
interface PipelineState {
  // ... existing fields from generation nodes (F-37)
  reviewHistory: ReviewHistoryEntry[];
  currentReviewCycle: number;
  finalStatus: "passed" | "corrected" | "needs_human_review" | "pending";
}

// ValidationCheckNode: PipelineState -> PipelineState (adds validation result)
// QualityScoreNode: PipelineState -> PipelineState (adds quality score)
// SelfCorrectionNode: PipelineState -> PipelineState (regenerates weak component)

// Conditional routing function:
function reviewRouter(state: PipelineState): "format_output" | "self_correction" | "human_review" {
  const lastScore = state.reviewHistory.at(-1)?.qualityScore;
  if (!lastScore) return "self_correction";
  if (lastScore.passesThreshold) return "format_output";
  if (state.currentReviewCycle >= config.maxCorrectionLoops + 1) return "human_review";
  return "self_correction";
}
```

## 6. Frontend Spec

No frontend components in this story. Review nodes operate within the server-side pipeline. Progress is streamed to the client via SSE (STORY-F-38) as `node_enter` / `node_complete` events for `validation-check`, `quality-score`, and `self-correction` nodes.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/review.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Edit (add review export) |
| 3 | `apps/server/src/services/generation/nodes/validation-check.node.ts` | Node | Create |
| 4 | `apps/server/src/services/generation/nodes/quality-score.node.ts` | Node | Create |
| 5 | `apps/server/src/services/generation/nodes/self-correction.node.ts` | Node | Create |
| 6 | `apps/server/src/services/generation/prompts/review-prompts.ts` | Prompts | Create |
| 7 | `apps/server/src/services/generation/review-router.ts` | Router | Create |
| 8 | `apps/server/src/__tests__/generation/nodes/validation-check.test.ts` | Tests | Create |
| 9 | `apps/server/src/__tests__/generation/nodes/quality-score.test.ts` | Tests | Create |
| 10 | `apps/server/src/__tests__/generation/nodes/self-correction.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-37 | faculty | NOT STARTED | Generation nodes must produce output (vignette, stem, distractors) for review nodes to validate |
| STORY-F-33 | faculty | NOT STARTED | Pipeline scaffold with LangGraph.js graph definition |

### NPM Packages (already installed or from pipeline scaffold)
- `@langchain/langgraph` — LangGraph.js for pipeline graph
- `@langchain/core` — LLM invocation for QualityScoreNode
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/services/generation/pipeline.graph.ts` — Pipeline graph definition (from F-33)
- `apps/server/src/services/generation/nodes/` — Generation nodes (from F-37) that produce question components

## 9. Test Fixtures (inline)

```typescript
// Mock generated question for validation
export const MOCK_VALID_QUESTION = {
  vignette: "A 45-year-old woman presents to the emergency department with acute onset chest pain radiating to her left arm. She has a history of hypertension and hyperlipidemia. ECG shows ST-elevation in leads V1-V4.",
  stem: "Which of the following is the most likely diagnosis?",
  distractors: [
    { text: "Acute myocardial infarction", isCorrect: true, explanation: "ST-elevation with classic risk factors" },
    { text: "Pulmonary embolism", isCorrect: false, explanation: "Would typically show right heart strain" },
    { text: "Aortic dissection", isCorrect: false, explanation: "Usually presents with tearing pain" },
    { text: "Pericarditis", isCorrect: false, explanation: "Would show diffuse ST-elevation" },
    { text: "Costochondritis", isCorrect: false, explanation: "Would not cause ECG changes" },
  ],
  answerKey: "A",
  explanation: "The combination of ST-elevation, classic risk factors, and presentation is diagnostic.",
};

// Mock question missing answer key (validation failure)
export const MOCK_INVALID_QUESTION = {
  ...MOCK_VALID_QUESTION,
  answerKey: null,
  vignette: "Short.", // Too short
};

// Mock quality score result (passes threshold)
export const MOCK_PASSING_SCORE = {
  dimensions: [
    { name: "clinical_accuracy", score: 0.9, feedback: "Accurate presentation", weight: 0.3 },
    { name: "pedagogical_alignment", score: 0.8, feedback: "Well-aligned with SLO", weight: 0.2 },
    { name: "distractor_quality", score: 0.75, feedback: "Plausible distractors", weight: 0.2 },
    { name: "slo_coverage", score: 0.85, feedback: "Covers target SLO", weight: 0.2 },
    { name: "blooms_match", score: 0.8, feedback: "Matches application level", weight: 0.1 },
  ],
  compositeScore: 0.83,
  passesThreshold: true,
  threshold: 0.7,
};

// Mock quality score result (fails threshold)
export const MOCK_FAILING_SCORE = {
  dimensions: [
    { name: "clinical_accuracy", score: 0.4, feedback: "Inaccurate ECG interpretation", weight: 0.3 },
    { name: "pedagogical_alignment", score: 0.6, feedback: "Partially aligned", weight: 0.2 },
    { name: "distractor_quality", score: 0.5, feedback: "Some implausible distractors", weight: 0.2 },
    { name: "slo_coverage", score: 0.7, feedback: "Covers SLO", weight: 0.2 },
    { name: "blooms_match", score: 0.6, feedback: "Below target Bloom level", weight: 0.1 },
  ],
  compositeScore: 0.54,
  passesThreshold: false,
  threshold: 0.7,
};

// Mock LLM response for quality scoring
export const MOCK_LLM_SCORE_RESPONSE = {
  content: JSON.stringify({
    clinical_accuracy: { score: 0.9, feedback: "Accurate presentation" },
    pedagogical_alignment: { score: 0.8, feedback: "Well-aligned" },
    distractor_quality: { score: 0.75, feedback: "Plausible" },
    slo_coverage: { score: 0.85, feedback: "Covers target" },
    blooms_match: { score: 0.8, feedback: "Matches level" },
  }),
};

// Mock review config
export const MOCK_REVIEW_CONFIG = {
  qualityThreshold: 0.7,
  maxCorrectionLoops: 2,
  dimensionWeights: {
    clinical_accuracy: 0.3,
    pedagogical_alignment: 0.2,
    distractor_quality: 0.2,
    slo_coverage: 0.2,
    blooms_match: 0.1,
  },
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/generation/nodes/validation-check.test.ts`

```
describe("ValidationCheckNode")
  ✓ passes valid question with all required components
  ✓ fails question with missing answer key
  ✓ fails question with vignette below minimum length
  ✓ warns on borderline distractor plausibility
  ✓ returns structured ValidationResult with field-specific errors
```

**File:** `apps/server/src/__tests__/generation/nodes/quality-score.test.ts`

```
describe("QualityScoreNode")
  ✓ invokes LLM with rubric prompt and question content
  ✓ calculates weighted composite score from 5 dimensions
  ✓ marks passesThreshold=true when composite >= threshold
  ✓ marks passesThreshold=false when composite < threshold
  ✓ uses institution-specific threshold when configured
  ✓ appends score to state.reviewHistory
```

**File:** `apps/server/src/__tests__/generation/nodes/self-correction.test.ts`

```
describe("SelfCorrectionNode")
  ✓ regenerates only the weakest component (vignette, stem, or distractors)
  ✓ passes dimension feedback as context to regeneration prompt
  ✓ increments currentReviewCycle in state
  ✓ appends correction record to state.reviewHistory

describe("reviewRouter")
  ✓ routes to format_output when score passes threshold
  ✓ routes to self_correction when score fails and retries remaining
  ✓ routes to human_review when max retries exceeded
```

**Total: ~16 tests** (5 validation + 6 quality + 5 self-correction/router)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. Review nodes are internal pipeline components. E2E coverage via the generation workbench E2E test.

## 12. Acceptance Criteria

1. ValidationCheckNode validates vignette length, stem clarity, distractor plausibility, answer key presence
2. QualityScoreNode scores on 5 dimensions using LLM-as-judge with rubric prompt
3. Composite score = weighted average (clinical_accuracy 0.3, pedagogical_alignment 0.2, distractor_quality 0.2, slo_coverage 0.2, blooms_match 0.1)
4. SelfCorrectionNode regenerates only the weak component, not the entire question
5. Quality threshold configurable per institution (default: 0.7)
6. Maximum 2 self-correction loops enforced
7. Conditional routing: pass -> format-output, fail -> self-correction, max retries -> human review
8. Review results persisted in `state.reviewHistory[]` for audit trail
9. Items exceeding max retries get `status: 'needs_human_review'`
10. All ~16 API tests pass
11. Named exports only, TypeScript strict

## 13. Source References

| Claim | Source |
|-------|--------|
| 5 scoring dimensions | S-F-18-3 § Acceptance Criteria: "5 dimensions" |
| Dimension weights | S-F-18-3 § Notes: "clinical_accuracy (0.3), pedagogical_alignment (0.2)..." |
| LLM-as-judge pattern | S-F-18-3 § Notes: "QualityScoreNode uses a separate LLM call with a rubric prompt" |
| Self-correction targets weak component | S-F-18-3 § Notes: "only regenerates the weak component, not the entire question" |
| Max 2 correction loops | S-F-18-3 § Acceptance Criteria: "Maximum self-correction loops: 2" |
| Conditional routing logic | S-F-18-3 § Acceptance Criteria: "score >= threshold -> format-output..." |
| Audit trail in state | S-F-18-3 § Notes: "each review cycle appends to state.reviewHistory[]" |
| Items flagged for human review | S-F-18-3 § Notes: "status: needs_human_review" |

## 14. Environment Prerequisites

- **Pipeline scaffold (F-33):** LangGraph.js graph definition must exist
- **Generation nodes (F-37):** Nodes must produce question output (vignette, stem, distractors)
- **LLM provider:** API key configured for quality scoring (Voyage AI or OpenAI)
- **No Supabase needed** for this story (review state is in pipeline memory)
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No UI components in this story — internal pipeline nodes only. Review progress is visible to faculty via SSE streaming events (node_enter/node_complete for validation-check, quality-score, self-correction nodes).
