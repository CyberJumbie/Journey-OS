# STORY-F-37 Brief: Generation Nodes

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-37
old_id: S-F-18-2
epic: E-18 (LangGraph.js Generation Pipeline)
feature: F-09 (AI Question Generation)
sprint: 6
lane: faculty
lane_priority: 3
within_lane_order: 37
size: L
depends_on:
  - STORY-F-33 (faculty) — LangGraph.js Pipeline Scaffold (graph topology must exist)
blocks:
  - STORY-F-38 — Review Nodes (E-18)
personas_served: [faculty]
```

---

## Section 1: Summary

**What to build:** Seven LLM-powered generation nodes that plug into the LangGraph.js pipeline scaffold (F-33) to produce USMLE-style assessment items. Each node handles a specific generation task: InitNode (parameter validation + context fetch from Neo4j), ContextFetchNode (RAG retrieval via embeddings), VignetteGenNode (clinical vignette), StemGenNode (question stem), DistractorGenNode (answer options), RationaleGenNode (educational rationale), and MetadataTagNode (auto-tagging with USMLE metadata). All nodes use structured output (Zod validation on LLM response), externalized prompt templates, and streaming support.

**Parent epic:** E-18 (LangGraph.js Generation Pipeline) under F-09 (AI Question Generation). These are the core generation nodes that produce the actual question content. The scaffold (F-33) defines the graph; this story fills in the node implementations.

**User story:** As a faculty member, I need LLM-powered generation nodes for vignette, stem, distractors, and rationale so that the pipeline produces clinically accurate, pedagogically sound USMLE-style questions.

**User flows affected:** UF-16 (AI Question Generation).

**Personas:** Faculty (triggers generation, reviews output).

**Why structured output:** Zod-validated JSON mode ensures LLM responses conform to expected schemas, preventing parsing errors and enabling reliable downstream processing.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Node types and prompt types | `packages/types/src/generation/nodes.types.ts` | 1h |
| 2 | Prompt template types | `packages/types/src/generation/prompts.types.ts` | 30m |
| 3 | Update generation barrel export | `packages/types/src/generation/index.ts` | 5m |
| 4 | Generation prompt templates | `apps/server/src/services/generation/prompts/generation-prompts.ts` | 2h |
| 5 | InitNode | `apps/server/src/services/generation/nodes/init.node.ts` | 1h |
| 6 | ContextFetchNode | `apps/server/src/services/generation/nodes/context-fetch.node.ts` | 1.5h |
| 7 | VignetteGenNode | `apps/server/src/services/generation/nodes/vignette-gen.node.ts` | 2h |
| 8 | StemGenNode | `apps/server/src/services/generation/nodes/stem-gen.node.ts` | 1.5h |
| 9 | DistractorGenNode | `apps/server/src/services/generation/nodes/distractor-gen.node.ts` | 2h |
| 10 | RationaleGenNode | `apps/server/src/services/generation/nodes/rationale-gen.node.ts` | 1.5h |
| 11 | MetadataTagNode | `apps/server/src/services/generation/nodes/metadata-tag.node.ts` | 1.5h |
| 12 | Node error classes | `apps/server/src/errors/node.errors.ts` | 20m |
| 13 | API tests: VignetteGenNode | `apps/server/src/tests/generation/nodes/vignette-gen.test.ts` | 1.5h |
| 14 | API tests: StemGenNode | `apps/server/src/tests/generation/nodes/stem-gen.test.ts` | 1.5h |
| 15 | API tests: DistractorGenNode | `apps/server/src/tests/generation/nodes/distractor-gen.test.ts` | 1.5h |
| 16 | API tests: RationaleGenNode | `apps/server/src/tests/generation/nodes/rationale-gen.test.ts` | 1.5h |

**Total estimate:** ~21h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/generation/nodes.types.ts

import type { GenerationState, Vignette, QuestionStem, AnswerOption, Rationale, QuestionMetadata } from './state.types';

/** Base node interface */
export interface GenerationNode {
  readonly name: string;
  execute(state: GenerationState): Promise<Partial<GenerationState>>;
}

/** InitNode output additions to state */
export interface InitNodeOutput {
  readonly params: GenerationState['params'];
  readonly current_node: 'init';
  readonly status: 'running';
}

/** ContextFetchNode output */
export interface ContextFetchOutput {
  readonly context_chunks: readonly string[];
  readonly current_node: 'context_fetch';
}

/** VignetteGenNode output */
export interface VignetteGenOutput {
  readonly vignette: Vignette;
  readonly current_node: 'vignette_gen';
}

/** StemGenNode output */
export interface StemGenOutput {
  readonly stem: QuestionStem;
  readonly current_node: 'stem_gen';
}

/** DistractorGenNode output */
export interface DistractorGenOutput {
  readonly options: readonly AnswerOption[];
  readonly current_node: 'distractor_gen';
}

/** RationaleGenNode output */
export interface RationaleGenOutput {
  readonly rationale: Rationale;
  readonly current_node: 'rationale_gen';
}

/** MetadataTagNode output */
export interface MetadataTagOutput {
  readonly metadata: QuestionMetadata;
  readonly current_node: 'metadata_tag';
}

// packages/types/src/generation/prompts.types.ts

/** Prompt template with placeholder variables */
export interface PromptTemplate {
  readonly name: string;
  readonly system_message: string;
  readonly user_message_template: string;
  readonly few_shot_examples: readonly FewShotExample[];
  readonly output_schema_description: string;
}

/** Few-shot example for prompt template */
export interface FewShotExample {
  readonly input: string;
  readonly output: string;
}

/** Prompt variables for template interpolation */
export interface VignettePromptVars {
  readonly concept_names: readonly string[];
  readonly slo_description: string;
  readonly context_chunks: readonly string[];
  readonly difficulty: string;
}

export interface StemPromptVars {
  readonly vignette_text: string;
  readonly slo_description: string;
  readonly question_type: string;
}

export interface DistractorPromptVars {
  readonly vignette_text: string;
  readonly stem_text: string;
  readonly correct_concept: string;
  readonly related_concepts: readonly string[];
}

export interface RationalePromptVars {
  readonly vignette_text: string;
  readonly stem_text: string;
  readonly correct_answer: string;
  readonly distractors: readonly string[];
}

export interface MetadataPromptVars {
  readonly question_text: string;
  readonly vignette_text: string;
  readonly usmle_systems: readonly string[];
  readonly usmle_disciplines: readonly string[];
}
```

