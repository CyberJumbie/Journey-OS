# STORY-U-11: Password Reset Page

**Epic:** E-03 (Account Recovery)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 21
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-03-2

---

## User Story
As a **user with a reset token**, I need to set a new password so that I can regain access to my account securely.

## Acceptance Criteria
- [ ] Password reset page receives token from URL hash fragment
- [ ] Token validation via Supabase `verifyOtp()` on page load
- [ ] New password input with confirmation field
- [ ] Password strength validation (min 8 chars, uppercase, lowercase, number, special)
- [ ] Visual password strength indicator
- [ ] Calls Supabase `updateUser({ password })` on submit
- [ ] Success state redirects to login with confirmation message
- [ ] Expired token shows clear error with link to request new reset
- [ ] Invalid token shows error with link to request new reset

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/auth/ForgotPassword.tsx` | `apps/web/src/app/(auth)/reset-password/page.tsx` | The ForgotPassword prototype includes both the "request reset" and "set new password" flows. Extract the reset-password step into a separate page; reuse auth-brand-panel organism; add password strength indicator atom; replace inline styles with Tailwind design tokens |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/auth/password-reset.types.ts` (extend from STORY-U-5) |
| Service | apps/server | `src/services/auth/password-reset.service.ts` (extend from STORY-U-5) |
| Controller | apps/server | `src/controllers/auth/password-reset.controller.ts` (extend from STORY-U-5) |
| View | apps/web | `src/app/(auth)/reset-password/page.tsx` |
| Component | apps/web | `src/components/auth/reset-password-form.tsx` |
| Atom | packages/ui | `src/atoms/password-strength-indicator.tsx` |
| API Tests | apps/server | `src/services/auth/__tests__/password-reset-token.test.ts` |

## Database Schema
No new tables. Uses Supabase Auth's built-in OTP/token verification and password update.

## API Endpoints

### POST /api/v1/auth/reset-password
**Auth:** Public (token-based, not JWT)
**Request:**
```json
{
  "token": "otp-from-email-link",
  "password": "NewSecurePass123!",
  "password_confirmation": "NewSecurePass123!"
}
```
**Success Response (200):**
```json
{
  "data": { "message": "Password reset successful. Please log in with your new password." },
  "error": null
}
```
**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Passwords don't match, weak password |
| 400 | `INVALID_TOKEN` | Token is invalid or malformed |
| 410 | `TOKEN_EXPIRED` | Reset token has expired (default 1 hour) |

## Dependencies
- **Blocked by:** STORY-U-5 (Forgot Password Flow must exist first)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 6 API tests:
  1. Valid token + matching passwords resets successfully
  2. Expired token returns 410
  3. Invalid token returns 400
  4. Passwords that don't match return 400
  5. Weak password returns 400
  6. Successful reset invalidates token (can't reuse)
- 0 E2E tests

## Implementation Notes
- Supabase passes the token via URL hash fragment after email link click.
- Token expiry is configured in Supabase dashboard (default 1 hour).
- Password strength indicator is a reusable atom component in packages/ui.
- Must handle edge case where user navigates directly to reset page without valid token.
- Reuse the auth-brand-panel organism from STORY-U-5 for consistent split-panel layout.
- Replace all inline styles with Tailwind + design tokens.
- The prototype `ForgotPassword.tsx` contains both request and reset flows -- split into separate pages.
- Use `@web/*` path alias for imports.
