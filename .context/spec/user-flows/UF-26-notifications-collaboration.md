# UF-26: Notifications & Collaboration

**Feature:** F-16 (Notifications & Collaboration)
**Persona:** Faculty — Dr. Amara Osei (applies to all personas)
**Goal:** Receive real-time notifications for key events (generation complete, review needed, batch done, gap alerts) and collaborate with co-faculty on generation sessions

## Preconditions
- User is logged in (any persona)
- Socket.io connection established for real-time push
- Notification preferences configured (F-18)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | (any page) | See bell icon in header with unread count badge (e.g., "5") | Notification icon visible globally |
| 2 | (any page) | Click bell icon | Dropdown opens: list of recent notifications |
| 3 | (any page, dropdown) | See notification types: "Question generated", "Review needed", "Batch complete", "Gap alert" | Each with icon, title, timestamp, read/unread indicator |
| 4 | (any page, dropdown) | Click "Question generated: Cardiovascular question ready for review" | Navigate to `/items/:id` (item detail) |
| 5 | (any page, dropdown) | Click "Mark all as read" | All notifications marked read, badge count resets to 0 |
| 6 | `/notifications` (Notifications) | Click "View All" in dropdown | Full notification list with filters |
| 7 | `/notifications` | Filter by type: "Review Needed" | Only review notifications shown |
| 8 | `/notifications` | Filter by date range | Notifications within range |

### Real-Time Push
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| P1 | `/generate` (workbench) | Start a generation (UF-14) | Socket.io room joined: `gen:session_abc` |
| P2 | (any page) | Batch generation completes (started earlier) | Bell badge increments, toast notification: "Batch complete: 10 items generated" |
| P3 | (any page) | Nightly gap scan finds new gaps | Bell badge increments: "3 new coverage gaps in MEDI 531" |

### Collaboration
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| C1 | `/generate` (workbench) | See "Observers" indicator: "1 other viewing" | Presence awareness |
| C2 | `/generate` | Click observers icon | See list of who is watching this session |
| C3 | `/settings/collaborators` (Collaborators) | Manage who can observe: add/remove faculty | List of collaborators per course |

## Error Paths
- **Socket.io disconnected**: Step P2 — Notifications delivered on next page load (persisted in Supabase)
- **No notifications**: Step 2 — "No notifications yet" empty state in dropdown
- **Notification action target deleted**: Step 4 — "This item is no longer available" if question was deleted
- **Too many unread**: Step 1 — Badge shows "99+" for > 99 unread

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/notifications` | Step 2 — fetch recent notifications |
| PATCH | `/api/v1/notifications/:id/read` | Step 4 — mark as read on click |
| PATCH | `/api/v1/notifications/read-all` | Step 5 — mark all as read |
| GET | `/api/v1/notifications?type=review` | Step 7 — filtered notifications |

## Test Scenario (Playwright outline)
Login as: Faculty
Steps:
1. Verify bell icon visible in header
2. Create a notification via API (in beforeAll)
3. Click bell icon, verify dropdown opens with notification
4. Click a notification, verify navigation to target
5. Click "Mark all as read", verify badge resets
Assertions:
- Bell icon renders with correct unread count
- Clicking notification navigates to correct page
- Mark-all-read clears badge
- Notifications persisted across page refreshes

## Source References
- ARCHITECTURE_v10.md § 3.5 (Socket.io for presence/notifications)
- ROADMAP_v2_3.md § Sprint 19 (notifications + profile)
- SUPABASE_DDL_v1.md § notifications table
- DESIGN_SPEC.md § 5.1 Group M (Notifications, Collaborators)
