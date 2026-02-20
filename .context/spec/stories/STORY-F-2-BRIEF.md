# STORY-F-2 Brief: Notification Model & Repository

**Generated:** 2026-02-19
**Status:** Ready for implementation
**Brief version:** 1.0

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-2
old_id: S-F-34-1
epic: E-34 (Notification System)
feature: F-16 (Notifications & Alerts)
sprint: 19
lane: faculty
lane_priority: 3
within_lane_order: 2
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-F-10 — Notification Bell & Panel (UI)
  - STORY-F-22 — Review Request Notifications
  - STORY-F-23 — Generation Pipeline Notifications
personas_served: [faculty, institutional_admin, student, advisor]
```

---

## Section 1: Summary

**What to build:** A notification data model and repository backed by the existing `notifications` Supabase table. This story creates the TypeScript types, repository with paginated reads, read/unread tracking, bulk operations, and a service layer for creating and querying notifications. No Neo4j dual-write needed (notifications are Supabase-only).

**Parent epic:** E-34 (Notification System) under F-16 (Notifications & Alerts). This is the data foundation for all notification features. Without the model and repository, no notification UI, real-time alerts, or pipeline events can be stored.

**User story:** As a faculty member, I need a notification system that tracks read/unread status so that I am aware of batch completions, review requests, and system alerts without missing critical events.

**User flows affected:** UF-28 (Notification Consumption), UF-29 (Notification Preferences).

**Personas:** All authenticated users receive notifications, but faculty is the primary consumer (batch_complete, review_request, gap_scan, lint_alert events).

**Key constraints:**
- Notifications table already exists in DDL (reuse, do not recreate)
- 90-day retention policy via scheduled cleanup
- Composite index on (user_id, read, created_at) for efficient unread queries
- Notification types are a strict enum, not free-form strings

---

## Section 2: Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Notification types and DTOs | `packages/types/src/notification/notification.types.ts` | 1h |
| 2 | Notification types barrel export | `packages/types/src/notification/index.ts` | 10m |
| 3 | Update types root index | `packages/types/src/index.ts` | 5m |
| 4 | Supabase migration: add composite index + retention function | Supabase MCP | 30m |
| 5 | Notification error classes | `apps/server/src/errors/notification.error.ts` | 15m |
| 6 | Update errors barrel | `apps/server/src/errors/index.ts` | 5m |
| 7 | NotificationRepository | `apps/server/src/repositories/notification.repository.ts` | 2h |
| 8 | NotificationService | `apps/server/src/services/notification/notification.service.ts` | 1.5h |
| 9 | NotificationController | `apps/server/src/controllers/notification/notification.controller.ts` | 1.5h |
| 10 | Register routes in index.ts | `apps/server/src/index.ts` | 15m |
| 11 | API tests: NotificationService | `apps/server/src/services/notification/__tests__/notification.service.test.ts` | 2h |
| 12 | API tests: NotificationController | `apps/server/src/controllers/notification/__tests__/notification.controller.test.ts` | 1.5h |

**Total estimate:** ~10.5h

---

## Section 3: Data Model (inline, complete)

```typescript
// packages/types/src/notification/notification.types.ts

/** Notification type enum — strict, not free-form */
export type NotificationType =
  | "batch_complete"
  | "review_request"
  | "review_decision"
  | "gap_scan"
  | "lint_alert"
  | "drift_detected"
  | "system";

/** Notification creation request (internal, from services) */
export interface CreateNotificationRequest {
  readonly user_id: string;
  readonly institution_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata?: Record<string, unknown>;
}

/** Batch notification creation (send to multiple users) */
export interface CreateBatchNotificationRequest {
  readonly user_ids: readonly string[];
  readonly institution_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata?: Record<string, unknown>;
}

/** Notification list query parameters */
export interface NotificationListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly unread_only?: boolean;
  readonly type?: NotificationType;
}

