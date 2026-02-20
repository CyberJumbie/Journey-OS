# STORY-F-10 Brief: Socket.io Notification Service

## 0. Lane & Priority

```yaml
story_id: STORY-F-10
old_id: S-F-34-2
lane: faculty
lane_priority: 3
within_lane_order: 10
sprint: 19
size: M
depends_on:
  - STORY-F-2 (faculty) — Notification Model (must exist for DB persistence)
blocks:
  - STORY-F-19 — Room Management (builds on socket infrastructure)
personas_served: [faculty, institutional_admin, advisor, student]
epic: E-34 (Notification System)
feature: F-16 (Real-time Notifications)
user_flow: UF-22 (Notification Delivery)
```

## 1. Summary

Build a **Socket.io notification service** that enables real-time push notifications to connected users. Socket.io is integrated into the existing Express server. On connection, the server validates the JWT from the socket handshake `auth.token`, then joins the user into a personal room `user:{userId}`. The `NotificationService.push()` method creates a notification record in Supabase and emits the payload to the user's socket room. Notifications are persisted regardless of connection status (offline users see them on next login). An in-memory `Set<string>` tracks online presence.

Key constraints:
- Socket.io for presence and notifications ONLY (SSE for streaming generation pipeline)
- JWT validation on handshake via `SocketAuthMiddleware` (reuses `AuthService` JWT verification)
- One socket namespace: `/` (default) with user-scoped rooms
- Custom error class: `SocketNotificationError` extending `JourneyOSError`
- No Redis adapter at MVP (single-server); adapter can be added for horizontal scaling later

## 2. Task Breakdown

1. **Types** -- Create `SocketNotificationPayload`, `SocketEvents`, `PresenceState` in `packages/types/src/notification/`
2. **Error class** -- `SocketNotificationError` in `apps/server/src/errors/socket.errors.ts`
3. **Socket auth middleware** -- `SocketAuthMiddleware` validates JWT on handshake
4. **Socket manager** -- `SocketManagerService` initializes Socket.io on HTTP server, manages rooms and presence
5. **Notification service** -- `NotificationService` with `push()`, `markAsRead()`, `getUnread()`
6. **Socket config** -- `createSocketServer()` factory in `apps/server/src/config/socket.config.ts`
7. **Wire up** -- Attach Socket.io to Express HTTP server in `apps/server/src/index.ts`
8. **API tests** -- 14 tests covering connection auth, room management, push delivery, offline persistence, presence
9. **Exports** -- Register error class and types in barrel files

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/notification/socket.types.ts

import { AuthRole } from "../auth/roles.types";

/** Notification types supported by the platform */
export type NotificationType =
  | "generation_complete"
  | "review_assigned"
  | "coverage_alert"
  | "system_announcement"
  | "approval_status"
  | "mention";

/** Notification record stored in Supabase */
export interface Notification {
  readonly id: string;
  readonly user_id: string;
  readonly institution_id: string | null;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata: Record<string, unknown>;
  readonly read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
}

/** Payload emitted via Socket.io `notification:new` event */
export interface SocketNotificationPayload {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
}

/** Request DTO for creating a notification programmatically */
export interface CreateNotificationRequest {
  readonly user_id: string;
  readonly institution_id?: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata?: Record<string, unknown>;
}

/** Socket.io event map (server -> client) */
export interface ServerToClientEvents {
  "notification:new": (payload: SocketNotificationPayload) => void;
  "presence:update": (payload: PresenceUpdate) => void;
}

/** Socket.io event map (client -> server) */
export interface ClientToServerEvents {
  "notification:read": (notificationId: string) => void;
}

/** Presence update broadcast */
export interface PresenceUpdate {
  readonly user_id: string;
  readonly status: "online" | "offline";
}

/** Socket handshake auth data */
export interface SocketAuthData {
  readonly user_id: string;
  readonly email: string;
  readonly role: AuthRole;
  readonly institution_id: string;
}

/** Unread notification count response */
export interface UnreadCountResponse {
  readonly count: number;
}
```

## 4. Database Schema (inline, complete)

Uses the existing `notifications` table created by STORY-F-2 (Notification Model). No new tables needed.

```sql
-- Existing table (created by STORY-F-2):
-- notifications (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL REFERENCES profiles(id),
--   institution_id UUID REFERENCES institutions(id),
--   type TEXT NOT NULL,
--   title TEXT NOT NULL,
--   body TEXT NOT NULL DEFAULT '',
--   metadata JSONB NOT NULL DEFAULT '{}',
--   read BOOLEAN NOT NULL DEFAULT false,
--   read_at TIMESTAMPTZ,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- )

-- Migration: add_notification_indexes_for_socket_service
-- Performance indexes for real-time notification queries

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read
  ON notifications(user_id, read)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at
  ON notifications(user_id, created_at DESC);
