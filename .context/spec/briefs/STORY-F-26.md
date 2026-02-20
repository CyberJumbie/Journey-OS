# STORY-F-26: Session Broadcast

**Epic:** E-35 (Real-time Collaboration)
**Feature:** F-16 (Notifications & Collaboration)
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-35-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need generation events broadcast to all room members so that observers can watch a colleague's generation session in real time.

## Acceptance Criteria
- [ ] Generation pipeline events broadcast to session room members via Socket.io
- [ ] Events: `generation:started`, `generation:node.complete`, `generation:streaming`, `generation:complete`, `generation:error`
- [ ] Observer mode: non-owner room members see read-only live view of generation progress
- [ ] Event payload: node name, progress percentage, partial output (for streaming), timestamps
- [ ] Owner indicator: visual distinction between session owner and observers
- [ ] Broadcast throttling: streaming events throttled to 100ms intervals to prevent flooding
- [ ] Late join: observers joining mid-session receive current state snapshot
- [ ] Custom error class: `BroadcastError`
- [ ] 8-12 API tests: event broadcast, observer receipt, throttling, late join state, owner identification
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/collaboration/Collaborators.tsx` | `apps/web/src/components/collaboration/observer-banner.tsx` | Extract observer mode banner and session indicator; replace inline styles with Tailwind design tokens; convert to named exports |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/collaboration/broadcast.types.ts` |
| Service | apps/server | `src/services/collaboration/session-broadcast.service.ts` |
| Hooks | apps/web | `src/hooks/use-session-broadcast.ts` |
| View | apps/web | `src/components/collaboration/observer-banner.tsx` |
| Tests | apps/server | `src/services/collaboration/__tests__/session-broadcast.service.test.ts` |

## Database Schema
No new tables. Broadcast state is ephemeral (in-memory via Socket.io rooms). Late-join state snapshot stored in a `Map<string, GenerationSnapshot>` keyed by room ID.

## API Endpoints
No REST endpoints. Socket.io events only:

| Event | Direction | Payload |
|-------|-----------|---------|
| `generation:started` | server -> room | `{ sessionId, ownerId, nodeCount, timestamp }` |
| `generation:node.complete` | server -> room | `{ nodeName, stepIndex, totalSteps, progress, timestamp }` |
| `generation:streaming` | server -> room (throttled) | `{ nodeName, delta, progress }` |
| `generation:complete` | server -> room | `{ sessionId, itemId, duration }` |
| `generation:error` | server -> room | `{ sessionId, error, nodeName }` |
| `session:snapshot` | server -> joiner | `{ currentNode, progress, partialOutputs }` |

## Dependencies
- **Blocked by:** STORY-F-25 (room management must exist — S-F-35-1), STORY-F-33 (LangGraph pipeline emits events)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: event broadcast to room members, observer receives events, throttling interval enforcement, late join snapshot delivery, owner identification in payload, error event propagation, empty room handling, disconnect cleanup
- 0 E2E tests

## Implementation Notes
- Broadcast service wraps Socket.io `socket.to(roomId).emit()` — excludes sender.
- Generation pipeline calls broadcast on each node transition via injected `IBroadcastService`.
- Late join state snapshot: maintain current pipeline state (node, progress, partial outputs) per room; send on `room:join`.
- Throttling uses lodash `throttle` or custom interval buffer for streaming events (100ms minimum interval).
- Observer mode: same workbench UI but all controls disabled, "Observing [user]'s session" banner shown.
- This is Socket.io only — SSE is for the session owner's direct progress stream.
- Use `Map<string, number>` for presence tracking (multiple tabs per user).