/** Stored notification record (Supabase row) */
export interface Notification {
  readonly id: string;
  readonly user_id: string;
  readonly institution_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata: Record<string, unknown> | null;
  readonly read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
}

/** Notification response for API */
export interface NotificationResponse {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly metadata: Record<string, unknown> | null;
  readonly read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
}

/** Unread count response */
export interface UnreadCountResponse {
  readonly count: number;
}

/** Mark-as-read response */
export interface MarkReadResponse {
  readonly id: string;
  readonly read: true;
  readonly read_at: string;
}

/** Bulk mark-all-as-read response */
export interface MarkAllReadResponse {
  readonly updated_count: number;
}
```

---

## Section 4: Database Schema (inline, complete)

The `notifications` table already exists. This migration adds the composite index and retention function.

```sql
-- Migration: add_notifications_index_and_retention
-- Composite index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
    ON notifications(user_id, read, created_at DESC);

-- Index for type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type
    ON notifications(type);

-- Index for institution scoping
CREATE INDEX IF NOT EXISTS idx_notifications_institution_id
    ON notifications(institution_id);

-- Retention cleanup function: delete notifications older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- RLS policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role inserts notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "SuperAdmin reads all notifications" ON notifications
    FOR SELECT USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

---

## Section 5: API Contract (complete request/response)

### GET /api/v1/notifications (Auth: any authenticated user)

