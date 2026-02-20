# STORY-F-26 Brief: Session Broadcast

## 0. Lane & Priority

```yaml
story_id: STORY-F-26
old_id: S-F-35-3
lane: faculty
lane_priority: 3
within_lane_order: 26
sprint: 19
size: M
depends_on:
  - STORY-F-19 (faculty) — Room management provides Socket.io room infrastructure
blocks: []
personas_served: [faculty]
epic: E-35 (Real-time Collaboration)
feature: F-16 (Notifications & Real-time)
```

## 1. Summary

Build a **SessionBroadcastService** that broadcasts generation pipeline events to all room members via Socket.io, enabling real-time observation of a colleague's generation session. Non-owner room members see a read-only "observer mode" with a live view of generation progress. The service handles event throttling (100ms for streaming events), late-join state snapshots, and owner/observer distinction.

Key constraints:
- Generation events broadcast to room via `socket.to(roomId).emit()` (excludes sender)
- Events: `generation:started`, `generation:node.complete`, `generation:streaming`, `generation:complete`, `generation:error`
- Streaming events throttled to 100ms intervals to prevent flooding
- Late join: observers joining mid-session receive current state snapshot
- Owner indicator: visual distinction between session owner and observers
- Custom error class: `BroadcastError`
- This is Socket.io only -- SSE is for the direct session owner's progress stream

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define broadcast types | `packages/types/src/collaboration/broadcast.types.ts` | 20m |
| 2 | Update barrel export | `packages/types/src/collaboration/index.ts` | 5m |
| 3 | Create `BroadcastError` error class | `apps/server/src/errors/broadcast.errors.ts` | 10m |
| 4 | Export new error | `apps/server/src/errors/index.ts` | 5m |
| 5 | Implement `SessionBroadcastService` | `apps/server/src/services/collaboration/session-broadcast.service.ts` | 90m |
| 6 | Implement `useSessionBroadcast` hook | `apps/web/src/hooks/useSessionBroadcast.ts` | 45m |
| 7 | Build `ObserverBanner` component | `apps/web/src/components/collaboration/ObserverBanner.tsx` | 20m |
| 8 | Write API tests (10 tests) | `apps/server/src/__tests__/collaboration/session-broadcast.test.ts` | 75m |

**Total estimate:** ~5 hours (Size M)

## 3. Data Model (inline, complete)

### `packages/types/src/collaboration/broadcast.types.ts`

```typescript
/**
 * Generation broadcast event types.
 */
export type BroadcastEventType =
  | "generation:started"
  | "generation:node.complete"
  | "generation:streaming"
  | "generation:complete"
  | "generation:error";

/**
 * Base broadcast event payload.
 */
export interface BaseBroadcastEvent {
  readonly event_type: BroadcastEventType;
  readonly session_id: string;
  readonly owner_id: string;
  readonly timestamp: string;
}

/**
 * Generation started event.
 */
export interface GenerationStartedEvent extends BaseBroadcastEvent {
  readonly event_type: "generation:started";
  readonly pipeline_name: string;
  readonly total_nodes: number;
}

/**
 * Node completion event.
 */
export interface NodeCompleteEvent extends BaseBroadcastEvent {
  readonly event_type: "generation:node.complete";
  readonly node_name: string;
  readonly node_index: number;
  readonly total_nodes: number;
  readonly progress_pct: number;
  readonly duration_ms: number;
}

/**
 * Streaming event (throttled to 100ms).
 */
export interface StreamingEvent extends BaseBroadcastEvent {
  readonly event_type: "generation:streaming";
  readonly node_name: string;
  readonly partial_output: string;
  readonly token_count: number;
}

/**
 * Generation complete event.
 */
export interface GenerationCompleteEvent extends BaseBroadcastEvent {
  readonly event_type: "generation:complete";
  readonly total_duration_ms: number;
  readonly items_generated: number;
}

/**
 * Generation error event.
 */
export interface GenerationErrorEvent extends BaseBroadcastEvent {
  readonly event_type: "generation:error";
  readonly error_code: string;
  readonly error_message: string;
  readonly node_name: string | null;
}

/**
 * Union of all broadcast events.
 */
export type BroadcastEvent =
  | GenerationStartedEvent
  | NodeCompleteEvent
  | StreamingEvent
  | GenerationCompleteEvent
  | GenerationErrorEvent;

/**
 * Session state snapshot for late-joining observers.
 */
export interface SessionSnapshot {
  readonly session_id: string;
  readonly owner_id: string;
  readonly owner_name: string;
  readonly pipeline_name: string;
  readonly current_node: string | null;
  readonly progress_pct: number;
  readonly partial_outputs: ReadonlyArray<string>;
  readonly started_at: string;
  readonly is_complete: boolean;
}

/**
 * Observer mode state.
 */
export interface ObserverState {
  readonly is_observing: boolean;
  readonly owner_name: string;
  readonly session_id: string;
}

/**
 * Throttle configuration for streaming events.
 */
export const STREAM_THROTTLE_MS = 100;
```

