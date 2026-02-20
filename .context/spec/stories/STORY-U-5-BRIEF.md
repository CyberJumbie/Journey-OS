# STORY-U-5 Brief: Forgot Password Flow

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-U-5
old_id: S-U-03-1
epic: E-03 (Account Recovery)
feature: F-01 (Platform Authentication & Authorization)
sprint: 21
lane: universal
lane_priority: 0
within_lane_order: 5
size: S
depends_on:
  - STORY-U-1 (universal) — Supabase Auth Setup [DONE]
blocks:
  - STORY-U-11 — Password Reset Page
personas_served: [all — any user who forgot their password]
```

## 1. Summary

**What to build:** A forgot password flow consisting of: (1) a server-side service + controller + route that wraps Supabase's `resetPasswordForEmail()`, (2) a rate limiter middleware to prevent email enumeration/abuse, and (3) a Next.js forgot-password page with email input form. The server endpoint always returns success regardless of whether the email exists (prevent enumeration). The Supabase client handles email delivery and token generation internally.

**Parent epic:** E-03 (Account Recovery) under F-01 (Authentication & Authorization). This is story 1 of 2 in E-03.

**User flows satisfied:**
- UF-01 (Platform Onboarding) — password recovery path
- UF-05 (User Role Management) — any persona can recover access

**Personas:** All five personas. Password recovery is a universal public flow — no authentication required.

**Why this story matters:** STORY-U-5 blocks STORY-U-11 (Password Reset Page), which completes the full account recovery flow. Without it, users who forget their password have no self-service recovery option.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define password reset types | `packages/types/src/auth/password-reset.types.ts` | CREATE |
| 2 | Export new types from auth barrel | `packages/types/src/auth/index.ts` | UPDATE |
| 3 | Create RateLimitError custom error | `apps/server/src/errors/rate-limit.error.ts` | CREATE |
| 4 | Export RateLimitError from errors barrel | `apps/server/src/errors/index.ts` | UPDATE |
| 5 | Create ValidationError custom error | `apps/server/src/errors/validation.error.ts` | CREATE |
| 6 | Export ValidationError from errors barrel | `apps/server/src/errors/index.ts` | UPDATE |
| 7 | Implement in-memory rate limiter | `apps/server/src/middleware/rate-limiter.middleware.ts` | CREATE |
| 8 | Implement PasswordResetService | `apps/server/src/services/auth/password-reset.service.ts` | CREATE |
| 9 | Implement PasswordResetController | `apps/server/src/controllers/auth/password-reset.controller.ts` | CREATE |
| 10 | Register forgot-password route (public, before auth middleware) | `apps/server/src/index.ts` | UPDATE |
| 11 | Create forgot-password page (Next.js) | `apps/web/src/app/(auth)/forgot-password/page.tsx` | CREATE |
| 12 | Create ForgotPasswordForm client component | `apps/web/src/components/auth/forgot-password-form.tsx` | CREATE |
| 13 | Write PasswordResetService unit tests | `apps/server/src/services/auth/__tests__/password-reset.service.test.ts` | CREATE |
| 14 | Write PasswordResetController unit tests | `apps/server/src/controllers/auth/__tests__/password-reset.controller.test.ts` | CREATE |
| 15 | Write rate limiter middleware tests | `apps/server/src/middleware/__tests__/rate-limiter.middleware.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/auth/password-reset.types.ts`

```typescript
/**
 * Request body for POST /api/v1/auth/forgot-password.
 * Only requires email — Supabase handles token generation and email delivery.
 */
export interface ForgotPasswordRequest {
  readonly email: string;
}

/**
 * Response shape for forgot-password endpoint.
 * Always returns success to prevent email enumeration.
 */
export interface ForgotPasswordResponse {
  readonly message: string;
}

/**
 * Rate limiter configuration.
 */