---

## Section 4: Database Schema (inline, complete)

No new database tables for this story. Generation nodes operate on the in-memory `GenerationState` within the LangGraph.js pipeline. The state is persisted to the `generation_pipelines` table (created in F-33) via checkpointing.

---

## Section 5: API Contract (complete request/response)

No public REST endpoints. Generation nodes are internal components of the LangGraph.js pipeline. They are registered in the graph definition (F-33) and invoked by the StateGraph execution engine.

**Internal Node Interface:**
```typescript
// Each node implements this pattern
interface GenerationNode {
  execute(state: GenerationState): Promise<Partial<GenerationState>>;
}
```

**Node I/O:**

| Node | Reads from State | Writes to State |
|------|-----------------|-----------------|
| InitNode | `params` | `params` (validated), `status` |
| ContextFetchNode | `params.concept_ids` | `context_chunks` |
| VignetteGenNode | `context_chunks`, `params` | `vignette` |
| StemGenNode | `vignette`, `params` | `stem` |
| DistractorGenNode | `vignette`, `stem` | `options` (4 items) |
| RationaleGenNode | `vignette`, `stem`, `options` | `rationale` |
| MetadataTagNode | full question content | `metadata` |

---

## Section 6: Frontend Spec

Not applicable for this story. Generation nodes are backend pipeline components. The Generation Workbench UI (displaying generated questions with streaming) is a later story in E-18.

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/nodes.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/prompts.types.ts` | Types | Create |
| 3 | `packages/types/src/generation/index.ts` | Types | Edit (add nodes, prompts exports) |
| 4 | `apps/server/src/errors/node.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add node errors) |
| 6 | `apps/server/src/services/generation/prompts/generation-prompts.ts` | Prompts | Create |
| 7 | `apps/server/src/services/generation/nodes/init.node.ts` | Node | Create |
| 8 | `apps/server/src/services/generation/nodes/context-fetch.node.ts` | Node | Create |
| 9 | `apps/server/src/services/generation/nodes/vignette-gen.node.ts` | Node | Create |
| 10 | `apps/server/src/services/generation/nodes/stem-gen.node.ts` | Node | Create |
| 11 | `apps/server/src/services/generation/nodes/distractor-gen.node.ts` | Node | Create |
| 12 | `apps/server/src/services/generation/nodes/rationale-gen.node.ts` | Node | Create |
| 13 | `apps/server/src/services/generation/nodes/metadata-tag.node.ts` | Node | Create |
| 14 | `apps/server/src/tests/generation/nodes/vignette-gen.test.ts` | Tests | Create |
| 15 | `apps/server/src/tests/generation/nodes/stem-gen.test.ts` | Tests | Create |
| 16 | `apps/server/src/tests/generation/nodes/distractor-gen.test.ts` | Tests | Create |
| 17 | `apps/server/src/tests/generation/nodes/rationale-gen.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-33 | faculty | **NOT YET** | Pipeline scaffold must exist (graph definition, state types, node registry) |

### NPM Packages (new)
- `@langchain/anthropic` — ChatAnthropic for Claude LLM calls with structured output
- `@langchain/openai` — ChatOpenAI for provider-agnostic LLM abstraction (optional)

### NPM Packages (already installed)
- `@langchain/langgraph` — StateGraph node registration (from F-33)
- `@langchain/core` — Base types, ChatModel interface
- `neo4j-driver` — SLO and concept context fetch from graph
- `@supabase/supabase-js` — Embedding retrieval for RAG
- `zod` — Structured output validation on LLM responses
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/services/generation/graph/graph-definition.ts` — Graph topology (from F-33)
- `apps/server/src/services/generation/graph/node-registry.ts` — Node registration (from F-33)
- `apps/server/src/models/generation-state.model.ts` — GenerationState model (from F-33)
- `apps/server/src/config/neo4j.config.ts` — Neo4j client for context fetch
- `apps/server/src/config/supabase.config.ts` — Supabase client for embedding queries
- `packages/types/src/generation/state.types.ts` — GenerationState, Vignette, etc. (from F-33)

