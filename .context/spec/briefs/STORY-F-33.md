# STORY-F-33: LangGraph.js Pipeline Scaffold

**Epic:** E-18 (LangGraph.js Generation Pipeline)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 6
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-18-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a 14-node LangGraph.js pipeline scaffold with state management so that the AI question generation system has a structured, observable execution graph for producing high-quality assessment items.

## Acceptance Criteria
- [ ] LangGraph.js `StateGraph` defined with 14 nodes (11 generation + 3 review)
- [ ] Pipeline state schema typed: `GenerationState` with question draft, vignette, stem, distractors, rationale, scores, metadata
- [ ] Node routing logic: conditional edges between generation and review phases
- [ ] Entry point node accepts generation parameters (question type, difficulty, SLO, concept scope)
- [ ] Checkpoint persistence for resumable generation (LangGraph checkpointer)
- [ ] Pipeline factory with constructor DI for LLM provider, embedding service, config
- [ ] Error handling: custom `PipelineExecutionError`, `NodeTimeoutError` classes
- [ ] Graph visualization export for debugging (mermaid diagram generation)
- [ ] 12-15 API tests: graph construction, state transitions, node routing, error paths, checkpoint save/restore
- [ ] Named exports only, no default exports, TypeScript strict

## Reference Screens
No UI screens. Backend pipeline scaffold only.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/pipeline.types.ts`, `src/generation/state.types.ts` |
| Model | apps/server | `src/models/generation-state.model.ts` |
| Service | apps/server | `src/services/generation/pipeline.service.ts`, `src/services/generation/pipeline-factory.service.ts` |
| Graph | apps/server | `src/services/generation/graph/graph-definition.ts`, `src/services/generation/graph/node-registry.ts` |
| Config | apps/server | `src/config/pipeline.config.ts` |
| Errors | apps/server | `src/errors/pipeline.errors.ts` |
| Tests | apps/server | `src/services/generation/__tests__/pipeline.service.test.ts`, `src/services/generation/graph/__tests__/graph-definition.test.ts` |

## Database Schema
Generation state checkpoints stored in Supabase:
```sql
CREATE TABLE generation_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT,
  state JSONB NOT NULL,
  parent_id UUID REFERENCES generation_checkpoints(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gen_checkpoints_session ON generation_checkpoints(session_id);
CREATE INDEX idx_gen_checkpoints_thread ON generation_checkpoints(thread_id);
```

## API Endpoints
No REST endpoints in this story. The pipeline is invoked internally by the generation controller (STORY-F-38) and batch pipeline (STORY-F-39).

## Dependencies
- **Blocked by:** STORY-F-31 (concepts available), STORY-U-3 (RBAC)
- **Blocks:** STORY-F-37, STORY-F-38, STORY-F-42
- **Cross-lane:** STORY-F-31 (Sprint 5 concepts)

## Testing Requirements
- 12-15 API tests: StateGraph construction with 14 nodes, state schema validation, conditional edge routing (score >= threshold -> format-output), conditional edge routing (score < threshold -> self-correction), entry point parameter validation, checkpoint save, checkpoint restore, pipeline factory DI, PipelineExecutionError on node failure, NodeTimeoutError on timeout, mermaid export, node registry completeness, state immutability between nodes
- 0 E2E tests

## Implementation Notes
- LangGraph.js uses `StateGraph` from `@langchain/langgraph` — not LangChain's legacy `AgentExecutor`.
- State must be immutable between nodes; use LangGraph's annotation-based state schema.
- 11 generation nodes: `init`, `context-fetch`, `vignette-gen`, `stem-gen`, `distractor-gen` (x3 for A/B/C wrong + correct), `rationale-gen`, `metadata-tag`, `format-output`.
- 3 review nodes: `validation-check`, `quality-score`, `self-correction`.
- Conditional edge after `quality-score`: if score < threshold, route to `self-correction`; else to `format-output`.
- Pipeline must support both single and batch invocation (batch in STORY-F-39).
- Target: <500ms to first token via streaming, <45s full generation cycle.
- Constructor DI with `#llmProvider`, `#embedService`, `#config` private fields.
