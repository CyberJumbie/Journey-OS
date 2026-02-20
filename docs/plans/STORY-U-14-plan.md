# Plan: STORY-U-14 — Email Verification Gate

## Tasks (implementation order)

1. **Types** — Create `packages/types/src/auth/verification.types.ts` with `ResendVerificationResult` and `VerificationStatus`. Add `email_confirmed_at: string | null` to `AuthTokenPayload` in `auth.types.ts`. Export from `packages/types/src/auth/index.ts`. Rebuild types with `tsc -b`.
2. **Auth service update** — Update `apps/server/src/services/auth/auth.service.ts` `verifyToken()` to populate `email_confirmed_at` from `user.email_confirmed_at` (Supabase User object has this field).
3. **Error class** — Create `apps/server/src/errors/email-not-verified.error.ts` extending `JourneyOSError` with code `"EMAIL_NOT_VERIFIED"`. Export from `apps/server/src/errors/index.ts`.
4. **Middleware** — Create `apps/server/src/middleware/email-verification.middleware.ts` with `EmailVerificationMiddleware` class. Checks `req.user.email_confirmed_at`. Exempt routes: resend-verification, verify-callback, onboarding/status, onboarding/complete. Factory function `createEmailVerificationMiddleware()`.
5. **Resend service** — Create `apps/server/src/services/auth/resend-verification.service.ts` with in-memory rate limiter (Map per userId, 3 per 10 min) and `supabase.auth.resend({ type: 'signup', email })`.
6. **Resend controller** — Create `apps/server/src/controllers/auth/resend-verification.controller.ts` with `handleResend(req, res)`. Returns 200/400 (already verified)/429 (rate limited)/500.
7. **Routes** — Wire in `apps/server/src/index.ts`: (a) Add `POST /api/v1/auth/resend-verification` as PUBLIC route before auth middleware (user needs auth but not verification), (b) Insert `createEmailVerificationMiddleware()` between auth middleware and RBAC routes.
8. **Frontend page** — Create `apps/web/src/app/(auth)/verify-email/page.tsx` and `apps/web/src/components/auth/verification-interstitial.tsx` client component with resend button, cooldown timer, and `onAuthStateChange` listener.
9. **Tests** — Create `apps/server/src/middleware/__tests__/email-verification.middleware.test.ts` (~6 tests) and `apps/server/src/services/auth/__tests__/resend-verification.service.test.ts` (~5 tests).

## Critical Design Decision: Middleware Placement

The email verification middleware must be a separate `app.use()` call inserted between the auth middleware and the first RBAC route:

```
app.use("/api/v1", createAuthMiddleware());        // existing line 120

// Onboarding routes (exempt from email verification per brief §5)
app.get("/api/v1/onboarding/status", ...);
app.post("/api/v1/onboarding/complete", ...);

// Resend verification — authenticated but EXEMPT from verification check
app.post("/api/v1/auth/resend-verification", ...);

// Email verification gate — blocks unverified users from all routes below
app.use("/api/v1", createEmailVerificationMiddleware());

// RBAC-protected routes below...
const rbac = createRbacMiddleware();
```

This means onboarding and resend-verification routes are placed BEFORE the email verification middleware (exempt by position, not by path matching). This is simpler and more robust than path-based exemptions.

## Critical: AuthTokenPayload Must Be Extended

`AuthTokenPayload` currently lacks `email_confirmed_at`. Must add it as `readonly email_confirmed_at: string | null`. The `AuthService.verifyToken()` must populate it from `user.email_confirmed_at` (available on Supabase User object).

**Impact:** Existing auth middleware tests may need `email_confirmed_at` added to test fixtures. Must read existing tests before modifying.

## Implementation Order

Types → AuthService update → Error class → Middleware → Service → Controller → Routes → View → Tests

## Patterns to Follow

- `docs/solutions/public-auth-route-pattern.md` — Route placement pattern (protected no-RBAC variant for resend)
- `docs/solutions/supabase-mock-factory.md` — Mock pattern for tests
- Existing middleware pattern from `auth.middleware.ts` — class with `#private` fields, factory function
- Existing error pattern from `base.errors.ts` — extend `JourneyOSError`

## Existing Code to Reuse

| What | Where |
|------|-------|
| `JourneyOSError` base class | `apps/server/src/errors/base.errors.ts` |
| `ApiResponse<T>` | `packages/types/src/auth/auth.types.ts` |
| `AuthTokenPayload` | `packages/types/src/auth/auth.types.ts` |
| `AuthService.verifyToken()` | `apps/server/src/services/auth/auth.service.ts` |
| `createAuthMiddleware()` factory | `apps/server/src/middleware/auth.middleware.ts` |
| `createBrowserClient()` | `apps/web/src/lib/supabase.ts` |

## Testing Strategy

- **API tests (~11):**
  - Middleware (6): allows verified user, blocks unverified with 403, returns correct error shape, exempt routes pass through (by position), OPTIONS passes through, runs after auth middleware
  - Resend service (5): calls supabase.auth.resend for unverified user, returns ALREADY_VERIFIED for verified user, rate limits at 3/10min, returns 429 when rate limited, resets counter after window expires
- **E2E:** Not required. Email verification involves external email delivery.

## Figma Make

- [ ] Code directly — uses existing auth layout patterns, simple interstitial UI

## Risks / Edge Cases

- **AuthTokenPayload change is breaking:** Adding `email_confirmed_at` changes a shared type. All mock fixtures that create `AuthTokenPayload` objects will need the new field. Must update existing auth middleware test fixtures.
- **Seeded demo users:** Demo/seed users in `auth.users` must have `email_confirmed_at` set (not null) or they'll be blocked by the new middleware. Check if seeder already sets this.
- **Middleware ordering:** If placed wrong, the verification middleware could block onboarding or resend endpoints. Using positional exemption (routes before middleware) instead of path matching avoids this risk.
- **In-memory rate limiter:** Resets on server restart. Acceptable for dev/MVP, production needs Redis.
- **Supabase resend API:** `supabase.auth.resend({ type: 'signup', email })` may silently succeed even if email is already verified. Service should check verification status first.

## Acceptance Criteria (from brief)

1. Unverified users see "Verify your email" interstitial after login
2. Interstitial shows: email address, resend button, check spam instructions
3. Resend verification email with rate limit (max 3 per 10 minutes)
4. Verification link callback updates user's `email_confirmed_at`
5. Verified users bypass the interstitial on subsequent logins
6. Express middleware blocks API access for unverified users (except exempt endpoints)
7. Custom `EmailNotVerifiedError` returns 403 with structured error response
8. `auth.onAuthStateChange` listener on frontend auto-detects verification
9. Middleware order: AuthMiddleware → EmailVerificationMiddleware → RbacMiddleware
10. All ~11 API tests pass
