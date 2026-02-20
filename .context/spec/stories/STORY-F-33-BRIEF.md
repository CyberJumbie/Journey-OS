# STORY-F-33 Brief: LangGraph.js Pipeline Scaffold

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-33
old_id: S-F-18-1
epic: E-18 (LangGraph.js Generation Pipeline)
feature: F-09 (AI Question Generation)
sprint: 6
lane: faculty
lane_priority: 3
within_lane_order: 33
size: L
depends_on:
  - STORY-F-31 (faculty) — SubConcept Extraction Service (concepts must be available)
  - STORY-IA-2 (institutional_admin) — cross-lane (SLOs must exist)
  - STORY-U-6 (universal) — cross-lane RBAC Middleware ✅ DONE
blocks:
  - STORY-F-37 — Generation Nodes
  - STORY-F-38 — Review Nodes
  - STORY-F-39 — Generation API
personas_served: [faculty]
```

---

## Section 1: Summary

**What to build:** A 14-node LangGraph.js StateGraph pipeline scaffold for AI question generation. The scaffold defines the graph topology (11 generation nodes + 3 review nodes), typed pipeline state (`GenerationState`), conditional routing between generation and review phases, checkpoint persistence for resumable generation, and a pipeline factory with constructor DI.

**Parent epic:** E-18 (LangGraph.js Generation Pipeline) under F-09 (AI Question Generation). This is the structural foundation -- it defines the graph shape, state schema, and routing logic that all generation and review nodes plug into.

**User story:** As a faculty member, I need a 14-node LangGraph.js pipeline scaffold with state management so that the AI question generation system has a structured, observable execution graph for producing high-quality assessment items.

**User flows affected:** UF-16 (AI Question Generation).

**Personas:** Faculty (triggers generation, observes pipeline execution).

**Why LangGraph.js:** StateGraph from `@langchain/langgraph` provides annotation-based immutable state, conditional edges, checkpoint persistence, and streaming -- all required for a complex multi-step generation pipeline with review loops.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Pipeline state types | `packages/types/src/generation/state.types.ts` | 1.5h |
| 2 | Pipeline config types | `packages/types/src/generation/pipeline.types.ts` | 1h |
| 3 | Generation types barrel export | `packages/types/src/generation/index.ts` | 10m |
| 4 | Update types root index | `packages/types/src/index.ts` | 5m |
| 5 | Pipeline error classes | `apps/server/src/errors/pipeline.errors.ts` | 30m |
| 6 | Update errors barrel | `apps/server/src/errors/index.ts` | 5m |
| 7 | Pipeline configuration | `apps/server/src/config/pipeline.config.ts` | 30m |
| 8 | GenerationState model | `apps/server/src/models/generation-state.model.ts` | 1h |
| 9 | Node registry | `apps/server/src/services/generation/graph/node-registry.ts` | 1.5h |
| 10 | Graph definition (14 nodes, edges, routing) | `apps/server/src/services/generation/graph/graph-definition.ts` | 3h |
| 11 | PipelineService | `apps/server/src/services/generation/pipeline.service.ts` | 2h |
| 12 | PipelineFactoryService (constructor DI) | `apps/server/src/services/generation/pipeline-factory.service.ts` | 1h |
| 13 | API tests: graph definition | `apps/server/src/tests/generation/graph-definition.test.ts` | 2h |
| 14 | API tests: pipeline service | `apps/server/src/tests/generation/pipeline.service.test.ts` | 2.5h |

**Total estimate:** ~17h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/generation/state.types.ts

/** Generation pipeline node names (11 generation + 3 review) */
export type GenerationNodeName =
  | "init"
  | "context_fetch"
  | "vignette_gen"
  | "stem_gen"
  | "distractor_gen"
  | "rationale_gen"
  | "metadata_tag"
  | "format_output"
  | "validation_check"
  | "quality_score"
  | "self_correction";

/** Question type supported by the generator */
export type QuestionType = "single_best_answer" | "extended_matching" | "sequential";

/** Difficulty level */
export type DifficultyLevel = "easy" | "medium" | "hard";

/** Bloom's taxonomy level */
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

/** Pipeline execution status */
export type PipelineStatus = "pending" | "running" | "completed" | "failed" | "paused";

/** Generation input parameters */
export interface GenerationParams {
  readonly question_type: QuestionType;
  readonly difficulty: DifficultyLevel;
  readonly slo_id: string;
  readonly concept_ids: readonly string[];
  readonly course_id: string;
  readonly faculty_id: string;
  readonly additional_context?: string;
}

/** Clinical vignette component */
export interface Vignette {
  readonly patient_presentation: string;
  readonly history: string;
  readonly physical_findings: string;
  readonly lab_results: string;
  readonly imaging: string;
}

/** Question stem */
export interface QuestionStem {
  readonly text: string;
  readonly lead_in: string;
}

/** Answer option */
export interface AnswerOption {
  readonly label: string;
  readonly text: string;
  readonly is_correct: boolean;
  readonly reasoning: string;
}

/** Educational rationale */
export interface Rationale {
  readonly correct_explanation: string;
  readonly distractor_explanations: readonly string[];
  readonly teaching_point: string;
}

/** Quality scores from review phase */
export interface QualityScores {
  readonly clinical_accuracy: number;
  readonly pedagogical_alignment: number;
  readonly distractor_plausibility: number;
  readonly overall: number;
}

/** Metadata tags */
export interface QuestionMetadata {
  readonly usmle_system: string;
  readonly usmle_discipline: string;
  readonly difficulty: DifficultyLevel;
  readonly bloom_level: BloomLevel;
  readonly slo_id: string;
  readonly concept_ids: readonly string[];
}

/** Complete generation pipeline state (immutable between nodes) */
export interface GenerationState {
  readonly params: GenerationParams;
  readonly context_chunks: readonly string[];
  readonly vignette: Vignette | null;
  readonly stem: QuestionStem | null;
  readonly options: readonly AnswerOption[];
  readonly rationale: Rationale | null;
  readonly metadata: QuestionMetadata | null;
  readonly quality_scores: QualityScores | null;
  readonly correction_attempts: number;
  readonly max_corrections: number;
  readonly current_node: GenerationNodeName;
  readonly status: PipelineStatus;
  readonly errors: readonly string[];
  readonly started_at: string;
  readonly completed_at: string | null;
}

// packages/types/src/generation/pipeline.types.ts

/** Pipeline configuration */
export interface PipelineConfig {
  readonly quality_threshold: number;
  readonly max_correction_attempts: number;
  readonly node_timeout_ms: number;
  readonly checkpoint_enabled: boolean;
  readonly streaming_enabled: boolean;
}

/** Node execution result */
export interface NodeExecutionResult {
  readonly node_name: GenerationNodeName;
  readonly success: boolean;
  readonly duration_ms: number;
  readonly error?: string;
}

/** Pipeline execution result */
export interface PipelineExecutionResult {
  readonly pipeline_id: string;
  readonly status: PipelineStatus;
  readonly state: GenerationState;
  readonly node_results: readonly NodeExecutionResult[];
  readonly total_duration_ms: number;
}

/** Checkpoint data for resumable generation */
export interface PipelineCheckpoint {
  readonly pipeline_id: string;
  readonly state: GenerationState;
  readonly checkpoint_at: string;
  readonly last_completed_node: GenerationNodeName;
}

/** Node handler function signature */
export type NodeHandler = (state: GenerationState) => Promise<Partial<GenerationState>>;

/** Conditional edge routing function signature */
export type EdgeRouter = (state: GenerationState) => GenerationNodeName;
```