```

## 5. API Contract (complete request/response)

### Socket.io Events (not REST -- WebSocket transport)

**Connection handshake:**
```javascript
// Client connects with JWT in auth
const socket = io("http://localhost:3001", {
  auth: {
    token: "Bearer eyJhbGciOi..."
  }
});
```

**Server -> Client: `notification:new`**
```json
{
  "id": "notif-uuid-1",
  "type": "generation_complete",
  "title": "Question Set Ready",
  "body": "Your 25-question set for Cardiology has been generated.",
  "metadata": {
    "course_id": "course-uuid-1",
    "generation_id": "gen-uuid-1",
    "question_count": 25
  },
  "created_at": "2026-02-19T14:30:00Z"
}
```

**Client -> Server: `notification:read`**
```
"notif-uuid-1"
```

**Connection error (emitted on handshake failure):**
```json
{
  "message": "Authentication failed: Invalid or expired token",
  "data": {
    "code": "SOCKET_AUTH_ERROR"
  }
}
```

**REST endpoint for unread count (optional, complements socket):**

### GET /api/v1/notifications/unread-count (Auth: any authenticated role)

**Success Response (200):**
```json
{
  "data": {
    "count": 7
  },
  "error": null
}
```

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

Frontend integration is minimal for this story -- the focus is the server-side socket infrastructure. Client-side notification UI is a separate story.

### Socket connection hook (utility for future stories)

**File:** `apps/web/src/hooks/use-socket.ts`

```
useSocket (custom hook)
  ├── Connects to Socket.io server on mount
  ├── Passes JWT from Supabase session as auth.token
  ├── Listens for `notification:new` events
  ├── Exposes: connected (boolean), onNotification (callback)
  └── Disconnects on unmount
```

**States:**
1. **Disconnected** -- Socket not yet connected (initial render)
2. **Connecting** -- Handshake in progress
3. **Connected** -- Socket authenticated and in user room
4. **Reconnecting** -- Auto-reconnect after network drop
5. **Error** -- Auth failure or server unreachable

**Design tokens:** N/A for this story (no visible UI components).

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/notification/socket.types.ts` | Types | Create |
| 2 | `packages/types/src/notification/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add notification export) |
| 4 | `apps/server/src/errors/socket.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 6 | Supabase migration via MCP (indexes) | Database | Apply |
| 7 | `apps/server/src/config/socket.config.ts` | Config | Create |
| 8 | `apps/server/src/middleware/socket-auth.middleware.ts` | Middleware | Create |
| 9 | `apps/server/src/services/notification/socket-manager.service.ts` | Service | Create |
| 10 | `apps/server/src/services/notification/notification.service.ts` | Service | Create |
| 11 | `apps/server/src/index.ts` | Wiring | Edit (attach Socket.io to HTTP server) |
| 12 | `apps/web/src/hooks/use-socket.ts` | Hook | Create |
| 13 | `apps/server/src/__tests__/notification/socket-manager.service.test.ts` | Tests | Create |
| 14 | `apps/server/src/__tests__/notification/notification.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-2 | faculty | Pending | Notification model + `notifications` table must exist |
| STORY-U-3 | universal | **DONE** | AuthService for JWT verification (reused in socket handshake) |
| STORY-U-6 | universal | **DONE** | RBAC middleware pattern (referenced for role-based filtering) |

### NPM Packages (to install)
- `socket.io` -- Server-side Socket.io library
- `socket.io-client` -- Client-side (for `apps/web` hook and tests)
- `@types/socket.io` -- TypeScript types (if not bundled)

### Existing Files Needed
- `apps/server/src/services/auth/auth.service.ts` -- `AuthService.verifyToken()` for JWT validation
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()` for notification persistence
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` -- `AuthTokenPayload`, `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
// Mock authenticated socket handshake
export const VALID_SOCKET_AUTH = {
  token: "Bearer valid-jwt-token",
};

export const INVALID_SOCKET_AUTH = {
  token: "Bearer expired-or-invalid-token",
};

export const MISSING_SOCKET_AUTH = {};

