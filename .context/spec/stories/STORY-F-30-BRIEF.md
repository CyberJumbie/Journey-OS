# STORY-F-30 Brief: Processing Progress UI

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-30
old_id: S-F-11-3
epic: E-11 (Content Processing Pipeline)
feature: F-05 (Content Upload & Processing)
sprint: 4
lane: faculty
lane_priority: 3
within_lane_order: 30
size: M
depends_on:
  - STORY-F-27 (faculty) — Content Processing Pipeline (pipeline must emit events)
blocks: []
personas_served: [faculty]
```

---

## Section 1: Summary

**What to build:** A real-time processing progress UI that streams Server-Sent Events (SSE) from the content processing pipeline, showing faculty members exactly what stage their uploaded content is in and overall completion percentage.

**Parent epic:** E-11 (Content Processing Pipeline) under F-05 (Content Upload & Processing). This is the observability layer for the pipeline -- faculty need visual feedback while their documents are parsed, cleaned, chunked, and embedded.

**User story:** As a faculty member, I need real-time processing status updates so that I can see how my uploaded content progresses through the pipeline.

**User flows affected:** UF-11 (Content Upload & Processing).

**Personas:** Faculty (observes pipeline progress for their uploaded content).

**Why SSE and not WebSockets:** Architecture rules dictate SSE for streaming pipeline events. Socket.io is reserved for presence only. SSE is simpler, auto-reconnects natively, and is sufficient for unidirectional server-to-client event streams.

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Progress event types and DTOs | `packages/types/src/content/progress.types.ts` | 45m |
| 2 | Progress types barrel export | `packages/types/src/content/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | SSE utility service | `apps/server/src/services/sse.service.ts` | 1.5h |
| 5 | ProgressController with SSE endpoint | `apps/server/src/controllers/progress.controller.ts` | 2h |
| 6 | Progress routes | `apps/server/src/routes/progress.routes.ts` | 30m |
| 7 | Register routes in index.ts | `apps/server/src/index.ts` | 15m |
| 8 | PipelineStageIndicator molecule | `apps/web/src/components/molecules/PipelineStageIndicator.tsx` | 1.5h |
| 9 | ProcessingProgress organism | `apps/web/src/components/organisms/ProcessingProgress/ProcessingProgress.tsx` | 2h |
| 10 | useProcessingProgress hook | `apps/web/src/hooks/useProcessingProgress.ts` | 1.5h |
| 11 | API tests: ProgressController | `apps/server/src/tests/progress.controller.test.ts` | 2h |

**Total estimate:** ~12h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/content/progress.types.ts

/** Pipeline processing stages in order */
export type PipelineStage = "parse" | "clean" | "chunk" | "embed";

/** Stage status */
export type StageStatus = "pending" | "in_progress" | "completed" | "error";

/** SSE event types emitted by the progress endpoint */
export type ProgressEventType =
  | "stage_started"
  | "stage_completed"
  | "stage_error"
  | "pipeline_completed"
  | "heartbeat";

/** Individual stage progress data */
export interface StageProgress {
  readonly stage: PipelineStage;
  readonly status: StageStatus;
  readonly percentage: number;
  readonly started_at: string | null;
  readonly completed_at: string | null;
  readonly error_message: string | null;
}

/** SSE event payload */
export interface ProgressEvent {
  readonly event_type: ProgressEventType;
  readonly content_id: string;
  readonly stage: PipelineStage;
  readonly overall_percentage: number;
  readonly timestamp: string;
  readonly error_details: string | null;
}

/** Stage percentage mapping */
export interface StagePercentageMap {
  readonly parse: 25;
  readonly clean: 50;
  readonly chunk: 75;
  readonly embed: 100;
}

/** Full pipeline progress state (for frontend) */
export interface PipelineProgressState {
  readonly content_id: string;
  readonly stages: readonly StageProgress[];
  readonly overall_percentage: number;
  readonly is_complete: boolean;
  readonly has_error: boolean;
  readonly current_stage: PipelineStage | null;
}
```

---

## Section 4: Database Schema (inline, complete)

No new database tables required. Progress events are ephemeral and flow through Redis pub/sub channels. The pipeline writes progress updates to a Redis channel keyed by content ID; the SSE controller subscribes and forwards to the client.

**Redis Channel Pattern:**
```
content:progress:{content_id}
```

**Redis Message Format (JSON string):**
```json
{
  "event_type": "stage_completed",
  "content_id": "uuid-1",
  "stage": "parse",
  "overall_percentage": 25,
  "timestamp": "2026-02-19T12:00:00Z",
  "error_details": null
}
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/content/:id/progress (Auth: faculty)

**Headers:**
```
Accept: text/event-stream
Authorization: Bearer <jwt>
```

