# E-18: LangGraph.js Generation Pipeline

**Feature:** F-09
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 6

## Definition of Done
- 14-node LangGraph.js pipeline (11 generation + 3 review nodes) operational
- CopilotKit SSE streaming for real-time chat + STATE_DELTA
- Single question generation mode works end-to-end
- Performance: <500ms to first token, <3s vignette stream, <45s full generation
- Conversational refinement with iterative feedback

## User Flows Enabled
- UF-14: Single Question Generation — fully enabled

## Story Preview
- Story: LangGraph.js pipeline scaffold — 14-node graph definition
- Story: Generation nodes — vignette, stem, distractors, rationale nodes
- Story: Review nodes — validation, scoring, self-correction
- Story: SSE streaming integration — CopilotKit STATE_DELTA protocol

## Source References
- F-09 feature definition
- UF-14 user flow
