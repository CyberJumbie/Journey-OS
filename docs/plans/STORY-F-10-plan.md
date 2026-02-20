# Plan: STORY-F-10 — Socket.io Notification Service

## Tasks (from brief, with refinements)

1. **Types** → `packages/types/src/notification/socket.types.ts` — Create socket-specific types (`SocketNotificationPayload`, `ServerToClientEvents`, `ClientToServerEvents`, `PresenceUpdate`, `SocketAuthData`). **Note:** `NotificationType`, `Notification`, `CreateNotificationRequest`, `UnreadCountResponse` already exist in `notification.types.ts` — reuse, don't duplicate. The brief's `NotificationType` differs from existing (`"generation_complete"` vs `"system"`); extend the existing union or create a `SocketNotificationType` subset.
2. **Types barrel** → `packages/types/src/notification/index.ts` — Edit to add `export * from "./socket.types"`. Barrel and root `index.ts` already export notification.
3. **Rebuild types** → `tsc -b packages/types/tsconfig.json`
4. **Error class** → `apps/server/src/errors/socket.errors.ts` — `SocketNotificationError` extends `JourneyOSError` with code `"SOCKET_NOTIFICATION_ERROR"`
5. **Error barrel** → `apps/server/src/errors/index.ts` — Add export
6. **Install packages** → `pnpm --filter server add socket.io` + `pnpm --filter web add socket.io-client`
7. **Migration** → Apply via Supabase MCP: add partial index `idx_notifications_user_id_read` and `idx_notifications_user_id_created_at`
8. **Socket config** → `apps/server/src/config/socket.config.ts` — `createSocketServer(httpServer)` factory returning typed `Server<ClientToServerEvents, ServerToClientEvents>`
9. **Socket auth middleware** → `apps/server/src/middleware/socket-auth.middleware.ts` — `SocketAuthMiddleware` class with `#authService`, validates JWT from `socket.handshake.auth.token`, attaches decoded payload to `socket.data`
10. **Socket manager service** → `apps/server/src/services/notification/socket-manager.service.ts` — `SocketManagerService` with `#io`, `#onlineUsers: Map<string, number>`, methods: `initialize()`, `isOnline()`, `emitToUser()`, `getOnlineCount()`
11. **Notification service** → `apps/server/src/services/notification/notification.service.ts` — `NotificationService` with `push()`, `markAsRead()`, `getUnread()`. Uses existing notification ownership pattern from `docs/solutions/notification-ownership-pattern.md`.
12. **Wire up** → `apps/server/src/index.ts` — Wrap Express app in `http.createServer(app)`, pass `httpServer` to `createSocketServer()`, change `app.listen()` to `httpServer.listen()`
13. **Client hook** → `apps/web/src/hooks/use-socket.ts` — `useSocket()` hook: connect on mount with JWT, listen for `notification:new`, expose `connected` state, disconnect on unmount
14. **Tests: socket-manager** → `apps/server/src/__tests__/notification/socket-manager.service.test.ts` — 11 tests (connection auth, room management, presence)
15. **Tests: notification-service** → `apps/server/src/__tests__/notification/notification.service.test.ts` — 8 tests (push, markAsRead, getUnread)

## Implementation Order

Types → Error class → Install packages → Migration → Config → Middleware → SocketManagerService → NotificationService → Wire up index.ts → Client hook → Tests

## Patterns to Follow

- `docs/solutions/notification-ownership-pattern.md` — Three-layer auth (middleware + service ownership check + RLS) for `markAsRead`
- `docs/solutions/supabase-mock-factory.md` — Supabase chain mocking in tests
- Error class pattern from `apps/server/src/errors/application.error.ts` — extend `JourneyOSError(message, code)`
- OOP with JS `#private` fields, constructor DI
- `vi.hoisted()` for mock variables referenced inside `vi.mock()` closures

## Type Reconciliation

The brief defines `NotificationType = "generation_complete" | "review_assigned" | ...` but existing `notification.types.ts` has `NotificationType = "system" | "course" | ...`. Options:
- **Option A (recommended):** Keep existing `NotificationType` as-is for DB/API, and use it in socket types too. The brief's specific types are examples; the socket payload just forwards whatever type the notification has.
- **Option B:** Extend the existing union with the brief's additional values. Risk: migration needed for CHECK constraint if one exists.
- Decision: **Option A** — socket types import `NotificationType` from `notification.types.ts`, no duplication.

Similarly, `Notification`, `CreateNotificationRequest`, `UnreadCountResponse` already exist — socket types will import from sibling file rather than redefining.

## Testing Strategy

- **API tests (100% for this story):** 19 vitest tests across 2 files
  - Socket manager: connection auth (4), room management (3), presence (4)
  - Notification service: push (5), markAsRead (2), getUnread (2)
  - Mock Socket.io server/socket objects using `vi.hoisted()` + `vi.mock()`
  - Mock Supabase client using factory pattern
- **E2E: No** — Socket infrastructure only; no UI to test

## Figma Make

- [x] Code directly (no UI components in this story)

## Risks / Edge Cases

1. **STORY-F-2 dependency:** The `notifications` table must exist. If F-2 isn't done, the migration indexes will fail. Verify table exists before applying migration.
2. **`http.createServer` refactor:** Changing `app.listen()` to `httpServer.listen()` in `index.ts` may affect any tests or scripts that import the app. Verify no other file depends on the listen pattern.
3. **Type divergence:** Brief's `NotificationType` values differ from existing — must reconcile (see above).
4. **Multiple tabs:** `Map<string, number>` for presence must correctly decrement; off-by-one = ghost presence or premature offline.
5. **Socket.io version:** Ensure `socket.io@4.x` is installed (v4 has built-in TypeScript support, typed events).
6. **CORS:** Socket.io needs CORS config matching Express. `createSocketServer()` must set `cors.origin` to match existing Express CORS settings.

## Acceptance Criteria (verbatim from brief)

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
