# STORY-F-38: SSE Streaming Integration

**Epic:** E-18 (LangGraph.js Generation Pipeline)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 6
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-18-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need real-time SSE streaming of pipeline progress so that I can see each generation step as it happens and interact with the system conversationally via CopilotKit.

## Acceptance Criteria
- [ ] SSE endpoint `POST /api/v1/generation/stream` returns `text/event-stream` response
- [ ] CopilotKit STATE_DELTA protocol implemented: events for `node-enter`, `node-complete`, `token-stream`, `error`
- [ ] Each pipeline node emits streaming tokens as they are generated (not buffered until completion)
- [ ] Progress indicators: current node name, step N/14, estimated time remaining
- [ ] Heartbeat events every 15s to prevent connection timeout
- [ ] Client reconnection support via `Last-Event-ID` header
- [ ] Graceful error streaming: pipeline errors sent as structured SSE events, not connection drops
- [ ] Generation cancellation: client sends abort, server cancels in-flight LLM calls
- [ ] <500ms to first SSE event after request
- [ ] Rate limiting: max 3 concurrent generation streams per user
- [ ] 8-12 API tests: stream format validation, reconnection, cancellation, error events, heartbeat, auth guard
- [ ] Named exports only, TypeScript strict

## Reference Screens
No UI screens in this story. SSE backend integration only (consumed by workbench UI in STORY-F-43).

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| N/A | N/A | N/A |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/streaming.types.ts` |
| Controller | apps/server | `src/controllers/generation/generation.controller.ts` |
| Route | apps/server | `src/routes/generation/generation.routes.ts` |
| Service | apps/server | `src/services/generation/streaming.service.ts` |
| Middleware | apps/server | `src/middleware/sse.middleware.ts` |
| Tests | apps/server | `src/controllers/generation/__tests__/generation.controller.test.ts`, `src/services/generation/__tests__/streaming.service.test.ts` |

## Database Schema
No new tables. Uses `generation_checkpoints` from STORY-F-33 for reconnection state.

## API Endpoints

### POST /api/v1/generation/stream
**Auth:** JWT required (faculty role)
**Request:**
```json
{
  "courseId": "uuid",
  "sloId": "uuid",
  "conceptIds": ["uuid"],
  "questionType": "single_best_answer",
  "difficulty": "medium",
  "templateId": "uuid (optional)"
}
```
**Response:** `text/event-stream`
**SSE Events:**
```
event: node-enter
data: {"node":"vignette-gen","step":3,"totalSteps":14,"timestamp":"..."}

event: token-stream
data: {"node":"vignette-gen","delta":"The patient","progress":0.21}

event: node-complete
data: {"node":"vignette-gen","output":{...},"step":3,"duration_ms":2800}

event: state_delta
data: {"node":"vignette-gen","delta":{"text":"The patient..."}}

event: error
data: {"node":"stem-gen","error":"NodeTimeoutError","message":"...","recoverable":true}

event: heartbeat
data: {}

event: complete
data: {"itemId":"uuid","totalDuration_ms":38000}
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 429 | `RATE_LIMITED` | More than 3 concurrent streams |

### POST /api/v1/generation/cancel
**Auth:** JWT required
**Request:**
```json
{ "sessionId": "uuid" }
```

## Dependencies
- **Blocked by:** STORY-F-33 (pipeline scaffold must exist to stream from)
- **Blocks:** STORY-F-43, STORY-F-50
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: SSE content-type header, node-enter event format, token-stream event format, node-complete with duration, heartbeat interval, Last-Event-ID reconnection, cancellation via AbortController, error event structure, auth guard (401), rate limiting (429), complete event with item ID
- 0 E2E tests

## Implementation Notes
- SSE, not WebSocket — per architecture rules, SSE for streaming generation events, Socket.io for presence only.
- CopilotKit STATE_DELTA format: `event: state_delta\ndata: {"node":"vignette-gen","delta":{"text":"The patient..."}}\n\n`.
- Use `AbortController` on the server to propagate client cancellation to LLM provider calls.
- Express response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- LangGraph.js `.stream()` method returns an async iterable — pipe directly to SSE response.
- Auth: validate JWT before opening SSE connection; reject unauthorized with 401 (not a stream).
- Rate limiting: max 3 concurrent generation streams per user — track in-memory with `Map<userId, count>`.