## 4. Database Schema (inline, complete)

No new tables required. Broadcast state is ephemeral and managed in-memory by the SessionBroadcastService. Session snapshots are held in a `Map<string, SessionSnapshot>` keyed by session_id, cleared when the session completes or the owner disconnects.

## 5. API Contract (complete request/response)

No REST endpoints. Broadcast is managed entirely via Socket.io events:

**Socket.io Events (server emits to room):**

| Event | Payload | Description |
|-------|---------|-------------|
| `generation:started` | `GenerationStartedEvent` | Pipeline execution began |
| `generation:node.complete` | `NodeCompleteEvent` | A pipeline node finished |
| `generation:streaming` | `StreamingEvent` | Partial output (throttled 100ms) |
| `generation:complete` | `GenerationCompleteEvent` | Pipeline finished successfully |
| `generation:error` | `GenerationErrorEvent` | Pipeline error occurred |
| `session:snapshot` | `SessionSnapshot` | Sent to late-joining observers |

**Socket.io Events (client emits):**

| Event | Payload | Description |
|-------|---------|-------------|
| `session:request-snapshot` | `{ session_id: string }` | Observer requests current state on join |

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
ObserverBanner (Molecule)
  ├── Eye icon (Lucide Eye) — observer mode indicator
  ├── Text: "Observing {owner_name}'s session"
  └── Progress indicator: node name + percentage
