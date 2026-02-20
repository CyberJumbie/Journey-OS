# STORY-F-19 Brief: Socket.io Room Management

> **This brief is fully self-contained.** Implement with ZERO external lookups.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-19
old_id: S-F-35-1
epic: E-35 (Real-time Collaboration)
feature: F-16 (Real-time Notifications)
sprint: 19
lane: faculty
lane_priority: 3
within_lane_order: 19
size: M
depends_on:
  - STORY-F-10 (faculty) — Socket.io Notification Service (socket infrastructure, SocketAuthMiddleware)
blocks:
  - S-F-35-2 (faculty) — Presence Indicators
  - S-F-35-3 (faculty) — Collaborative Editing
cross_epic:
  - STORY-F-10 (faculty) — Socket.io service shares the same server instance
personas_served: [faculty, faculty_course_director, institutional_admin]
```

---

## Section 1: Summary

Build a **Socket.io room management service** that allows users to join and leave context-specific rooms for real-time collaboration. When a faculty member navigates to a generation session, review page, or batch view, they automatically join a room scoped to that resource. Other users viewing the same resource see join/leave events and can query the current member list.

Rooms use Socket.io's native room mechanism (no custom data structures for the rooms themselves). An in-memory `Map<string, Set<RoomMember>>` tracks member metadata (userId, socketId, joinedAt) for querying. Rooms are auto-created on first join and garbage-collected after 5 minutes of being empty.

This story builds on the Socket.io infrastructure from STORY-F-10 (same server instance, same JWT auth handshake). It adds room-specific middleware, a `RoomManagerService` for join/leave/query operations, and a React hook `useRoom(roomId)` for automatic room lifecycle on the client.

Key constraints:
- Room naming convention: `session:{sessionId}`, `review:{questionId}`, `batch:{batchId}`
- Max room size: 20 (configurable), rejects join with `RoomFullError` if exceeded
- Room events: `room:joined`, `room:left` emitted to all room members
- Room cleanup: GC sweep every 60 seconds, removes rooms empty for 5+ minutes
- Custom error class: `RoomManagementError` (and subclasses)
- Auto-join on mount, auto-leave on unmount via React hook
- Reconnection: client re-joins room on Socket.io reconnect

---

## Section 2: Task Breakdown

Implementation order: Types -> Errors -> Service -> Middleware -> Hook -> Tests.

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define room types: `RoomMember`, `RoomInfo`, `RoomEvent`, `RoomConfig` | `packages/types/src/collaboration/room.types.ts` | 30m |
| 2 | Create barrel export for collaboration types | `packages/types/src/collaboration/index.ts` | 5m |
| 3 | Update root barrel export | `packages/types/src/index.ts` | 5m |
| 4 | Create room error classes | `apps/server/src/errors/room.error.ts` | 15m |
| 5 | Export new errors | `apps/server/src/errors/index.ts` | 5m |
| 6 | Implement `RoomManagerService` | `apps/server/src/services/collaboration/room-manager.service.ts` | 90m |
| 7 | Implement `SocketRoomMiddleware` | `apps/server/src/middleware/socket-room.middleware.ts` | 45m |
| 8 | Register room event handlers on Socket.io server | `apps/server/src/index.ts` | 15m |
| 9 | Build `useRoom` React hook | `apps/web/src/hooks/useRoom.ts` | 45m |
| 10 | Write RoomManagerService tests (12 tests) | `apps/server/src/__tests__/collaboration/room-manager.test.ts` | 75m |

**Total estimate:** ~5.5 hours (Size M)

---

## Section 3: Data Model (inline, complete)

### `packages/types/src/collaboration/room.types.ts`

```typescript
/**
 * Room type prefixes for different collaboration contexts.
 */
export type RoomType = "session" | "review" | "batch";

/**
 * Full room ID string. Format: "{type}:{resourceId}"
 * Examples: "session:abc-123", "review:q-456", "batch:b-789"
 */
