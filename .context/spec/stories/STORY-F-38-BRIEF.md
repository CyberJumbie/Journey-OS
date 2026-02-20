# STORY-F-38 Brief: SSE Streaming Integration

## 0. Lane & Priority

```yaml
story_id: STORY-F-38
old_id: S-F-18-4
lane: faculty
lane_priority: 3
within_lane_order: 38
sprint: 6
size: M
depends_on:
  - STORY-F-33 (faculty) — Pipeline Scaffold (generation pipeline must exist to stream from)
blocks:
  - STORY-F-43 — SplitPane Layout
personas_served: [faculty]
epic: E-18 (LangGraph.js Generation Pipeline)
feature: F-09 (AI Generation)
user_flow: UF-18 (Generation Pipeline)
```

## 1. Summary

Build an **SSE streaming endpoint** at `POST /api/v1/generation/stream` that delivers real-time pipeline progress to the faculty workbench using the **CopilotKit STATE_DELTA protocol**. Each LangGraph.js pipeline node emits streaming tokens as they are generated (not buffered). The endpoint supports progress indicators (step N/14, estimated time), heartbeat keep-alive (15s), client reconnection via `Last-Event-ID`, graceful error streaming, and generation cancellation via `AbortController`.

Key constraints:
- **SSE only** — per architecture rules, SSE for streaming generation events, Socket.io for presence only
- CopilotKit STATE_DELTA format: `event: state_delta\ndata: {"node":"vignette-gen","delta":{"text":"The patient..."}}\n\n`
- Auth: validate JWT before opening SSE connection, reject unauthorized with 401 (not a stream)
- Rate limiting: max 3 concurrent generation streams per user
- <500ms to first SSE event after request

## 2. Task Breakdown

1. **Types** — Create `SSEEvent`, `StreamingState`, `StateDelta`, `StreamProgress`, `StreamConfig` in `packages/types/src/generation/streaming.types.ts`
2. **Error classes** — `StreamConnectionError`, `StreamCancellationError`, `ConcurrentStreamLimitError` in `apps/server/src/errors/streaming.errors.ts`
3. **SSE Middleware** — `sseMiddleware` that sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` headers
4. **Streaming Service** — `StreamingService` with `createStream()`, `sendEvent()`, `sendHeartbeat()`, `handleReconnection()`, `cancelStream()` methods
5. **Controller** — `GenerationStreamController` with `handleStream()` that validates auth, opens SSE connection, pipes LangGraph.js `.stream()` async iterable to SSE response
6. **Routes** — Protected route `POST /api/v1/generation/stream` with auth + faculty RBAC
7. **Wire up** — Register route in `apps/server/src/index.ts`
8. **API tests** — 10 tests covering stream format, reconnection, cancellation, error events, heartbeat, auth guard

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/streaming.types.ts

/** SSE event types following CopilotKit STATE_DELTA protocol */
export type SSEEventType =
  | "state_delta"
  | "node_enter"
  | "node_complete"
  | "token_stream"
  | "progress"
  | "heartbeat"
  | "error"
  | "done";

/** A single SSE event sent to the client */
export interface SSEEvent {
  readonly id: string;
  readonly event: SSEEventType;
  readonly data: string; // JSON stringified payload
  readonly retry?: number; // Reconnection interval in ms
}

/** CopilotKit STATE_DELTA payload */
export interface StateDelta {
  readonly node: string;
  readonly delta: Record<string, unknown>;
}

/** Progress indicator payload */
export interface StreamProgress {
  readonly currentNode: string;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly estimatedTimeRemainingMs: number;
}

/** Stream configuration from the client request */
export interface StreamConfig {
  readonly generationId: string;
  readonly courseId: string;
  readonly sloId: string;
  readonly parameters: Record<string, unknown>;
  readonly lastEventId?: string; // For reconnection
}

/** Active stream tracking for concurrency control */
export interface ActiveStream {
  readonly userId: string;
  readonly generationId: string;
  readonly startedAt: string;
  readonly abortController: AbortController;
}

/** Stream status for internal tracking */
export type StreamStatus = "active" | "completed" | "cancelled" | "errored";
```

## 4. Database Schema (inline, complete)

No new tables needed. Stream state is ephemeral (in-memory). Generation results are persisted by the pipeline itself (E-18 scaffold).

```sql
-- No migration required for this story.
-- Active streams tracked in-memory via Map<string, ActiveStream[]>.
-- Generation results persisted by existing pipeline nodes.
```

