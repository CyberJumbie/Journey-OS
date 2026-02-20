# STORY-F-16: Notification Preferences

**Epic:** E-38 (Profile & Preferences)
**Feature:** F-18
**Sprint:** 19
**Lane:** faculty (P3)
**Size:** S
**Old ID:** S-F-38-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need per-type notification preference toggles so that I can control which notifications I receive and through which channels.

## Acceptance Criteria
- [ ] Preference matrix: notification types as rows, channels as columns (in-app, email, off)
- [ ] Notification types: `batch_complete`, `review_request`, `review_decision`, `gap_scan`, `lint_alert`, `system`
- [ ] Default: all types enabled for in-app, email off
- [ ] Toggle saves immediately (optimistic update with rollback)
- [ ] Preferences stored in Supabase `notification_preferences` table as JSONB
- [ ] NotificationService checks preferences before sending
- [ ] Reset to defaults button
- [ ] 5-8 API tests: preference read, update, NotificationService respects preferences, reset
- [ ] TypeScript strict, named exports only (EXCEPTION: page.tsx uses `export default`)

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/settings/Settings.tsx` (notification section) | `apps/web/src/app/(protected)/settings/notifications/page.tsx` | Extract notification preferences section into standalone page. Replace inline styles with design tokens. Use shadcn/ui Toggle or Switch components in table layout. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/notification-prefs.types.ts` |
| Service | apps/server | `src/services/user/notification-preference.service.ts` |
| Controller | apps/server | `src/controllers/user/preferences.controller.ts` |
| View | apps/web | `src/app/(protected)/settings/notifications/page.tsx` |
| Components | apps/web | `src/components/settings/notification-prefs-matrix.tsx` |
| Hooks | apps/web | `src/hooks/use-notification-prefs.ts` |
| Tests | apps/server | `src/services/user/__tests__/notification-preference.service.test.ts` |

## Database Schema

### Supabase -- `notification_preferences` table (or JSONB column in `profiles`)
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | NOT NULL, UNIQUE, FK -> auth.users |
| `preferences` | jsonb | NOT NULL, DEFAULT '{}' |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

JSONB structure: `{ "batch_complete": { "in_app": true, "email": false }, ... }`

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/users/me/notification-preferences` | Authenticated | Get notification preferences |
| PATCH | `/api/v1/users/me/notification-preferences` | Authenticated | Update notification preferences |
| POST | `/api/v1/users/me/notification-preferences/reset` | Authenticated | Reset to defaults |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-5 (profile page exists as settings parent)
- **Cross-lane:** STORY-F-10 (notification service reads preferences)

## Testing Requirements
### API Tests (5-8)
1. GET preferences returns current settings
2. GET preferences for new user returns defaults (all in-app enabled)
3. PATCH single preference toggle updates correctly
4. NotificationService skips disabled notification type
5. NotificationService sends enabled notification type
6. Reset restores all to defaults
7. Optimistic update rolls back on server error
8. Preference matrix renders toggle grid

## Implementation Notes
- Preference matrix: shadcn/ui Toggle or Switch components in a table layout.
- Email channel placeholder: save preference but email delivery not implemented until email service is added.
- JSONB structure: `{ batch_complete: { in_app: true, email: false }, ... }`.
- NotificationService.push() checks `notification-preference.service.getPreferences(userId, type)` before creating.
- Settings URL: `/settings/notifications` -- tab under settings layout.
- See existing `apps/server/src/services/user/notification-preference.service.ts`.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table names.
