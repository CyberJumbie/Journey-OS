# STORY-F-37: Generation Nodes

**Epic:** E-18 (LangGraph.js Generation Pipeline)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 6
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-18-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need LLM-powered generation nodes for vignette, stem, distractors, and rationale so that the pipeline produces clinically accurate, pedagogically sound USMLE-style questions.

## Acceptance Criteria
- [ ] `InitNode`: validates input parameters, fetches SLO and concept context from Neo4j
- [ ] `ContextFetchNode`: retrieves source material embeddings (1024-dim Voyage AI) for RAG context
- [ ] `VignetteGenNode`: generates clinical vignette with patient presentation, history, findings
- [ ] `StemGenNode`: generates question stem aligned to vignette and target SLO
- [ ] `DistractorGenNode`: generates 3 plausible wrong answers + 1 correct answer with clinical reasoning
- [ ] `RationaleGenNode`: generates educational rationale explaining correct answer and why distractors are wrong
- [ ] `MetadataTagNode`: auto-tags question with USMLE system, discipline, difficulty, Bloom's level
- [ ] Each node uses structured output (JSON mode) with Zod validation on LLM response
- [ ] Prompt templates externalized in config, not hardcoded in node implementations
- [ ] Streaming support: each node yields partial results via LangGraph streaming
- [ ] 15-18 API tests: per-node output validation, prompt injection guards, malformed LLM response handling, context window overflow
- [ ] Named exports only, TypeScript strict

## Reference Screens
> Read-only reference for understanding generation output structure.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/generation/GenerateQuestionsSyllabus.tsx` | N/A (backend nodes, not UI) | Reference for understanding question generation output fields and structure |
| `pages/generation/GenerateQuestionsTopic.tsx` | N/A | Reference for topic-scoped generation parameters |
| `pages/generation/GenerateQuiz.tsx` | N/A | Reference for quiz generation output format |
| `pages/generation/GenerateTest.tsx` | N/A | Reference for test generation output format |
| `pages/generation/GenerateHandout.tsx` | N/A | Reference for handout generation output format |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/nodes.types.ts`, `src/generation/prompts.types.ts` |
| Nodes | apps/server | `src/services/generation/nodes/init.node.ts`, `src/services/generation/nodes/context-fetch.node.ts`, `src/services/generation/nodes/vignette-gen.node.ts`, `src/services/generation/nodes/stem-gen.node.ts`, `src/services/generation/nodes/distractor-gen.node.ts`, `src/services/generation/nodes/rationale-gen.node.ts`, `src/services/generation/nodes/metadata-tag.node.ts`, `src/services/generation/nodes/format-output.node.ts` |
| Prompts | apps/server | `src/services/generation/prompts/generation-prompts.ts` |
| Tests | apps/server | `src/services/generation/nodes/__tests__/vignette-gen.test.ts`, `src/services/generation/nodes/__tests__/stem-gen.test.ts`, `src/services/generation/nodes/__tests__/distractor-gen.test.ts`, `src/services/generation/nodes/__tests__/rationale-gen.test.ts`, `src/services/generation/nodes/__tests__/metadata-tag.test.ts` |

## Database Schema
No new tables. Nodes read from existing `subconcepts`, `chunks`, `standard_terms` tables and write to `GenerationState` (managed by LangGraph checkpointer from STORY-F-33).

## API Endpoints
No REST endpoints. Nodes are invoked by the LangGraph pipeline (STORY-F-33).

## Dependencies
- **Blocked by:** STORY-F-33 (pipeline scaffold)
- **Blocks:** STORY-F-42
- **Cross-lane:** none

## Testing Requirements
- 15-18 API tests: InitNode parameter validation, InitNode Neo4j context fetch, ContextFetchNode embedding retrieval, VignetteGenNode output structure (patient, history, findings), StemGenNode SLO alignment, DistractorGenNode 4 options (3 wrong + 1 correct), RationaleGenNode explanation completeness, MetadataTagNode USMLE system tagging, Zod validation on LLM structured output, malformed LLM response fallback, prompt injection guard, context window overflow handling, streaming partial result yield, prompt template externalization, FormatOutputNode final structure
- 0 E2E tests

## Implementation Notes
- All LLM calls use `ChatAnthropic` or `ChatOpenAI` via LangChain.js abstraction — provider-agnostic.
- Structured output via `.withStructuredOutput(zodSchema)` on the LLM instance.
- Vignette generation target: <3s streaming time.
- `DistractorGenNode` generates all 4 options in a single call with reasoning chains.
- `MetadataTagNode` uses embedding similarity against USMLE framework nodes in Neo4j.
- Prompt templates should include few-shot examples for each node type.
- Guard against prompt injection: sanitize user-provided context before inclusion in prompts.
- Constructor DI with `#llmProvider` private field per node class.
