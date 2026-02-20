# STORY-F-53 Brief: Critic Agent Service

## 0. Lane & Priority

```yaml
story_id: STORY-F-53
old_id: S-F-22-1
lane: faculty
lane_priority: 3
within_lane_order: 53
sprint: 13
size: M
depends_on:
  - STORY-F-48 (faculty) — Validation Rule Engine exists
blocks:
  - STORY-F-56 — Review Router (needs critic scores)
personas_served: [faculty]
epic: E-22 (Critic Agent & Review Router)
feature: F-10 (Quality Assurance Pipeline)
```

## 1. Summary

Build an **AI critic agent service** that scores generated questions on 6 quality metrics using Claude Opus. The metrics are: clinical accuracy, pedagogical alignment, distractor quality, stem clarity, Bloom fidelity, and bias detection. Each metric is scored 1-5 with justification text. A composite score is computed as a weighted average (weights configurable per institution). The critic returns a `CriticResult` with per-metric scores, justifications, and composite. Each scoring uses Toulmin argumentation structure: claim, evidence, warrant, backing, qualifier, rebuttal. A provenance chain links the critic output to source concept, SLO, and generation node. The critic prompt is few-shot with golden examples per metric. Rate limiting and caching are applied since critic calls are expensive.

Key constraints:
- Claude Opus for superior reasoning capability
- 6 metrics with 1-5 scoring and weighted composite
- Toulmin argumentation: claim, evidence, warrant, backing, qualifier, rebuttal
- Few-shot critic prompt with golden examples
- Metric weights configurable per institution
- Custom error classes: `CriticAgentError`, `ScoringTimeoutError`
- OOP with JS `#private` fields, constructor DI

## 2. Task Breakdown

1. **Types** -- Create `CriticResult`, `MetricScore`, `ToulminArgument`, `CriticConfig`, `ProvenanceChain` in `packages/types/src/review/`
2. **Error classes** -- `CriticAgentError`, `ScoringTimeoutError` in `apps/server/src/errors/critic.errors.ts`
3. **Critic prompt builder** -- `CriticPromptBuilder` with few-shot examples per metric
4. **Scoring service** -- `ScoringService` for individual metric scoring and composite calculation
5. **Critic agent service** -- `CriticAgentService` orchestrates all 6 metric scorings via Claude Opus
6. **API tests** -- 10-14 tests covering all metrics, composite, weight config, Toulmin, timeout
7. **Exports** -- Register in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/review/critic.types.ts

/** The 6 quality metrics scored by the critic agent */
export type CriticMetric =
  | "clinical_accuracy"
  | "pedagogical_alignment"
  | "distractor_quality"
  | "stem_clarity"
  | "bloom_fidelity"
  | "bias_detection";

/** Score for a single metric */
export interface MetricScore {
  readonly metric: CriticMetric;
  readonly score: number; // 1-5
  readonly justification: string;
  readonly toulmin: ToulminArgument;
}

/** Metric weight configuration */
export interface MetricWeight {
  readonly metric: CriticMetric;
  readonly weight: number; // 0-1, all weights sum to 1
}

/** Default metric weights */
export const DEFAULT_METRIC_WEIGHTS: readonly MetricWeight[] = [
  { metric: "clinical_accuracy", weight: 0.25 },
  { metric: "pedagogical_alignment", weight: 0.20 },
  { metric: "distractor_quality", weight: 0.20 },
  { metric: "stem_clarity", weight: 0.15 },
  { metric: "bloom_fidelity", weight: 0.10 },
  { metric: "bias_detection", weight: 0.10 },
];

/** Critic agent configuration per institution */
export interface CriticConfig {
  readonly institution_id: string;
  readonly metric_weights: readonly MetricWeight[];
  readonly timeout_ms: number;
  readonly cache_ttl_seconds: number;
}

// packages/types/src/review/toulmin.types.ts

/** Toulmin argumentation structure */
export interface ToulminArgument {
  readonly claim: string;       // The score assertion
  readonly evidence: string;    // Specific item features cited
  readonly warrant: string;     // Why the evidence supports the claim
  readonly backing: string;     // NBME guidelines or standards cited
  readonly qualifier: string;   // Confidence level (e.g., "with high confidence")
  readonly rebuttal: string;    // Counter-arguments or limitations
}

/** Complete critic result */
export interface CriticResult {
  readonly question_id: string;
  readonly scores: readonly MetricScore[];
  readonly composite_score: number;
  readonly composite_justification: string;
  readonly provenance: ProvenanceChain;
  readonly scored_at: string;
  readonly model_used: string;
  readonly token_usage: TokenUsage;
}