export interface RateLimitConfig {
  /** Max requests per window per key */
  readonly maxRequests: number;
  /** Window duration in milliseconds */
  readonly windowMs: number;
}
```

**Note:** `ResetPasswordRequest` and `UpdatePasswordRequest` already exist in `packages/types/src/auth/auth.types.ts`. The new `ForgotPasswordRequest` is semantically distinct (it maps to the forgot-password endpoint, not the update-password endpoint in STORY-U-11).

## 4. Database Schema (inline, complete)

**No new database schema required for STORY-U-5.**

Password reset is handled entirely by Supabase Auth:
- `supabase.auth.resetPasswordForEmail(email)` sends a recovery email
- Supabase generates and stores the recovery token internally
- Token expiry is configured in the Supabase dashboard (default: 1 hour)
- No custom tables needed

Rate limiting uses in-memory storage (Map). For production scale, this could be upgraded to Redis, but an in-memory implementation is correct for the current stage.

## 5. API Contract (complete request/response)

### POST /api/v1/auth/forgot-password

**Auth:** None (public endpoint)

**Request:**
```
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "student.kim@msm.edu"
}
```

**200 Success (always, whether email exists or not):**
```json
{
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent."
  },
  "error": null
}
```

**400 Validation Error (invalid email format):**
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format"
  }
}
```

**429 Rate Limited:**
```json
{
  "data": null,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many password reset requests. Please try again later."
  }
}
```

**500 Internal Error (Supabase unreachable):**
```json
{
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again."
  }
}
```

### Supabase Recovery Email Callback

When the user clicks the link in the recovery email, Supabase redirects to:
```
{SITE_URL}/auth/callback?token_hash=...&type=recovery
```

This callback is handled by STORY-U-11 (Password Reset Page), not this story. The `redirectTo` option in `resetPasswordForEmail()` should point to the web app's reset-password page:
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${process.env.SITE_URL}/auth/callback?next=/reset-password`,
});
```

## 6. Frontend Spec

### Route: `/forgot-password`

**Layout:** `(auth)` group layout — centered card, no navigation.

### Component Hierarchy
```
app/(auth)/forgot-password/page.tsx (Server Component — metadata only)
  └── ForgotPasswordForm (Client Component — "use client")
        ├── Email input field
        ├── Submit button with loading state
        ├── Success message (post-submit)
        ├── Error message (network failure)
        └── Link to /login
```

### ForgotPasswordForm Props & States

```typescript
// No props — self-contained client component

// Internal states:
// - idle: email input + submit button
// - loading: submit button disabled, spinner shown
// - success: green confirmation message, form hidden
// - error: red error message with retry button
type FormState = "idle" | "loading" | "success" | "error";
```

