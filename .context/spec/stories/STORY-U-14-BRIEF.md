# STORY-U-14 Brief: Email Verification Gate

## 0. Lane & Priority

```yaml
story_id: STORY-U-14
old_id: S-U-02-4
lane: universal
lane_priority: 0
within_lane_order: 14
sprint: 3
size: S
depends_on:
  - STORY-U-1 (universal) — Supabase Auth Setup ✅ DONE
  - STORY-U-3 (universal) — Express Auth Middleware ✅ DONE
  - STORY-U-8 (universal) — Registration Wizard ✅ DONE
blocks: []
personas_served: [all]
epic: E-02 (Registration & Onboarding)
feature: F-01 (Authentication & Access)
user_flow: UF-02 (Registration & Onboarding)
```

## 1. Summary

Build an **email verification gate** that prevents unverified users from accessing the platform. After registration, users who have not yet verified their email see an interstitial page with instructions to check their inbox, a resend button (rate-limited to 3 per 10 minutes), and spam-check guidance. An Express middleware blocks all API access for unverified users (except auth-related endpoints). Once verified via Supabase's callback, users automatically bypass the interstitial.

Key constraints:
- Supabase handles actual verification email sending and callback — this story wraps the UX
- Middleware order: `AuthMiddleware` → `EmailVerificationMiddleware` → `RbacMiddleware`
- Exempt endpoints: `POST /auth/resend-verification`, `GET /auth/verify-callback`, all public routes
- Rate limiting on resend: in-memory counter per user ID (production: Redis)
- Custom `EmailNotVerifiedError` for blocked requests (403)
- `auth.onAuthStateChange` listener on frontend updates UI when verification completes

## 2. Task Breakdown

1. **Error class** — `EmailNotVerifiedError` in `apps/server/src/errors/email-not-verified.error.ts`
2. **Middleware** — `EmailVerificationMiddleware` that checks `email_confirmed_at` from JWT claims
3. **Frontend page** — `/verify-email` interstitial with resend button
4. **Frontend component** — `VerificationBanner` for inline notification
5. **Wire up** — Insert middleware in chain after auth, before RBAC
6. **API tests** — 8 tests covering middleware blocking, exempt routes, resend rate limit

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/auth/verification.types.ts

/** Response for resend verification endpoint */
export interface ResendVerificationResult {
  readonly email: string;
  readonly sent: boolean;
  readonly message: string;
}

/** Verification status check */
export interface VerificationStatus {
  readonly email: string;
  readonly email_verified: boolean;
  readonly verified_at: string | null;
}
```

## 4. Database Schema (inline, complete)

No new tables. Uses Supabase `auth.users` built-in `email_confirmed_at` field.

```sql
-- Supabase auth.users (built-in, managed by Supabase):
-- auth.users.id UUID PK
-- auth.users.email TEXT
-- auth.users.email_confirmed_at TIMESTAMPTZ (null until verified)
-- auth.users.confirmation_sent_at TIMESTAMPTZ