**SSE Stream Response (200, Content-Type: text/event-stream):**
```
: heartbeat

event: stage_started
data: {"event_type":"stage_started","content_id":"uuid-1","stage":"parse","overall_percentage":0,"timestamp":"2026-02-19T12:00:00Z","error_details":null}

event: stage_completed
data: {"event_type":"stage_completed","content_id":"uuid-1","stage":"parse","overall_percentage":25,"timestamp":"2026-02-19T12:00:01Z","error_details":null}

event: stage_started
data: {"event_type":"stage_started","content_id":"uuid-1","stage":"clean","overall_percentage":25,"timestamp":"2026-02-19T12:00:02Z","error_details":null}

event: stage_completed
data: {"event_type":"stage_completed","content_id":"uuid-1","stage":"clean","overall_percentage":50,"timestamp":"2026-02-19T12:00:03Z","error_details":null}

event: pipeline_completed
data: {"event_type":"pipeline_completed","content_id":"uuid-1","stage":"embed","overall_percentage":100,"timestamp":"2026-02-19T12:00:10Z","error_details":null}
```

**Error SSE Event:**
```
event: stage_error
data: {"event_type":"stage_error","content_id":"uuid-1","stage":"chunk","overall_percentage":50,"timestamp":"2026-02-19T12:00:05Z","error_details":"Chunk size exceeded maximum token limit"}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | No valid JWT |
| 403 | `FORBIDDEN` | User does not own this content |
| 404 | `CONTENT_NOT_FOUND` | Content ID does not exist |
| 500 | `INTERNAL_ERROR` | Redis connection or unexpected error |

---

## Section 6: Frontend Spec

### PipelineStageIndicator (Molecule)

**Location:** `apps/web/src/components/molecules/PipelineStageIndicator.tsx`

**Props:**
```typescript
interface PipelineStageIndicatorProps {
  readonly stage: PipelineStage;
  readonly label: string;
  readonly status: StageStatus;
  readonly percentage: number;
}
```

**Behavior:**
- Displays a single stage with icon, label, and status badge
- Colors from design tokens: Navy Deep (#002c76) for in-progress, Green (#69a338) for completed, red (error token) for error, muted for pending
- Lucide icons: `Loader2` (spinning, in-progress), `CheckCircle2` (completed), `XCircle` (error), `Circle` (pending)
- Transition animation between states using CSS transitions

### ProcessingProgress (Organism)

**Location:** `apps/web/src/components/organisms/ProcessingProgress/ProcessingProgress.tsx`

**Props:**
```typescript
interface ProcessingProgressProps {
  readonly contentId: string;
}
```

**Behavior:**
- Uses `useProcessingProgress` hook to manage SSE connection
- Renders overall progress bar (shadcn/ui `Progress` component)
- Renders 4 `PipelineStageIndicator` molecules (parse, clean, chunk, embed)
- Error state: shows error message with a retry button (reconnects SSE)
- Completed state: shows success message with checkmark

### useProcessingProgress Hook

**Location:** `apps/web/src/hooks/useProcessingProgress.ts`

**Returns:** `PipelineProgressState` plus `reconnect()` function

**Behavior:**
- Creates `EventSource` to `/api/v1/content/{contentId}/progress`
- Parses SSE events into `PipelineProgressState`
- Auto-reconnect with exponential backoff: 1s, 2s, 4s, max 30s
- Closes connection on unmount or `pipeline_completed`
- Heartbeat timeout: if no event in 60s, trigger reconnect

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/content/progress.types.ts` | Types | Create |
| 2 | `packages/types/src/content/index.ts` | Types | Create or Edit |
| 3 | `packages/types/src/index.ts` | Types | Edit (add content export) |
| 4 | `apps/server/src/services/sse.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/progress.controller.ts` | Controller | Create |
| 6 | `apps/server/src/routes/progress.routes.ts` | Routes | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add progress routes) |
| 8 | `apps/web/src/hooks/useProcessingProgress.ts` | Hook | Create |
| 9 | `apps/web/src/components/molecules/PipelineStageIndicator.tsx` | View | Create |
| 10 | `apps/web/src/components/organisms/ProcessingProgress/ProcessingProgress.tsx` | View | Create |
| 11 | `apps/server/src/tests/progress.controller.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-27 | faculty | **NOT YET** | Content processing pipeline must exist and emit progress events via Redis pub/sub |

### NPM Packages (new)
- `ioredis` — Redis client for pub/sub subscription in SSE service (if not already installed)

### NPM Packages (already installed)
- `express` — Server framework
- `zod` — Request validation
- `vitest` — Testing
- `@supabase/supabase-js` — Auth context for content ownership check
- `lucide-react` — Icons for stage indicators

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` — `RbacMiddleware` with `AuthRole` enum
- `apps/server/src/config/redis.config.ts` — Redis client configuration (from F-27)
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`

### Does NOT Depend On
- Neo4j (no graph operations)
- Supabase migrations (no new tables)
- DualWriteService (read-only endpoint)

---

## Section 9: Test Fixtures (inline)

```typescript
// Valid progress events
export const STAGE_STARTED_EVENT: ProgressEvent = {
  event_type: "stage_started",
  content_id: "content-uuid-001",
  stage: "parse",
  overall_percentage: 0,
  timestamp: "2026-02-19T12:00:00Z",
  error_details: null,
};

