# STORY-U-14: Email Verification Gate

**Epic:** E-02 (Registration & Onboarding)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-02-4

---

## User Story
As a **newly registered user**, I need to verify my email address before gaining full platform access so that the system confirms my identity and prevents fraudulent registrations.

## Acceptance Criteria
- [ ] Unverified users see a "Verify your email" interstitial after login
- [ ] Interstitial shows: email address, resend button, check spam instructions
- [ ] Resend verification email with rate limit (max 3 per 10 minutes)
- [ ] Verification link callback updates user's email_verified flag
- [ ] Verified users bypass the interstitial on subsequent logins
- [ ] Express middleware blocks API access for unverified users (except auth endpoints)
- [ ] Custom EmailNotVerifiedError for blocked requests
- [ ] Supabase auth.onAuthStateChange listener updates UI on verification

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/auth/EmailVerification.tsx` | `apps/web/src/app/(auth)/verify-email/page.tsx` | Convert from React Router to Next.js App Router; replace inline styles with Tailwind design tokens; reuse auth-brand-panel organism; add real-time verification status via Supabase onAuthStateChange; resend button with rate limit feedback |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Middleware | apps/server | `src/middleware/email-verification.middleware.ts` |
| Errors | apps/server | `src/errors/email-not-verified.error.ts` |
| View | apps/web | `src/app/(auth)/verify-email/page.tsx` |
| Component | apps/web | `src/components/auth/verification-interstitial.tsx` |
| Atom | packages/ui | `src/atoms/verification-banner.tsx` |
| Tests | apps/server | `src/middleware/__tests__/email-verification.middleware.test.ts` |

## Database Schema
No new tables. Uses Supabase Auth's built-in `email_confirmed_at` field on `auth.users`.

Rate limiting for resend (in-memory, production: Redis):
```typescript
// In-memory rate limit: userId -> { count, resetAt }
Map<string, { count: number; resetAt: Date }>
```

## API Endpoints

### POST /api/v1/auth/resend-verification
**Auth:** Required (JWT, but exempt from email verification check)
**Success Response (200):**
```json
{
  "data": { "message": "Verification email sent." },
  "error": null
}
```
**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `ALREADY_VERIFIED` | User email already verified |
| 429 | `RATE_LIMITED` | More than 3 resend attempts in 10 minutes |

### GET /api/v1/auth/verify-callback
**Auth:** Public (Supabase redirect callback)
**Behavior:** Supabase redirects here after email link click; updates `email_confirmed_at`, redirects to dashboard.

## Dependencies
- **Blocked by:** STORY-U-1 (Supabase Auth Setup), STORY-U-3 (Express Auth Middleware), STORY-U-8 (Registration triggers verification)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8 API tests:
  1. Unverified user blocked from protected endpoints (returns 403 with EmailNotVerifiedError)
  2. Verified user passes through middleware
  3. Auth endpoints exempt from verification check (POST /auth/resend-verification)
  4. Resend verification sends email successfully
  5. Rate limiting: 4th resend within 10 minutes returns 429
  6. Already verified user gets 400 on resend
  7. Verification callback updates email_confirmed_at
  8. Middleware order: AuthMiddleware -> EmailVerificationMiddleware -> RbacMiddleware
- 0 E2E tests

## Implementation Notes
- Supabase handles the verification email sending and callback; this story wraps the UX around it.
- Middleware order: AuthMiddleware -> EmailVerificationMiddleware -> RbacMiddleware.
- Exempt endpoints from verification check: POST /auth/resend-verification, GET /auth/verify-callback.
- Rate limiting on resend uses a simple in-memory counter per user ID (production: Redis).
- The prototype `EmailVerification.tsx` shows a centered card with email icon, email address, resend button, and "check your spam folder" text.
- Reuse the auth-brand-panel organism from STORY-U-5 for consistent layout.
- Supabase `auth.onAuthStateChange` listener in the client can detect verification in real-time, updating the UI without manual refresh.
- Custom error classes only per architecture rules.
- OOP with private `#fields` (JS private syntax).
- Constructor DI for the middleware receiving AuthService.
- Replace all inline styles with Tailwind + design tokens.
