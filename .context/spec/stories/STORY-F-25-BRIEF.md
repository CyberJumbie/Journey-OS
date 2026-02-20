# STORY-F-25 Brief: Presence Indicators

## 0. Lane & Priority

```yaml
story_id: STORY-F-25
old_id: S-F-35-2
lane: faculty
lane_priority: 3
within_lane_order: 25
sprint: 19
size: S
depends_on:
  - STORY-F-19 (faculty) — Room management provides member list and Socket.io room infrastructure
blocks: []
personas_served: [faculty]
epic: E-35 (Real-time Collaboration)
feature: F-16 (Notifications & Real-time)
```

## 1. Summary

Build **presence indicator UI components** that display an avatar stack showing who else is viewing the same page. Users are represented by circular avatars (profile image or initials fallback) with status dots indicating activity state: green (active), yellow (idle > 2 min), gray (reconnecting). The component subscribes to Socket.io room membership events and updates in real-time.

Key constraints:
- Avatar stack with overlapping layout (negative margin), max 3 visible + "+N" overflow
- Status dot colors: green (active), yellow (idle > 2 min), gray (reconnecting)
- Idle detection: client-side activity tracker emits heartbeat every 30 seconds
- Server-side: if no heartbeat for 2 minutes, status changes to idle
- Avatar images loaded from Supabase Storage profile bucket; initials fallback with random background
- Placement: top-right corner of page content area
- Socket.io events: `room:joined`, `room:left`, `room:heartbeat`

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define presence types | `packages/types/src/collaboration/presence.types.ts` | 15m |
| 2 | Create barrel export | `packages/types/src/collaboration/index.ts` | 5m |
| 3 | Update root barrel export | `packages/types/src/index.ts` | 5m |
| 4 | Build `AvatarStack` component | `apps/web/src/components/collaboration/AvatarStack.tsx` | 45m |
| 5 | Build `PresenceIndicator` component (with status dot) | `apps/web/src/components/collaboration/PresenceIndicator.tsx` | 30m |
| 6 | Implement `usePresence` hook | `apps/web/src/hooks/usePresence.ts` | 45m |
| 7 | Write API tests (6 tests) | `apps/server/src/__tests__/collaboration/presence.test.ts` | 45m |

**Total estimate:** ~3.5 hours (Size S)

## 3. Data Model (inline, complete)

### `packages/types/src/collaboration/presence.types.ts`

```typescript
/**
 * User presence status in a room.
 */
export type PresenceStatus = "active" | "idle" | "reconnecting";

/**
 * A user's presence in a room.
 */
export interface RoomMember {
  readonly user_id: string;
  readonly display_name: string;
  readonly avatar_url: string | null;
  readonly initials: string;
  readonly status: PresenceStatus;
  readonly joined_at: string;
  readonly last_heartbeat: string;
}

/**
 * Room presence state.
 */
export interface RoomPresence {
  readonly room_id: string;
  readonly members: ReadonlyArray<RoomMember>;
}

/**
 * Heartbeat payload sent by client.
 */
export interface HeartbeatPayload {
  readonly room_id: string;
  readonly user_id: string;
  readonly timestamp: string;
}

/**
 * Room join/leave event payload from Socket.io.
 */
export interface RoomMemberEvent {
  readonly room_id: string;
  readonly member: RoomMember;
  readonly event_type: "joined" | "left";
}

/**
 * Avatar stack display props.
 */
export interface AvatarStackConfig {
  readonly maxVisible: number;
  readonly avatarSize: number;
  readonly overlapOffset: number;
}

/**
 * Status dot color mapping.
 */
export const PRESENCE_STATUS_COLORS: Record<PresenceStatus, string> = {
  active: "var(--green)",
  idle: "var(--amber-500)",
  reconnecting: "var(--gray-400)",
} as const;

/**
 * Idle timeout in milliseconds (2 minutes).
 */
export const IDLE_TIMEOUT_MS = 2 * 60 * 1000;

/**
 * Heartbeat interval in milliseconds (30 seconds).
 */
export const HEARTBEAT_INTERVAL_MS = 30 * 1000;
```

## 4. Database Schema (inline, complete)

No new tables required. Presence state is ephemeral and managed entirely in-memory by the Socket.io server. Room membership is tracked by STORY-F-19 (Room Management). Heartbeat timestamps are stored in the Socket.io room metadata, not persisted to the database.

## 5. API Contract (complete request/response)

No REST endpoints. Presence is managed entirely via Socket.io events:

**Socket.io Events (client listens):**

| Event | Payload | Description |
|-------|---------|-------------|
| `room:joined` | `RoomMemberEvent` | A user joined the current room |
| `room:left` | `RoomMemberEvent` | A user left the current room |
| `room:presence:update` | `RoomMember` | A member's status changed (active/idle/reconnecting) |

**Socket.io Events (client emits):**

