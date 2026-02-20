# Plan: STORY-U-5 — Forgot Password Flow

## Status: AWAITING APPROVAL

## Codebase State
- STORY-U-1 (Supabase Auth Setup): DONE — monorepo scaffold, Supabase client, env config
- `JourneyOSError` base class exists at `apps/server/src/errors/base.errors.ts`
- `ApiResponse<T>` / `ApiError` types exist in `packages/types/src/auth/auth.types.ts`
- Express app at `apps/server/src/index.ts` — health route + auth middleware already wired
- No `(auth)` layout group exists yet in `apps/web` — will create
- `SITE_URL` not in env schema yet — needs adding as optional

---

## Tasks (implementation order)

### Phase 1: Types
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 1 | Define ForgotPasswordRequest, ForgotPasswordResponse, RateLimitConfig | `packages/types/src/auth/password-reset.types.ts` | CREATE |
| 2 | Re-export new types from auth barrel | `packages/types/src/auth/index.ts` | UPDATE |

### Phase 2: Error Classes
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 3 | RateLimitError extending JourneyOSError (code: "RATE_LIMITED", #retryAfterMs) | `apps/server/src/errors/rate-limit.error.ts` | CREATE |
| 4 | ValidationError extending JourneyOSError (code: "VALIDATION_ERROR") | `apps/server/src/errors/validation.error.ts` | CREATE |
| 5 | Export both from errors barrel | `apps/server/src/errors/index.ts` | UPDATE |

### Phase 3: Middleware
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 6 | RateLimiterMiddleware class (#store Map, #config, #keyExtractor) + createForgotPasswordRateLimiter factory | `apps/server/src/middleware/rate-limiter.middleware.ts` | CREATE |

### Phase 4: Service
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 7 | PasswordResetService (#supabaseClient, #siteUrl) — requestPasswordReset() wraps Supabase, always returns success | `apps/server/src/services/auth/password-reset.service.ts` | CREATE |

### Phase 5: Controller
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 8 | PasswordResetController (#passwordResetService) — handleForgotPassword() with validation + error mapping | `apps/server/src/controllers/auth/password-reset.controller.ts` | CREATE |

### Phase 6: Route Registration
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 9 | Add SITE_URL as optional to env schema | `apps/server/src/config/env.config.ts` | UPDATE |
| 10 | Register `POST /api/v1/auth/forgot-password` as public route (BEFORE auth middleware), wire rate limiter + controller | `apps/server/src/index.ts` | UPDATE |

### Phase 7: Frontend
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 11 | Create (auth) group layout — centered card, no navigation | `apps/web/src/app/(auth)/layout.tsx` | CREATE |
| 12 | Server component page with metadata | `apps/web/src/app/(auth)/forgot-password/page.tsx` | CREATE |
| 13 | ForgotPasswordForm client component — idle/loading/success/error states, calls Express API | `apps/web/src/components/auth/forgot-password-form.tsx` | CREATE |

### Phase 8: Tests
| # | Task | File Path | Action |
|---|------|-----------|--------|
| 14 | PasswordResetService tests (7 cases) | `apps/server/src/services/auth/__tests__/password-reset.service.test.ts` | CREATE |
| 15 | PasswordResetController tests (6 cases) | `apps/server/src/controllers/auth/__tests__/password-reset.controller.test.ts` | CREATE |
| 16 | RateLimiterMiddleware tests (6 cases) | `apps/server/src/middleware/__tests__/rate-limiter.middleware.test.ts` | CREATE |

---

## Implementation Order
Types → Errors → Middleware → Service → Controller → Route → View → Tests

## Patterns to Follow
- OOP: JS `#private` fields, public getters, constructor DI (CLAUDE.md)
- Custom errors extend `JourneyOSError` (see `apps/server/src/errors/base.errors.ts`)
- Named exports only (CLAUDE.md)
- `ApiResponse<T>` envelope for all responses (existing pattern in `auth.types.ts`)
- Solution doc: `docs/solutions/rbac-middleware-pattern.md` — similar middleware class pattern

## Key Design Decisions
1. **Rate limiter keyed by email** (from request body), not IP — prevents one email from being spammed while allowing legitimate users on shared networks
2. **Service always returns success** even on Supabase error — logs the error server-side but never leaks info to the client (enumeration prevention)
3. **Route placed BEFORE `app.use("/api/v1", createAuthMiddleware())`** — this is a public endpoint
4. **Frontend calls Express API, NOT Supabase directly** — keeps rate limiting server-side
5. **`SITE_URL` added as optional** to env schema with fallback to `http://localhost:3000`

## Note on `JourneyOSError` base class
The base class uses TS `public readonly code` (not `#private`). This is existing code from U-1 — I won't refactor it in this story. New error classes (RateLimitError, ValidationError) will use `#private` for their own fields while inheriting `code` from the base.

## Testing Strategy
- **API tests (vitest):** 3 test suites, ~19 test cases total
  - `password-reset.service.test.ts` — Supabase call, redirectTo, enumeration prevention, validation, error handling
  - `password-reset.controller.test.ts` — HTTP status codes, response shapes, error mapping
  - `rate-limiter.middleware.test.ts` — limit enforcement, window reset, per-key tracking, Retry-After header
- **E2E:** None (depends on Supabase email delivery — deferred to U-5 + U-11 completion)

## Figma Make
- [x] Code directly (simple single-field form)

## Risks / Edge Cases
- **No (auth) layout exists yet** — Need to create the group layout. Will be minimal (centered card). Future auth pages (login, register, reset-password) will reuse it.
- **`SITE_URL` env var** — Adding as optional to avoid breaking existing setups. Falls back to localhost:3000.
- **In-memory rate limiter** — Resets on server restart. Acceptable for current stage; brief notes Redis upgrade path for production.
- **Express 5 typing** — Express 5 has different types than v4. Need to verify `req.ip` availability (it exists in Express 5 but types may differ).

## Acceptance Criteria (verbatim from brief)
- AC-1: Forgot password page exists at `/forgot-password` with email input and submit button
- AC-2: Email format validation before submission (client-side + server-side)
- AC-3: Server calls Supabase `resetPasswordForEmail()` on valid submission
- AC-4: Success message displayed regardless of email existence (prevent enumeration)
- AC-5: Rate limiting: max 3 reset requests per email per hour
- AC-6: Loading state shown during request submission
- AC-7: Link to forgot password page from login (deferred — login page not built yet)
- AC-8: Error handling for network failures with retry option
- AC-9: `POST /api/v1/auth/forgot-password` is a public route (no auth required)
- AC-10: All error responses follow `ApiResponse<null>` envelope
- AC-11: JS `#private` fields used (not TS `private`)
- AC-12: Constructor DI: Supabase client injected into PasswordResetService
- AC-13: Custom error classes only (no raw throw new Error())
- AC-14: 12+ API tests pass
- AC-15: 429 response includes `Retry-After` header
