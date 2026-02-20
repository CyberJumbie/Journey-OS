# STORY-F-23 Brief: Bell Dropdown Component

## 0. Lane & Priority

```yaml
story_id: STORY-F-23
old_id: S-F-34-4
lane: faculty
lane_priority: 3
within_lane_order: 23
sprint: 19
size: M
depends_on:
  - STORY-F-10 (faculty) — NotificationService + Socket.io service must exist for real-time updates
blocks: []
personas_served: [faculty, institutional_admin, student]
epic: E-34 (Notification System)
feature: F-16 (Notifications & Real-time)
```

## 1. Summary

Build a **bell icon notification dropdown** in the dashboard header that displays unread notification count, a scrollable list of recent notifications, and supports real-time updates via Socket.io. Clicking a notification marks it as read and navigates to the relevant page. The component includes a "Mark all as read" action and a "View all" link to the full notifications page.

Key constraints:
- Bell icon with red badge showing unread count (hidden at 0, "99+" for > 99)
- Dropdown is a shadcn/ui Popover with max 10 recent items in a scrollable list
- Each notification shows: type icon (Lucide), title, body preview, time ago, read/unread indicator
- Real-time: new notifications appear via Socket.io `notification:new` event
- Subtle pulse animation on bell when new notification arrives
- Navigation mapping: each notification type resolves to a target URL
- Server endpoint: GET /api/v1/notifications with pagination, POST mark-read, POST mark-all-read
- Design tokens for badge color, type icons, read/unread text weight

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Add notification controller endpoints (list, mark-read, mark-all-read) | `apps/server/src/controllers/notification/notification.controller.ts` | 60m |
| 2 | Register notification routes | `apps/server/src/index.ts` | 10m |
| 3 | Build `NotificationItem` atom component | `apps/web/src/components/notification/NotificationItem.tsx` | 30m |
| 4 | Build `NotificationList` molecule component | `apps/web/src/components/notification/NotificationList.tsx` | 30m |
| 5 | Build `BellDropdown` organism component | `apps/web/src/components/notification/BellDropdown.tsx` | 60m |
| 6 | Implement `useNotifications` hook (fetch + state) | `apps/web/src/hooks/useNotifications.ts` | 45m |
| 7 | Implement `useSocketNotifications` hook (real-time) | `apps/web/src/hooks/useSocketNotifications.ts` | 30m |
| 8 | Create notifications page (full list view) | `apps/web/src/app/(dashboard)/notifications/page.tsx` | 30m |
| 9 | Integrate BellDropdown into dashboard header | `apps/web/src/components/layout/DashboardHeader.tsx` | 15m |
| 10 | Write API tests (10 tests) | `apps/server/src/__tests__/notification/notification.controller.test.ts` | 60m |

**Total estimate:** ~6 hours (Size M)

## 3. Data Model (inline, complete)

No new types needed beyond what STORY-F-10 provides. The following are the key types consumed:

```typescript
// From STORY-F-10 (already exists in packages/types)

/** Notification record from the notifications table */
export interface Notification {
  readonly id: string;
  readonly user_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly action_url: string | null;
  readonly is_read: boolean;
  readonly metadata: Record<string, unknown>;
  readonly created_at: string;
  readonly read_at: string | null;
}

export type NotificationType =
  | "batch_complete"
  | "review_request"
  | "review_decision"
  | "gap_scan"
  | "kaizen_drift"
  | "kaizen_lint"
  | "system";

/** Client-side notification list response */
export interface NotificationListResponse {
  readonly notifications: ReadonlyArray<Notification>;
  readonly unread_count: number;
}

/** Mark read request */
export interface MarkReadRequest {
  readonly notification_ids: ReadonlyArray<string>;
}
```

### Frontend-only types (in component files)

```typescript
/** Navigation URL resolver mapping */
export interface NotificationNavMap {
  readonly [type: string]: (notification: Notification) => string;
}

/** Bell dropdown props */
export interface BellDropdownProps {
  readonly className?: string;
}

/** Notification item props */
export interface NotificationItemProps {
  readonly notification: Notification;
  readonly onRead: (id: string) => void;
  readonly onNavigate: (url: string) => void;
}
```

## 4. Database Schema (inline, complete)

No new tables or migrations. Uses existing `notifications` table from STORY-F-10.