export const STAGE_COMPLETED_EVENT: ProgressEvent = {
  event_type: "stage_completed",
  content_id: "content-uuid-001",
  stage: "parse",
  overall_percentage: 25,
  timestamp: "2026-02-19T12:00:01Z",
  error_details: null,
};

export const STAGE_ERROR_EVENT: ProgressEvent = {
  event_type: "stage_error",
  content_id: "content-uuid-001",
  stage: "chunk",
  overall_percentage: 50,
  timestamp: "2026-02-19T12:00:05Z",
  error_details: "Chunk size exceeded maximum token limit",
};

export const PIPELINE_COMPLETED_EVENT: ProgressEvent = {
  event_type: "pipeline_completed",
  content_id: "content-uuid-001",
  stage: "embed",
  overall_percentage: 100,
  timestamp: "2026-02-19T12:00:10Z",
  error_details: null,
};

export const HEARTBEAT_EVENT: ProgressEvent = {
  event_type: "heartbeat",
  content_id: "content-uuid-001",
  stage: "parse",
  overall_percentage: 0,
  timestamp: "2026-02-19T12:00:30Z",
  error_details: null,
};

// Auth fixtures
export const CONTENT_OWNER_USER = {
  id: "user-uuid-faculty-001",
  email: "faculty@med.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-001",
};

export const NON_OWNER_USER = {
  id: "user-uuid-faculty-002",
  email: "other@med.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-001",
};

// Content fixtures
export const VALID_CONTENT_ID = "content-uuid-001";
export const NONEXISTENT_CONTENT_ID = "content-uuid-999";
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/tests/progress.controller.test.ts`

```
describe("ProgressController")
  describe("GET /api/v1/content/:id/progress")
    ✓ sets Content-Type to text/event-stream
    ✓ sets Cache-Control to no-cache
    ✓ sets Connection to keep-alive
    ✓ subscribes to Redis channel for content ID
    ✓ forwards stage_started event as SSE
    ✓ forwards stage_completed event as SSE
    ✓ forwards stage_error event with error details
    ✓ forwards pipeline_completed event and closes stream
    ✓ sends heartbeat every 30 seconds
    ✓ returns 401 without valid JWT
    ✓ returns 403 if user does not own the content
    ✓ returns 404 for nonexistent content ID
    ✓ cleans up Redis subscription on client disconnect
    ✓ narrows req.params.id with typeof check
```

**File:** `apps/server/src/services/__tests__/sse.service.test.ts`

```
describe("SSEService")
  ✓ formats event as valid SSE text (event: + data:)
  ✓ serializes ProgressEvent to JSON in data field
  ✓ sends heartbeat comment (: heartbeat)
  ✓ flushes response after each write
```

**Total: ~18 tests** (14 controller + 4 SSE service)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable for this story in isolation. E2E tests for the full content upload + progress flow will be covered when the content upload journey (UF-11) is complete and all pipeline stages (F-27 through F-30) are working together.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | GET /api/v1/content/:id/progress returns text/event-stream | API test |
| 2 | SSE events include stage_started, stage_completed, stage_error, pipeline_completed | API test |
| 3 | Each event contains stage name, progress percentage, timestamp, error details | API test |
| 4 | Progress UI shows current stage and overall progress bar | Manual / future E2E |
| 5 | Stage indicators show parse (25%), clean (50%), chunk (75%), embed (100%) | Manual / future E2E |
| 6 | Error state displays error message with retry button | Manual / future E2E |
| 7 | SSE auto-reconnects with exponential backoff (1s, 2s, 4s, max 30s) | Manual / hook unit test |
| 8 | Controller subscribes to Redis pub/sub for pipeline progress events | API test |
| 9 | Heartbeat sent every 30 seconds to keep connection alive | API test |
| 10 | Redis subscription cleaned up on client disconnect | API test |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| SSE for streaming pipeline events, Socket.io for presence only | CLAUDE.md SS Architecture Rules |
| Pipeline stages: parse, clean, chunk, embed | S-F-11-3 SS Acceptance Criteria |
| Redis pub/sub for progress events | S-F-11-3 SS Notes |
| Auto-reconnect with exponential backoff | S-F-11-3 SS Notes |
| Atomic Design: Organism > Molecule | CLAUDE.md SS Architecture Rules |
| Design tokens, no hardcoded colors | CLAUDE.md SS Architecture Rules |
| Heartbeat every 30 seconds | S-F-11-3 SS Notes |

---

## Section 14: Environment Prerequisites

- **Redis:** Running instance for pub/sub (content processing pipeline writes progress events)
- **Express:** Server running on port 3001
- **Content pipeline (F-27):** Must be emitting progress events to Redis channels
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REDIS_URL`

---

## Section 15: Figma Make Prototype

Code directly using shadcn/ui components. The ProcessingProgress organism is a contained component with clear states (idle, in-progress per stage, error, completed). Use the shadcn/ui `Progress` component for the overall bar, and custom `PipelineStageIndicator` molecules with Lucide icons for each stage. Colors: Navy Deep (#002c76) in-progress, Green (#69a338) completed, design token red for errors, Cream (#f5f3ef) background.
