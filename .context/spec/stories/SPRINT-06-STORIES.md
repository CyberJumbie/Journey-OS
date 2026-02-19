# Sprint 6 — Stories

**Stories:** 4
**Epics:** E-18

## Execution Order (by lane priority)

| # | Story | Title | Lane | Size |
|---|-------|-------|------|------|
| 1 | S-F-18-1 | LangGraph.js Pipeline Scaffold | faculty | L |
| 2 | S-F-18-2 | Generation Nodes | faculty | L |
| 3 | S-F-18-3 | Review Nodes | faculty | M |
| 4 | S-F-18-4 | SSE Streaming Integration | faculty | M |

## Sprint Goals
- Scaffold the LangGraph.js multi-agent generation pipeline with configurable state graph
- Implement generation and review nodes for AI-powered question creation
- Integrate SSE streaming so faculty see real-time pipeline progress in the browser

## Entry Criteria
- Sprint 5 exit criteria complete (concepts extracted, ILOs/SLOs mapped to frameworks)
- LangGraph.js and LLM provider credentials configured on the server

## Exit Criteria
- LangGraph.js pipeline generates assessment items from concept + SLO context
- Review nodes validate generated items against quality criteria
- SSE events stream pipeline state transitions to connected clients in real time
