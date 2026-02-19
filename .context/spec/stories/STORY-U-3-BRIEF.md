# STORY-U-3 Brief: Express Auth Middleware

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-U-3
old_id: S-U-01-2
epic: E-01 (Auth Infrastructure)
feature: F-01 (Authentication & Authorization)
sprint: 3
lane: universal
lane_priority: 0
within_lane_order: 3
size: M
depends_on:
  - STORY-U-1 (universal) — Supabase Auth Setup [DONE]
blocks:
  - STORY-U-6 (universal) — RBAC Middleware
  - STORY-U-8 (universal) — Registration Wizard
  - STORY-U-9 (universal) — Invitation Acceptance Flow
  - STORY-U-10 (universal) — Role-Based Dashboard Routing
  - STORY-U-14 (universal) — Email Verification Gate
personas_served: [all — infrastructure story]
```

---

## Section 1: Summary

**What to build:** Express middleware that verifies Supabase JWT tokens from the `Authorization` header, extracts the user's role and institution from `app_metadata`, and populates `req.user` with a typed `AuthTokenPayload` object. This includes an `AuthService` class that wraps Supabase auth operations (verify, decode) and an `AuthMiddleware` class that delegates to `AuthService` via constructor injection.

**Parent epic:** E-01 (Auth Infrastructure) under F-01 (Authentication & Authorization). This is story 2 of 4 in the epic.

**User flows affected:** This middleware is required by every authenticated API endpoint. It directly enables UF-01 (Faculty Login session verification), UF-02 (Registration token validation), and all subsequent flows that hit protected API routes.

**Personas:** All five personas require authenticated API access. This middleware is the gate.

**Why this story is third:** STORY-U-1 created the auth types, error classes, env config, and Supabase client. This story uses all of those to build the actual middleware layer. It unblocks STORY-U-6 (RBAC) which is the single biggest blocker in the project (12+ downstream stories).

---

## Section 2: Task Breakdown

Implementation order follows: **Types -> Service -> Middleware -> Tests**

### Task 1: Define AuthenticatedRequest type augmentation
- **File:** `packages/types/src/auth/auth-request.types.ts`
- **Action:** Create Express Request type augmentation that adds `user: AuthTokenPayload` to `req`. Use TypeScript module augmentation for Express.

### Task 2: Update auth types barrel export
- **File:** `packages/types/src/auth/index.ts`
- **Action:** Re-export the new `AuthenticatedRequest` type.

### Task 3: Create AuthService class
- **File:** `apps/server/src/services/auth/auth.service.ts`
- **Action:** Create `AuthService` class with constructor DI for Supabase client. Methods: `verifyToken(token: string)` returns `AuthTokenPayload`, `extractBearerToken(header: string)` returns token string. Uses `@supabase/supabase-js` `getUser()` for JWT verification.

### Task 4: Create AuthMiddleware class
- **File:** `apps/server/src/middleware/auth.middleware.ts`
- **Action:** Create `AuthMiddleware` class with constructor DI for `AuthService`. Method: `handle(req, res, next)` — extracts Bearer token, calls `AuthService.verifyToken()`, populates `req.user`, calls `next()`. OPTIONS requests pass through for CORS preflight.

### Task 5: Create middleware factory function
- **File:** `apps/server/src/middleware/auth.middleware.ts` (same file)
- **Action:** Export `createAuthMiddleware()` factory that instantiates `AuthService` and `AuthMiddleware` and returns the bound handler.

### Task 6: Wire middleware into Express app
- **File:** `apps/server/src/index.ts`
- **Action:** Import and apply auth middleware to protected routes. The health endpoint remains unprotected. Export the middleware instance for route-level use.

### Task 7: Write AuthService unit tests
- **File:** `apps/server/src/services/auth/__tests__/auth.service.test.ts`
- **Action:** Test token verification, extraction, error cases.

### Task 8: Write AuthMiddleware integration tests
- **File:** `apps/server/src/middleware/__tests__/auth.middleware.test.ts`
- **Action:** 10 test cases covering all acceptance criteria.

---

## Section 3: Data Model (inline, complete)

### Express Request Type Augmentation

```typescript
// packages/types/src/auth/auth-request.types.ts