-- No migration needed — Supabase handles email verification natively.
-- The middleware reads email_confirmed_at from the JWT claims or user metadata.
```

## 5. API Contract (complete request/response)

### POST /api/v1/auth/resend-verification (Auth: authenticated, unverified allowed)

**Success Response (200):**
```json
{
  "data": {
    "email": "jsmith@msm.edu",
    "sent": true,
    "message": "Verification email sent. Please check your inbox."
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 400 | `ALREADY_VERIFIED` | User's email is already verified |
| 429 | `RATE_LIMIT_EXCEEDED` | More than 3 resend requests in 10 minutes |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Middleware: EmailVerificationMiddleware

**Blocked Response (403):**
```json
{
  "data": null,
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email address before accessing this resource."
  }
}
```

**Exempt routes (not blocked by this middleware):**
- `POST /api/v1/auth/resend-verification`
- `GET /api/v1/auth/verify-callback`
- All public routes (no auth middleware)
- `GET /api/v1/onboarding/status`
- `POST /api/v1/onboarding/complete`

## 6. Frontend Spec

### Page: `/verify-email` (Auth layout)

**Route:** `apps/web/src/app/(auth)/verify-email/page.tsx`

**Component hierarchy:**
```
VerifyEmailPage (page.tsx — default export)
  └── VerificationInterstitial (client component)
        ├── EmailIcon (Lucide mail icon, large centered)
        ├── Heading ("Verify your email")
        ├── EmailDisplay (user's email address)
        ├── Instructions ("We sent a verification link to your email...")
        ├── SpamNote ("Check your spam folder if you don't see it")
        ├── ResendButton ("Resend verification email")
        │     ├── Cooldown timer (shows seconds remaining after send)
        │     └── Rate limit message ("Too many requests, try again in X minutes")
        └── BackToLoginLink ("Back to login")
```

**States:**
1. **Default** — Instructions displayed, resend button enabled
2. **Sending** — Resend button disabled with spinner
3. **Sent** — Success message, cooldown timer (60 seconds before next resend)
4. **Rate Limited** — Error message, button disabled with countdown
5. **Verified** — `onAuthStateChange` detects verification, auto-redirect to dashboard/onboarding

**Design tokens:**
- Surface: White `#ffffff` card on Cream `#f5f3ef` background
- Email icon: Navy Deep `#002c76`
- Resend button: Green `#69a338` outline variant
- Rate limit message: warning yellow
- Typography: Lora for heading, Source Sans 3 for body
- Spacing: 24px card padding, 16px element gap

### Component: VerificationBanner (packages/ui)

A dismissible banner shown at the top of protected pages for unverified users who somehow reach them (edge case — middleware should block, but defense in depth).

```
VerificationBanner (atom)
  ├── WarningIcon (Lucide alert-triangle)
  ├── Message ("Please verify your email to access all features")
  └── VerifyLink ("Verify now" → /verify-email)
```

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/auth/verification.types.ts` | Types | Create |
| 2 | `packages/types/src/auth/index.ts` | Types | Edit (add verification export) |
| 3 | `apps/server/src/errors/email-not-verified.error.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 5 | `apps/server/src/middleware/email-verification.middleware.ts` | Middleware | Create |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add middleware to chain, add resend route) |
| 7 | `apps/web/src/app/(auth)/verify-email/page.tsx` | View | Create |
| 8 | `packages/ui/src/components/auth/verification-banner.tsx` | Component | Create |
| 9 | `apps/server/src/middleware/__tests__/email-verification.middleware.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-1 | universal | **DONE** | Supabase Auth — email verification via Supabase native flow |
| STORY-U-3 | universal | **DONE** | Express Auth Middleware — JWT parsing, req.user augmentation |
| STORY-U-8 | universal | **DONE** | Registration Wizard — creates users who need verification |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client (auth state change listener)
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/middleware/auth.middleware.ts` — `AuthMiddleware` (runs before this middleware)
- `apps/server/src/middleware/rbac.middleware.ts` — `RbacMiddleware` (runs after this middleware)
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`

## 9. Test Fixtures (inline)

```typescript
// Mock verified user
export const MOCK_VERIFIED_USER = {
  sub: "user-uuid-1",
  email: "verified@msm.edu",
  role: "faculty" as const,
  email_confirmed_at: "2026-02-19T10:00:00Z",
  institution_id: "inst-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock unverified user
export const MOCK_UNVERIFIED_USER = {
  ...MOCK_VERIFIED_USER,
  sub: "user-uuid-2",
  email: "unverified@msm.edu",
  email_confirmed_at: null,
};

// Exempt route paths
export const EXEMPT_ROUTES = [
  "/api/v1/auth/resend-verification",
  "/api/v1/auth/verify-callback",
];

// Protected route paths (should be blocked for unverified)
export const PROTECTED_ROUTES = [
  "/api/v1/admin/users",
  "/api/v1/admin/applications",
  "/api/v1/onboarding/status",
];
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/middleware/__tests__/email-verification.middleware.test.ts`

```
describe("EmailVerificationMiddleware")
  ✓ allows verified user to pass through (next() called)
  ✓ blocks unverified user with 403 EMAIL_NOT_VERIFIED
  ✓ exempts POST /api/v1/auth/resend-verification from check
  ✓ exempts GET /api/v1/auth/verify-callback from check
  ✓ runs after AuthMiddleware (req.user is populated)
  ✓ returns correct error shape in ApiResponse format

describe("Resend Verification")
  ✓ calls supabase.auth.resend() for unverified user
  ✓ returns 400 ALREADY_VERIFIED for verified user
  ✓ rate limits to 3 requests per 10 minutes per user
  ✓ returns 429 RATE_LIMIT_EXCEEDED when limit hit
  ✓ resets rate limit counter after 10 minutes
```

**Total: ~11 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Email verification flow involves external email delivery which is not testable in Playwright without email interceptors.

## 12. Acceptance Criteria

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

## 13. Source References

| Claim | Source |
|-------|--------|
| Email verification gate | S-U-02-4 § User Story |
| Interstitial with resend | S-U-02-4 § Acceptance Criteria |
| Rate limit 3/10min | S-U-02-4 § Acceptance Criteria |
| Middleware blocking | S-U-02-4 § Acceptance Criteria: "blocks API access for unverified users" |
| EmailNotVerifiedError | S-U-02-4 § Acceptance Criteria |
| Middleware order | S-U-02-4 § Notes: "AuthMiddleware -> EmailVerificationMiddleware -> RbacMiddleware" |
| Exempt endpoints | S-U-02-4 § Notes |
| Supabase handles email | S-U-02-4 § Notes: "Supabase handles the verification email sending and callback" |
| In-memory rate counter | S-U-02-4 § Notes: "simple in-memory counter per user ID (production: Redis)" |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running with email verification enabled in auth settings
- **Express:** Server running on port 3001 with auth middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story
- **Email:** Supabase built-in email service (or custom SMTP configured in Supabase dashboard)

## 15. Implementation Notes

- **Middleware check:** Read `email_confirmed_at` from `req.user` (set by AuthMiddleware from JWT claims). If `null` and route is not exempt, return 403 `EmailNotVerifiedError`.
- **Exempt route matching:** Use a simple array of path prefixes. Check `req.path.startsWith(exemptPath)` for each.
- **Resend via Supabase:** Use `supabase.auth.resend({ type: 'signup', email })` to trigger Supabase's built-in verification email.
- **In-memory rate limiter:** Use a `Map<string, { count: number; resetAt: number }>` keyed by user ID. Increment on each resend request. Reset when `Date.now() > resetAt`. Production upgrade: move to Redis.
- **Frontend auth state:** Use `supabase.auth.onAuthStateChange((event, session) => { if (event === 'USER_UPDATED' && session?.user.email_confirmed_at) { redirect to dashboard } })`.
- **Redirect logic:** After login, check if `email_confirmed_at` is null. If so, redirect to `/verify-email`. If not, proceed to dashboard or onboarding.
- **Middleware insertion:** In `apps/server/src/index.ts`, add `emailVerificationMiddleware` between `authMiddleware` and `rbacMiddleware` in the middleware chain for protected routes.
