# STORY-F-23: Bell Dropdown Component

**Epic:** E-34 (Notification System)
**Feature:** F-16
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-34-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a bell icon in the header with an unread badge and notification dropdown so that I can quickly see and manage recent notifications.

## Acceptance Criteria
- [ ] Bell icon in header with unread count badge (red dot with number)
- [ ] Badge hidden when unread count is 0; shows "99+" for counts over 99
- [ ] Click opens dropdown/popover with notification list
- [ ] Each notification: icon (by type), title, body preview, time ago, read/unread indicator
- [ ] Click notification: marks as read + navigates to relevant page (e.g., batch detail, review queue)
- [ ] "Mark all as read" button at top of dropdown
- [ ] "View all" link to full notifications page
- [ ] Real-time updates: new notifications appear in dropdown via Socket.io listener
- [ ] Animation: subtle pulse on bell icon when new notification arrives
- [ ] 8-12 API tests: notification list, mark as read, mark all read, navigation links
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/notifications/Notifications.tsx` | `apps/web/src/app/(protected)/notifications/page.tsx` | Full notifications page. Convert React Router to Next.js App Router. Replace inline styles with design tokens. |
| `.context/source/05-reference/app/app/components/layout/TopNavigation.tsx` (bell icon) | `apps/web/src/components/notification/bell-dropdown.tsx` | Extract bell icon + dropdown from navigation into standalone component. Use shadcn/ui Popover. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Controller | apps/server | `src/controllers/notification/notification.controller.ts` |
| View | apps/web | `src/app/(protected)/notifications/page.tsx` |
| Components | apps/web | `src/components/notification/bell-dropdown.tsx`, `src/components/notification/notification-list.tsx`, `src/components/notification/notification-item.tsx` |
| Hooks | apps/web | `src/hooks/use-notifications.ts`, `src/hooks/use-socket-notifications.ts` |
| Tests | apps/server | `src/controllers/notification/__tests__/notification.controller.test.ts` |
| Tests | apps/web | `src/components/notification/__tests__/bell-dropdown.test.tsx` |

## Database Schema
No new tables. Uses existing `notifications` table from STORY-F-2.

## API Endpoints
Uses existing endpoints from STORY-F-2:
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/notifications` | Authenticated | List notifications (paginated) |
| GET | `/api/v1/notifications/unread-count` | Authenticated | Get unread count |
| PATCH | `/api/v1/notifications/:id/read` | Authenticated | Mark single as read |
| PATCH | `/api/v1/notifications/read-all` | Authenticated | Mark all as read |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-10 (Socket.io service exists for real-time updates)
- **Cross-lane:** None

## Testing Requirements
### API/Component Tests (8-12)
1. GET /notifications returns paginated list for current user
2. GET /notifications/unread-count returns correct count
3. PATCH /:id/read marks single notification as read
4. PATCH /read-all marks all as read, returns updated count
5. BellDropdown renders bell icon with badge
6. Badge shows unread count, hidden when 0
7. Badge shows "99+" for counts over 99
8. Dropdown opens on bell click
9. Click notification marks as read
10. Socket.io listener adds new notification to list
11. "Mark all as read" button updates all notifications
12. "View all" link navigates to /notifications

## Implementation Notes
- Bell icon: shadcn/ui icon (Lucide `Bell`) with positioned badge overlay.
- Dropdown: shadcn/ui Popover with fixed height scrollable list (max 10 recent items).
- `useNotifications` hook: fetches initial list, listens for Socket.io `notification:new` events.
- Navigation mapping: each notification type maps to a target URL via type-specific resolver.
- Time ago: use `date-fns` `formatDistanceToNow` for relative timestamps.
- Design tokens for badge color, notification type icons, read/unread text weight.
- In client components, `fetch().json()` returns `unknown` in strict TypeScript. Always cast with `as`.
- Radix UI Popover may not work in jsdom tests -- test callback behavior without rendering Radix components.