export type RoomId = `${RoomType}:${string}`;

/**
 * A member currently in a room.
 */
export interface RoomMember {
  readonly userId: string;
  readonly socketId: string;
  readonly displayName: string;
  readonly joinedAt: string;
}

/**
 * Room information returned by queries.
 */
export interface RoomInfo {
  readonly roomId: RoomId;
  readonly members: readonly RoomMember[];
  readonly memberCount: number;
  readonly createdAt: string;
  readonly lastActivityAt: string;
}

/**
 * Payload for room:joined and room:left events.
 */
export interface RoomEvent {
  readonly roomId: RoomId;
  readonly member: RoomMember;
  readonly memberCount: number;
  readonly timestamp: string;
}

/**
 * Room configuration (overridable at server startup).
 */
export interface RoomConfig {
  /** Maximum members per room (default: 20) */
  readonly maxRoomSize: number;
  /** Time in ms before an empty room is garbage-collected (default: 300000 = 5 min) */
  readonly emptyRoomTtlMs: number;
  /** GC sweep interval in ms (default: 60000 = 1 min) */
  readonly gcIntervalMs: number;
}

/**
 * Default room configuration.
 */
export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxRoomSize: 20,
  emptyRoomTtlMs: 5 * 60 * 1000,
  gcIntervalMs: 60 * 1000,
};

/**
 * Client-to-server socket events for room management.
 */
export interface RoomClientEvents {
  "room:join": (data: { roomId: RoomId }) => void;
  "room:leave": (data: { roomId: RoomId }) => void;
  "room:members": (data: { roomId: RoomId }, callback: (members: readonly RoomMember[]) => void) => void;
}

/**
 * Server-to-client socket events for room management.
 */
export interface RoomServerEvents {
  "room:joined": (event: RoomEvent) => void;
  "room:left": (event: RoomEvent) => void;
  "room:error": (error: { code: string; message: string }) => void;
}

/**
 * Valid room ID pattern: {type}:{uuid or identifier}
 */
export const ROOM_ID_PATTERN = /^(session|review|batch):[a-zA-Z0-9-]+$/;
```

### `packages/types/src/collaboration/index.ts`

```typescript
export type {
  RoomType,
  RoomId,
  RoomMember,
  RoomInfo,
  RoomEvent,
  RoomConfig,
  RoomClientEvents,
  RoomServerEvents,
} from "./room.types";

export {
  DEFAULT_ROOM_CONFIG,
  ROOM_ID_PATTERN,
} from "./room.types";
```

---

## Section 4: Database Schema

**No new tables.** Room state is entirely in-memory. Rooms are ephemeral collaboration contexts that do not need persistence. If the server restarts, clients reconnect and re-join their rooms automatically via the `useRoom` hook.

---

## Section 5: API Contract

Room management uses Socket.io events, not REST endpoints.

### Client-to-Server Events

#### `room:join`

**Payload:**
```json
{ "roomId": "session:abc-123" }
```

**Success:** Server emits `room:joined` to all room members (including the joiner).

**Errors (emitted via `room:error`):**
| Code | When |
|------|------|
| `INVALID_ROOM_ID` | Room ID does not match pattern `{type}:{id}` |
| `ROOM_FULL` | Room has reached max capacity (20) |
| `ALREADY_IN_ROOM` | User is already a member of this room |

#### `room:leave`

**Payload:**
```json
{ "roomId": "session:abc-123" }
```

**Success:** Server emits `room:left` to remaining room members.

**Errors:**
| Code | When |
|------|------|
| `INVALID_ROOM_ID` | Invalid room ID format |
| `NOT_IN_ROOM` | User is not a member of this room |

#### `room:members`

**Payload + Callback:**
```json
{ "roomId": "session:abc-123" }
```

**Callback response:**
```json
[
  {
    "userId": "user-uuid-001",
    "socketId": "socket-abc",
    "displayName": "Dr. Sarah Carter",
    "joinedAt": "2026-02-19T12:00:00Z"
  }
]
```

### Server-to-Client Events

#### `room:joined`

```json
{
  "roomId": "session:abc-123",
  "member": {
    "userId": "user-uuid-001",
    "socketId": "socket-abc",
    "displayName": "Dr. Sarah Carter",
    "joinedAt": "2026-02-19T12:00:00Z"
  },
  "memberCount": 3,
  "timestamp": "2026-02-19T12:00:00Z"
}
```

#### `room:left`

```json
{
  "roomId": "session:abc-123",
  "member": {
    "userId": "user-uuid-001",
    "socketId": "socket-abc",
    "displayName": "Dr. Sarah Carter",
    "joinedAt": "2026-02-19T12:00:00Z"
  },
  "memberCount": 2,
  "timestamp": "2026-02-19T12:05:00Z"
}
```

#### `room:error`

```json
{
  "code": "ROOM_FULL",
  "message": "Room session:abc-123 has reached the maximum capacity of 20 members"
}
```

---

## Section 6: Frontend Spec

### React Hook: `useRoom`

**File:** `apps/web/src/hooks/useRoom.ts`

```typescript
/**
 * Hook for automatic room lifecycle management.
 * Joins room on mount, leaves on unmount.
 * Re-joins on Socket.io reconnect.
 *
 * @param roomId - The room to join (e.g., "session:abc-123")
 * @returns { members, isConnected, error }
 */