import { AuthTokenPayload } from './auth.types';

/**
 * Augment Express Request to include `user` property after auth middleware.
 * [ARCHITECTURE v10 SS 4.2] — Express middleware populates req.user from JWT.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Type guard: check if a request has been authenticated.
 * Use after auth middleware to narrow the type.
 */
export function isAuthenticated(
  req: Express.Request,
): req is Express.Request & { user: AuthTokenPayload } {
  return req.user !== undefined && req.user !== null;
}
```

### AuthTokenPayload (already exists from STORY-U-1)

```typescript
// packages/types/src/auth/auth.types.ts (EXISTING — DO NOT MODIFY)

export interface AuthTokenPayload {
  readonly sub: string;            // user UUID (auth.users.id)
  readonly email: string;
  readonly role: AuthRole;         // from app_metadata.role
  readonly institution_id: string; // from app_metadata.institution_id
  readonly is_course_director: boolean;
  readonly aud: string;
  readonly exp: number;
  readonly iat: number;
}
```

### AuthRole enum (already exists from STORY-U-1)

```typescript
export enum AuthRole {
  SUPERADMIN = 'superadmin',
  INSTITUTIONAL_ADMIN = 'institutional_admin',
  FACULTY = 'faculty',
  ADVISOR = 'advisor',
  STUDENT = 'student',
}
```

---

## Section 4: Database Schema (inline, complete)

No new database schema. This story reads from `auth.users` via Supabase JWT verification only. The relevant schema was created in STORY-U-1:

```sql
-- auth.users.raw_app_meta_data JSONB contains:
-- {
--   "role": "faculty",
--   "institution_id": "uuid",
--   "is_course_director": false
-- }
```

The middleware extracts these fields from the verified JWT claims.

---

## Section 5: API Contract (complete request/response)

### Authentication Convention

All protected endpoints require:
```
Authorization: Bearer <supabase-jwt>
```

### Middleware Response on Failure

**401 — Missing Authorization header:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing Authorization header"
  }
}
```

**401 — Invalid Bearer format:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid Authorization header format. Expected: Bearer <token>"
  }
}
```

**401 — Expired token:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token has expired"
  }
}
```

**401 — Invalid/malformed token:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or malformed token"
  }
}
```

**401 — Invalid signature:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token signature"
  }
}
```

### OPTIONS Passthrough (CORS Preflight)

OPTIONS requests bypass authentication entirely and return immediately. This is required for CORS preflight requests from the browser.

### Successful Authentication

On success, the middleware sets `req.user` and calls `next()`. No response body is sent by the middleware itself.

```typescript
// After middleware runs, req.user contains:
{
  sub: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "dr.osei@msm.edu",
  role: "faculty",                    // AuthRole enum value
  institution_id: "inst-uuid-here",
  is_course_director: true,
  aud: "authenticated",
  exp: 1740000000,
  iat: 1739996400
}
```

---

## Section 6: Frontend Spec

This story does NOT create any UI components. It creates server-side Express middleware only. The frontend will consume this indirectly via API calls that pass through the middleware.

---

## Section 7: Files to Create (exact paths, implementation order)

```
# 1. Shared Types (packages/types)
packages/types/src/auth/auth-request.types.ts    # Express Request augmentation + isAuthenticated guard
packages/types/src/auth/index.ts                  # UPDATE: add auth-request exports

# 2. Service Layer (apps/server)
apps/server/src/services/auth/auth.service.ts     # AuthService class — JWT verification

# 3. Middleware Layer (apps/server)
apps/server/src/middleware/auth.middleware.ts      # AuthMiddleware class + createAuthMiddleware factory

# 4. App Integration (apps/server)
apps/server/src/index.ts                          # UPDATE: wire auth middleware

# 5. Tests
apps/server/src/services/auth/__tests__/auth.service.test.ts
apps/server/src/middleware/__tests__/auth.middleware.test.ts
```

---

