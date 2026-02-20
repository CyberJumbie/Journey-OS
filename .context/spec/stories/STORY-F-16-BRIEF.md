# STORY-F-16 Brief: Notification Preferences

## 0. Lane & Priority

```yaml
story_id: STORY-F-16
old_id: S-F-38-2
lane: faculty
lane_priority: 3
within_lane_order: 16
sprint: 19
size: S
depends_on:
  - STORY-F-5 (faculty) — Profile Page (settings layout exists)
blocks: []
cross_epic:
  - STORY-F-10 (faculty) — NotificationService reads preferences before sending
personas_served: [faculty, faculty_course_director]
epic: E-38 (Profile & Preferences)
feature: F-18 (User Preferences)
```

## 1. Summary

Build a **notification preferences panel** at `/settings/notifications` where faculty members configure per-type, per-channel notification delivery. The preferences UI renders a matrix table: notification types as rows, channels (in-app, email) as columns, with toggle switches. Changes save immediately via optimistic update with rollback on failure.

Preferences are stored in a `user_preferences` table as a JSONB column keyed by `notification_preferences`. The `NotificationService.push()` method (from F-10) will read these preferences before dispatching -- this story provides the storage and API; the service integration hook is documented for F-10 to consume.

Key constraints:
- Authenticated route (faculty+ via RbacMiddleware)
- 6 notification types: `batch_complete`, `review_request`, `review_decision`, `gap_scan`, `lint_alert`, `system`
- 2 channels: `in_app` (default: true), `email` (default: false)
- Email channel: preference is saved but delivery is not implemented yet (future story)
- "Reset to defaults" button restores all to default values
- Optimistic toggle: UI flips immediately, rolls back on 4xx/5xx

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define `NotificationPreferences` types | `packages/types/src/user/notification-preferences.types.ts` | 20m |
| 2 | Update barrel exports | `packages/types/src/user/index.ts` | 5m |
| 3 | Migration: create `user_preferences` table | Supabase MCP | 15m |
| 4 | Create `PreferenceNotFoundError` error class | `apps/server/src/errors/preference.error.ts` | 10m |
| 5 | Export new error | `apps/server/src/errors/index.ts` | 5m |
| 6 | Implement `NotificationPreferenceService` | `apps/server/src/services/user/notification-preference.service.ts` | 45m |
| 7 | Implement `NotificationPreferenceController` | `apps/server/src/controllers/user/notification-preference.controller.ts` | 30m |
| 8 | Register routes in Express app | `apps/server/src/index.ts` | 10m |
| 9 | Build `NotificationPreferencesPanel` component | `apps/web/src/components/settings/notification-preferences-panel.tsx` | 45m |
| 10 | Build settings notifications page | `apps/web/src/app/(dashboard)/settings/notifications/page.tsx` | 15m |
| 11 | Write API tests (8 tests) | `apps/server/src/__tests__/notification-preference.controller.test.ts` | 45m |

**Total estimate:** ~4 hours (Size S)

## 3. Data Model (inline, complete)

### `packages/types/src/user/notification-preferences.types.ts`

```typescript
/**
 * Notification type identifiers.
 * Maps to notification_type enum in notifications table.
 */
export type NotificationType =
  | "batch_complete"
  | "review_request"
  | "review_decision"
  | "gap_scan"
  | "lint_alert"
  | "system";

/**
 * Delivery channels for notifications.
 * email channel: preference stored but delivery not yet implemented.
 */
export type NotificationChannel = "in_app" | "email";

/**
 * Per-type channel toggles.
 */
export interface NotificationChannelPreference {
  readonly in_app: boolean;
  readonly email: boolean;
}

/**
 * Full notification preference matrix.
 * Keys are NotificationType, values are channel toggles.
 */
export type NotificationPreferenceMatrix = Readonly<
  Record<NotificationType, NotificationChannelPreference>
>;

/**
 * Stored user preferences row from user_preferences table.
 */
export interface UserPreferencesRow {
  readonly id: string;
  readonly user_id: string;
  readonly notification_preferences: NotificationPreferenceMatrix;
  readonly generation_preferences: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * GET /api/v1/settings/notifications response payload.
 */
export interface NotificationPreferencesResponse {
  readonly preferences: NotificationPreferenceMatrix;
}

/**
 * PUT /api/v1/settings/notifications request body.
 * Partial update: only include types being changed.
 */
export interface UpdateNotificationPreferencesRequest {
  readonly preferences: Partial<
    Record<NotificationType, Partial<NotificationChannelPreference>>
  >;
}

/**
 * Default preferences: all in_app enabled, all email disabled.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceMatrix = {
  batch_complete: { in_app: true, email: false },
  review_request: { in_app: true, email: false },
  review_decision: { in_app: true, email: false },
  gap_scan: { in_app: true, email: false },
  lint_alert: { in_app: true, email: false },
  system: { in_app: true, email: false },
};

/**
 * All valid notification types (for validation).
 */
export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "batch_complete",
  "review_request",
  "review_decision",
  "gap_scan",
  "lint_alert",
  "system",
] as const;
```