```

### ObserverBanner Component

- **Placement:** Top of the generation workbench, below the page header
- **Background:** `var(--cream)` (#f5f3ef) with left Navy Deep border (4px)
- **Icon:** Lucide `Eye` icon, 20px, Navy Deep color
- **Text:** "Observing Dr. Jones's session" with owner name from session snapshot
- **Progress:** Show current node name and progress percentage
- **Visibility:** Only shown when `is_observing === true`

### Observer Mode Behavior

When a user enters a room where a generation session is active:
1. `useSessionBroadcast` hook detects active session on room join
2. Requests snapshot via `session:request-snapshot`
3. Receives `session:snapshot` with current state
4. Sets `is_observing = true`, renders ObserverBanner
5. All workbench controls are disabled (read-only mode)
6. Live events update progress display in real-time

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--observer-bg` | `var(--cream)` (#f5f3ef) | Banner background |
| `--observer-border` | `var(--navy-deep)` (#002c76) | Left border accent |
| `--observer-text` | `var(--navy-deep)` (#002c76) | Banner text color |
| `--observer-icon` | `var(--navy-deep)` (#002c76) | Eye icon color |

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/collaboration/broadcast.types.ts` | Types | Create |
| 2 | `packages/types/src/collaboration/index.ts` | Types | Edit (add broadcast exports) |
| 3 | `apps/server/src/errors/broadcast.errors.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 5 | `apps/server/src/services/collaboration/session-broadcast.service.ts` | Service | Create |
| 6 | `apps/web/src/hooks/useSessionBroadcast.ts` | Hook | Create |
| 7 | `apps/web/src/components/collaboration/ObserverBanner.tsx` | View (Molecule) | Create |
| 8 | `apps/server/src/__tests__/collaboration/session-broadcast.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-19 | faculty | Required | Room management provides Socket.io room infrastructure |
| STORY-U-3 | universal | **DONE** | Auth context for owner/observer identification |

### Cross-Epic Dependencies
| Story | Epic | Why |
|-------|------|-----|
| S-F-18-1 | E-18 | Generation pipeline emits events that broadcast service relays |

### NPM Packages (already installed)
- `socket.io` -- Server-side Socket.io
- `socket.io-client` -- Client-side Socket.io (from STORY-F-23)
- `lodash` -- `throttle` function for streaming event throttling
- `lucide-react` -- Icons

### Existing Files Needed
- `apps/server/src/services/collaboration/room.service.ts` -- Room management (STORY-F-19)
- `apps/server/src/config/socket.config.ts` -- Socket.io server instance
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class

## 9. Test Fixtures (inline)

```typescript
import type {
  GenerationStartedEvent,
  NodeCompleteEvent,
  StreamingEvent,
  GenerationCompleteEvent,
  GenerationErrorEvent,
  SessionSnapshot,
} from "@journey-os/types";

/** Mock room ID */
export const MOCK_ROOM_ID = "room-session-uuid-001";

/** Mock session owner */
export const MOCK_OWNER_ID = "user-uuid-001";
export const MOCK_OWNER_NAME = "Dr. Jones";

/** Mock observer */
export const MOCK_OBSERVER_ID = "user-uuid-002";

/** Mock generation started event */
export const MOCK_STARTED_EVENT: GenerationStartedEvent = {
  event_type: "generation:started",
  session_id: "gen-session-uuid-001",
  owner_id: MOCK_OWNER_ID,
  timestamp: "2026-02-19T12:00:00Z",
  pipeline_name: "question-generation",
  total_nodes: 5,
};

/** Mock node complete event */
export const MOCK_NODE_COMPLETE: NodeCompleteEvent = {
  event_type: "generation:node.complete",
  session_id: "gen-session-uuid-001",
  owner_id: MOCK_OWNER_ID,
  timestamp: "2026-02-19T12:00:05Z",
  node_name: "concept-extraction",
  node_index: 1,
  total_nodes: 5,
  progress_pct: 20,
  duration_ms: 5000,
};

/** Mock streaming event */
export const MOCK_STREAMING_EVENT: StreamingEvent = {
  event_type: "generation:streaming",
  session_id: "gen-session-uuid-001",
  owner_id: MOCK_OWNER_ID,
  timestamp: "2026-02-19T12:00:06Z",
  node_name: "question-draft",
  partial_output: "A 45-year-old patient presents with...",
  token_count: 42,
};

/** Mock generation complete event */
export const MOCK_COMPLETE_EVENT: GenerationCompleteEvent = {
  event_type: "generation:complete",
  session_id: "gen-session-uuid-001",
  owner_id: MOCK_OWNER_ID,
  timestamp: "2026-02-19T12:00:30Z",
  total_duration_ms: 30000,
  items_generated: 10,
};

/** Mock error event */
export const MOCK_ERROR_EVENT: GenerationErrorEvent = {
  event_type: "generation:error",
  session_id: "gen-session-uuid-001",
  owner_id: MOCK_OWNER_ID,
  timestamp: "2026-02-19T12:00:15Z",
  error_code: "PIPELINE_TIMEOUT",
  error_message: "Question generation timed out after 60s",
  node_name: "question-draft",
};

/** Mock session snapshot for late join */
export const MOCK_SNAPSHOT: SessionSnapshot = {
  session_id: "gen-session-uuid-001",
  owner_id: MOCK_OWNER_ID,
  owner_name: MOCK_OWNER_NAME,
  pipeline_name: "question-generation",
  current_node: "question-draft",
  progress_pct: 40,
  partial_outputs: ["Concept extraction complete", "Drafting question..."],
  started_at: "2026-02-19T12:00:00Z",
  is_complete: false,
};
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/collaboration/session-broadcast.test.ts` (10 tests)

```
describe("SessionBroadcastService")
  describe("broadcast")
    it broadcasts generation:started event to all room members except owner
    it broadcasts generation:node.complete with correct progress percentage
    it broadcasts generation:complete event and clears session state
    it broadcasts generation:error event to room

  describe("throttling")
    it throttles streaming events to 100ms intervals
    it does not throttle non-streaming events

  describe("late join")
    it sends session snapshot to observer on room join
    it returns null snapshot when no active session in room

  describe("observer identification")
    it identifies owner vs observer based on session owner_id
    it prevents observer from emitting generation events

  describe("error handling")
    it throws BroadcastError when Socket.io room emit fails
```

**Total: 10 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Session broadcast requires multi-user simulation (owner + observer). E2E coverage will be part of the real-time collaboration journey test spanning F-19, F-25, F-26.

## 12. Acceptance Criteria

1. Generation pipeline events broadcast to all room members via Socket.io
2. Events include: `generation:started`, `generation:node.complete`, `generation:streaming`, `generation:complete`, `generation:error`
3. Observer mode: non-owner room members see read-only live view with ObserverBanner
4. Event payloads include node name, progress percentage, partial output, timestamps
5. Owner indicator: visual distinction between session owner and observers
6. Streaming events throttled to 100ms intervals to prevent flooding
7. Late join: observers joining mid-session receive current state snapshot
8. Custom error class `BroadcastError` used for all broadcast failures
9. Socket.io broadcast uses `socket.to(roomId).emit()` to exclude sender
10. All 10 API tests pass
11. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Broadcast to room members | S-F-35-3: "Generation pipeline events broadcast to session room members" |
| Event types | S-F-35-3: "generation:started, generation:node.complete, generation:streaming, generation:complete, generation:error" |
| Observer mode | S-F-35-3: "non-owner room members see read-only live view" |
| Throttling 100ms | S-F-35-3: "streaming events throttled to 100ms intervals" |
| Late join snapshot | S-F-35-3: "observers joining mid-session receive current state snapshot" |
| BroadcastError | S-F-35-3: "Custom error class: BroadcastError" |
| Socket.io only | S-F-35-3: "Socket.io only -- SSE is for direct session owner's progress stream" |
| socket.to(roomId).emit() | S-F-35-3: "Socket.io broadcast uses socket.to(roomId).emit()" |
| Socket.io for presence | ARCHITECTURE_v10: "Socket.io for presence only" (extended to broadcast) |

## 14. Environment Prerequisites

- **Socket.io:** Server running with room management (STORY-F-19)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000 with dashboard layout
- **No database migrations** needed (broadcast state is ephemeral)
- **No Neo4j needed** for this story
- **lodash** must be installed for `throttle` function

## 15. Implementation Notes

- **SessionBroadcastService:**

```typescript
import { Server as SocketServer } from "socket.io";
import throttle from "lodash/throttle";
import type { BroadcastEvent, SessionSnapshot } from "@journey-os/types";
import { STREAM_THROTTLE_MS } from "@journey-os/types";

export class SessionBroadcastService {
  readonly #io: SocketServer;
  readonly #sessions: Map<string, SessionSnapshot>;
  readonly #throttledEmitters: Map<string, (event: BroadcastEvent) => void>;

  constructor(io: SocketServer) {
    this.#io = io;
    this.#sessions = new Map();
    this.#throttledEmitters = new Map();
  }

  broadcast(roomId: string, event: BroadcastEvent): void {
    if (event.event_type === "generation:streaming") {
      this.#getThrottledEmitter(roomId)(event);
    } else {
      this.#io.to(roomId).emit(event.event_type, event);
    }

    this.#updateSnapshot(event);

    if (event.event_type === "generation:complete" || event.event_type === "generation:error") {
      this.#clearSession(event.session_id);
    }
  }

  getSnapshot(sessionId: string): SessionSnapshot | null {
    return this.#sessions.get(sessionId) ?? null;
  }

  #getThrottledEmitter(roomId: string): (event: BroadcastEvent) => void {
    if (!this.#throttledEmitters.has(roomId)) {
      this.#throttledEmitters.set(
        roomId,
        throttle((event: BroadcastEvent) => {
          this.#io.to(roomId).emit(event.event_type, event);
        }, STREAM_THROTTLE_MS),
      );
    }
    return this.#throttledEmitters.get(roomId)!;
  }

  #updateSnapshot(event: BroadcastEvent): void {
    // Update in-memory session snapshot based on event type
  }

  #clearSession(sessionId: string): void {
    this.#sessions.delete(sessionId);
  }
}
```

- **useSessionBroadcast hook:**

```typescript
import { useState, useEffect, useCallback } from "react";
import type { BroadcastEvent, SessionSnapshot, ObserverState } from "@journey-os/types";

export function useSessionBroadcast(roomId: string, userId: string) {
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [observerState, setObserverState] = useState<ObserverState>({
    is_observing: false,
    owner_name: "",
    session_id: "",
  });

  // Listen for broadcast events and update snapshot
  // Request snapshot on room join if session is active
  // Set observer state based on owner_id vs userId

  return { snapshot, observerState, events: [] };
}
```

- **ObserverBanner:** Simple banner with Lucide `Eye` icon, owner name, and current progress. Hidden when `observerState.is_observing === false`.

- **Integration with generation pipeline:** The generation pipeline (from E-18) calls `broadcastService.broadcast(roomId, event)` at each step transition. This wiring happens when both the pipeline and broadcast service exist.

- **OOP:** SessionBroadcastService uses JS `#private` fields, constructor DI for SocketServer.

- **Named exports only** for all components, hooks, and service.

- **Error class:**

```
JourneyOSError
  └── BroadcastError (code: "BROADCAST_ERROR")
```