export function useRoom(roomId: RoomId | null): UseRoomReturn;

interface UseRoomReturn {
  /** Current room members */
  readonly members: readonly RoomMember[];
  /** Whether the socket is connected and room is joined */
  readonly isConnected: boolean;
  /** Last error from room operations */
  readonly error: string | null;
  /** Manually refresh member list */
  readonly refreshMembers: () => void;
}
```

**Behavior:**
1. On mount (or when `roomId` changes from null to a value): emit `room:join`
2. Listen for `room:joined` and `room:left` events to update member list
3. Listen for `room:error` events to set error state
4. On unmount (or when `roomId` changes to null): emit `room:leave`
5. On Socket.io `reconnect` event: re-emit `room:join` for the current roomId
6. `refreshMembers`: emits `room:members` with callback to refresh the member list

**Usage example:**
```tsx
// In a generation session page component
const { members, isConnected } = useRoom(`session:${sessionId}`);

// Show member avatars
{members.map(m => <Avatar key={m.userId} name={m.displayName} />)}
```

**States:**
1. **Disconnected** -- Socket not connected, `isConnected: false`, empty members
2. **Joining** -- Socket connected, `room:join` emitted, waiting for `room:joined`
3. **Connected** -- In room, members populated, `isConnected: true`
4. **Error** -- `room:error` received, error message displayed
5. **Reconnecting** -- Socket reconnecting, `isConnected: false`, previous members stale

**Design tokens (for consumer components, not the hook itself):**
- Member avatars: 24px circles, navyDeep background, white initials
- Online indicator: Green dot (`--color-green-500`), 8px
- Member count badge: `--color-neutral-100` background

---

## Section 7: Files to Create

```
# 1. Types (packages/types)
packages/types/src/collaboration/room.types.ts
packages/types/src/collaboration/index.ts

# 2. Types barrel update
packages/types/src/index.ts                    -- UPDATE (add collaboration export)

# 3. Error classes (apps/server)
apps/server/src/errors/room.error.ts

# 4. Error barrel update
apps/server/src/errors/index.ts                -- UPDATE

# 5. Service (apps/server)
apps/server/src/services/collaboration/room-manager.service.ts

# 6. Middleware (apps/server)
apps/server/src/middleware/socket-room.middleware.ts

# 7. Server registration
apps/server/src/index.ts                       -- UPDATE (register room handlers)

# 8. React hook (apps/web)
apps/web/src/hooks/useRoom.ts