## 5. API Contract (complete request/response)

### GET /api/v1/notifications (Auth: any authenticated)

**Query params:** `?page=1&limit=10&unread_only=false`

**Success Response (200):**
```json
{
  "data": {
    "notifications": [
      {
        "id": "notif-uuid-001",
        "user_id": "user-uuid-001",
        "type": "batch_complete",
        "title": "Batch Generation Complete",
        "body": "Cardiology Question Set: 23/25 succeeded, 2 failed",
        "action_url": "/dashboard/batches/batch-uuid-001",
        "is_read": false,
        "metadata": {},
        "created_at": "2026-02-19T12:00:00Z",
        "read_at": null
      }
    ],
    "unread_count": 5
  },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "total_pages": 5
  }
}
```

### POST /api/v1/notifications/mark-read (Auth: any authenticated)

**Request:**
```json
{
  "notification_ids": ["notif-uuid-001", "notif-uuid-002"]
}
```

**Success Response (200):**
```json
{
  "data": { "marked": 2 },
  "error": null
}
```

### POST /api/v1/notifications/mark-all-read (Auth: any authenticated)

**Request:** (empty body)

**Success Response (200):**
```json
{
  "data": { "marked": 5 },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 404 | `NOT_FOUND` | Notification ID not found or belongs to another user |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Component Hierarchy (Atomic Design)

```
BellDropdown (Organism)
  ├── Bell icon (Lucide Bell) with badge overlay (Atom)
  ├── Popover (shadcn/ui)
  │   ├── Header: "Notifications" + "Mark all as read" button
  │   ├── NotificationList (Molecule)
  │   │   └── NotificationItem (Atom) x 10 max
  │   └── Footer: "View all notifications" link
  └── Pulse animation (CSS keyframe on new notification)