### Design Tokens (from ARCHITECTURE_v10)
- Font: Source Sans 3 (body), DM Mono (labels)
- Card: white bg, rounded-lg, shadow-md, max-w-md centered
- Primary button: bg-[#2b71b9] text-white
- Input: border-gray-300 rounded-md focus:ring-[#2b71b9]
- Success text: text-[#69a338]
- Error text: text-red-600
- Link: text-[#2b71b9] hover:underline

### States
1. **Idle:** Email input, "Send Reset Link" button, "Back to Login" link
2. **Loading:** Button shows spinner, input disabled
3. **Success:** "If an account with that email exists, a password reset link has been sent." — green text, "Back to Login" link
4. **Error:** "Something went wrong. Please try again." — red text, "Try Again" button

### Client-Side Behavior
- The form calls the Express API endpoint (`POST /api/v1/auth/forgot-password`), NOT Supabase directly from the browser. This keeps rate limiting server-side and prevents client-side bypass.
- Email format validation happens client-side before submission (basic regex).
- On success, the form is replaced with the success message (no re-submission).

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/auth/password-reset.types.ts` | CREATE | ForgotPasswordRequest, ForgotPasswordResponse, RateLimitConfig |
| 2 | Types | `packages/types/src/auth/index.ts` | UPDATE | Add exports for password-reset.types |
| 3 | Errors | `apps/server/src/errors/rate-limit.error.ts` | CREATE | RateLimitError with retryAfter context |
| 4 | Errors | `apps/server/src/errors/validation.error.ts` | CREATE | ValidationError for request validation |
| 5 | Errors | `apps/server/src/errors/index.ts` | UPDATE | Add RateLimitError + ValidationError exports |
| 6 | Middleware | `apps/server/src/middleware/rate-limiter.middleware.ts` | CREATE | In-memory rate limiter keyed by email |
| 7 | Service | `apps/server/src/services/auth/password-reset.service.ts` | CREATE | PasswordResetService wrapping Supabase |
| 8 | Controller | `apps/server/src/controllers/auth/password-reset.controller.ts` | CREATE | PasswordResetController with request validation |
| 9 | App | `apps/server/src/index.ts` | UPDATE | Register public forgot-password route |
| 10 | View | `apps/web/src/app/(auth)/forgot-password/page.tsx` | CREATE | Server component with metadata |
| 11 | Component | `apps/web/src/components/auth/forgot-password-form.tsx` | CREATE | Client component with form |
| 12 | Tests | `apps/server/src/services/auth/__tests__/password-reset.service.test.ts` | CREATE | Service unit tests |
| 13 | Tests | `apps/server/src/controllers/auth/__tests__/password-reset.controller.test.ts` | CREATE | Controller unit tests |
| 14 | Tests | `apps/server/src/middleware/__tests__/rate-limiter.middleware.test.ts` | CREATE | Rate limiter tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-U-1 | universal | DONE | Supabase auth setup, env config, monorepo scaffold, Supabase client libs |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| `@supabase/supabase-js` | ^2.97.0 | `resetPasswordForEmail()` on server |
| `@supabase/ssr` | ^0.8.0 | Browser Supabase client (apps/web) |
| `express` | ^5.2.1 | Request/Response/NextFunction types |
| `zod` | ^4.3.6 | Request body validation |
| `vitest` | ^4.0.18 | Test runner |
| `next` | 16.1.6 | App Router, Server/Client Components |
| `react` | 19.2.3 | UI |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `packages/types/src/auth/auth.types.ts` | `ApiResponse`, `ApiError` envelope types |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/config/supabase.config.ts` | `getSupabaseClient()` singleton |
| `apps/server/src/config/env.config.ts` | `envConfig` with SUPABASE_URL etc. |
| `apps/server/src/index.ts` | Express app — where public route is registered |
| `apps/web/src/lib/supabase.ts` | `createBrowserClient()` for frontend |

## 9. Test Fixtures (inline)

### Valid Requests

```typescript
export const VALID_FORGOT_PASSWORD_REQUEST = {
  email: "student.kim@msm.edu",
};

export const VALID_FORGOT_PASSWORD_UNKNOWN_EMAIL = {
  email: "unknown@nonexistent.edu",
};
```

### Invalid Requests

```typescript
export const INVALID_EMAIL_FORMAT = {
  email: "not-an-email",
};

export const EMPTY_EMAIL = {
  email: "",
};

export const MISSING_EMAIL = {};
```

### Mock Express Objects Helper

```typescript
import { Request, Response, NextFunction } from "express";

export function mockRequest(body?: Record<string, unknown>): Partial<Request> {
  return {
    body: body ?? {},
    method: "POST",
    headers: { "content-type": "application/json" },
    ip: "127.0.0.1",
  };
}

export function mockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}

export function mockNext(): NextFunction & { called: boolean } {
  const fn = (() => { fn.called = true; }) as NextFunction & { called: boolean };
  fn.called = false;
  return fn;
}
```

### Mock Supabase Auth

```typescript
export function mockSupabaseAuth() {
  return {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({
        data: {},
        error: null,
      }),
    },
  };
}

export function mockSupabaseAuthError() {
  return {
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Supabase error", status: 500 },
      }),
    },
  };
}
```

## 10. API Test Spec (vitest — PRIMARY)

### `apps/server/src/services/auth/__tests__/password-reset.service.test.ts`

```
describe("PasswordResetService")
  describe("requestPasswordReset")
    it("calls supabase.auth.resetPasswordForEmail with the provided email")
    it("passes redirectTo option pointing to the reset-password page")
    it("returns success result even when email does not exist in system")
    it("throws InternalError when Supabase client returns an error")
    it("validates email format before calling Supabase")
    it("rejects empty email string")
    it("rejects malformed email string")
```

### `apps/server/src/controllers/auth/__tests__/password-reset.controller.test.ts`

```
describe("PasswordResetController")
  describe("handleForgotPassword")
    it("returns 200 with success message for valid email")
    it("returns 200 with same success message for non-existent email (no enumeration)")
    it("returns 400 VALIDATION_ERROR for invalid email format")
    it("returns 400 VALIDATION_ERROR for missing email field")
    it("returns 500 INTERNAL_ERROR when service throws")
    it("response body matches ApiResponse<ForgotPasswordResponse> shape")
```

### `apps/server/src/middleware/__tests__/rate-limiter.middleware.test.ts`

```
describe("RateLimiterMiddleware")
  describe("createRateLimiter")
    it("calls next() when under rate limit")
    it("returns 429 RATE_LIMITED when limit exceeded")
    it("resets count after window expires")
    it("tracks limits per key (different emails have separate counters)")
    it("response body matches ApiResponse<null> shape with RATE_LIMITED code")
    it("includes Retry-After header in 429 response")
```

**Total: ~19 test cases** (exceeds 12 minimum).

## 11. E2E Test Spec (Playwright — CONDITIONAL)

**Not applicable for this story.** The forgot password flow depends on Supabase email delivery which cannot be tested end-to-end without a real email inbox. E2E coverage for account recovery will be deferred to when the full flow (U-5 + U-11) is complete, using Supabase's test helpers or email interceptors.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Forgot password page exists at `/forgot-password` with email input and submit button | Manual: navigate to page |
| AC-2 | Email format validation before submission (client-side + server-side) | Test: invalid email → 400 VALIDATION_ERROR |
| AC-3 | Server calls Supabase `resetPasswordForEmail()` on valid submission | Test: mock Supabase call verified |
| AC-4 | Success message displayed regardless of email existence (prevent enumeration) | Test: unknown email → same 200 response as known email |
| AC-5 | Rate limiting: max 3 reset requests per email per hour | Test: 4th request → 429 RATE_LIMITED |
| AC-6 | Loading state shown during request submission | Code review: FormState transitions |
| AC-7 | Link to forgot password page from login (deferred — login page not built yet) | N/A for this story |
| AC-8 | Error handling for network failures with retry option | Code review: error state with "Try Again" button |
| AC-9 | `POST /api/v1/auth/forgot-password` is a public route (no auth required) | Test: no Authorization header needed |
| AC-10 | All error responses follow `ApiResponse<null>` envelope | Test: assert `{ data: null, error: { code, message } }` |
| AC-11 | JS `#private` fields used (not TS `private`) | Code review |
| AC-12 | Constructor DI: Supabase client injected into PasswordResetService | Code review: constructor signature |
| AC-13 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-14 | 12+ API tests pass | Test suite: ≥19 tests in vitest |
| AC-15 | 429 response includes `Retry-After` header | Test: check header presence |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| Supabase handles email delivery and token generation internally | Supabase Auth docs | resetPasswordForEmail API |
| Success message must not reveal whether email exists (security) | OWASP guidelines | Account Enumeration Prevention |
| Five roles: superadmin, institutional_admin, faculty, advisor, student | ARCHITECTURE_v10.md | SS 4.1 |
| Public auth routes placed BEFORE auth middleware | apps/server/src/index.ts | Lines 12-17 |
| Custom error classes only (no raw Error) | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Named exports only | CLAUDE.md | Architecture Rules |
| API response envelope: `{ data, error, meta? }` | API_CONTRACT_v1.md | SS Conventions |
| Password reset routes: `/forgot-password`, `/reset-password` | ARCHITECTURE_v10.md | Frontend route structure |
| @supabase/ssr for SSR cookie-based auth in Next.js | apps/web/package.json | Dependencies |
| Rate limiting defined in API contract (429 RATE_LIMITED) | API_CONTRACT_v1.md | Error Codes |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Supabase | `resetPasswordForEmail()` — but fully mocked in tests | For manual testing only |

### Environment Variables

No new environment variables. The existing Supabase config provides everything:

**Server (`apps/server/.env`):**
- `SUPABASE_URL` — already configured
- `SUPABASE_SERVICE_ROLE_KEY` — already configured

**Web (`apps/web/.env.local`):**
- `NEXT_PUBLIC_SUPABASE_URL` — already configured
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already configured

**Optional (for redirectTo in password reset email):**
- `SITE_URL` — the public URL of the web app. Falls back to `http://localhost:3000` in development. Add to env schema if not already present.

### Dev Setup

```bash
# From monorepo root — already set up from previous stories
pnpm install
pnpm --filter @journey-os/types build   # build types first (project references)
pnpm --filter @journey-os/server test   # run server tests
```

## 15. Figma Make Prototype

**Optional.** The forgot password page is a simple single-field form. Code directly — no prototype needed.

---

## Implementation Notes

### PasswordResetService Design

```typescript
// apps/server/src/services/auth/password-reset.service.ts
import { SupabaseClient } from "@supabase/supabase-js";
import type { ForgotPasswordResponse } from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class PasswordResetService {
  readonly #supabaseClient: SupabaseClient;
  readonly #siteUrl: string;

  constructor(supabaseClient: SupabaseClient, siteUrl: string) {
    this.#supabaseClient = supabaseClient;
    this.#siteUrl = siteUrl;
  }

  /**
   * Request a password reset email. Always returns success to prevent enumeration.
   * @throws ValidationError if email format is invalid.
   */
  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      throw new ValidationError("Invalid email format");
    }

    const { error } = await this.#supabaseClient.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${this.#siteUrl}/auth/callback?next=/reset-password`,
      },
    );

    // Log error for monitoring but do NOT expose to client (prevents enumeration)
    if (error) {
      console.error("[PasswordResetService] Supabase error:", error.message);
    }

    // Always return success
    return {
      message: "If an account with that email exists, a password reset link has been sent.",
    };
  }
}
```

### RateLimiterMiddleware Design

```typescript
// apps/server/src/middleware/rate-limiter.middleware.ts
import { Request, Response, NextFunction } from "express";
import { ApiResponse } from "@journey-os/types";
import type { RateLimitConfig } from "@journey-os/types";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiterMiddleware {
  readonly #store: Map<string, RateLimitEntry>;
  readonly #config: RateLimitConfig;
  readonly #keyExtractor: (req: Request) => string;

  constructor(config: RateLimitConfig, keyExtractor: (req: Request) => string) {
    this.#store = new Map();
    this.#config = config;
    this.#keyExtractor = keyExtractor;
  }

  handle(req: Request, res: Response, next: NextFunction): void {
    const key = this.#keyExtractor(req);
    const now = Date.now();
    const entry = this.#store.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.count >= this.#config.maxRequests) {
        const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader("Retry-After", String(retryAfterSec));
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "RATE_LIMITED",
            message: "Too many password reset requests. Please try again later.",
          },
        };
        res.status(429).json(body);
        return;
      }
      entry.count++;
    } else {
      this.#store.set(key, { count: 1, resetAt: now + this.#config.windowMs });
    }

    next();
  }
}