// Mock decoded token payload
export const FACULTY_TOKEN_PAYLOAD = {
  sub: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock notification payloads
export const GENERATION_COMPLETE_NOTIFICATION = {
  user_id: "faculty-uuid-1",
  type: "generation_complete" as const,
  title: "Question Set Ready",
  body: "Your 25-question set for Cardiology has been generated.",
  metadata: {
    course_id: "course-uuid-1",
    generation_id: "gen-uuid-1",
    question_count: 25,
  },
};

export const REVIEW_ASSIGNED_NOTIFICATION = {
  user_id: "faculty-uuid-2",
  type: "review_assigned" as const,
  title: "New Review Assignment",
  body: "You have 10 questions pending review for Pharmacology.",
  metadata: {
    course_id: "course-uuid-2",
    review_queue_id: "rq-uuid-1",
    question_count: 10,
  },
};

// Mock notification DB record (after insert)
export const STORED_NOTIFICATION = {
  id: "notif-uuid-1",
  user_id: "faculty-uuid-1",
  institution_id: "inst-uuid-1",
  type: "generation_complete",
  title: "Question Set Ready",
  body: "Your 25-question set for Cardiology has been generated.",
  metadata: { course_id: "course-uuid-1" },
  read: false,
  read_at: null,
  created_at: "2026-02-19T14:30:00Z",
};

// Offline user (not connected)
export const OFFLINE_USER_ID = "offline-user-uuid-1";

// Online user (connected)
export const ONLINE_USER_ID = "faculty-uuid-1";
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/notification/socket-manager.service.test.ts`

```
describe("SocketManagerService")
  describe("connection auth")
    > rejects connection with missing auth token
    > rejects connection with invalid/expired JWT
    > accepts connection with valid JWT and joins user room
    > extracts user_id from decoded token for room assignment

  describe("room management")
    > joins user to room `user:{userId}` on authenticated connect
    > removes user from room on disconnect
    > handles multiple connections from same user (multiple tabs)

  describe("presence tracking")
    > adds user_id to online set on connect
    > removes user_id from online set on disconnect (last connection)
    > keeps user_id in online set when one of multiple connections drops
    > returns correct online/offline status via isOnline()
```

**File:** `apps/server/src/__tests__/notification/notification.service.test.ts`

```
describe("NotificationService")
  describe("push")
    > creates notification record in Supabase
    > emits `notification:new` to user's socket room when online
    > persists notification even when user is offline (no emit)
    > includes full payload in socket emission (id, type, title, body, metadata, created_at)
    > throws SocketNotificationError on Supabase insert failure

  describe("markAsRead")
    > updates notification read=true and read_at timestamp
    > throws SocketNotificationError if notification not found

  describe("getUnread")
    > returns unread notifications for user ordered by created_at desc
    > returns empty array when all notifications are read
```

**Total: ~19 tests** (11 socket manager + 8 notification service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Socket.io infrastructure is tested via unit/integration tests. E2E coverage for notifications will be added when the notification UI story is complete.

## 12. Acceptance Criteria

1. Socket.io server attaches to Express HTTP server and accepts connections
2. JWT is validated on socket handshake; invalid tokens are rejected with error event
3. Authenticated users automatically join room `user:{userId}` on connect
4. `NotificationService.push()` creates a Supabase record AND emits to the user's room
5. Notifications are persisted to the `notifications` table regardless of connection status
6. Online presence tracked: `SocketManagerService.isOnline(userId)` returns correct boolean
7. User is removed from room and presence set on disconnect
8. Multiple simultaneous connections from same user (multiple tabs) are handled correctly
9. `notification:new` event payload contains id, type, title, body, metadata, created_at
10. Custom `SocketNotificationError` extends `JourneyOSError` with code `SOCKET_NOTIFICATION_ERROR`
11. All 19 API tests pass
12. Socket.io used only for notifications/presence; SSE remains for streaming generation

## 13. Source References

| Claim | Source |
|-------|--------|
| Socket.io for presence only | ARCHITECTURE_v10 SS 6.3: "SSE for streaming generation pipeline events. Socket.io for presence only." |
| Notification table schema | SUPABASE_DDL_v1 SS notifications |
| JWT on socket handshake | S-F-34-2 SS Acceptance Criteria: "validate JWT on socket handshake" |
| User room naming | S-F-34-2 SS Notes: "user:{userId}" |
| Online presence in-memory Set | S-F-34-2 SS Notes: "in-memory Set of connected user IDs" |
| NotificationService.push() | S-F-34-2 SS Acceptance Criteria |
| Blocks room management | FULL-DEPENDENCY-GRAPH: S-F-34-2 -> S-F-35-1 |
| Notification types | API_CONTRACT_v1 SS Notifications |

## 14. Environment Prerequisites

- **Supabase:** Project running, `notifications` table created (via STORY-F-2 migration)
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **NPM:** `socket.io` and `socket.io-client` installed
- **No Neo4j needed** for this story (notifications are Supabase-only)

## 15. Implementation Notes

- **Socket.io attachment pattern:** Create HTTP server from Express app (`http.createServer(app)`), then pass to both `app.listen()` and `new Server(httpServer)`. Update `apps/server/src/index.ts` accordingly.
- **JWT verification reuse:** The `SocketAuthMiddleware` should instantiate or receive an `AuthService` and call its token verification method. Do NOT duplicate JWT logic.
- **Room naming convention:** `user:{userId}` -- predictable, scoped, secure. No institution-level rooms in this story (that is STORY-F-19).
- **Presence: in-memory Map, not Set:** Use `Map<string, number>` to track connection count per user (handles multiple tabs). Decrement on disconnect; remove from map when count hits 0.
- **Error class pattern:** Follow existing `apps/server/src/errors/application.error.ts` pattern -- extend `JourneyOSError` with a specific error code string.
- **OOP pattern:** `SocketManagerService` and `NotificationService` use JS `#private` fields for internal state (`#io`, `#onlineUsers`, `#supabaseClient`). Constructor DI for all dependencies.
- **vi.hoisted() for mocks:** Socket.io mocks must use `vi.hoisted()` since `vi.mock()` hoists before variable declarations.
- **No default exports:** All services, types, and error classes use named exports only.