---

## Section 4: Database Schema (inline, complete)

```sql
-- Migration: create_generation_pipelines_table
CREATE TABLE generation_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faculty_id UUID NOT NULL REFERENCES auth.users(id),
    course_id UUID NOT NULL,
    slo_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'paused')),
    state JSONB NOT NULL DEFAULT '{}',
    checkpoint JSONB,
    params JSONB NOT NULL,
    node_results JSONB NOT NULL DEFAULT '[]',
    total_duration_ms INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generation_pipelines_faculty_id ON generation_pipelines(faculty_id);
CREATE INDEX idx_generation_pipelines_course_id ON generation_pipelines(course_id);
CREATE INDEX idx_generation_pipelines_status ON generation_pipelines(status);

-- RLS
ALTER TABLE generation_pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Faculty reads own pipelines" ON generation_pipelines
    FOR SELECT USING (faculty_id = auth.uid());

CREATE POLICY "Faculty creates own pipelines" ON generation_pipelines
    FOR INSERT WITH CHECK (faculty_id = auth.uid());

CREATE POLICY "Faculty updates own pipelines" ON generation_pipelines
    FOR UPDATE USING (faculty_id = auth.uid());

CREATE POLICY "SuperAdmin full access to pipelines" ON generation_pipelines
    FOR ALL USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

No Neo4j schema for the pipeline itself -- generated questions will be written to Neo4j in F-39 (Generation API).

---

## Section 5: API Contract (complete request/response)

This story is a backend scaffold -- no public REST endpoint. The pipeline is invoked internally by PipelineService. A public generation API endpoint will be added in STORY-F-39 (Generation API).

**Internal Service Interface:**
```typescript
interface IPipelineService {
  execute(params: GenerationParams): Promise<PipelineExecutionResult>;
  resume(pipelineId: string): Promise<PipelineExecutionResult>;
  getStatus(pipelineId: string): Promise<PipelineStatus>;
}