| Event | Payload | Description |
|-------|---------|-------------|
| `room:heartbeat` | `HeartbeatPayload` | Client activity heartbeat (every 30s) |

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
PresenceIndicator (Molecule)
  └── AvatarStack (Molecule)
       ├── Avatar (Atom, shadcn/ui) x maxVisible
       │   └── StatusDot (Atom, absolute positioned)
       └── OverflowBadge (Atom) — "+N" when members > maxVisible
```

### AvatarStack Component

- **Layout:** Flex row with negative right margin (-8px) for overlap effect
- **Max visible:** 3 avatars, then "+N" overflow badge
- **Avatar size:** 32px (default), using shadcn/ui `Avatar` component
- **Overlap:** Each avatar after the first has `margin-left: -8px` with `z-index` decreasing
- **Border:** 2px white border around each avatar for visual separation
- **Tooltip:** shadcn/ui `Tooltip` on hover showing user name and "Joined X ago"

### PresenceIndicator Component

- **Wrapper:** Positioned top-right of page content area (absolute or fixed)
- **Status dot:** 10px circle, absolute positioned at bottom-right of avatar
- **Status colors:** green `var(--green)` (#69a338), amber (idle), gray (reconnecting)
- **Initials fallback:** Two uppercase letters, deterministic background color from user_id hash

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--presence-active` | `var(--green)` (#69a338) | Active status dot |
| `--presence-idle` | `#f59e0b` (amber-500) | Idle status dot |
| `--presence-reconnecting` | `#9ca3af` (gray-400) | Reconnecting status dot |
| `--avatar-border` | `var(--white)` (#ffffff) | Avatar overlap border |
| `--avatar-size-sm` | `32px` | Default avatar diameter |
| `--overflow-bg` | `var(--cream)` (#f5f3ef) | Overflow badge background |

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/collaboration/presence.types.ts` | Types | Create |
| 2 | `packages/types/src/collaboration/index.ts` | Types | Create or Edit |
| 3 | `packages/types/src/index.ts` | Types | Edit (add collaboration export) |
| 4 | `apps/web/src/components/collaboration/AvatarStack.tsx` | View (Molecule) | Create |
| 5 | `apps/web/src/components/collaboration/PresenceIndicator.tsx` | View (Molecule) | Create |
| 6 | `apps/web/src/hooks/usePresence.ts` | Hook | Create |
| 7 | `apps/server/src/__tests__/collaboration/presence.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-19 | faculty | Required | Room management provides member list and Socket.io room infrastructure |
| STORY-U-10 | universal | **DONE** | Dashboard layout where presence indicators are placed |

### NPM Packages (already installed or from prior stories)
- `socket.io-client` -- Socket.io client (installed in STORY-F-23)
- `lucide-react` -- Icons
- `date-fns` -- `formatDistanceToNow` for tooltip "joined X ago"

### Existing Files Needed
- `apps/web/src/components/ui/avatar.tsx` -- shadcn/ui Avatar component
- `apps/web/src/components/ui/tooltip.tsx` -- shadcn/ui Tooltip component
- `apps/server/src/services/collaboration/room.service.ts` -- Room management (STORY-F-19)

## 9. Test Fixtures (inline)

```typescript
import type { RoomMember, RoomPresence, RoomMemberEvent, HeartbeatPayload } from "@journey-os/types";

/** Mock active member */
export const MOCK_ACTIVE_MEMBER: RoomMember = {
  user_id: "user-uuid-001",
  display_name: "Dr. Jones",
  avatar_url: "https://project.supabase.co/storage/v1/object/public/avatars/user-uuid-001.jpg",
  initials: "DJ",
  status: "active",
  joined_at: "2026-02-19T12:00:00Z",
  last_heartbeat: "2026-02-19T12:05:00Z",
};

/** Mock idle member */
export const MOCK_IDLE_MEMBER: RoomMember = {
  user_id: "user-uuid-002",
  display_name: "Dr. Smith",
  avatar_url: null,
  initials: "DS",
  status: "idle",
  joined_at: "2026-02-19T11:50:00Z",
  last_heartbeat: "2026-02-19T12:01:00Z",
};

/** Mock reconnecting member */
export const MOCK_RECONNECTING_MEMBER: RoomMember = {
  user_id: "user-uuid-003",
  display_name: "Prof. Lee",
  avatar_url: null,
  initials: "PL",
  status: "reconnecting",
  joined_at: "2026-02-19T11:45:00Z",
  last_heartbeat: "2026-02-19T11:58:00Z",
};

/** Mock room with 5 members (tests overflow) */
export const MOCK_ROOM_PRESENCE: RoomPresence = {
  room_id: "room-course-uuid-001",
  members: [
    MOCK_ACTIVE_MEMBER,
    MOCK_IDLE_MEMBER,
    MOCK_RECONNECTING_MEMBER,
    { ...MOCK_ACTIVE_MEMBER, user_id: "user-uuid-004", display_name: "Dr. Patel", initials: "DP" },
    { ...MOCK_ACTIVE_MEMBER, user_id: "user-uuid-005", display_name: "Dr. Kim", initials: "DK" },
  ],
};

/** Mock room join event */
export const MOCK_JOIN_EVENT: RoomMemberEvent = {
  room_id: "room-course-uuid-001",
  member: MOCK_ACTIVE_MEMBER,
  event_type: "joined",
};

/** Mock heartbeat */
export const MOCK_HEARTBEAT: HeartbeatPayload = {
  room_id: "room-course-uuid-001",
  user_id: "user-uuid-001",
  timestamp: "2026-02-19T12:05:30Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/collaboration/presence.test.ts` (6 tests)

```
describe("Presence")
  describe("member list")
    it returns current room members with status and avatar data
    it excludes members who have disconnected (room:left received)

  describe("status transitions")
    it sets member status to idle after 2 minutes without heartbeat
    it sets member status back to active on heartbeat received
    it sets member status to reconnecting on socket disconnect

  describe("avatar data")
    it returns avatar_url from Supabase Storage or initials fallback
```

**Total: 6 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Presence indicators are a visual component that requires multi-user simulation. E2E coverage will be part of the real-time collaboration journey test spanning F-19, F-25, F-26.

## 12. Acceptance Criteria

1. Avatar stack displays overlapping circular avatars of users in the current room
2. Tooltip on hover shows user name and time joined
3. Max display: first 3 avatars + "+N" overflow indicator for additional members
4. Avatars appear/disappear in real-time as users join/leave via Socket.io
5. Status dot: green (active), yellow (idle > 2 min), gray (reconnecting)
6. User avatar loaded from Supabase profile or initials fallback with deterministic background color
7. Presence indicator placed in top-right corner of page content area
8. Client emits heartbeat every 30 seconds; server sets idle after 2 min without heartbeat
9. All 6 API tests pass
10. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Avatar stack with overlap | S-F-35-2: "overlapping circular avatars" |
| Max 3 + overflow | S-F-35-2: "show first 3 avatars + '+N' overflow indicator" |
| Status dot colors | S-F-35-2: "green (active), yellow (idle > 2 min), gray (reconnecting)" |
| Heartbeat every 30s | S-F-35-2: "emits heartbeat every 30s" |
| Idle after 2 min | S-F-35-2: "no heartbeat for 2 minutes, status changes to idle" |
| Supabase Storage avatars | S-F-35-2: "Avatar images loaded from Supabase Storage user profile bucket" |
| shadcn/ui Avatar | S-F-35-2: "AvatarStack uses shadcn/ui Avatar component" |
| Socket.io for presence | ARCHITECTURE_v10: "Socket.io for presence only" |

## 14. Environment Prerequisites

- **Socket.io:** Server running with room management (STORY-F-19)
- **Supabase Storage:** Profile avatar bucket accessible for avatar image loading
- **Next.js:** Web app running on port 3000 with dashboard layout
- **No database migrations** needed (presence is ephemeral)
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **usePresence hook:**

```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { RoomMember, RoomMemberEvent } from "@journey-os/types";
import { HEARTBEAT_INTERVAL_MS } from "@journey-os/types";

export function usePresence(roomId: string) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token: /* from auth context */ },
    });
    socketRef.current = socket;

    socket.emit("room:join", { room_id: roomId });

    socket.on("room:joined", (event: RoomMemberEvent) => {
      setMembers((prev) => [...prev, event.member]);
    });

    socket.on("room:left", (event: RoomMemberEvent) => {
      setMembers((prev) => prev.filter((m) => m.user_id !== event.member.user_id));
    });

    socket.on("room:presence:update", (member: RoomMember) => {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? member : m))
      );
    });

    // Heartbeat interval
    const heartbeatInterval = setInterval(() => {
      socket.emit("room:heartbeat", {
        room_id: roomId,
        user_id: /* from auth context */,
        timestamp: new Date().toISOString(),
      });
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      clearInterval(heartbeatInterval);
      socket.emit("room:leave", { room_id: roomId });
      socket.disconnect();
    };
  }, [roomId]);

  return { members };
}
```

- **Idle detection (client-side):** Track `mousemove`, `keypress`, `click` events. If no activity for 2 minutes, stop emitting heartbeats. Resume on activity.

- **Initials generation:**

```typescript
function getInitials(displayName: string): string {
  const parts = displayName.split(" ");
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : "";
  return (first + last).toUpperCase();
}
```

- **Deterministic background color from user_id:**

```typescript
function getAvatarColor(userId: string): string {
  const colors = ["#002c76", "#69a338", "#dc2626", "#7c3aed", "#0891b2", "#d97706"];
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length]!;
}
```

- **AvatarStack overlap:** Use `flex` with `ml-[-8px]` for each avatar after the first. Each avatar gets decreasing `z-index` so the first avatar is on top.

- **Named exports only** for all components and hooks.