# 9. Tests (apps/server)
apps/server/src/__tests__/collaboration/room-manager.test.ts
```

**Total files:** 7 new + 3 modified

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-10 | faculty | Required | Socket.io server instance, SocketAuthMiddleware, JWT handshake |

### NPM Packages (already installed)
- `socket.io` -- Socket.io server (from STORY-F-10)
- `socket.io-client` -- Socket.io client (from STORY-F-10)
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/services/notification/socket-auth.middleware.ts` -- SocketAuthMiddleware (from STORY-F-10)
- `apps/server/src/services/notification/notification.service.ts` -- NotificationService with socket.io server instance (from STORY-F-10)
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` -- `AuthUser`
- `apps/web/src/hooks/useSocket.ts` -- Socket.io client hook (from STORY-F-10, if exists) or direct socket.io-client usage

---

## Section 9: Test Fixtures (inline)

```typescript
import type { RoomMember, RoomId, RoomConfig, RoomEvent } from "@journey-os/types";

/** Mock room members */
export const MEMBER_1: RoomMember = {
  userId: "user-uuid-001",
  socketId: "socket-aaa",
  displayName: "Dr. Sarah Carter",
  joinedAt: "2026-02-19T12:00:00Z",
};

export const MEMBER_2: RoomMember = {
  userId: "user-uuid-002",
  socketId: "socket-bbb",
  displayName: "Dr. James Wilson",
  joinedAt: "2026-02-19T12:01:00Z",
};

export const MEMBER_3: RoomMember = {
  userId: "user-uuid-003",
  socketId: "socket-ccc",
  displayName: "Dr. Lisa Chen",
  joinedAt: "2026-02-19T12:02:00Z",
};

/** Valid room IDs */
export const SESSION_ROOM: RoomId = "session:sess-uuid-001";
export const REVIEW_ROOM: RoomId = "review:q-uuid-001";
export const BATCH_ROOM: RoomId = "batch:batch-uuid-001";

/** Invalid room IDs */
export const INVALID_ROOM_IDS = [
  "invalid",
  "unknown:abc",
  "session:",
  ":abc-123",
  "",
  "session:abc 123",
];

/** Test room config with fast GC for testing */
export const TEST_ROOM_CONFIG: RoomConfig = {
  maxRoomSize: 3,
  emptyRoomTtlMs: 100,
  gcIntervalMs: 50,
};

/** Mock room joined event */
export const JOINED_EVENT: RoomEvent = {
  roomId: SESSION_ROOM,
  member: MEMBER_1,
  memberCount: 1,
  timestamp: "2026-02-19T12:00:00Z",
};

/** Mock room left event */
export const LEFT_EVENT: RoomEvent = {
  roomId: SESSION_ROOM,
  member: MEMBER_1,
  memberCount: 0,
  timestamp: "2026-02-19T12:05:00Z",
};
```

---

## Section 10: API Test Spec (vitest)

**File:** `apps/server/src/__tests__/collaboration/room-manager.test.ts`
**Total tests:** 12

```
describe("RoomManagerService")
  describe("join")
    it adds member to room and returns updated room info
    it auto-creates room on first join
    it emits room:joined event to all room members
    it rejects join when room is at max capacity (RoomFullError)
    it rejects join when member is already in room (AlreadyInRoomError)
    it rejects invalid room ID format (InvalidRoomIdError)

  describe("leave")
    it removes member from room and emits room:left event
    it marks room as empty with timestamp when last member leaves
    it rejects leave when member is not in room (NotInRoomError)

  describe("getMembers")
    it returns current member list for a room
    it returns empty array for non-existent room

  describe("garbageCollect")
    it removes rooms that have been empty longer than TTL
    it does not remove rooms that still have members
    it does not remove recently-emptied rooms within TTL

  describe("handleDisconnect")
    it removes disconnected member from all their rooms
    it emits room:left for each room the member was in