### Does NOT Depend On
- Frontend/Next.js (backend nodes only)
- Redis (no pub/sub for node execution)
- RBAC middleware (nodes are internal to pipeline)

---

## Section 9: Test Fixtures (inline)

```typescript
import type { GenerationState, Vignette, QuestionStem, AnswerOption } from '@journey-os/types';

// State fixtures for node testing
export const STATE_WITH_CONTEXT: Partial<GenerationState> = {
  params: {
    question_type: "single_best_answer",
    difficulty: "medium",
    slo_id: "slo-uuid-001",
    concept_ids: ["concept-uuid-001"],
    course_id: "course-uuid-001",
    faculty_id: "user-uuid-faculty-001",
  },
  context_chunks: [
    "Beta-blockers competitively inhibit catecholamines at beta-adrenergic receptors...",
    "Common beta-blockers include metoprolol (beta-1 selective) and propranolol (non-selective)...",
  ],
  current_node: "context_fetch",
  status: "running",
};

// Mock vignette output
export const MOCK_VIGNETTE: Vignette = {
  patient_presentation: "A 58-year-old man presents to the emergency department with chest pain and shortness of breath.",
  history: "He has a history of hypertension and hyperlipidemia. He has been taking atorvastatin and lisinopril.",
  physical_findings: "Blood pressure 160/95 mmHg, heart rate 110 bpm, regular rhythm. JVP elevated.",
  lab_results: "Troponin I elevated at 2.4 ng/mL. BNP 890 pg/mL.",
  imaging: "Chest X-ray shows cardiomegaly with bilateral pulmonary congestion.",
};

// Mock stem output
export const MOCK_STEM: QuestionStem = {
  text: "Which of the following medications would be most appropriate to initiate for long-term management of this patient's condition?",
  lead_in: "Which of the following",
};

// Mock answer options
export const MOCK_OPTIONS: AnswerOption[] = [
  { label: "A", text: "Metoprolol succinate", is_correct: true, reasoning: "Beta-1 selective blocker reduces mortality in heart failure" },
  { label: "B", text: "Verapamil", is_correct: false, reasoning: "Non-dihydropyridine CCB contraindicated in systolic heart failure" },
  { label: "C", text: "Amlodipine", is_correct: false, reasoning: "DHP CCB does not improve mortality in heart failure" },
  { label: "D", text: "Propranolol", is_correct: false, reasoning: "Non-selective beta-blocker not preferred over cardioselective agents in HF" },
];

// Mock rationale
export const MOCK_RATIONALE = {
  correct_explanation: "Metoprolol succinate (extended-release) is a beta-1 selective blocker with proven mortality benefit in heart failure with reduced ejection fraction.",
  distractor_explanations: [
    "Verapamil has negative inotropic effects and is contraindicated in systolic heart failure.",
    "Amlodipine is safe but does not improve mortality outcomes.",
    "Propranolol is non-selective and not preferred in heart failure management.",
  ],
  teaching_point: "Three beta-blockers have mortality benefit in HFrEF: metoprolol succinate, carvedilol, and bisoprolol.",
};

// Mock malformed LLM response
export const MALFORMED_LLM_RESPONSE = { unexpected_field: "not valid" };

// Mock LLM that returns structured output
export const createMockLLM = (response: unknown) => ({
  withStructuredOutput: vi.fn().mockReturnValue({
    invoke: vi.fn().mockResolvedValue(response),
    stream: vi.fn().mockReturnValue(async function* () { yield response; }()),
  }),
});

// Mock Neo4j context data
export const MOCK_SLO = {
  id: "slo-uuid-001",
  description: "Select appropriate pharmacological management for acute decompensated heart failure",
};

export const MOCK_CONCEPTS = [
  { id: "concept-uuid-001", name: "Beta-adrenergic antagonism", description: "Competitive inhibition at beta receptors" },
];

// USMLE framework nodes for MetadataTagNode
export const MOCK_USMLE_SYSTEMS = ["Cardiovascular", "Respiratory", "Renal"];
export const MOCK_USMLE_DISCIPLINES = ["Pharmacology", "Pathology", "Physiology"];
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/generation/nodes/vignette-gen.test.ts`

