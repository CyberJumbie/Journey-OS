# Plan: STORY-U-9 — Invitation Acceptance Flow

## Tasks (implementation order)

1. **Types** — Create `InvitationTokenPayload`, `InvitationAcceptRequest`, `InvitationAcceptResult` in `packages/types/src/auth/invitation.types.ts`, export from barrel. Reuse existing `Invitation` from `institution/invitation.types.ts` as-is (it already matches `InvitationRecord`).
2. **Error classes** — Add `InvitationNotFoundError`, `InvitationAlreadyUsedError`, `InvitationInvalidError` to existing `apps/server/src/errors/invitation.error.ts` (already has `InvitationExpiredError`).
3. **Password validation (server-side)** — Port `apps/web/src/lib/auth/password-validation.ts` to `apps/server/src/utils/password-validation.ts` for server-side reuse. Same rules: min 8 chars, upper, lower, number, special.
4. **Service** — Create `InvitationAcceptanceService` in `apps/server/src/services/auth/invitation-acceptance.service.ts` with `validateToken(token)` and `acceptInvitation(request)`. Constructor DI: `supabaseClient`.
5. **Controller** — Create `InvitationAcceptanceController` in `apps/server/src/controllers/auth/invitation-acceptance.controller.ts` with `handleValidate(req, res)` and `handleAccept(req, res)`.
6. **Routes** — Wire public routes in `apps/server/src/index.ts`: `GET /api/v1/invitations/validate` and `POST /api/v1/invitations/accept` (no auth middleware).
7. **Frontend page** — Create `apps/web/src/app/(auth)/invite/accept/page.tsx` with token validation on mount.
8. **Frontend component** — Create `apps/web/src/components/auth/invitation-accept-form.tsx` (InvitationAcceptFlow organism with states: validating, invalid, form, submitting, success).
9. **Service tests** — `apps/server/src/services/auth/__tests__/invitation-acceptance.service.test.ts` (~12 tests)
10. **Controller tests** — `apps/server/src/controllers/auth/__tests__/invitation-acceptance.controller.test.ts` (~9 tests)
11. **Rebuild types** — `tsc -b packages/types/tsconfig.json` after adding new type file.

## Implementation Order

Types → Errors → Password Validation → Service → Controller → Routes → View → Tests

## Patterns to Follow

- `docs/solutions/approval-workflow-pattern.md` — Supabase query patterns, error mapping
- `docs/solutions/public-auth-route-pattern.md` — Public route wiring (no auth middleware)
- `docs/solutions/registration-wizard-pattern.md` — Supabase `auth.admin.createUser()` pattern
- `docs/solutions/supabase-mock-factory.md` — Separate mock objects per Supabase chain stage

## Existing Code to Reuse

| What | Where |
|------|-------|
| `Invitation` type (= InvitationRecord) | `packages/types/src/institution/invitation.types.ts` |
| `InvitationExpiredError` | `apps/server/src/errors/invitation.error.ts` |
| `getSupabaseClient()` | `apps/server/src/config/supabase.config.ts` |
| `validatePassword()` | `apps/web/src/lib/auth/password-validation.ts` (port to server) |
| Password strength indicator | `apps/web/src/components/auth/reset-password-form.tsx` (reuse pattern) |
| Auth layout | `apps/web/src/app/(auth)/layout.tsx` |

## Testing Strategy

- **API tests (21):** Token validation (5: valid, not found, expired, already used, includes institution name). Acceptance (7: creates auth user, creates profile, marks consumed, returns result, weak password, duplicate email, re-validates token). Controller (9: validate 200/400/404/410x2, accept 200/400x2/409).
- **E2E:** Not required. Will be covered by full onboarding journey E2E when U-13 is complete.

## Figma Make

- [ ] Code directly — uses existing auth layout pattern from login/register/reset pages

## Risks / Edge Cases

- **Race condition:** Two tabs with same token — optimistic locking via `WHERE accepted_at IS NULL` in the UPDATE
- **Supabase user exists:** Email already registered — catch and throw `UserAlreadyExistsError` (409)
- **Profile trigger:** The `handle_new_user` trigger on `auth.users` auto-creates a profile. Service must either: (a) use `ON CONFLICT` update for profile, or (b) skip manual profile insert and rely on trigger + update `institution_id`/`role` after
- **Password validation:** Must be identical rules on server and client — extract to shared util or duplicate
- **Token in query string:** `req.query.token` is `string | ParsedQs | string[] | ParsedQs[]` — narrow carefully

## Acceptance Criteria (from brief)

1. Invitation URL `/invite/accept?token=xxx` loads and validates the token on page mount
2. Valid token shows acceptance form with pre-filled email and institution name
3. Expired token shows clear error with "Request New Invitation" link
4. Already-used token redirects to login page with message
5. Acceptance form: full name, set password, confirm password (email read-only)
6. Password validation enforces min 8 chars, upper, lower, number, special
7. `InvitationAcceptanceService` validates token, creates Supabase user with pre-assigned role
8. User profile created in `profiles` table with `institution_id` and `role` from invitation
9. Token marked as consumed (`accepted_at` set) after successful acceptance
10. Redirect to `/onboarding` (U-13) after account creation
11. Role is fixed by the inviter — no role selection during acceptance
12. All ~21 API tests pass
