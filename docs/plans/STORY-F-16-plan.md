# Plan: STORY-F-16 (Notification Preferences)

## Critical Findings from Codebase Exploration

### 1. Type Name Collision
The brief defines `NotificationType` in `notification-preferences.types.ts`, but `NotificationType` already exists in `packages/types/src/notification/notification.types.ts` with **different values** (`system`, `course`, `assessment`, `enrollment`, `announcement`, `alert`). Must rename the preference type to `NotificationPreferenceType` to avoid duplicate export in the barrel (TS2308 — CLAUDE.md known gotcha).

### 2. Existing `notification_preferences` on `profiles`
The `profiles` table already has a `notification_preferences` JSONB column with default `'{"email": true, "in_app": true}'`. The brief's approach (separate `user_preferences` table with per-type matrix) is architecturally superior — extensible for `generation_preferences` etc. The existing column is a simple global toggle that will be superseded.

### 3. Settings Layout Already Exists
`apps/web/src/app/(dashboard)/settings/layout.tsx` has a "Notifications" nav item with `enabled: false`. Task 10 must flip this to `enabled: true`.

### 4. No Existing `/api/v1/settings/` Routes
No settings routes exist yet. New route group.

### 5. DB Notification Types vs Preference Types
The `notifications` table CHECK constraint uses: `generation_complete`, `review_assigned`, `review_complete`, `batch_complete`, `batch_failed`, `alert`, `intervention`, `import_complete`, `compliance_update`, `system`. The brief's 6 preference categories are a **subset/abstraction** — they don't need to match 1:1.

---

## Tasks (implementation order)

| # | Task | File | Notes |
|---|------|------|-------|
| 1 | Define `NotificationPreferenceType` + related types | `packages/types/src/user/notification-preferences.types.ts` | Rename from `NotificationType` to avoid collision |
| 2 | Export from user barrel | `packages/types/src/user/index.ts` | Add new exports |
| 3 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | Required for downstream |
| 4 | Migration: `user_preferences` table | Supabase MCP `apply_migration` | FK to `auth.users(id)`, RLS, unique index |
| 5 | Create `PreferenceNotFoundError` | `apps/server/src/errors/preference.error.ts` | Extends `DomainError` |
| 6 | Export error | `apps/server/src/errors/index.ts` | Single edit, re-read after |
| 7 | Implement `NotificationPreferenceService` | `apps/server/src/services/user/notification-preference.service.ts` | `#supabaseClient`, upsert pattern, deep merge |
| 8 | Implement `NotificationPreferenceController` | `apps/server/src/controllers/user/notification-preference.controller.ts` | GET/PUT/POST reset, double-cast req pattern |
| 9 | Register routes in Express | `apps/server/src/index.ts` | 3 routes with `rbac.require(AuthRole.FACULTY)` |
| 10 | Build `NotificationPreferencesPanel` | `apps/web/src/components/settings/notification-preferences-panel.tsx` | Client component, shadcn Switch, optimistic update |
| 11 | Build settings notifications page | `apps/web/src/app/(dashboard)/settings/notifications/page.tsx` | Default export (App Router exception) |
| 12 | Enable nav item in settings layout | `apps/web/src/app/(dashboard)/settings/layout.tsx` | Flip `enabled: false` → `enabled: true` |
| 13 | Write API tests | `apps/server/src/__tests__/notification-preference.controller.test.ts` | ~12 tests (8 controller + 4 service) |

## Implementation Order
Types → Rebuild → Migration → Errors → Service → Controller → Routes → View → Tests

## Patterns to Follow
- `docs/solutions/notification-ownership-pattern.md` — user-scoped resource, double-cast `req.user` extraction
- `docs/solutions/supabase-mock-factory.md` — separate mock objects per Supabase chain stage
- `GlobalUserService` pattern — `#supabaseClient` via constructor DI, no repository layer for simple CRUD
- `vi.hoisted()` for mock variables referenced in `vi.mock()` closures

## Testing Strategy
- **API tests (12):**
  - GET: creates defaults if none exist, returns existing prefs, rejects unauthenticated
  - PUT: partial deep merge, rejects unknown types, rejects non-boolean values, upserts if no row
  - POST reset: resets to defaults, creates defaults if no row
  - Service unit: `getForUser` (defaults vs stored), `updateForUser` (deep merge, validation)
- **E2E:** Not required — not in the 5 critical journeys

## Figma Make
- [ ] Prototype first
- [x] Code directly — simple matrix table with toggles, well-defined in brief

## Risks / Edge Cases

1. **Type collision:** `NotificationType` exists in `notification.types.ts`. Solution: name preference type `NotificationPreferenceType`.
2. **Existing `profiles.notification_preferences`:** Legacy column with different schema. The new `user_preferences` table supersedes it. Do NOT migrate data — old column is unused (no code reads it for dispatch). Leave it in place.
3. **RLS with service_role key:** Server uses `service_role` key (bypasses RLS). Ownership enforced at service layer by always filtering on `user_id` from auth middleware. RLS is defense-in-depth.
4. **Concurrent toggle flips:** Two rapid toggles could race on PUT. The deep-merge approach is idempotent per-key, so last write wins — acceptable UX.
5. **PostToolUse eslint hook:** May strip barrel exports. Re-read `index.ts` after every edit (CLAUDE.md critical rule).

## Acceptance Criteria (verbatim from brief)
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