```
describe("VignetteGenNode")
  ✓ generates clinical vignette with patient presentation, history, findings
  ✓ uses structured output with Zod validation on LLM response
  ✓ includes context chunks in prompt
  ✓ returns VignetteGenOutput with vignette field
  ✓ throws NodeExecutionError on malformed LLM response
  ✓ sanitizes context chunks to guard against prompt injection
  ✓ uses externalized prompt template (not hardcoded)
  ✓ supports streaming via LangGraph streaming interface
```

**File:** `apps/server/src/tests/generation/nodes/stem-gen.test.ts`

```
describe("StemGenNode")
  ✓ generates question stem aligned to vignette and SLO
  ✓ validates LLM response matches QuestionStem schema
  ✓ includes vignette text in prompt context
  ✓ returns StemGenOutput with stem field
  ✓ throws NodeExecutionError on malformed response
```

**File:** `apps/server/src/tests/generation/nodes/distractor-gen.test.ts`

```
describe("DistractorGenNode")
  ✓ generates 4 answer options (1 correct + 3 distractors) in single LLM call
  ✓ each option has label, text, is_correct, and reasoning
  ✓ exactly one option has is_correct=true
  ✓ validates response matches AnswerOption[] schema
  ✓ throws NodeExecutionError if no correct answer in response
  ✓ throws NodeExecutionError on malformed response
```

**File:** `apps/server/src/tests/generation/nodes/rationale-gen.test.ts`

```
describe("RationaleGenNode")
  ✓ generates educational rationale for correct answer
  ✓ generates explanations for each distractor
  ✓ includes teaching point
  ✓ validates response matches Rationale schema
  ✓ throws NodeExecutionError on malformed response
```

**Total: ~24 tests** (8 vignette + 5 stem + 6 distractor + 5 rationale)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. Generation nodes are backend pipeline components. E2E tests will be added when the Generation Workbench UI is complete and the full generation journey (UF-16) is testable end-to-end.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | InitNode validates input parameters and fetches SLO + concept context from Neo4j | API test |
| 2 | ContextFetchNode retrieves source material embeddings for RAG context | API test |
| 3 | VignetteGenNode generates clinical vignette with all required fields | API test |
| 4 | StemGenNode generates question stem aligned to vignette and target SLO | API test |
| 5 | DistractorGenNode generates 3 wrong + 1 correct answer with reasoning | API test |
| 6 | RationaleGenNode generates educational rationale with teaching point | API test |
| 7 | MetadataTagNode auto-tags with USMLE system, discipline, difficulty, Bloom's level | API test |
| 8 | Each node uses structured output (JSON mode) with Zod validation | API test |
| 9 | Prompt templates externalized in config, not hardcoded | Code review |
| 10 | Prompt injection guards sanitize user-provided context | API test |
| 11 | Each node supports streaming via LangGraph streaming interface | API test |
| 12 | Named exports only, TypeScript strict | Code review |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| 7 generation nodes: init, context-fetch, vignette, stem, distractor, rationale, metadata | S-F-18-2 SS Acceptance Criteria |
| Structured output via .withStructuredOutput(zodSchema) | S-F-18-2 SS Notes |
| Provider-agnostic LLM abstraction (ChatAnthropic/ChatOpenAI) | S-F-18-2 SS Notes |
| DistractorGenNode: all 4 options in single call | S-F-18-2 SS Notes |
| MetadataTagNode: embedding similarity against USMLE framework | S-F-18-2 SS Notes |
| Prompt templates with few-shot examples | S-F-18-2 SS Notes |
| Prompt injection sanitization | S-F-18-2 SS Notes |
| 1024-dim Voyage AI embeddings for RAG | CLAUDE.md SS shared context |
| Named exports, TypeScript strict | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **LangGraph.js pipeline scaffold (F-33):** Graph definition, state types, node registry must exist
- **Neo4j:** Running with SubConcept nodes, SLO nodes, USMLE framework nodes
- **Supabase:** Running with content chunks and embeddings available for RAG
- **LLM API:** Anthropic API key (Claude) or OpenAI API key -- at least one provider
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `ANTHROPIC_API_KEY` (and/or `OPENAI_API_KEY`)

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend generation nodes only). The Generation Workbench UI that displays generated questions with real-time streaming will be prototyped in a later E-18 story.