/** Provenance chain linking critic output to source entities */
export interface ProvenanceChain {
  readonly question_id: string;
  readonly generation_id: string;
  readonly concept_ids: readonly string[];
  readonly slo_ids: readonly string[];
  readonly pipeline_node: string;
  readonly validation_result_id: string | null;
}

/** Token usage tracking for cost monitoring */
export interface TokenUsage {
  readonly prompt_tokens: number;
  readonly completion_tokens: number;
  readonly total_tokens: number;
}
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_critic_results_table

CREATE TABLE critic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  composite_score NUMERIC(3,2) NOT NULL,
  composite_justification TEXT NOT NULL DEFAULT '',
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_used TEXT NOT NULL DEFAULT 'claude-opus-4-6',
  token_usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_critic_results_question_id ON critic_results(question_id);
CREATE INDEX idx_critic_results_composite_score ON critic_results(composite_score);
CREATE INDEX idx_critic_results_scored_at ON critic_results(scored_at DESC);

-- RLS
ALTER TABLE critic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty can view critic results for their questions"
  ON critic_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = critic_results.question_id
      AND q.created_by = auth.uid()
    )
  );
```

## 5. API Contract (complete request/response)

### POST /api/v1/questions/:questionId/critic (Auth: faculty)

Triggers critic agent scoring for a question.

**Success Response (200):**
```json
{
  "data": {
    "question_id": "question-uuid-1",
    "scores": [
      {
        "metric": "clinical_accuracy",
        "score": 4,
        "justification": "The clinical scenario is accurate with appropriate presentation of STEMI.",
        "toulmin": {
          "claim": "Clinical accuracy score of 4/5",
          "evidence": "ECG findings (ST-elevation V1-V4) consistent with anterior STEMI. Treatment option A (aspirin + PCI) aligns with current AHA guidelines.",
          "warrant": "Accurate clinical scenarios improve question validity and ensure students learn correct clinical reasoning.",
          "backing": "AHA/ACC 2023 STEMI Guidelines; NBME Item Writing Manual Section 4.2",
          "qualifier": "With high confidence",
          "rebuttal": "The vignette could include more specific vital signs and lab values for completeness."
        }
      }
    ],
    "composite_score": 3.85,
    "composite_justification": "Strong clinical accuracy and stem clarity. Distractor quality could be improved.",
    "provenance": {
      "question_id": "question-uuid-1",
      "generation_id": "gen-uuid-1",
      "concept_ids": ["concept-uuid-1"],
      "slo_ids": ["slo-uuid-1"],
      "pipeline_node": "generate_question",
      "validation_result_id": "vr-uuid-1"
    },
    "scored_at": "2026-02-19T14:30:00Z",
    "model_used": "claude-opus-4-6",
    "token_usage": {
      "prompt_tokens": 2450,
      "completion_tokens": 1800,
      "total_tokens": 4250
    }
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 404 | `NOT_FOUND` | Question not found |
| 408 | `SCORING_TIMEOUT` | Claude API call timed out |
| 500 | `CRITIC_AGENT_ERROR` | Unexpected critic failure |

## 6. Frontend Spec

No frontend components in this story. The critic agent is a server-side service. Critic results will be displayed in the review queue UI in later stories.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/review/critic.types.ts` | Types | Create |
| 2 | `packages/types/src/review/toulmin.types.ts` | Types | Create |
| 3 | `packages/types/src/review/index.ts` | Types | Create |
| 4 | `packages/types/src/index.ts` | Types | Edit (add review export) |
| 5 | `apps/server/src/errors/critic.errors.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 7 | Supabase migration: `critic_results` table | Database | Apply via MCP |
| 8 | `apps/server/src/services/review/prompts/critic-prompt.builder.ts` | Prompt | Create |
| 9 | `apps/server/src/services/review/scoring.service.ts` | Service | Create |
| 10 | `apps/server/src/services/review/critic-agent.service.ts` | Service | Create |
| 11 | `apps/server/src/__tests__/review/critic-agent.test.ts` | Tests | Create |
| 12 | `apps/server/src/__tests__/review/scoring.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-48 | faculty | Pending | Validation engine must exist (critic runs after validation) |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role check |

### NPM Packages (to install)
- `@anthropic-ai/sdk` -- Anthropic SDK for Claude Opus API calls (may already be installed)

### Existing Files Needed
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `apps/server/src/config/supabase.config.ts` -- Supabase client for persisting results
- `apps/server/src/services/validation/validation-engine.service.ts` -- Validation results (from STORY-F-48)

## 9. Test Fixtures (inline)

```typescript
import type { CriticResult, MetricScore, CriticConfig, ProvenanceChain, ToulminArgument } from "@journey-os/types";

// Mock metric scores
export const CLINICAL_ACCURACY_SCORE: MetricScore = {
  metric: "clinical_accuracy",
  score: 4,
  justification: "Clinical scenario accurately represents STEMI presentation.",
  toulmin: {
    claim: "Clinical accuracy score of 4/5",
    evidence: "ECG findings consistent with anterior STEMI. Treatment aligns with AHA guidelines.",
    warrant: "Accurate scenarios ensure students learn correct clinical reasoning.",
    backing: "AHA/ACC 2023 STEMI Guidelines; NBME Item Writing Manual 4.2",
    qualifier: "With high confidence",
    rebuttal: "Could include more specific vital signs for completeness.",
  },
};

export const LOW_DISTRACTOR_SCORE: MetricScore = {
  metric: "distractor_quality",
  score: 2,
  justification: "Options B-E are implausible for a STEMI presentation.",
  toulmin: {
    claim: "Distractor quality score of 2/5",
    evidence: "Options C (antibiotics) and E (discharge) are not clinically relevant to chest pain workup.",
    warrant: "Plausible distractors are essential for discriminating student knowledge.",
    backing: "NBME Item Writing Flaw #7: Implausible distractors",
    qualifier: "With moderate confidence",
    rebuttal: "Some distractors test common misconceptions which has pedagogical value.",
  },
};

export const ALL_METRIC_SCORES: MetricScore[] = [
  CLINICAL_ACCURACY_SCORE,
  { metric: "pedagogical_alignment", score: 4, justification: "Well-aligned with Apply-level learning.", toulmin: { claim: "Score 4/5", evidence: "Stem requires application of treatment guidelines.", warrant: "Aligns with target Bloom level.", backing: "NBME guidelines", qualifier: "High confidence", rebuttal: "None." } },
  LOW_DISTRACTOR_SCORE,
  { metric: "stem_clarity", score: 5, justification: "Clear, focused stem with single best answer format.", toulmin: { claim: "Score 5/5", evidence: "Stem asks specific management question.", warrant: "Clear stems reduce construct-irrelevant variance.", backing: "NBME Item Writing Manual 3.1", qualifier: "Very high confidence", rebuttal: "None." } },
  { metric: "bloom_fidelity", score: 4, justification: "Correctly targets Apply level.", toulmin: { claim: "Score 4/5", evidence: "Requires applying treatment knowledge to clinical scenario.", warrant: "Bloom fidelity ensures appropriate cognitive demand.", backing: "Bloom taxonomy", qualifier: "High confidence", rebuttal: "Could argue for Analyze level." } },
  { metric: "bias_detection", score: 5, justification: "No bias detected.", toulmin: { claim: "Score 5/5", evidence: "No gender, racial, or cultural bias identified.", warrant: "Bias-free items ensure equitable assessment.", backing: "NBME fairness guidelines", qualifier: "High confidence", rebuttal: "None." } },
];

// Mock critic result
export const MOCK_CRITIC_RESULT: CriticResult = {
  question_id: "question-uuid-1",
  scores: ALL_METRIC_SCORES,
  composite_score: 3.85,
  composite_justification: "Strong clinical accuracy and clarity. Distractor quality needs improvement.",
  provenance: {
    question_id: "question-uuid-1",
    generation_id: "gen-uuid-1",
    concept_ids: ["concept-uuid-1"],
    slo_ids: ["slo-uuid-1"],
    pipeline_node: "generate_question",
    validation_result_id: "vr-uuid-1",
  },
  scored_at: "2026-02-19T14:30:00Z",
  model_used: "claude-opus-4-6",
  token_usage: { prompt_tokens: 2450, completion_tokens: 1800, total_tokens: 4250 },
};

// Custom weight config
export const CUSTOM_WEIGHTS_CONFIG: CriticConfig = {
  institution_id: "inst-uuid-1",
  metric_weights: [
    { metric: "clinical_accuracy", weight: 0.30 },
    { metric: "pedagogical_alignment", weight: 0.25 },
    { metric: "distractor_quality", weight: 0.15 },
    { metric: "stem_clarity", weight: 0.15 },
    { metric: "bloom_fidelity", weight: 0.10 },
    { metric: "bias_detection", weight: 0.05 },
  ],
  timeout_ms: 30000,
  cache_ttl_seconds: 3600,
};

// Mock Claude API response (for mocking Anthropic SDK)
export const MOCK_CLAUDE_SCORING_RESPONSE = {
  content: [{ type: "text" as const, text: JSON.stringify(ALL_METRIC_SCORES) }],
  usage: { input_tokens: 2450, output_tokens: 1800 },
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/review/critic-agent.test.ts`

```
describe("CriticAgentService")
  describe("score")
    > scores a question on all 6 metrics via Claude Opus
    > returns CriticResult with per-metric scores and justifications
    > includes Toulmin argumentation structure for each metric
    > includes provenance chain linking to source entities
    > computes composite score as weighted average of metric scores
    > throws ScoringTimeoutError when Claude API call times out
    > throws CriticAgentError on unexpected API failure
    > tracks token usage for cost monitoring
    > caches results for repeated calls on same question

  describe("configuration")
    > uses default metric weights when no institution config provided
    > applies custom institution weights to composite calculation
```

**File:** `apps/server/src/__tests__/review/scoring.test.ts`

```
describe("ScoringService")
  describe("computeComposite")
    > computes weighted average with default weights
    > computes weighted average with custom weights
    > returns 0 when all scores are 0
    > returns 5 when all scores are 5
    > validates weights sum to 1.0 (within tolerance)
```

**Total: ~16 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. The critic agent is a server-side service. E2E coverage will be added with the review queue UI.

## 12. Acceptance Criteria

1. Critic agent uses Claude Opus for 6-metric scoring
2. Metrics: clinical accuracy, pedagogical alignment, distractor quality, stem clarity, Bloom fidelity, bias detection
3. Each metric scored 1-5 with justification text
4. Composite score computed as weighted average with configurable weights
5. Toulmin argumentation structure stored for each metric score
6. Provenance chain links critic output to source concept, SLO, and generation node
7. `CriticAgentError` and `ScoringTimeoutError` extend `JourneyOSError`
8. Token usage tracked for cost monitoring
9. Results persisted in `critic_results` table
10. All 16 API tests pass
11. TypeScript strict, named exports only, OOP with constructor DI and JS `#private` fields

## 13. Source References

| Claim | Source |
|-------|--------|
| Claude Opus for critic role | S-F-22-1 Notes: "Claude Opus selected for critic role due to superior reasoning capability" |
| 6 metrics with 1-5 scoring | S-F-22-1 Acceptance Criteria |
| Default metric weights | S-F-22-1 Notes: "clinical accuracy 0.25, pedagogical alignment 0.20, ..." |
| Toulmin argumentation model | S-F-22-1 Notes: "Claim, Evidence, Warrant, Backing, Qualifier, Rebuttal" |
| Few-shot critic prompt | S-F-22-1 Notes: "Critic prompt should be few-shot with golden examples per metric" |
| Rate limiting and caching | S-F-22-1 Notes: "batch where possible, cache results" |
| Blocks S-F-22-2 | S-F-22-1 Dependencies |

## 14. Environment Prerequisites

- **Supabase:** Project running, `questions` table exists
- **Express:** Server running on port 3001
- **Anthropic API key:** `ANTHROPIC_API_KEY` env var configured for Claude Opus calls
- **No Neo4j needed** for this story (provenance references stored as IDs)

## 15. Implementation Notes

- **CriticAgentService:** OOP class with `#anthropicClient`, `#supabaseClient`, `#scoringService` injected via constructor DI. `score(questionId)` method: (1) fetches question from DB, (2) builds critic prompt with few-shot examples, (3) calls Claude Opus, (4) parses response into MetricScore[], (5) computes composite, (6) builds provenance chain, (7) persists CriticResult to `critic_results` table.
- **CriticPromptBuilder:** Builds a structured prompt with the question text, followed by per-metric scoring instructions with 1-2 golden examples each. Output format: JSON array of MetricScore objects. Uses system prompt to enforce Toulmin structure.
- **ScoringService:** Pure computation class. `computeComposite(scores, weights)` calculates weighted average. Validates weights sum to 1.0 within floating-point tolerance.
- **Timeout handling:** Wrap Anthropic API call with `AbortController` and configurable timeout (default 30s). If aborted, throw `ScoringTimeoutError`.
- **Caching:** Simple in-memory Map with TTL. Key = question_id + content hash. TTL configurable per institution.
- **vi.hoisted() for mocks:** Anthropic SDK mock must use `vi.hoisted()` since `vi.mock()` hoists before variable declarations.
- **No default exports:** All services, types, and error classes use named exports only.