## 4. Database Schema (inline, complete)

```sql
-- Migration: create_user_preferences_table
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_preferences JSONB NOT NULL DEFAULT '{
      "batch_complete": { "in_app": true, "email": false },
      "review_request": { "in_app": true, "email": false },
      "review_decision": { "in_app": true, "email": false },
      "gap_scan": { "in_app": true, "email": false },
      "lint_alert": { "in_app": true, "email": false },
      "system": { "in_app": true, "email": false }
    }'::jsonb,
    generation_preferences JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- One preferences row per user
CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- RLS: Users can only read/update their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own preferences" ON user_preferences
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own preferences" ON user_preferences
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid());
```

## 5. API Contract (complete request/response)

### GET /api/v1/settings/notifications (Auth: faculty+)

**Response (200):**
```json
{
  "data": {
    "preferences": {
      "batch_complete": { "in_app": true, "email": false },
      "review_request": { "in_app": true, "email": false },
      "review_decision": { "in_app": true, "email": false },
      "gap_scan": { "in_app": true, "email": false },
      "lint_alert": { "in_app": true, "email": false },
      "system": { "in_app": true, "email": false }
    }
  },
  "error": null
}
```

**Behavior:** If no `user_preferences` row exists, creates one with defaults and returns it (upsert pattern).

### PUT /api/v1/settings/notifications (Auth: faculty+)

**Request (partial update):**
```json
{
  "preferences": {
    "batch_complete": { "in_app": true, "email": true },
    "review_request": { "email": true }
  }
}
```

**Response (200):**
```json
{
  "data": {
    "preferences": {
      "batch_complete": { "in_app": true, "email": true },
      "review_request": { "in_app": true, "email": true },
      "review_decision": { "in_app": true, "email": false },
      "gap_scan": { "in_app": true, "email": false },
      "lint_alert": { "in_app": true, "email": false },
      "system": { "in_app": true, "email": false }
    }
  },
  "error": null
}
```

### POST /api/v1/settings/notifications/reset (Auth: faculty+)

**Request:** Empty body.

**Response (200):**
```json
{
  "data": {
    "preferences": {
      "batch_complete": { "in_app": true, "email": false },
      "review_request": { "in_app": true, "email": false },
      "review_decision": { "in_app": true, "email": false },
      "gap_scan": { "in_app": true, "email": false },
      "lint_alert": { "in_app": true, "email": false },
      "system": { "in_app": true, "email": false }
    }
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid notification type or channel value |
| 401 | `AUTHENTICATION_ERROR` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role below faculty |
| 500 | `INTERNAL_ERROR` | Database error |

## 6. Frontend Spec

### Page: `/settings/notifications`

**Route:** `apps/web/src/app/(dashboard)/settings/notifications/page.tsx`

**Component hierarchy:**
```
SettingsNotificationsPage (page.tsx -- default export)
  └── NotificationPreferencesPanel (client component)
        ├── PreferenceTable
        │     ├── Header row: [Type | In-App | Email]
        │     └── Per-type rows (6):
        │           ├── TypeLabel (human-readable name + description)
        │           ├── InAppToggle (shadcn/ui Switch, navyDeep track)
        │           └── EmailToggle (shadcn/ui Switch, navyDeep track)
        └── ResetToDefaultsButton