```

---

## Section 11: E2E Test Spec (Playwright)

Not required for this story. Room management is not one of the 5 critical user journeys. E2E coverage will be added when the collaborative editing flow (E-35) is complete.

---

## Section 12: Acceptance Criteria

- [ ] `room:join` event adds user to a Socket.io room and emits `room:joined` to all members
- [ ] `room:leave` event removes user from room and emits `room:left` to remaining members
- [ ] `room:members` event returns current member list via callback
- [ ] Room naming convention: `session:{id}`, `review:{id}`, `batch:{id}`
- [ ] Invalid room IDs rejected with `INVALID_ROOM_ID` error
- [ ] Max room size (default 20) enforced; `ROOM_FULL` error emitted when exceeded
- [ ] Rooms auto-created on first join, garbage-collected after 5 minutes empty
- [ ] `handleDisconnect` removes user from all rooms on socket disconnect
- [ ] Reconnection: client re-joins room via `useRoom` hook on Socket.io reconnect
- [ ] `useRoom` hook joins on mount, leaves on unmount, tracks members
- [ ] Custom error class: `RoomManagementError` with subclasses
- [ ] All 12 tests pass
- [ ] TypeScript strict, named exports only
- [ ] JS `#private` fields for service internals

---

## Section 13: Source References

All data in this brief was extracted from the following source documents. Do NOT read these during implementation -- everything needed is inlined above.

| Document | What Was Extracted |
|----------|-------------------|
| `.context/spec/stories/S-F-35-1.md` | Original story with acceptance criteria, implementation layers, dependencies |
| `.context/spec/stories/STORY-F-10-BRIEF.md` | Socket.io server setup, SocketAuthMiddleware, JWT handshake, socket namespace |
| `.context/source/04-process/CODE_STANDARDS.md` | OOP standards (JS #private), testing standards, named exports rule |
| `.context/source/02-architecture/ARCHITECTURE_v10.md` | Socket.io for presence only (SSE for streaming), monorepo structure |

---

## Section 14: Environment Prerequisites

### Required Services
- **Express:** Server running on port 3001 with Socket.io attached (from STORY-F-10)
- **Next.js:** Web app running on port 3000
- **No Supabase needed** for this story (rooms are in-memory only)
- **No Neo4j needed** for this story

### Required Environment Variables
```bash
# Server (from STORY-F-10 setup)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Pre-implementation Checks
1. Verify STORY-F-10 is complete: Socket.io server running, `SocketAuthMiddleware` validates JWT on handshake
2. Verify `socket.io` and `socket.io-client` packages installed
3. Verify Socket.io server instance is accessible for attaching room event handlers

---

## Section 15: Implementation Notes

- **RoomManagerService class:**

```typescript
import { Server as SocketServer, Socket } from "socket.io";
import type { RoomMember, RoomId, RoomConfig, RoomInfo, RoomEvent } from "@journey-os/types";
import { DEFAULT_ROOM_CONFIG, ROOM_ID_PATTERN } from "@journey-os/types";

interface RoomMetadata {
  members: Map<string, RoomMember>; // keyed by socketId
  createdAt: string;
  lastActivityAt: string;
  emptiedAt: string | null;
}

export class RoomManagerService {
  readonly #io: SocketServer;
  readonly #rooms: Map<string, RoomMetadata>;
  readonly #config: RoomConfig;
  #gcInterval: ReturnType<typeof setInterval> | null;

  constructor(io: SocketServer, config?: Partial<RoomConfig>) {
    this.#io = io;
    this.#rooms = new Map();
    this.#config = { ...DEFAULT_ROOM_CONFIG, ...config };
    this.#gcInterval = null;
  }

  startGarbageCollection(): void {
    this.#gcInterval = setInterval(() => this.#collectEmptyRooms(), this.#config.gcIntervalMs);
  }

  stopGarbageCollection(): void {
    if (this.#gcInterval) {
      clearInterval(this.#gcInterval);
      this.#gcInterval = null;
    }
  }

  join(socket: Socket, roomId: RoomId, member: RoomMember): RoomInfo {
    this.#validateRoomId(roomId);
    // ... implementation
  }

  leave(socket: Socket, roomId: RoomId): void {
    // ... implementation
  }

  getMembers(roomId: RoomId): readonly RoomMember[] {
    // ... implementation
  }

  handleDisconnect(socketId: string): void {
    // Remove from all rooms, emit room:left for each
  }

  #validateRoomId(roomId: string): asserts roomId is RoomId {
    if (!ROOM_ID_PATTERN.test(roomId)) {
      throw new InvalidRoomIdError(roomId);
    }
  }

  #collectEmptyRooms(): void {
    const now = Date.now();
    for (const [roomId, metadata] of this.#rooms) {
      if (
        metadata.members.size === 0 &&
        metadata.emptiedAt !== null &&
        now - new Date(metadata.emptiedAt).getTime() > this.#config.emptyRoomTtlMs
      ) {
        this.#rooms.delete(roomId);
      }
    }
  }
}
```

- **SocketRoomMiddleware:** Registers event handlers on each connected socket:

```typescript
export function createSocketRoomMiddleware(roomManager: RoomManagerService) {
  return (socket: Socket) => {
    const user = socket.data.user; // Set by SocketAuthMiddleware from F-10

    socket.on("room:join", ({ roomId }) => {
      try {
        const member: RoomMember = {
          userId: user.id,
          socketId: socket.id,
          displayName: user.display_name ?? user.email,
          joinedAt: new Date().toISOString(),
        };
        roomManager.join(socket, roomId, member);
      } catch (err) {
        if (err instanceof RoomManagementError) {
          socket.emit("room:error", { code: err.code, message: err.message });
        }
      }
    });

    socket.on("room:leave", ({ roomId }) => {
      try {
        roomManager.leave(socket, roomId);
      } catch (err) {
        if (err instanceof RoomManagementError) {
          socket.emit("room:error", { code: err.code, message: err.message });
        }
      }
    });

    socket.on("room:members", ({ roomId }, callback) => {
      const members = roomManager.getMembers(roomId);
      callback(members);
    });

    socket.on("disconnect", () => {
      roomManager.handleDisconnect(socket.id);
    });
  };
}
```

- **Error classes:**

```typescript
// apps/server/src/errors/room.error.ts
import { JourneyOSError } from "./base.errors";