## Section 8: Dependencies

### Stories

| Story | Lane | Status | Relationship |
|-------|------|--------|-------------|
| STORY-U-1 | universal | DONE | Provides auth types, error classes, env config, Supabase client |
| STORY-U-6 | universal | pending | Blocked by this story (RBAC middleware) |

### NPM Packages (already installed)

| Package | Version | Location | Purpose |
|---------|---------|----------|---------|
| `@supabase/supabase-js` | `^2.97.0` | `apps/server` | JWT verification via `getUser()` |
| `express` | `^5.2.1` | `apps/server` | HTTP framework |
| `@types/express` | dev | `apps/server` | Express type definitions |
| `vitest` | dev | `apps/server` | Test runner |

No new packages needed.

### Existing Files (consumed by this story)

| File | Purpose |
|------|---------|
| `packages/types/src/auth/auth.types.ts` | `AuthTokenPayload`, `AuthRole` |
| `packages/types/src/auth/roles.types.ts` | `AuthRole` enum, `isValidRole()` |
| `apps/server/src/errors/auth.errors.ts` | `AuthenticationError` |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/config/supabase.config.ts` | `getSupabaseClient()` singleton |
| `apps/server/src/config/env.config.ts` | `envConfig` for JWT secret |

---

## Section 9: Test Fixtures (inline)

### Valid JWT Fixtures

```json
{
  "VALID_JWT_PAYLOAD": {
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "dr.osei@msm.edu",
    "role": "faculty",
    "institution_id": "inst-0001-0002-0003-000000000001",
    "is_course_director": true,
    "aud": "authenticated",
    "exp": 1999999999,
    "iat": 1739996400
  },
  "VALID_SUPERADMIN_PAYLOAD": {
    "sub": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "email": "admin@journeyos.io",
    "role": "superadmin",
    "institution_id": "inst-0000-0000-0000-000000000000",
    "is_course_director": false,
    "aud": "authenticated",
    "exp": 1999999999,
    "iat": 1739996400
  },
  "VALID_STUDENT_PAYLOAD": {
    "sub": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "email": "marcus.williams@msm.edu",
    "role": "student",
    "institution_id": "inst-0001-0002-0003-000000000001",
    "is_course_director": false,
    "aud": "authenticated",
    "exp": 1999999999,
    "iat": 1739996400
  }
}
```

### Invalid Token Fixtures

```json
{
  "EXPIRED_JWT_PAYLOAD": {
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "dr.osei@msm.edu",
    "role": "faculty",
    "institution_id": "inst-0001-0002-0003-000000000001",
    "is_course_director": false,
    "aud": "authenticated",
    "exp": 1000000000,
    "iat": 999996400
  },
  "MALFORMED_TOKEN": "not.a.valid.jwt.token",
  "EMPTY_BEARER": "",
  "MISSING_ROLE_PAYLOAD": {
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "dr.osei@msm.edu",
    "aud": "authenticated",
    "exp": 1999999999,
    "iat": 1739996400
  }
}
```

### Mock Express Objects

```typescript
// Helper to create mock Express req/res/next for middleware tests
function createMockRequest(headers: Record<string, string> = {}): Partial<Request> {
  return {
    headers: { ...headers },
    method: 'GET',
    path: '/api/v1/test',
  };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res;
}
```

---

## Section 10: API Test Spec (vitest)

### Test Suite: `auth.service.test.ts`

```
describe('AuthService')
  describe('extractBearerToken')
    it('should extract token from valid "Bearer <token>" header')
    it('should throw AuthenticationError for missing header')
    it('should throw AuthenticationError for non-Bearer scheme')
    it('should throw AuthenticationError for empty bearer value')
    it('should throw AuthenticationError for "Bearer" with no token')

  describe('verifyToken')
    it('should return AuthTokenPayload for valid token')
    it('should extract role from app_metadata.role')
    it('should extract institution_id from app_metadata.institution_id')
    it('should extract is_course_director from app_metadata')
    it('should throw AuthenticationError for expired token')
    it('should throw AuthenticationError for invalid signature')
    it('should throw AuthenticationError for malformed token')
    it('should throw AuthenticationError when role is missing from app_metadata')
    it('should throw AuthenticationError when role is invalid')