```

**NotificationPreferencesPanel behavior:**
```typescript
interface NotificationPreferencesPanelState {
  preferences: NotificationPreferenceMatrix;
  loading: boolean;
  saving: Record<string, boolean>; // keyed by "{type}_{channel}"
  error: string | null;
}
```

**States:**
1. **Loading** -- Skeleton table while fetching GET /settings/notifications
2. **Idle** -- All toggles reflect current preferences
3. **Saving** -- Individual toggle shows saving indicator; others remain interactive
4. **Error** -- Toast notification on save failure, toggle reverts to previous value
5. **Reset** -- Confirmation dialog before resetting all to defaults

**Notification type display names:**

| Type | Label | Description |
|------|-------|-------------|
| `batch_complete` | Batch Complete | Generation batch finished processing |
| `review_request` | Review Request | Item submitted for your review |
| `review_decision` | Review Decision | Your submitted item was approved or rejected |
| `gap_scan` | Gap Scan | Coverage gap analysis completed |
| `lint_alert` | Lint Alert | Quality issue detected in content |
| `system` | System | Platform updates and announcements |

**Design tokens:**
- Surface: White card on Parchment settings background (three-sheet hierarchy)
- Toggle track active: navyDeep `var(--color-navy-deep)`
- Toggle track inactive: `var(--color-cream-dark)`
- Table row dividers: `var(--color-cream)`
- Typography: Source Sans 3 for labels, Lora for section heading
- Reset button: ghost variant, `var(--color-text-muted)`

**Responsive:**
- Desktop: Full table with columns
- Mobile (< 768px): Stacked cards per notification type, toggles inline

**Optimistic update pattern:**
1. User toggles switch
2. UI immediately reflects new state
3. PUT request fires in background
4. On success: no additional action needed
5. On failure: revert toggle to previous state, show error toast

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/notification-preferences.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add exports) |
| 3 | Supabase migration via MCP: `create_user_preferences_table` | Database | Apply |
| 4 | `apps/server/src/errors/preference.error.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 6 | `apps/server/src/services/user/notification-preference.service.ts` | Service | Create |
| 7 | `apps/server/src/controllers/user/notification-preference.controller.ts` | Controller | Create |
| 8 | `apps/server/src/index.ts` | Routes | Edit (add settings routes) |
| 9 | `apps/web/src/components/settings/notification-preferences-panel.tsx` | Component | Create |
| 10 | `apps/web/src/app/(dashboard)/settings/notifications/page.tsx` | View | Create |
| 11 | `apps/server/src/__tests__/notification-preference.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-5 | faculty | Required | Settings layout at `/settings/` must exist |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `AuthMiddleware`
- `apps/server/src/middleware/rbac.middleware.ts` -- `RbacMiddleware`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>` envelope

### Cross-Epic Integration (F-10)
The `NotificationService.push()` method should check `user_preferences.notification_preferences` before dispatching. This story provides:
- The `user_preferences` table with `notification_preferences` JSONB
- `NotificationPreferenceService.getForUser(userId)` to read preferences
- Type definitions for the preference matrix

F-10 integration code (not built here, documented for reference):
```typescript
// In NotificationService.push() — added by F-10:
// const prefs = await this.#preferenceService.getForUser(userId);
// if (!prefs[notificationType].in_app) return; // skip in-app
// if (!prefs[notificationType].email) skipEmail = true;
```

## 9. Test Fixtures (inline)

```typescript
import type {
  NotificationPreferenceMatrix,
  UpdateNotificationPreferencesRequest,
} from "@journey-os/types";

/** Default preferences (all in_app on, all email off) */
export const DEFAULT_PREFS: NotificationPreferenceMatrix = {
  batch_complete: { in_app: true, email: false },
  review_request: { in_app: true, email: false },
  review_decision: { in_app: true, email: false },
  gap_scan: { in_app: true, email: false },
  lint_alert: { in_app: true, email: false },
  system: { in_app: true, email: false },
};

/** Custom preferences (some email enabled) */
export const CUSTOM_PREFS: NotificationPreferenceMatrix = {
  batch_complete: { in_app: true, email: true },
  review_request: { in_app: true, email: true },
  review_decision: { in_app: true, email: false },
  gap_scan: { in_app: false, email: false },
  lint_alert: { in_app: true, email: false },
  system: { in_app: true, email: false },
};

/** Valid partial update request */
export const VALID_UPDATE: UpdateNotificationPreferencesRequest = {
  preferences: {
    batch_complete: { email: true },
    gap_scan: { in_app: false },
  },
};

/** Invalid update: unknown notification type */
export const INVALID_TYPE_UPDATE = {
  preferences: {
    unknown_type: { in_app: true, email: false },
  },
};

/** Invalid update: non-boolean channel value */
export const INVALID_CHANNEL_UPDATE = {
  preferences: {
    batch_complete: { in_app: "yes" },
  },
};

/** Mock user ID */
export const MOCK_USER_ID = "user-uuid-001";

/** Mock user preferences row */
export const MOCK_PREFS_ROW = {
  id: "pref-uuid-001",
  user_id: MOCK_USER_ID,
  notification_preferences: DEFAULT_PREFS,
  generation_preferences: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/notification-preference.controller.test.ts`