export class RoomManagementError extends JourneyOSError {
  constructor(message: string, code: string) {
    super(message, code);
  }
}

export class InvalidRoomIdError extends RoomManagementError {
  constructor(roomId: string) {
    super(`Invalid room ID format: '${roomId}'. Expected {type}:{id}`, "INVALID_ROOM_ID");
  }
}

export class RoomFullError extends RoomManagementError {
  constructor(roomId: string, maxSize: number) {
    super(
      `Room ${roomId} has reached the maximum capacity of ${maxSize} members`,
      "ROOM_FULL",
    );
  }
}

export class AlreadyInRoomError extends RoomManagementError {
  constructor(roomId: string, userId: string) {
    super(`User ${userId} is already a member of room ${roomId}`, "ALREADY_IN_ROOM");
  }
}

export class NotInRoomError extends RoomManagementError {
  constructor(roomId: string, userId: string) {
    super(`User ${userId} is not a member of room ${roomId}`, "NOT_IN_ROOM");
  }
}
```

- **useRoom hook:** Uses `socket.io-client` directly or a shared socket context from STORY-F-10. The hook manages the join/leave lifecycle and listens for room events. Use `useEffect` cleanup to emit `room:leave` on unmount. Listen for Socket.io `reconnect` event to re-join.

- **Testing approach:** Mock the Socket.io `Server` and `Socket` objects. Use `vi.hoisted()` for mocks. Test the `RoomManagerService` methods directly. For event emission, capture `socket.to(roomId).emit()` calls via mock.

- **vi.hoisted()** needed for Socket.io mocks in tests.
- **Named exports only** for all files. No default exports.
- **JS `#private` fields** for `RoomManagerService` internals.
