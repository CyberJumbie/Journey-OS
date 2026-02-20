# STORY-F-25: Presence Indicators

**Epic:** E-35 (Real-time Collaboration)
**Feature:** F-16
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-35-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need avatar presence indicators showing who else is viewing the same page so that I am aware of collaborators and avoid conflicting actions.

## Acceptance Criteria
- [ ] Avatar stack: overlapping circular avatars of users in the current room
- [ ] Tooltip on hover: user name and time joined
- [ ] Max display: show first 3 avatars + "+N" overflow indicator
- [ ] Real-time updates: avatars appear/disappear as users join/leave
- [ ] Status dot: green (active), yellow (idle > 2 min), gray (reconnecting)
- [ ] Placement: top-right corner of page content area
- [ ] User avatar from Supabase profile or initials fallback
- [ ] 5-8 API tests: member list, status transitions, avatar data
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/collaboration/Collaborators.tsx` | `apps/web/src/components/collaboration/presence-indicator.tsx`, `apps/web/src/components/collaboration/avatar-stack.tsx` | Extract avatar stack and presence indicators into separate components. Replace inline styles with design tokens. Use shadcn/ui Avatar component with negative margin overlap. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/collaboration/presence.types.ts` |
| Components | apps/web | `src/components/collaboration/presence-indicator.tsx`, `src/components/collaboration/avatar-stack.tsx` |
| Hooks | apps/web | `src/hooks/use-presence.ts` |
| Tests | apps/web | `src/components/collaboration/__tests__/presence-indicator.test.tsx` |
| Tests | apps/server | `src/services/collaboration/__tests__/presence.test.ts` |

## Database Schema
No database schema changes. Presence state is derived from Socket.io room membership (in-memory).

## API Endpoints
No REST endpoints. Uses Socket.io events from STORY-F-19:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `room:members` | Server -> Client | `{ roomId, members[] }` | Current room member list with status |
| `presence:heartbeat` | Client -> Server | `{ roomId }` | Client activity heartbeat |
| `presence:idle` | Server -> Room | `{ userId }` | User idle notification |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-19 (room management provides member list)
- **Cross-lane:** None

## Testing Requirements
### Component/API Tests (5-8)
1. AvatarStack renders up to 3 avatars
2. Overflow indicator shows "+N" for additional members
3. Status dot shows green for active users
4. Status dot shows yellow for idle users (> 2 min no heartbeat)
5. Status dot shows gray for reconnecting users
6. Avatar uses profile image or initials fallback
7. Tooltip shows user name and join time
8. Real-time update adds/removes avatars on join/leave

## Implementation Notes
- `usePresence` hook subscribes to room member changes via Socket.io `room:joined`/`room:left` events.
- Idle detection: client-side activity tracker (mouse move, key press) -- emits heartbeat every 30s.
- If no heartbeat for 2 minutes, status changes to idle (server-side timeout).
- Avatar images loaded from Supabase Storage user profile bucket.
- Initials fallback: first letter of first name + first letter of last name, random background color.
- AvatarStack uses shadcn/ui Avatar component with negative margin overlap.
- Design tokens for status dot colors and avatar sizes.
- Never use inline `style={{ }}` for static values -- use Tailwind arbitrary values.
- When testing components that import from `@journey-os/ui`, mock the entire package with `vi.mock("@journey-os/ui", ...)`.
