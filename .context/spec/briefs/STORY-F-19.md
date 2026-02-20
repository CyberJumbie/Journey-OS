# STORY-F-19: Socket.io Room Management

**Epic:** E-35 (Real-time Collaboration)
**Feature:** F-16
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-35-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need to join and leave Socket.io session rooms so that I can collaborate with colleagues who are viewing the same generation session or review in real time.

## Acceptance Criteria
- [ ] Room creation: auto-create room when first user joins a session/page context
- [ ] Room naming convention: `session:{sessionId}`, `review:{questionId}`, `batch:{batchId}`
- [ ] Join room: user added to room on page navigation (automatic via React hook)
- [ ] Leave room: user removed on page navigation away or disconnect
- [ ] Room member list: query current members of a room
- [ ] Room events: `room:joined`, `room:left` emitted to all room members
- [ ] Max room size: configurable limit (default 20) to prevent resource issues
- [ ] Room cleanup: empty rooms garbage-collected after TTL (5 minutes)
- [ ] Custom error class: `RoomManagementError`
- [ ] 8-12 API tests: join/leave, member list, events, max size, cleanup
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Presence indicators are built in STORY-F-25.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/collaboration/room.types.ts` |
| Service | apps/server | `src/services/collaboration/room-manager.service.ts` |
| Middleware | apps/server | `src/middleware/socket-room.middleware.ts` |
| Hooks | apps/web | `src/hooks/use-room.ts` |
| Errors | apps/server | `src/errors/collaboration.errors.ts` |
| Tests | apps/server | `src/services/collaboration/__tests__/room-manager.test.ts` |

## Database Schema
No database schema changes. Room state is in-memory (Map of roomId -> Set of members).

## API Endpoints
No REST endpoints. Socket.io events:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `room:join` | Client -> Server | `{ roomId }` | Request to join room |
| `room:leave` | Client -> Server | `{ roomId }` | Request to leave room |
| `room:joined` | Server -> Room | `{ userId, roomId }` | User joined room notification |
| `room:left` | Server -> Room | `{ userId, roomId }` | User left room notification |
| `room:members` | Server -> Client | `{ roomId, members[] }` | Current room member list |

## Dependencies
- **Blocks:** STORY-F-25 (Presence Indicators)
- **Blocked by:** STORY-F-10 (Socket.io infrastructure exists)
- **Cross-lane:** STORY-F-10 (Sprint 19 Socket.io service)

## Testing Requirements
### API Tests (8-12)
1. Join room adds user to room members
2. Leave room removes user from room members
3. Room:joined event emitted to all room members
4. Room:left event emitted to remaining room members
5. Room member list returns current members with metadata
6. Max room size: join rejected when room is full (20 members)
7. Room cleanup: empty room removed after 5-minute TTL
8. Auto-join via useRoom hook on component mount
9. Auto-leave via useRoom hook on component unmount
10. Reconnection: user re-joins room automatically
11. Room naming follows convention (session:, review:, batch:)

## Implementation Notes
- Room management builds on Socket.io infrastructure from STORY-F-10 -- shares the same server instance.
- Socket.io native rooms used (no custom room implementation needed).
- Auto-join: React hook `useRoom(roomId)` joins on mount, leaves on unmount.
- Room member tracking: in-memory Map of roomId -> Set of `{ userId, socketId, joinedAt }`.
- Consider room locking: prevent new joins during critical operations (e.g., batch export).
- Reconnection: user re-joins room automatically on Socket.io reconnect via middleware.
- See `docs/solutions/socketio-service-layer-pattern.md`.