interface IPipelineFactoryService {
  create(config?: Partial<PipelineConfig>): PipelineService;
}
```

---

## Section 6: Frontend Spec

Not applicable for this story. The pipeline scaffold is backend-only. Generation UI (the "Generation Workbench") is covered in later E-18 stories.

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/state.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/pipeline.types.ts` | Types | Create |
| 3 | `packages/types/src/generation/index.ts` | Types | Create |
| 4 | `packages/types/src/index.ts` | Types | Edit (add generation export) |
| 5 | Supabase migration via MCP | Database | Apply |
| 6 | `apps/server/src/errors/pipeline.errors.ts` | Errors | Create |
| 7 | `apps/server/src/errors/index.ts` | Errors | Edit (add pipeline errors) |
| 8 | `apps/server/src/config/pipeline.config.ts` | Config | Create |
| 9 | `apps/server/src/models/generation-state.model.ts` | Model | Create |
| 10 | `apps/server/src/services/generation/graph/node-registry.ts` | Graph | Create |
| 11 | `apps/server/src/services/generation/graph/graph-definition.ts` | Graph | Create |
| 12 | `apps/server/src/services/generation/pipeline.service.ts` | Service | Create |
| 13 | `apps/server/src/services/generation/pipeline-factory.service.ts` | Service | Create |
| 14 | `apps/server/src/tests/generation/graph-definition.test.ts` | Tests | Create |
| 15 | `apps/server/src/tests/generation/pipeline.service.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-31 | faculty | **NOT YET** | SubConcepts must be available for concept-scoped generation |
| STORY-IA-2 | institutional_admin | **NOT YET** | SLOs must exist for SLO-aligned question generation |
| STORY-U-6 | universal | **DONE** | RBAC middleware for pipeline access control |

### NPM Packages (new)
- `@langchain/langgraph` — StateGraph, Annotation, conditional edges, checkpointer
- `@langchain/core` — Base LangChain types (ChatModel interface)

### NPM Packages (already installed)
- `@supabase/supabase-js` — Pipeline state persistence
- `zod` — State schema validation
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `apps/server/src/middleware/rbac.middleware.ts` — `AuthRole` enum

### Does NOT Depend On
- Anthropic/OpenAI SDKs (scaffold only, LLM calls in F-37)
- Neo4j (no graph writes in scaffold)
- Redis (no pub/sub for scaffold)
- Frontend/Next.js (backend scaffold only)

---

## Section 9: Test Fixtures (inline)

```typescript
// Valid generation params
export const VALID_GENERATION_PARAMS: GenerationParams = {
  question_type: "single_best_answer",
  difficulty: "medium",
  slo_id: "slo-uuid-001",
  concept_ids: ["concept-uuid-001", "concept-uuid-002"],
  course_id: "course-uuid-001",
  faculty_id: "user-uuid-faculty-001",
};

// Default pipeline config
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  quality_threshold: 0.7,
  max_correction_attempts: 2,
  node_timeout_ms: 30000,
  checkpoint_enabled: true,
  streaming_enabled: true,
};

// Initial generation state
export const INITIAL_STATE: GenerationState = {
  params: VALID_GENERATION_PARAMS,
  context_chunks: [],
  vignette: null,
  stem: null,
  options: [],
  rationale: null,
  metadata: null,
  quality_scores: null,
  correction_attempts: 0,
  max_corrections: 2,
  current_node: "init",
  status: "pending",
  errors: [],
  started_at: "2026-02-19T12:00:00Z",
  completed_at: null,
};

// State after context fetch
export const STATE_AFTER_CONTEXT: GenerationState = {
  ...INITIAL_STATE,
  context_chunks: ["Pharmacology chunk 1...", "Pharmacology chunk 2..."],
  current_node: "context_fetch",
  status: "running",
};

// Mock quality scores (below threshold - triggers self-correction)
export const LOW_QUALITY_SCORES: QualityScores = {
  clinical_accuracy: 0.6,
  pedagogical_alignment: 0.5,
  distractor_plausibility: 0.4,
  overall: 0.5,
};

// Mock quality scores (above threshold - passes to format)
export const HIGH_QUALITY_SCORES: QualityScores = {
  clinical_accuracy: 0.9,
  pedagogical_alignment: 0.85,
  distractor_plausibility: 0.8,
  overall: 0.85,
};