**Query params:** `?page=1&limit=25&unread_only=true&type=review_request`

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "notif-uuid-1",
      "type": "review_request",
      "title": "New Review Request",
      "body": "Dr. Smith has requested your review on Pharmacology Quiz 3",
      "metadata": {
        "review_id": "review-uuid",
        "course_id": "course-uuid"
      },
      "read": false,
      "read_at": null,
      "created_at": "2026-02-19T12:00:00Z"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 8,
    "total_pages": 1
  }
}
```

### GET /api/v1/notifications/unread-count (Auth: any authenticated user)

**Success Response (200):**
```json
{
  "data": {
    "count": 5
  },
  "error": null
}
```

### PATCH /api/v1/notifications/:id/read (Auth: notification owner)

**Request:** No body required.

**Success Response (200):**
```json
{
  "data": {
    "id": "notif-uuid-1",
    "read": true,
    "read_at": "2026-02-19T14:30:00Z"
  },
  "error": null
}
```

### POST /api/v1/notifications/mark-all-read (Auth: any authenticated user)

**Request:** No body required.

**Success Response (200):**
```json
{
  "data": {
    "updated_count": 5
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | No valid JWT |
| 403 | `FORBIDDEN` | Trying to read/mark another user's notification |
| 404 | `NOTIFICATION_NOT_FOUND` | Notification ID does not exist or belongs to another user |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

Not applicable for this story. STORY-F-2 is a backend-only model and API story. Frontend notification bell and panel are covered in STORY-F-10 (Notification Bell & Panel).

---

## Section 7: Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/notification/notification.types.ts` | Types | Create |
| 2 | `packages/types/src/notification/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add notification export) |
| 4 | Supabase migration via MCP | Database | Apply |
| 5 | `apps/server/src/errors/notification.error.ts` | Errors | Create |
| 6 | `apps/server/src/errors/index.ts` | Errors | Edit (add notification errors) |
| 7 | `apps/server/src/repositories/notification.repository.ts` | Repository | Create |
| 8 | `apps/server/src/services/notification/notification.service.ts` | Service | Create |
| 9 | `apps/server/src/controllers/notification/notification.controller.ts` | Controller | Create |
| 10 | `apps/server/src/index.ts` | Routes | Edit (add notification routes) |
| 11 | `apps/server/src/services/notification/__tests__/notification.service.test.ts` | Tests | Create |
| 12 | `apps/server/src/controllers/notification/__tests__/notification.controller.test.ts` | Tests | Create |

---

## Section 8: Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for authenticated access |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client for notifications table
- `express` — Server framework
- `zod` — Request validation
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `AuthMiddleware`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError` base class
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `PaginationMeta`

### Does NOT Depend On
- Neo4j (notifications are Supabase-only, no graph representation)
- DualWriteService (single-store pattern)
- Any frontend packages (backend-only story)
- Any other faculty stories (standalone data layer)

---

## Section 9: Test Fixtures (inline)

```typescript
// Valid notification creation (internal use by services)
export const VALID_NOTIFICATION = {
  user_id: "user-uuid-001",
  institution_id: "inst-uuid-001",
  type: "review_request" as const,
  title: "New Review Request",
  body: "Dr. Smith has requested your review on Pharmacology Quiz 3",
  metadata: { review_id: "review-uuid-001", course_id: "course-uuid-001" },
};

// System notification (no metadata)
export const SYSTEM_NOTIFICATION = {
  user_id: "user-uuid-001",
  institution_id: "inst-uuid-001",
  type: "system" as const,
  title: "Scheduled Maintenance",
  body: "The platform will undergo maintenance on Saturday 2-4 AM EST",
};

// Batch completion notification
export const BATCH_COMPLETE_NOTIFICATION = {
  user_id: "user-uuid-001",
  institution_id: "inst-uuid-001",
  type: "batch_complete" as const,
  title: "Question Generation Complete",
  body: "Your batch of 50 questions for PHARM-101 has been generated",
  metadata: { batch_id: "batch-uuid-001", question_count: 50 },
};

// Stored notification (as returned from DB)
export const STORED_NOTIFICATION = {
  id: "notif-uuid-001",
  user_id: "user-uuid-001",
  institution_id: "inst-uuid-001",
  type: "review_request" as const,
  title: "New Review Request",
  body: "Dr. Smith has requested your review on Pharmacology Quiz 3",
  metadata: { review_id: "review-uuid-001" },
  read: false,
  read_at: null,
  created_at: "2026-02-19T12:00:00Z",
};

// Read notification
export const READ_NOTIFICATION = {
  ...STORED_NOTIFICATION,
  id: "notif-uuid-002",
  read: true,
  read_at: "2026-02-19T14:30:00Z",
};

// Invalid notification (missing required fields)
export const MISSING_TITLE = { ...VALID_NOTIFICATION, title: "" };
export const MISSING_BODY = { ...VALID_NOTIFICATION, body: "" };
export const INVALID_TYPE = { ...VALID_NOTIFICATION, type: "invalid_type" };
export const MISSING_USER = { ...VALID_NOTIFICATION, user_id: "" };

// Auth context fixtures
export const NOTIFICATION_OWNER = {
  id: "user-uuid-001",
  email: "faculty@med.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-001",
};

export const OTHER_USER = {
  id: "user-uuid-002",
  email: "other@med.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-001",
};
```

---

## Section 10: API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/services/notification/__tests__/notification.service.test.ts`

```
describe("NotificationService")
  describe("create")
    ✓ creates notification with all required fields
    ✓ creates notification with metadata JSONB
    ✓ creates notification without metadata (null)
    ✓ sets read=false and read_at=null by default
    ✓ rejects missing title (VALIDATION_ERROR)
    ✓ rejects missing body (VALIDATION_ERROR)
    ✓ rejects invalid notification type (VALIDATION_ERROR)
    ✓ rejects empty user_id (VALIDATION_ERROR)

  describe("createBatch")
    ✓ creates notifications for multiple user_ids
    ✓ returns count of created notifications
    ✓ rejects empty user_ids array

  describe("findByUserId")
    ✓ returns paginated notifications for user
    ✓ sorts by created_at DESC (newest first)
    ✓ filters by unread_only=true
    ✓ filters by notification type
    ✓ defaults to page=1, limit=25
    ✓ returns empty array for user with no notifications

  describe("getUnreadCount")
    ✓ returns count of unread notifications for user
    ✓ returns 0 when all notifications are read

  describe("markAsRead")
    ✓ sets read=true and read_at to current timestamp
    ✓ throws NOTIFICATION_NOT_FOUND for non-existent id
    ✓ throws FORBIDDEN when user does not own notification
    ✓ is idempotent (marking already-read notification succeeds)

  describe("markAllAsRead")
    ✓ marks all unread notifications for user as read
    ✓ returns count of updated notifications
    ✓ returns 0 when no unread notifications exist

  describe("deleteOld")
    ✓ calls cleanup function for notifications older than 90 days
    ✓ returns count of deleted notifications
```

**File:** `apps/server/src/controllers/notification/__tests__/notification.controller.test.ts`

```
describe("NotificationController")
  describe("GET /api/v1/notifications")
    ✓ returns 200 with paginated notifications
    ✓ passes unread_only query param to service
    ✓ passes type query param to service
    ✓ returns 401 without auth token

  describe("GET /api/v1/notifications/unread-count")
    ✓ returns 200 with unread count
    ✓ uses authenticated user's ID

  describe("PATCH /api/v1/notifications/:id/read")
    ✓ returns 200 with updated notification
    ✓ returns 404 for non-existent notification
    ✓ returns 403 for another user's notification
    ✓ narrows req.params.id with typeof check

  describe("POST /api/v1/notifications/mark-all-read")
    ✓ returns 200 with updated count
    ✓ uses authenticated user's ID
```

**Total: ~39 tests** (27 service + 12 controller)

---

## Section 11: E2E Test Spec (Playwright -- CONDITIONAL)

Not applicable. Notification Model & Repository is a backend story. E2E tests for the notification panel will be added in STORY-F-10 if it qualifies as a critical journey.

---

## Section 12: Acceptance Criteria

| # | Criteria | Verification |
|---|----------|-------------|
| 1 | NotificationService.create stores notification in Supabase with correct type | API test |
| 2 | Notification types restricted to the 7-value enum | API test |
| 3 | GET /api/v1/notifications returns paginated list scoped to authenticated user | API test |
| 4 | unread_only=true filter works correctly | API test |
| 5 | type filter returns only matching notification type | API test |
| 6 | GET /api/v1/notifications/unread-count returns correct unread count | API test |
| 7 | PATCH /api/v1/notifications/:id/read sets read=true and read_at timestamp | API test |
| 8 | POST /api/v1/notifications/mark-all-read bulk-updates all unread for user | API test |
| 9 | User cannot read or mark another user's notifications (403) | API test |
| 10 | Composite index (user_id, read, created_at) exists for query performance | Migration |
| 11 | cleanup_old_notifications() function deletes records older than 90 days | API test |
| 12 | createBatch creates notifications for multiple users in one call | API test |
| 13 | metadata JSONB stored and returned correctly | API test |
| 14 | All 39 API tests pass | CI |

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Notification endpoints | API_CONTRACT_v1 SS Notifications: GET /notifications, PATCH /notifications/:id/read |
| Notification types enum | S-F-34-1 SS Acceptance Criteria: 7 notification types |
| 90-day retention | S-F-34-1 SS Non-Functional: "Retention policy: 90 days TTL" |
| Composite index | S-F-34-1 SS Performance: "(user_id, read, created_at)" |
| Notifications table DDL | SUPABASE_DDL_v1 SS notifications table |
| Supabase-only (no Neo4j) | ARCHITECTURE_v10 SS 3.2: "Notifications are ephemeral, no graph representation" |
| RLS: user reads own | ARCHITECTURE_v10 SS 4.2: "Row-level security on all user-scoped tables" |

---

## Section 14: Environment Prerequisites

- **Supabase:** Project running, `notifications` table exists (from initial DDL), migration for indexes applied
- **Express:** Server running on port 3001
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **No Neo4j needed** for this story (notifications are Supabase-only)

---

## Section 15: Figma Make Prototype

Code directly. No UI in this story (backend model and API only). Frontend notification bell prototype needed when STORY-F-10 (Notification Bell & Panel) is implemented.
