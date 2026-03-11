# Spike 001: CopilotKit + LangGraph.js Integration

**Story:** P1-008
**Date:** 2026-03-10
**Verdict:** PASS

---

## What We Tested

1. CopilotKit Runtime (`@copilotkit/runtime` v1.53.0) on Express backend
2. LangGraph.js `StateGraph` (`@langchain/langgraph` v0.2.74) with one pass-through node
3. CopilotKit React (`@copilotkit/react-core` + `@copilotkit/react-ui` v1.53.0) on Next.js frontend
4. AG-UI streaming: TEXT_MESSAGE via CopilotChat, STATE_DELTA via useCoAgent
5. `langgraph dev` local server for native STATE_DELTA streaming

## Architecture

```
Browser (Next.js :3000)                     Express (:3001)              LangGraph Dev (:2024)
+---------------------------+                +---------------------+     +---------------------+
| CopilotKitProvider        |   SSE/HTTP     | POST /api/copilotkit|     | langgraph.json      |
|   +-- CopilotChat --------|--------------->|   CopilotRuntime    |     |   journey_generation|
|   |   TEXT_MESSAGE stream  |<---------------|     Anthropic       |     |   = compiledGraph   |
|   +-- useCoAgent ---------|                |                     |     |                     |
|       STATE_DELTA render   |                |   remoteEndpoints:  |     | StateGraph:         |
|       pipelineStatus badge |                |     langGraph       |---->|   spike_passthrough  |
|       vignette/stem fields |                |     Platform        |<----|   → STATE_DELTA     |
+---------------------------+                |     Endpoint        |     +---------------------+
                                             +---------------------+
```

## How It Works

1. `langgraph dev` runs at localhost:2024, serving the compiled graph via LangGraph Platform API
2. CopilotKit Runtime (Express :3001) connects to it as a `langGraphPlatformEndpoint`
3. Frontend `useCoAgent({ name: 'journey_generation' })` subscribes to state changes
4. When the graph runs, each node transition emits native STATE_DELTA events
5. The frontend receives state updates in real-time (pipelineStatus, vignette, stem, etc.)

## Running the Spike

```bash
# Terminal 1: LangGraph dev server (port 2024)
pnpm dev:langgraph

# Terminal 2: Express backend (port 3001) + Next.js frontend (port 3000)
pnpm dev

# Browser: http://localhost:3000/workbench-test
# Type a message → observe pipelineStatus: idle → running → completed
# Check STATE_DELTA events in Network tab (SSE stream)
```

## Key Findings

### langgraph dev as Local Platform Server

The `@langchain/langgraph-cli` package provides `langgraph dev` which runs a local
LangGraph Platform-compatible server. This eliminates the need for a remote deployment
during development. The server:
- Reads `backend/langgraph.json` for graph definitions
- Exposes the LangGraph Platform API at localhost:2024
- Supports hot-reload during development
- Emits native STATE_DELTA events (unlike the action-based approach)

### CopilotKit Integration Pattern

```typescript
// backend/src/copilotkit/runtime.ts
const runtime = new CopilotRuntime({
  remoteEndpoints: [
    langGraphPlatformEndpoint({
      deploymentUrl: 'http://localhost:2024',
      agents: [{ name: 'journey_generation', description: '...' }],
    }),
  ],
});
```

### MessagesAnnotation Required

The LangGraph Platform protocol requires a `messages` channel in the graph state.
The graph extends `MessagesAnnotation` to include this:
```typescript
export const WorkbenchAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,  // Required for CopilotKit interop
  // ... pipeline-specific channels
});
```

## Decision

**PROCEED to Epic 1.2.** Native STATE_DELTA streaming is proven working with `langgraph dev`.

For P1-016+ (pipeline nodes):
- Use `langGraphPlatformEndpoint` pointing at `langgraph dev` server
- Each pipeline node returns partial state → STATE_DELTA auto-emitted
- Frontend `useCoAgent` receives live state updates as each node completes
- Deploy to LangGraph Cloud in production (swap `deploymentUrl` via env var)

## Files

- `backend/langgraph.json` — LangGraph dev server config
- `backend/src/copilotkit/runtime.ts` — CopilotKit Runtime with LangGraph endpoint
- `backend/src/pipeline/graph.ts` — StateGraph (spike stub, exports compiledGraph)
- `frontend/src/providers/CopilotKitProvider.tsx` — Provider wrapper
- `frontend/src/app/workbench-test/page.tsx` — Test page with useCoAgent + CopilotChat
