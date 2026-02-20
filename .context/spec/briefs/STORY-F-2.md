# STORY-F-2: Notification Model & Repository

**Epic:** E-34 (Notification System)
**Feature:** F-16
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-34-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a notification data model with read/unread tracking so that the platform can persist and manage notifications reliably.

## Acceptance Criteria
- [ ] Supabase `notifications` table: id, user_id, type, title, body, metadata (JSONB), is_read, created_at
- [ ] Notification types enum: `batch_complete`, `review_request`, `review_decision`, `gap_scan`, `lint_alert`, `drift_detected`, `system`
- [ ] NotificationRepository: create, findByUserId (paginated), markAsRead, markAllAsRead, deleteOld
- [ ] Unread count query: efficient count of unread notifications per user
- [ ] Retention policy: auto-delete notifications older than configurable TTL (default 90 days)
- [ ] Index on (user_id, is_read, created_at) for efficient queries
- [ ] Model class with private `#fields`, public getters, constructor DI
- [ ] Custom error class: `NotificationError`, `NotificationNotFoundError`
- [ ] 10-14 API tests: CRUD operations, pagination, unread count, retention cleanup, type filtering
- [ ] TypeScript strict, named exports only

## Reference Screens
> **None** -- backend-only story. Bell dropdown UI is built in STORY-F-23.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/notification/notification.types.ts` |
| Model | apps/server | `src/models/notification.model.ts` |
| Repository | apps/server | `src/repositories/notification.repository.ts` |
| Errors | apps/server | `src/errors/notification.errors.ts` |
| Tests | apps/server | `src/repositories/__tests__/notification.repository.test.ts` |

## Database Schema

### Supabase -- `notifications` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK -> auth.users |
| `type` | varchar(30) | NOT NULL, CHECK IN ('batch_complete', 'review_request', 'review_decision', 'gap_scan', 'lint_alert', 'drift_detected', 'system') |
| `title` | varchar(255) | NOT NULL |
| `body` | text | NULL |
| `metadata` | jsonb | NULL |
| `is_read` | boolean | NOT NULL, DEFAULT false |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

INDEX on (user_id, is_read, created_at DESC).

### No Neo4j schema -- notifications live only in Supabase.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/notifications` | Authenticated | List user's notifications (paginated) |
| GET | `/api/v1/notifications/unread-count` | Authenticated | Get unread count |
| PATCH | `/api/v1/notifications/:id/read` | Authenticated | Mark single notification as read |
| PATCH | `/api/v1/notifications/read-all` | Authenticated | Mark all as read |

## Dependencies
- **Blocks:** STORY-F-10 (Socket.io Notification Service), STORY-F-23 (Bell Dropdown), STORY-F-22 (Inngest Triggers)
- **Blocked by:** STORY-U-1 (auth -- user_id FK requires auth system)
- **Cross-lane:** STORY-U-1 (Sprint 1 auth)

## Testing Requirements
### API Tests (10-14)
1. Create notification returns valid record
2. findByUserId returns paginated results ordered by created_at DESC
3. Pagination with offset and limit works correctly
4. markAsRead updates is_read to true
5. markAllAsRead updates all unread notifications for user
6. Unread count returns correct count
7. Unread count returns 0 when all read
8. Type filtering returns only matching types
9. Retention cleanup deletes notifications older than TTL
10. RLS: users can only read their own notifications
11. Create with metadata JSONB stores type-specific payload
12. Notification model private fields not accessible via bracket notation

## Implementation Notes
- Metadata JSONB stores type-specific payload: e.g., `batch_complete` has `{ batchId, successCount, failCount }`.
- Unread count uses `SELECT COUNT(*) WHERE user_id = $1 AND is_read = false` -- consider caching for high-traffic.
- Retention cleanup: Inngest cron job running weekly to delete expired notifications (built in STORY-F-22).
- Table RLS: users can only read/modify their own notifications.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
- The story references `read` as the column name but existing types may use `is_read`. Always check existing types first.
- Use `.select().single()` on ALL Supabase write operations.