// Stub node handler (for scaffold tests)
export const STUB_NODE_HANDLER: NodeHandler = async (state) => ({ ...state });

// Pipeline execution result
export const MOCK_PIPELINE_RESULT: PipelineExecutionResult = {
  pipeline_id: "pipeline-uuid-001",
  status: "completed",
  state: INITIAL_STATE,
  node_results: [],
  total_duration_ms: 12000,
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/generation/graph-definition.test.ts`

```
describe("GraphDefinition")
  describe("graph construction")
    ✓ creates StateGraph with 14 nodes
    ✓ registers all 11 generation nodes
    ✓ registers all 3 review nodes
    ✓ sets 'init' as the entry point
    ✓ sets 'format_output' as the terminal node
    ✓ defines edges from init -> context_fetch -> vignette_gen -> stem_gen
    ✓ defines edges from stem_gen -> distractor_gen -> rationale_gen -> metadata_tag
    ✓ defines edges from metadata_tag -> validation_check -> quality_score
    ✓ defines conditional edge from quality_score (threshold routing)

  describe("conditional routing")
    ✓ routes to self_correction when quality_score < threshold
    ✓ routes to format_output when quality_score >= threshold
    ✓ routes to format_output after max correction attempts exceeded
    ✓ self_correction routes back to vignette_gen for regeneration

  describe("state schema")
    ✓ GenerationState annotation validates all required fields
    ✓ state is immutable between nodes (annotation-based)

  describe("mermaid export")
    ✓ generates valid mermaid diagram string from graph
```

**File:** `apps/server/src/tests/generation/pipeline.service.test.ts`

```
describe("PipelineService")
  describe("execute")
    ✓ creates pipeline record in Supabase with status 'running'
    ✓ invokes graph with initial state from GenerationParams
    ✓ updates pipeline record with final state on completion
    ✓ sets status to 'completed' on successful execution
    ✓ sets status to 'failed' on unrecoverable error
    ✓ records node execution results with duration_ms
    ✓ throws PipelineExecutionError on graph execution failure
    ✓ saves checkpoint after each node completion (when enabled)

  describe("resume")
    ✓ loads checkpoint from Supabase by pipeline ID
    ✓ resumes graph execution from last completed node
    ✓ throws PipelineExecutionError if no checkpoint found

  describe("getStatus")
    ✓ returns current pipeline status from Supabase

  describe("PipelineFactoryService")
    ✓ creates PipelineService with default config
    ✓ creates PipelineService with custom config override
    ✓ injects LLM provider, embedding service via constructor DI
```

**Total: ~30 tests** (16 graph + 14 pipeline)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. The pipeline scaffold is backend-only with no UI. E2E tests for generation will be added when the Generation Workbench UI story is complete.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | StateGraph defined with 14 nodes (11 generation + 3 review) | API test |
| 2 | GenerationState type fully defined with all pipeline data fields | API test |
| 3 | Conditional edge routes from quality_score based on threshold | API test |
| 4 | Entry point node accepts GenerationParams (question type, difficulty, SLO, concepts) | API test |
| 5 | Checkpoint persistence saves/restores pipeline state | API test |
| 6 | PipelineFactoryService uses constructor DI for LLM provider and config | API test |
| 7 | PipelineExecutionError and NodeTimeoutError custom error classes | API test |
| 8 | Mermaid diagram generation for debugging | API test |
| 9 | Pipeline supports both single invocation and resumable execution | API test |
| 10 | Self-correction loop limited by max_correction_attempts | API test |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| LangGraph.js StateGraph, not AgentExecutor | S-F-18-1 SS Notes |
| 11 generation + 3 review nodes | S-F-18-1 SS Notes |
| Annotation-based immutable state | S-F-18-1 SS Notes |
| Conditional edge: quality_score < threshold -> self_correction | S-F-18-1 SS Notes |
| Checkpoint persistence (LangGraph checkpointer) | S-F-18-1 SS Acceptance Criteria |
| Constructor DI for pipeline factory | CLAUDE.md SS Architecture Rules |
| Custom error classes only | CLAUDE.md SS Architecture Rules |
| Target <45s full generation cycle | S-F-18-1 SS Notes |
| Named exports, TypeScript strict | CLAUDE.md SS Architecture Rules |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `generation_pipelines` migration applied
- **LangGraph.js:** `@langchain/langgraph` and `@langchain/core` installed
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **Not required yet:** LLM API keys (scaffold uses stub node handlers; real LLM calls in F-37)

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend pipeline scaffold only). The Generation Workbench UI will be prototyped when the generation API endpoint (F-39) is ready.