```
describe("NotificationPreferenceController")
  describe("getPreferences")
    it creates default preferences row if none exists and returns defaults (200)
    it returns existing preferences when row exists (200)
    it returns 401 when not authenticated

  describe("updatePreferences")
    it merges partial update into existing preferences (200)
    it rejects unknown notification type (400 VALIDATION_ERROR)
    it rejects non-boolean channel values (400 VALIDATION_ERROR)
    it creates preferences row with merged defaults if none exists (200)

  describe("resetPreferences")
    it resets all preferences to defaults (200)
    it returns defaults even if no row existed (200)

describe("NotificationPreferenceService")
  describe("getForUser")
    it returns defaults when no row exists
    it returns stored preferences when row exists

  describe("updateForUser")
    it deep-merges partial update with existing preferences
    it validates notification type names
```

**Total: ~12 tests** (8 controller + 4 service unit tests)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Notification preferences are not part of the 5 critical user journeys. E2E coverage may be added when the full settings flow is tested end-to-end.

## 12. Acceptance Criteria

1. GET `/settings/notifications` returns the user's notification preference matrix
2. PUT `/settings/notifications` performs a partial deep-merge update on preferences
3. POST `/settings/notifications/reset` restores all preferences to defaults
4. If no `user_preferences` row exists, one is created with defaults on first access
5. Preferences JSONB validates: only known notification types, only boolean channel values
6. UI renders a table with 6 notification types x 2 channels = 12 toggle switches
7. Toggle switches use optimistic update: flip immediately, rollback on error
8. "Reset to Defaults" button resets all toggles via POST reset endpoint
9. Email channel toggle saves preference but no email delivery occurs (placeholder)
10. All 12 API tests pass
11. Route protected by AuthMiddleware + RbacMiddleware requiring `AuthRole.FACULTY` or higher

## 13. Source References

| Claim | Source |
|-------|--------|
| Notification types enum | S-F-38-2 acceptance criteria: batch_complete, review_request, review_decision, gap_scan, lint_alert, system |
| Per-type per-channel preferences | E-38 epic spec: "notification preference matrix" |
| JSONB storage for preferences | S-F-38-2: "Stored in user_preferences table as JSONB" |
| Default: all in_app on, email off | S-F-38-2: "Default: all in-app enabled, email off" |
| Optimistic toggle pattern | F-18 feature spec: "Toggle saves immediately (optimistic update with rollback)" |
| Settings URL /settings/notifications | F-18 feature spec, Settings Template A |
| Three-sheet hierarchy | Design spec: Cream, White, Parchment |
| NotificationService reads preferences | F-10 cross-epic dependency |
| Reset to defaults button | S-F-38-2: "Reset to defaults button" |
| shadcn/ui Toggle/Switch | S-F-38-2: "shadcn/ui Toggle/Switch in table layout" |

## 14. Environment Prerequisites

- **Supabase:** Project running, `user_preferences` table created via migration
- **Express:** Server running on port 3001
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story
- **Settings layout** from STORY-F-5 must exist at `apps/web/src/app/(dashboard)/settings/`

## 15. Implementation Notes

- **Upsert pattern:** When GET finds no `user_preferences` row, INSERT one with defaults and return it. Use Supabase `.upsert()` with `onConflict: 'user_id'`.
- **Deep merge for PUT:** The partial update should deep-merge into existing preferences. For each notification type in the request, merge its channels into the existing entry. Unmentioned types remain unchanged.
- **Service class pattern:** Use JS `#private` fields for the Supabase client. Constructor DI pattern matching `GlobalUserService`.

```typescript
export class NotificationPreferenceService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }
}
```

- **Validation:** Validate notification type names against `NOTIFICATION_TYPES` array. Validate channel values are boolean. Throw `ValidationError` for invalid input.
- **RbacMiddleware:** Use `AuthRole.FACULTY` -- faculty, institutional_admin, and superadmin can all access their own preferences.
- **vi.hoisted()** needed for Supabase mock in tests -- vi.mock() hoists before variable declarations.
- **No repository layer** -- direct Supabase queries in service (consistent with `GlobalUserService` pattern for simple CRUD).
