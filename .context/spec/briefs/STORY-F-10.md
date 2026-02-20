# STORY-F-10: Socket.io Notification Service

**Epic:** E-34 (Notification System)
**Feature:** F-16
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-34-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need real-time push notifications via Socket.io so that I receive instant alerts for important events without refreshing the page.

## Acceptance Criteria
- [ ] Socket.io server integration on Express app via `http.createServer(app)`
- [ ] Authenticated connections: validate JWT on socket handshake
- [ ] User-scoped rooms: each user joins a personal notification room on connect (`user:{userId}`)
- [ ] SocketNotificationService.push(): creates notification record + emits to user's socket room
- [ ] Event format: `notification:new` with full notification payload
- [ ] Connection lifecycle: join room on connect, leave on disconnect, handle reconnection
- [ ] Offline handling: notifications persisted to DB regardless of connection status
- [ ] Online presence tracking: `Map<string, number>` for multi-tab connection counting
- [ ] Custom error class: `SocketNotificationError`
- [ ] 8-12 API tests: connection auth, room join, push delivery, offline persistence, reconnection
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Bell Dropdown UI is built in STORY-F-23.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/notification/socket.types.ts` |
| Service | apps/server | `src/services/notification/socket-notification.service.ts`, `src/services/notification/socket-manager.service.ts` |
| Middleware | apps/server | `src/middleware/socket-auth.middleware.ts` |
| Config | apps/server | `src/config/socket.config.ts` |
| Errors | apps/server | `src/errors/socket.errors.ts` |
| Tests | apps/server | `src/services/notification/__tests__/socket-notification.service.test.ts`, `src/services/notification/__tests__/socket-manager.test.ts` |

## Database Schema
No new tables. Uses existing `notifications` table from STORY-F-2.

## API Endpoints
No REST endpoints. Socket.io events:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `notification:new` | Server -> Client | `Notification` | New notification pushed to user |
| `notification:read` | Client -> Server | `{ notificationId }` | Client acknowledges read |

## Dependencies
- **Blocks:** STORY-F-19 (Socket.io Room Management), STORY-F-22 (Inngest Triggers), STORY-F-23 (Bell Dropdown)
- **Blocked by:** STORY-F-2 (notification model exists)
- **Cross-lane:** STORY-F-19 (Sprint 19 room management builds on this)

## Testing Requirements
### API Tests (8-12)
1. Socket connection with valid JWT succeeds
2. Socket connection with invalid JWT rejects
3. Connected user auto-joins `user:{userId}` room
4. push() creates DB notification record regardless of connection status
5. push() emits `notification:new` to connected user's room
6. Offline user receives notification on next connect (from DB)
7. Disconnect removes user from room
8. Reconnection re-adds user to room via handshake
9. Multi-tab: presence count increments/decrements correctly
10. Presence count reaches 0 on all tabs closed, key deleted from Map

## Implementation Notes
- Socket.io used for presence and notifications only -- SSE used for streaming generation events.
- See `docs/solutions/socketio-service-layer-pattern.md` for the service layer pattern.
- Socket.io integration requires wrapping Express app in `http.createServer(app)` and calling `httpServer.listen()` instead of `app.listen()`.
- The `createSocketServer()` factory takes the httpServer, not the Express app.
- JWT validation on handshake: extract token from `auth.token` in socket handshake.
- User room naming: `user:{userId}` -- predictable, scoped, secure.
- Online presence: `Map<string, number>` (not `Set<string>`) -- count tracks multiple connections per user (multiple tabs). Decrement on disconnect; delete key when count reaches 0.
- SocketNotificationService composes the existing NotificationService (from STORY-F-2) rather than replacing it.
- Consider Socket.io adapter (Redis) for horizontal scaling in production.