## 5. API Contract (complete request/response)

### POST /api/v1/generation/stream (Auth: Faculty, Course Director)

**Request Body:**
```json
{
  "generationId": "gen-uuid-1",
  "courseId": "course-uuid-1",
  "sloId": "slo-uuid-1",
  "parameters": {
    "questionType": "single-best-answer",
    "bloomLevel": "application",
    "difficulty": "medium"
  }
}
```

**SSE Response (200, Content-Type: text/event-stream):**
```
id: evt-1
event: node_enter
data: {"node":"context-assembly","step":1,"totalSteps":14}

id: evt-2
event: state_delta
data: {"node":"vignette-gen","delta":{"text":"A 45-year-old woman presents..."}}

id: evt-3
event: token_stream
data: {"node":"vignette-gen","token":"with"}

id: evt-4
event: progress
data: {"currentNode":"vignette-gen","currentStep":3,"totalSteps":14,"estimatedTimeRemainingMs":22000}

id: evt-5
event: node_complete
data: {"node":"vignette-gen","durationMs":3200}

id: evt-heartbeat
event: heartbeat
data: {"timestamp":"2026-02-19T12:00:15Z"}

id: evt-done
event: done
data: {"generationId":"gen-uuid-1","totalDurationMs":45000}
```

**Error SSE Event (streamed, not connection drop):**
```
id: evt-err-1
event: error
data: {"code":"GENERATION_ERROR","message":"LLM provider timeout","node":"vignette-gen","recoverable":false}
```

**Error Responses (non-stream):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty role |
| 400 | `VALIDATION_ERROR` | Missing required fields |
| 429 | `CONCURRENT_STREAM_LIMIT` | User already has 3 active streams |

### POST /api/v1/generation/stream/cancel (Auth: Faculty)

**Request Body:**
```json
{
  "generationId": "gen-uuid-1"
}
```

**Success Response (200):**
```json
{
  "data": { "generationId": "gen-uuid-1", "status": "cancelled" },
  "error": null
}
```

## 6. Frontend Spec

Frontend SSE client integration is handled by STORY-F-43 (SplitPane Layout). This story provides only the server-side streaming infrastructure.

**SSE Client Notes (for downstream stories):**
- Use `EventSource` or `fetch` with `ReadableStream` for POST-based SSE
- Reconnection: pass `Last-Event-ID` header on reconnect
- Cancellation: call cancel endpoint, then close client connection
- CopilotKit integration: map `state_delta` events to CopilotKit's `useCoagentStateRender`

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/streaming.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Edit (add streaming export) |
| 3 | `apps/server/src/errors/streaming.errors.ts` | Errors | Create |
| 4 | `apps/server/src/middleware/sse.middleware.ts` | Middleware | Create |
| 5 | `apps/server/src/services/generation/streaming.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/generation/generation-stream.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add stream routes) |
| 8 | `apps/server/src/__tests__/generation/streaming.service.test.ts` | Tests | Create |
| 9 | `apps/server/src/__tests__/generation/generation-stream.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-33 | faculty | NOT STARTED | Pipeline scaffold must exist — provides LangGraph.js graph and `.stream()` async iterable |
| STORY-U-3 | universal | **DONE** | Auth middleware for JWT validation |
| STORY-U-6 | universal | **DONE** | RBAC middleware for faculty role enforcement |

### NPM Packages (already installed or to install)
- `express` — Server framework
- `vitest` — Testing
- No additional packages needed — SSE is native HTTP, no library required

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.FACULTY)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `apps/server/src/services/generation/` — Pipeline scaffold from F-33 (LangGraph.js graph with `.stream()`)

## 9. Test Fixtures (inline)