/**
 * Factory: creates a rate limiter for forgot-password keyed by email in request body.
 * 3 requests per email per hour.
 */
export function createForgotPasswordRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
  const limiter = new RateLimiterMiddleware(
    { maxRequests: 3, windowMs: 60 * 60 * 1000 },
    (req: Request) => (req.body?.email ?? req.ip ?? "unknown").toLowerCase(),
  );
  return (req, res, next) => limiter.handle(req, res, next);
}
```

### PasswordResetController Design

```typescript
// apps/server/src/controllers/auth/password-reset.controller.ts
import { Request, Response } from "express";
import { ApiResponse } from "@journey-os/types";
import type { ForgotPasswordResponse } from "@journey-os/types";
import { PasswordResetService } from "../../services/auth/password-reset.service";
import { ValidationError } from "../../errors/validation.error";

export class PasswordResetController {
  readonly #passwordResetService: PasswordResetService;

  constructor(passwordResetService: PasswordResetService) {
    this.#passwordResetService = passwordResetService;
  }

  async handleForgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#passwordResetService.requestPasswordReset(email);

      const body: ApiResponse<ForgotPasswordResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
        return;
      }

      const body: ApiResponse<null> = {
        data: null,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." },
      };
      res.status(500).json(body);
    }
  }
}
```

### Route Registration (in index.ts)

```typescript
// Add BEFORE the auth middleware line in apps/server/src/index.ts:
import { createForgotPasswordRateLimiter } from "./middleware/rate-limiter.middleware";
import { PasswordResetController } from "./controllers/auth/password-reset.controller";
import { PasswordResetService } from "./services/auth/password-reset.service";
import { getSupabaseClient } from "./config/supabase.config";

const passwordResetService = new PasswordResetService(
  getSupabaseClient(),
  process.env.SITE_URL ?? "http://localhost:3000",
);
const passwordResetController = new PasswordResetController(passwordResetService);

// Public — no auth required
app.post(
  "/api/v1/auth/forgot-password",
  createForgotPasswordRateLimiter(),
  (req, res) => passwordResetController.handleForgotPassword(req, res),
);
```

### Error Classes

```typescript
// apps/server/src/errors/rate-limit.error.ts
import { JourneyOSError } from "./base.errors";

export class RateLimitError extends JourneyOSError {
  readonly #retryAfterMs: number;

  constructor(message: string = "Too many requests", retryAfterMs: number = 0) {
    super(message, "RATE_LIMITED");
    this.#retryAfterMs = retryAfterMs;
  }

  get retryAfterMs(): number {
    return this.#retryAfterMs;
  }
}
```

```typescript
// apps/server/src/errors/validation.error.ts
import { JourneyOSError } from "./base.errors";

export class ValidationError extends JourneyOSError {
  constructor(message: string = "Validation failed") {
    super(message, "VALIDATION_ERROR");
  }
}
```