```

### Test Suite: `auth.middleware.test.ts`

```
describe('AuthMiddleware')
  it('should call next() with req.user populated for valid token')
  it('should return 401 with UNAUTHORIZED code for missing Authorization header')
  it('should return 401 for expired token')
  it('should return 401 for malformed token')
  it('should return 401 for empty Bearer value')
  it('should extract role correctly from JWT claims')
  it('should extract institution_id correctly from JWT claims')
  it('should pass through OPTIONS requests without auth (CORS preflight)')
  it('should return 401 for invalid token signature')
  it('should return structured error in { data, error } envelope')

describe('createAuthMiddleware')
  it('should return a function with (req, res, next) signature')
  it('should use the singleton Supabase client by default')
```

---

## Section 11: E2E Test Spec

Not applicable. This is an infrastructure middleware story. E2E login/registration tests will be part of STORY-U-8 (Registration Wizard) which tests the full flow including this middleware.

---

## Section 12: Acceptance Criteria

1. **AC-1:** `AuthMiddleware` class verifies Supabase JWT on every protected request by calling `AuthService.verifyToken()`. Verified by: unit test with mocked Supabase client.

2. **AC-2:** Invalid/expired tokens return 401 Unauthorized with structured `{ data: null, error: { code: "UNAUTHORIZED", message } }` response. Verified by: 3 test cases (expired, malformed, invalid signature).

3. **AC-3:** Missing Authorization header returns 401 with message "Missing Authorization header". Verified by: unit test sends request without header.

4. **AC-4:** `req.user` is populated with `AuthTokenPayload` containing: `sub`, `email`, `role`, `institution_id`, `is_course_director`, `aud`, `exp`, `iat`. Verified by: test asserts all fields present on `req.user` after middleware runs.

5. **AC-5:** Role is extracted from `app_metadata.role` in JWT claims (NOT `user_metadata`). Verified by: mock Supabase response has role in `app_metadata` and test confirms extraction.

6. **AC-6:** TypeScript augmentation for Express `Request` type includes optional `user: AuthTokenPayload` property. Verified by: TypeScript compilation succeeds without casts.

7. **AC-7:** `AuthService` class wraps Supabase auth operations using constructor DI for the Supabase client. Verified by: tests inject mock client.

8. **AC-8:** Custom `AuthenticationError` class is used (not raw `throw new Error()`). Verified by: grep for `throw new Error` returns zero results in middleware/service files.

9. **AC-9:** 10 API tests pass: valid token, expired token, malformed token, missing header, role extraction, institution scoping, token refresh edge case, invalid signature, empty bearer, OPTIONS passthrough. Verified by: `pnpm --filter @journey-os/server test` passes.

10. **AC-10:** OPTIONS requests pass through without authentication for CORS preflight. Verified by: test sends OPTIONS request and confirms `next()` called without token check.

---

## Section 13: Source References

| Claim | Source |
|-------|--------|
| Express middleware verifies JWT from Authorization header | [ARCHITECTURE v10 SS 4.2] |
| Role stored in `app_metadata.role` (not `user_metadata`) | [ARCHITECTURE v10 SS 4.2] |
| JWT contains `{ role, institution_id, is_course_director }` | [ARCHITECTURE v10 SS 4.2] |
| Bearer JWT in Authorization header convention | [API_CONTRACT v1 SS Conventions] |
| Error code `UNAUTHORIZED` for missing/invalid JWT | [API_CONTRACT v1 SS Error Codes] |
| Response envelope `{ data, error, meta }` | [API_CONTRACT v1 SS Conventions] |
| OOP: Private fields, public getters, constructor DI | [CODE_STANDARDS SS 3.1] |
| Named exports only, no default exports | [CODE_STANDARDS SS 4.4] |
| Custom error classes, no raw `throw new Error()` | [CODE_STANDARDS SS 3.4] |
| MVC: middleware delegates to service | [CODE_STANDARDS SS 2.1] |
| `AuthMiddleware` receives `AuthService` via constructor | [Story S-U-01-2 Notes] |
| OPTIONS passthrough for CORS preflight | [Story S-U-01-2 Notes] |

---

## Section 14: Environment Prerequisites

### Services Required

- **Supabase project** — configured in STORY-U-1 (DONE)
- **Express server** — running on `PORT` (default 3001)

### Environment Variables (already configured from STORY-U-1)

```bash
# apps/server/.env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=<jwt-secret>
NODE_ENV=development
PORT=3001
```

### Dev Setup

```bash
pnpm install                              # already done
pnpm --filter @journey-os/server dev      # start server
pnpm --filter @journey-os/server test     # run tests
```

---

## Section 15: Figma / Make Prototype

Not applicable. This story creates no UI components.

---

## Implementation Notes

### AuthService Pattern

```typescript
// apps/server/src/services/auth/auth.service.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { AuthTokenPayload, AuthRole, isValidRole } from '@journey-os/types';
import { AuthenticationError } from '../../errors/auth.errors';