```typescript
// Mock Faculty user
export const FACULTY_USER = {
  sub: "faculty-uuid-1",
  email: "dr.jones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock student user (should be denied)
export const STUDENT_USER = {
  ...FACULTY_USER,
  sub: "student-uuid-1",
  email: "student@msm.edu",
  role: "student" as const,
  is_course_director: false,
};

// Mock stream config
export const MOCK_STREAM_CONFIG = {
  generationId: "gen-uuid-1",
  courseId: "course-uuid-1",
  sloId: "slo-uuid-1",
  parameters: {
    questionType: "single-best-answer",
    bloomLevel: "application",
    difficulty: "medium",
  },
};

// Mock SSE events for testing
export const MOCK_SSE_EVENTS = [
  { id: "evt-1", event: "node_enter", data: '{"node":"context-assembly","step":1,"totalSteps":14}' },
  { id: "evt-2", event: "state_delta", data: '{"node":"vignette-gen","delta":{"text":"A 45-year-old"}}' },
  { id: "evt-3", event: "node_complete", data: '{"node":"vignette-gen","durationMs":3200}' },
  { id: "evt-done", event: "done", data: '{"generationId":"gen-uuid-1","totalDurationMs":45000}' },
];

// Mock async iterable for LangGraph.js stream
export async function* mockPipelineStream() {
  yield { node: "context-assembly", type: "enter" };
  yield { node: "vignette-gen", type: "token", token: "A" };
  yield { node: "vignette-gen", type: "token", token: " 45-year-old" };
  yield { node: "vignette-gen", type: "complete", durationMs: 3200 };
  yield { node: "done", type: "complete", generationId: "gen-uuid-1" };
}
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/generation/streaming.service.test.ts`

```
describe("StreamingService")
  describe("createStream")
    ✓ creates an active stream and returns stream controller
    ✓ throws ConcurrentStreamLimitError when user has 3 active streams
    ✓ tracks active stream in internal registry

  describe("sendEvent")
    ✓ formats SSE event with id, event type, and JSON data
    ✓ includes retry field for reconnectable events

  describe("sendHeartbeat")
    ✓ emits heartbeat event with current timestamp

  describe("handleReconnection")
    ✓ resumes from Last-Event-ID, skipping already-sent events

  describe("cancelStream")
    ✓ calls AbortController.abort() on the active stream
    ✓ removes stream from active registry
    ✓ marks stream status as cancelled
```

**File:** `apps/server/src/__tests__/generation/generation-stream.controller.test.ts`

```
describe("GenerationStreamController")
  describe("handleStream")
    ✓ sets correct SSE headers (Content-Type, Cache-Control, Connection)
    ✓ validates request body (returns 400 for missing fields)
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-faculty roles (403 FORBIDDEN)
    ✓ returns 429 when concurrent stream limit reached
    ✓ pipes pipeline stream events to SSE response
    ✓ sends done event when pipeline completes
    ✓ sends error event (not connection drop) on pipeline failure
    ✓ first SSE event emitted within response (no buffering)
    ✓ propagates client abort to pipeline AbortController
```

**Total: ~20 tests** (10 service + 10 controller)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full Generation Workbench (F-43 SplitPane + streaming) is complete as a critical journey.

## 12. Acceptance Criteria

1. `POST /api/v1/generation/stream` returns `Content-Type: text/event-stream` response
2. CopilotKit STATE_DELTA protocol implemented: events for node-enter, node-complete, token-stream, error
3. Each pipeline node emits streaming tokens as generated (not buffered)
4. Progress indicators show current node name, step N/14, estimated time remaining
5. Heartbeat events every 15s prevent connection timeout
6. Client reconnection supported via `Last-Event-ID` header
7. Pipeline errors sent as structured SSE events, not connection drops
8. Generation cancellation: client sends abort, server cancels in-flight LLM calls
9. <500ms to first SSE event after request
10. Max 3 concurrent generation streams per user (429 if exceeded)
11. All ~20 API tests pass
12. Named exports only, TypeScript strict

## 13. Source References

| Claim | Source |
|-------|--------|
| SSE for streaming generation events | ARCHITECTURE_DECISIONS § Architecture Rules: "SSE for streaming generation pipeline events" |
| CopilotKit STATE_DELTA protocol | S-F-18-4 § Notes: "CopilotKit STATE_DELTA format" |
| LangGraph.js `.stream()` method | S-F-18-4 § Notes: "LangGraph.js `.stream()` method returns an async iterable" |
| AbortController for cancellation | S-F-18-4 § Notes: "Use AbortController on the server" |
| Max 3 concurrent streams | S-F-18-4 § Notes: "Rate limiting: max 3 concurrent generation streams per user" |
| Auth before SSE connection | S-F-18-4 § Notes: "validate JWT before opening SSE connection" |
| Express SSE headers | S-F-18-4 § Notes: "res.setHeader patterns" |

## 14. Environment Prerequisites

- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Pipeline scaffold (F-33):** LangGraph.js generation graph must be implemented with `.stream()` support
- **No Supabase needed** for this story (stream state is ephemeral)
- **No Neo4j needed** for this story

## 15. Figma / Make Prototype

No UI components in this story — server-side streaming infrastructure only. Frontend SSE client integration is deferred to STORY-F-43 (SplitPane Layout).