```

### BellDropdown Component

- **Placement:** Dashboard header, right side, before user avatar
- **Trigger:** Click on bell icon opens shadcn/ui `Popover`
- **Badge:** Absolute positioned red dot with white text. Hidden when `unread_count === 0`. Shows `99+` when > 99.
- **Popover:** Fixed width 380px, max height 480px, scrollable content area
- **Pulse:** CSS `@keyframes pulse` animation triggered for 2 seconds when `notification:new` Socket.io event received

### NotificationItem Component

- **Layout:** Horizontal: type icon (24px Lucide) | title + body preview + time ago | read indicator (blue dot)
- **Type icons:** `batch_complete` -> CheckCircle, `review_request` -> MessageSquare, `review_decision` -> ThumbsUp, `gap_scan` -> Search, `kaizen_drift` -> TrendingDown, `kaizen_lint` -> Shield, `system` -> Info
- **Time ago:** `date-fns` `formatDistanceToNow` with `{ addSuffix: true }`
- **Read/unread:** Unread items have `font-weight: 600` title, blue dot indicator. Read items have `font-weight: 400`.
- **Click:** Calls `onRead(id)` then navigates to `action_url`

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--badge-bg` | `#dc2626` (red-600) | Unread count badge background |
| `--badge-text` | `#ffffff` | Badge text color |
| `--unread-dot` | `var(--navy-deep)` (#002c76) | Unread indicator dot |
| `--notification-hover` | `var(--cream)` (#f5f3ef) | Item hover background |
| `--notification-unread-weight` | `600` | Unread title font weight |
| `--notification-read-weight` | `400` | Read title font weight |

### Notifications Page (`/dashboard/notifications`)

Full-page notification list with pagination. Reuses `NotificationItem` and `NotificationList` components. Adds "unread only" filter toggle. Uses `@web/components/notification/*` imports.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `apps/server/src/controllers/notification/notification.controller.ts` | Controller | Create |
| 2 | `apps/server/src/index.ts` | Routes | Edit (add notification routes) |
| 3 | `apps/web/src/components/notification/NotificationItem.tsx` | View (Atom) | Create |
| 4 | `apps/web/src/components/notification/NotificationList.tsx` | View (Molecule) | Create |
| 5 | `apps/web/src/components/notification/BellDropdown.tsx` | View (Organism) | Create |
| 6 | `apps/web/src/hooks/useNotifications.ts` | Hook | Create |
| 7 | `apps/web/src/hooks/useSocketNotifications.ts` | Hook | Create |
| 8 | `apps/web/src/app/(dashboard)/notifications/page.tsx` | Page | Create |
| 9 | `apps/web/src/components/layout/DashboardHeader.tsx` | Layout | Edit (add BellDropdown) |
| 10 | `apps/server/src/__tests__/notification/notification.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-10 | faculty | Required | NotificationService, Socket.io service, notifications table |
| STORY-U-3 | universal | **DONE** | AuthMiddleware for protected routes |
| STORY-U-10 | universal | **DONE** | Dashboard layout where BellDropdown is placed |

### NPM Packages (new for web)
| Package | Version | Purpose | Size |
|---------|---------|---------|------|
| `date-fns` | ^3.x | `formatDistanceToNow` for time-ago display | ~30KB (tree-shaken) |
| `socket.io-client` | ^4.x | Socket.io client for real-time notifications | ~50KB |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `lucide-react` -- Icon library
- `express` -- Server framework
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/services/notification/notification.service.ts` -- NotificationService (STORY-F-10)
- `apps/server/src/middleware/auth.middleware.ts` -- AuthMiddleware
- `apps/web/src/components/layout/DashboardHeader.tsx` -- Header to integrate bell into
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`, `PaginationMeta`

## 9. Test Fixtures (inline)

```typescript
import type { Notification } from "@journey-os/types";

/** Mock unread notification */
export const MOCK_UNREAD_NOTIFICATION: Notification = {
  id: "notif-uuid-001",
  user_id: "user-uuid-001",
  type: "batch_complete",
  title: "Batch Generation Complete",
  body: "Cardiology Question Set: 23/25 succeeded, 2 failed",
  action_url: "/dashboard/batches/batch-uuid-001",
  is_read: false,
  metadata: {},
  created_at: "2026-02-19T12:00:00Z",
  read_at: null,
};

/** Mock read notification */
export const MOCK_READ_NOTIFICATION: Notification = {
  id: "notif-uuid-002",
  user_id: "user-uuid-001",
  type: "review_request",
  title: "Review Requested",
  body: "Dr. Smith requested review of Cardiac Physiology MCQ #12",
  action_url: "/dashboard/reviews/review-uuid-001",
  is_read: true,
  metadata: {},
  created_at: "2026-02-19T11:00:00Z",
  read_at: "2026-02-19T11:30:00Z",
};

/** Mock notification list (10 items for dropdown) */
export const MOCK_NOTIFICATION_LIST: Notification[] = [
  MOCK_UNREAD_NOTIFICATION,
  MOCK_READ_NOTIFICATION,
  {
    id: "notif-uuid-003",
    user_id: "user-uuid-001",
    type: "gap_scan",
    title: "Coverage Gaps Found",
    body: "Medical Sciences I: 5 gaps detected, 2 critical",
    action_url: "/dashboard/courses/course-uuid-001/gaps",
    is_read: false,
    metadata: {},
    created_at: "2026-02-19T10:00:00Z",
    read_at: null,
  },
];

/** Mock faculty user token */
export const MOCK_FACULTY_USER = {
  sub: "user-uuid-001",
  email: "drjones@msm.edu",
  role: "faculty",
  institution_id: "inst-uuid-001",
};

/** Different user's notification (for ownership tests) */
export const OTHER_USER_NOTIFICATION: Notification = {
  ...MOCK_UNREAD_NOTIFICATION,
  id: "notif-uuid-099",
  user_id: "user-uuid-999",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/notification/notification.controller.test.ts` (10 tests)

```
describe("NotificationController")
  describe("listNotifications (GET /api/v1/notifications)")
    it returns paginated notification list with unread_count (200)
    it filters to unread only when unread_only=true
    it returns empty list for user with no notifications
    it returns 401 for unauthenticated request

  describe("markRead (POST /api/v1/notifications/mark-read)")
    it marks specified notifications as read and sets read_at (200)
    it returns 404 for notification belonging to another user
    it ignores already-read notifications without error

  describe("markAllRead (POST /api/v1/notifications/mark-all-read)")
    it marks all unread notifications as read for current user (200)
    it returns marked: 0 when no unread notifications exist

  describe("navigation mapping")
    it returns correct action_url for each notification type
```

**Total: 10 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story in isolation. The notification bell E2E will be part of the critical notification journey test when triggers (F-22), bell UI (F-23), and the notification page are all integrated.

## 12. Acceptance Criteria

1. Bell icon appears in dashboard header with unread count badge
2. Badge hidden when unread count is 0; shows "99+" for counts > 99
3. Click opens popover with scrollable notification list (max 10 recent)
4. Each notification displays type icon, title, body preview, time ago, read/unread indicator
5. Clicking a notification marks it as read and navigates to the relevant page
6. "Mark all as read" button marks all unread notifications for current user
7. "View all" link navigates to `/dashboard/notifications` full-page list
8. Real-time: new notifications appear via Socket.io `notification:new` event
9. Pulse animation on bell icon when new notification arrives
10. GET `/api/v1/notifications` returns paginated list with unread_count
11. POST `/api/v1/notifications/mark-read` marks specified notifications
12. POST `/api/v1/notifications/mark-all-read` marks all unread
13. Users can only read/mark their own notifications
14. All 10 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Bell icon with unread badge | S-F-34-4: "Bell icon in header with unread count badge" |
| Popover dropdown | S-F-34-4: "shadcn/ui Popover with fixed height scrollable list" |
| Socket.io for real-time | ARCHITECTURE_v10: "Socket.io for presence only" (extended to notification push) |
| date-fns for time ago | S-F-34-4: "formatDistanceToNow for relative timestamps" |
| Navigation mapping per type | S-F-34-4: "each notification type maps to a target URL" |
| Lucide Bell icon | S-F-34-4: "Lucide Bell with positioned badge overlay" |
| Pulse animation | S-F-34-4: "subtle pulse on bell icon when new notification arrives" |
| Design tokens | S-F-34-4: "Design tokens for badge color, notification type icons" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `notifications` table exists (STORY-F-10)
- **Socket.io:** Server running with `notification:new` event emitter (STORY-F-10)
- **Express:** Server running on port 3001 with auth middleware
- **Next.js:** Web app running on port 3000 with dashboard layout
- **No Neo4j needed** for this story
- **New npm packages:** `date-fns` and `socket.io-client` in apps/web

## 15. Implementation Notes

- **useNotifications hook:**

```typescript
import { useState, useEffect, useCallback } from "react";
import type { Notification } from "@journey-os/types";

export function useNotifications(limit = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch(`/api/v1/notifications?limit=${limit}`);
    const json = await res.json();
    setNotifications(json.data.notifications);
    setUnreadCount(json.data.unread_count);
    setIsLoading(false);
  }, [limit]);

  const markRead = useCallback(async (ids: string[]) => {
    await fetch("/api/v1/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notification_ids: ids }),
    });
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  return { notifications, unreadCount, isLoading, markRead, refetch: fetchNotifications };
}
```

- **useSocketNotifications hook:**

```typescript
import { useEffect } from "react";
import { io } from "socket.io-client";
import type { Notification } from "@journey-os/types";

export function useSocketNotifications(
  onNewNotification: (notification: Notification) => void,
) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      auth: { token: /* get from auth context */ },
    });

    socket.on("notification:new", (notification: Notification) => {
      onNewNotification(notification);
    });

    return () => { socket.disconnect(); };
  }, [onNewNotification]);
}
```

- **Badge component:** Use absolute positioning on a `span` inside a `button`. Background `var(--badge-bg)`, text white, min-width 20px, border-radius full.

- **Pulse animation CSS:**

```css
@keyframes bell-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
.bell-pulse {
  animation: bell-pulse 0.5s ease-in-out 2;
}
```

- **Navigation resolver:**

```typescript
const NAV_MAP: Record<string, (n: Notification) => string> = {
  batch_complete: (n) => n.action_url ?? "/dashboard/batches",
  review_request: (n) => n.action_url ?? "/dashboard/reviews",
  review_decision: (n) => n.action_url ?? "/dashboard/reviews",
  gap_scan: (n) => n.action_url ?? "/dashboard/courses",
  kaizen_drift: (n) => n.action_url ?? "/dashboard/analytics",
  kaizen_lint: (n) => n.action_url ?? "/dashboard/analytics",
  system: () => "/dashboard/notifications",
};
```

- **NotificationController:** Uses constructor DI with NotificationService. All methods read `req.user.sub` for user scoping.

- **Named exports only** for all components, hooks, and controller.

- **`export default`** for the notifications page.tsx (Next.js App Router exception).