export class AuthService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  /**
   * Extract Bearer token from Authorization header.
   * @throws AuthenticationError if header is missing or malformed.
   */
  extractBearerToken(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new AuthenticationError('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AuthenticationError(
        'Invalid Authorization header format. Expected: Bearer <token>',
      );
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
      throw new AuthenticationError('Empty bearer token');
    }

    return token;
  }

  /**
   * Verify JWT token via Supabase and extract AuthTokenPayload.
   * @throws AuthenticationError if token is invalid, expired, or missing role.
   */
  async verifyToken(token: string): Promise<AuthTokenPayload> {
    const { data, error } = await this.#supabaseClient.auth.getUser(token);

    if (error || !data.user) {
      throw new AuthenticationError(
        error?.message ?? 'Invalid or malformed token',
      );
    }

    const user = data.user;
    const appMetadata = user.app_metadata ?? {};
    const role = appMetadata.role;

    if (!role || !isValidRole(role)) {
      throw new AuthenticationError(
        'Missing or invalid role in token claims',
      );
    }

    return {
      sub: user.id,
      email: user.email ?? '',
      role: role as AuthRole,
      institution_id: appMetadata.institution_id ?? '',
      is_course_director: appMetadata.is_course_director ?? false,
      aud: 'authenticated',
      exp: 0, // Not directly available from getUser — use JWT decode if needed
      iat: 0,
    };
  }
}
```

### AuthMiddleware Pattern

```typescript
// apps/server/src/middleware/auth.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { AuthenticationError } from '../errors/auth.errors';
import { getSupabaseClient } from '../config/supabase.config';

export class AuthMiddleware {
  readonly #authService: AuthService;

  constructor(authService: AuthService) {
    this.#authService = authService;
  }

  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    // CORS preflight passthrough
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    try {
      const token = this.#authService.extractBearerToken(
        req.headers.authorization,
      );
      const payload = await this.#authService.verifyToken(token);
      req.user = payload;
      next();
    } catch (err) {
      if (err instanceof AuthenticationError) {
        res.status(401).json({
          data: null,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  }
}

/**
 * Factory: creates an AuthMiddleware bound to the singleton Supabase client.
 * Returns the middleware handler function for use with app.use().
 */
export function createAuthMiddleware(): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const authService = new AuthService(getSupabaseClient());
  const middleware = new AuthMiddleware(authService);
  return (req, res, next) => middleware.handle(req, res, next);
}
```

### Express App Integration

```typescript
// apps/server/src/index.ts — ADDITIONS (do not replace entire file)

import { createAuthMiddleware } from './middleware/auth.middleware';

// After app.use(express.json()):

// Health check remains unprotected
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// All /api/v1/* routes after this point require auth
app.use('/api/v1', createAuthMiddleware());

// Future route handlers will be mounted after the auth middleware
```

---

*Brief generated: 2026-02-19. This document is self-contained. All source data is inlined. No external lookups required for implementation.*
