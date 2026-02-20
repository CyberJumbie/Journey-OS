---
name: public-auth-route-pattern
tags: [auth, express, rate-limiting, public-routes, middleware]
story: STORY-U-5
date: 2026-02-19
---
# Public Auth Route Pattern

## Problem
Some auth endpoints (forgot-password, login, register) must be accessible without authentication. These routes need to be registered BEFORE the global auth middleware in Express, with per-route rate limiting to prevent abuse.

## Solution

Register public auth routes between the health check and the `app.use("/api/v1", createAuthMiddleware())` line. Each public route gets its own rate limiter.

```typescript
// apps/server/src/index.ts

// 1. Health — public, no rate limiting
app.get("/api/v1/health", (_req, res) => { ... });

// 2. Public auth routes — before auth middleware, rate-limited
app.post(
  "/api/v1/auth/forgot-password",
  createForgotPasswordRateLimiter(),
  (req, res) => passwordResetController.handleForgotPassword(req, res),
);

// 3. Auth middleware — everything below requires JWT
app.use("/api/v1", createAuthMiddleware());
```

### Rate Limiter Pattern

Use `RateLimiterMiddleware` class with constructor DI for config and key extraction:

```typescript
const limiter = new RateLimiterMiddleware(
  { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3/hour
  (req) => (req.body?.email ?? req.ip ?? "unknown").toLowerCase(),
);
```

Key by email (not IP) to prevent one email from being spammed while allowing legitimate users on shared networks. Include `Retry-After` header on 429 responses.

### Controller Pattern

Always return same success response regardless of whether email exists (prevents enumeration):

```typescript
return {
  message: "If an account with that email exists, a password reset link has been sent.",
};
```

## Invitation Acceptance Variant (STORY-U-9)

Token-based public endpoints that validate and consume a one-time invitation token. Same placement (before auth middleware) but no rate limiting needed — the token itself is the access control:

```typescript
// Invitation acceptance — public, no auth (user has no account yet)
app.get("/api/v1/invitations/validate", (req, res) =>
  invitationAcceptanceController.handleValidate(req, res),
);
app.post("/api/v1/invitations/accept", (req, res) =>
  invitationAcceptanceController.handleAccept(req, res),
);
```

Key differences from password reset:
- **No rate limiter** — token is single-use with expiry (self-limiting)
- **Two endpoints** — validate (GET, display-only) + accept (POST, creates account)
- **Optimistic lock** — consume with `WHERE accepted_at IS NULL` to prevent races

## When to Use
- Any unauthenticated API endpoint (forgot-password, login, register, email verification, invitation acceptance)
- Public endpoints that need abuse protection

## When Not to Use
- Authenticated endpoints (use auth middleware + RBAC instead)
- WebSocket endpoints (different rate limiting strategy)

## Source Reference
- [ARCHITECTURE_v10 § Frontend Routes] — `/forgot-password`, `/reset-password`
- [API_CONTRACT_v1 § Error Codes] — 429 RATE_LIMITED
