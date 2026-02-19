# STORY-U-1 Brief: Supabase Auth Setup

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-U-1
old_id: S-U-01-1
epic: E-01 (Auth Infrastructure)
feature: F-01 (Authentication & Authorization)
sprint: 3
lane: universal
lane_priority: 0
within_lane_order: 1
size: S
depends_on: []
blocks:
  - STORY-U-3 (universal) — Express Auth Middleware
  - STORY-U-5 (universal) — Forgot Password Flow
  - STORY-U-8 (universal) — Registration Wizard
  - STORY-U-9 (universal) — Invitation Acceptance Flow
  - STORY-U-10 (universal) — Role-Based Dashboard Routing
  - STORY-U-14 (universal) — Email Verification Gate
personas_served: [all — infrastructure story]
```

---

## Section 1: Summary

**What to build:** Configure Supabase Auth with email/password provider, define all auth-related TypeScript types in the shared types package, create Supabase client singletons for both the Express backend and Next.js frontend, implement environment variable validation with fail-fast behavior, and set up custom email templates for verification, invitation, and password reset flows.

**Parent epic:** E-01 (Auth Infrastructure) under F-01 (Authentication & Authorization).

**User flows affected:** This story is the foundation for all authentication flows: UF-01 (Faculty Login), UF-02 (Registration), UF-03 (Password Reset), UF-04 (Invitation Acceptance), and UF-05 (Session Persistence). No user flow is directly completed by this story -- it provides the infrastructure all of them depend on.

**Personas:** All five personas benefit indirectly. Dr. Amara Osei (Faculty/Course Director), Marcus Williams (Student), Dr. Kenji Takahashi (Institutional Admin), Fatima Al-Rashid (Advisor), and the Journey OS team (SuperAdmin) all require authentication to access the platform.

**Why this story is first:** STORY-U-1 has zero dependencies and unblocks 6 other stories. It sits at the root of the universal lane critical path. Without Supabase Auth configured, no authentication middleware, no registration, no password flows, and no role-based routing can proceed.

---

## Section 2: Task Breakdown

Implementation order follows the project rule: **Types -> Config -> Tests**

### Task 1: Define AuthRole enum and role types
- **File:** `packages/types/src/auth/roles.types.ts`
- **Action:** Create the `AuthRole` enum with all 5 roles. Create `RolePermissions` interface. Create `ROLE_HIERARCHY` constant mapping.
- **Rationale:** Shared across server and web. Must exist before any config references roles.

### Task 2: Define AuthUser, AuthSession, and Profile types
- **File:** `packages/types/src/auth/auth.types.ts`
- **Action:** Create `AuthUser`, `AuthSession`, `AuthTokenPayload`, `UserProfile`, and auth request/response DTOs.
- **Rationale:** These types are consumed by both Supabase client config and Express middleware.

### Task 3: Create auth types barrel export
- **File:** `packages/types/src/auth/index.ts`
- **Action:** Re-export all auth types from a single entry point.

### Task 4: Define custom error classes for auth
- **File:** `apps/server/src/errors/auth.errors.ts`
- **Action:** Create `AuthenticationError`, `AuthorizationError`, `MissingEnvironmentError` extending `JourneyOSError`.

### Task 5: Create environment variable validation config
- **File:** `apps/server/src/config/env.config.ts`
- **Action:** Define required env vars schema using Zod. Validate on import. Throw `MissingEnvironmentError` on failure (fail-fast).
- **Required vars:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NODE_ENV`.

### Task 6: Create Supabase server client singleton
- **File:** `apps/server/src/config/supabase.config.ts`
- **Action:** Create `SupabaseClientConfig` class with private `SupabaseClient` instance. Use service role key for server operations. Export singleton via `getSupabaseClient()` named export.

### Task 7: Create Supabase web client configuration
- **File:** `apps/web/src/lib/supabase.ts`
- **Action:** Create browser client using `@supabase/ssr` for cookie-based session persistence. Create server-side client for Server Components. Both use anon key.

### Task 8: Configure Supabase project auth settings
- **Action:** Via Supabase MCP or Dashboard:
  - Enable email/password auth provider
  - Set JWT secret in project settings
  - Configure JWT expiry (default: 3600s / 1 hour)
  - Configure refresh token rotation (enabled)
  - Set site URL and redirect URLs

### Task 9: Create custom email templates
- **Action:** Via Supabase MCP or Dashboard, configure 3 email templates:
  - Email verification (on signup)
  - Invitation (admin invites user)
  - Password reset
- Templates branded with Journey OS styling.

### Task 10: Write unit tests for env validation
- **File:** `apps/server/src/config/__tests__/env.config.test.ts`
- **Action:** Test fail-fast behavior, valid config parsing, missing var detection.

### Task 11: Write unit tests for Supabase client creation
- **File:** `apps/server/src/config/__tests__/supabase.config.test.ts`
- **Action:** Test singleton behavior, correct key usage, error on missing config.

### Task 12: Write unit tests for auth types
- **File:** `packages/types/src/auth/__tests__/auth.types.test.ts`
- **Action:** Test AuthRole enum values, type guard functions, role hierarchy.

---

## Section 3: Data Model (inline, complete)

### AuthRole Enum

```typescript
// packages/types/src/auth/roles.types.ts

/**
 * The five platform roles. Stored in `app_metadata.role` on auth.users.
 * "Course Director" is a permission flag (is_course_director) on Faculty, NOT a separate role.
 * [ARCHITECTURE v10 SS 4.1]
 */
export enum AuthRole {
  SUPERADMIN = 'superadmin',
  INSTITUTIONAL_ADMIN = 'institutional_admin',
  FACULTY = 'faculty',
  ADVISOR = 'advisor',
  STUDENT = 'student',
}

/**
 * Role hierarchy: higher index = more permissive.
 * SuperAdmin > InstitutionalAdmin > Faculty > Advisor > Student.
 */
export const ROLE_HIERARCHY: Record<AuthRole, number> = {
  [AuthRole.SUPERADMIN]: 100,
  [AuthRole.INSTITUTIONAL_ADMIN]: 80,
  [AuthRole.FACULTY]: 60,
  [AuthRole.ADVISOR]: 40,
  [AuthRole.STUDENT]: 20,
};

/**
 * Type guard: checks if a string is a valid AuthRole.
 */
export function isValidRole(value: string): value is AuthRole {
  return Object.values(AuthRole).includes(value as AuthRole);
}
```

### AuthUser and AuthSession Interfaces

```typescript
// packages/types/src/auth/auth.types.ts

import { AuthRole } from './roles.types';

/**
 * JWT token payload extracted from Supabase Auth JWT.
 * Role is in app_metadata, NOT user_metadata (prevents self-modification).
 * [ARCHITECTURE v10 SS 4.2]
 */
export interface AuthTokenPayload {
  readonly sub: string;            // user UUID (auth.users.id)
  readonly email: string;
  readonly role: AuthRole;         // from app_metadata.role
  readonly institution_id: string; // from app_metadata.institution_id
  readonly is_course_director: boolean; // from app_metadata.is_course_director
  readonly aud: string;
  readonly exp: number;
  readonly iat: number;
}

/**
 * Authenticated user object available after JWT verification.
 * Maps to POST /api/v1/auth/me response shape.
 * [API_CONTRACT v1 SS Auth & Users]
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly display_name: string;
  readonly onboarding_complete: boolean;
}

/**
 * Session object wrapping Supabase session data.
 */
export interface AuthSession {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_at: number;       // Unix timestamp
  readonly expires_in: number;       // seconds until expiry
  readonly token_type: 'bearer';
  readonly user: AuthUser;
}

/**
 * User profile stored in user_profiles table.
 * PK references auth.users(id).
 * [SUPABASE_DDL v1 SS Auth & Institutional Tables]
 */
export interface UserProfile {
  readonly id: string;               // FK to auth.users.id
  readonly institution_id: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly display_name: string | null;
  readonly title: string | null;
  readonly department: string | null;
  readonly avatar_url: string | null;
  readonly onboarding_complete: boolean;
  readonly created_at: string;       // ISO 8601
  readonly updated_at: string;       // ISO 8601
}

/**
 * Auth-related request DTOs.
 */
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly display_name: string;
  readonly institution_domain: string;
}

export interface RefreshTokenRequest {
  readonly refresh_token: string;
}

export interface ResetPasswordRequest {
  readonly email: string;
}

export interface UpdatePasswordRequest {
  readonly password: string;
}

/**
 * Standard API response envelope.
 * [API_CONTRACT v1 SS Conventions]
 */
export interface ApiResponse<T> {
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly meta?: PaginationMeta;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly total_pages: number;
}

/**
 * Auth response (login/register/refresh).
 */
export interface AuthResponse {
  readonly session: AuthSession;
  readonly user: AuthUser;
}
```

### Barrel Export

```typescript
// packages/types/src/auth/index.ts

export { AuthRole, ROLE_HIERARCHY, isValidRole } from './roles.types';
export type {
  AuthTokenPayload,
  AuthUser,
  AuthSession,
  UserProfile,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ResetPasswordRequest,
  UpdatePasswordRequest,
  ApiResponse,
  ApiError,
  PaginationMeta,
  AuthResponse,
} from './auth.types';
```

---

## Section 4: Database Schema (inline, complete)

### Supabase auth.users (managed by Supabase Auth)

Supabase manages the `auth.users` table automatically. The key fields relevant to this story:

```sql
-- Managed by Supabase Auth — DO NOT create manually
-- auth.users contains:
--   id UUID PRIMARY KEY
--   email TEXT
--   encrypted_password TEXT
--   email_confirmed_at TIMESTAMPTZ
--   raw_app_meta_data JSONB    -- WHERE role lives
--   raw_user_meta_data JSONB
--   created_at TIMESTAMPTZ
--   updated_at TIMESTAMPTZ
```

**Critical:** Role is stored in `app_metadata` (server-writable only), NOT `user_metadata` (client-writable). This prevents users from self-modifying their role.

```sql
-- app_metadata shape:
-- {
--   "role": "faculty",
--   "institution_id": "uuid",
--   "is_course_director": false
-- }
```

### user_profiles Table

```sql
-- [SUPABASE_DDL v1 SS Auth & Institutional Tables]

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'institutional_admin', 'faculty', 'advisor', 'student')),
    is_course_director BOOLEAN DEFAULT false,           -- Permission flag (R-023)
    display_name TEXT,
    title TEXT,
    department TEXT,
    avatar_url TEXT,
    onboarding_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_institution ON user_profiles(institution_id);
CREATE INDEX idx_profiles_role ON user_profiles(role);
```

### institutions Table (referenced by user_profiles)

```sql
-- [SUPABASE_DDL v1 SS Auth & Institutional Tables]

CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE NOT NULL,                        -- e.g., 'msm.edu'
    status TEXT NOT NULL DEFAULT 'waitlisted' CHECK (status IN ('waitlisted', 'approved', 'suspended')),
    approved_at TIMESTAMPTZ,
    approved_by UUID,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security Policies

```sql
-- [SUPABASE_DDL v1 SS Row-Level Security Policies]

-- All tenant-scoped tables use this pattern:
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

-- Users see profiles within their institution
CREATE POLICY "Users see own institution profiles" ON user_profiles
    FOR SELECT USING (
        institution_id = (
            SELECT institution_id FROM user_profiles WHERE id = auth.uid()
        )
    );

-- Institutional admins can update profiles in their institution
CREATE POLICY "Admins can update institution profiles" ON user_profiles
    FOR UPDATE USING (
        institution_id = (
            SELECT institution_id FROM user_profiles WHERE id = auth.uid()
        )
        AND (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('institutional_admin', 'superadmin')
    );

-- SuperAdmin bypasses institution scope
CREATE POLICY "SuperAdmin sees all profiles" ON user_profiles
    FOR SELECT USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );

-- SuperAdmin can update any profile
CREATE POLICY "SuperAdmin can update all profiles" ON user_profiles
    FOR UPDATE USING (
        (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

---

## Section 5: API Contract (complete request/response)

All auth-related endpoints from the API Contract. Base URL: `/api/v1`. All responses use `{ data, error, meta }` envelope. Auth via Bearer JWT in `Authorization` header.

### `POST /api/v1/auth/me`

Returns the authenticated user's profile. This is the primary endpoint for getting current user data after login.

**Auth:** Any authenticated user
**Request:** No body. JWT in Authorization header.
**Response (200):**

```json
{
  "data": {
    "id": "uuid",
    "email": "faculty@msm.edu",
    "role": "faculty",
    "is_course_director": true,
    "institution_id": "uuid",
    "institution_name": "Morehouse School of Medicine",
    "display_name": "Dr. Jamal Carter",
    "onboarding_complete": true
  }
}
```

**Error responses:**

| HTTP | Code | When |
|------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |

### `GET /api/v1/users`

List users with optional filters.

**Auth:** institutional_admin, superadmin
**Query:** `?role=faculty&page=1&limit=20`
**Response (200):**

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "faculty@msm.edu",
      "role": "faculty",
      "is_course_director": true,
      "institution_id": "uuid",
      "display_name": "Dr. Jamal Carter",
      "onboarding_complete": true
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

**Error responses:**

| HTTP | Code | When |
|------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role not institutional_admin or superadmin |

### `PATCH /api/v1/users/:id`

Update user profile (role, permissions, display name).

**Auth:** institutional_admin, superadmin
**Body:**

```json
{
  "role": "faculty",
  "is_course_director": true,
  "display_name": "Dr. Jamal Carter"
}
```

**Response (200):** Updated user object in data envelope.

**Error responses:**

| HTTP | Code | When |
|------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role insufficient |
| 403 | `CROSS_INSTITUTION` | Updating user from another institution |
| 404 | `NOT_FOUND` | User ID does not exist |

### Global Error Code Table

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role insufficient for action |
| 403 | `CROSS_INSTITUTION` | RLS violation -- accessing another institution's data |
| 404 | `NOT_FOUND` | Entity does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## Section 6: Frontend Spec

This story does NOT create any UI components. It creates the Supabase client configuration for `apps/web` that all future auth UI will consume.

### Browser Client (`apps/web/src/lib/supabase.ts`)

```typescript
// Uses @supabase/ssr for cookie-based session persistence.
// Two client factories:
//
// 1. createBrowserClient() — for Client Components
//    - Uses NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
//    - Automatically handles cookie-based session via @supabase/ssr
//    - Session persists across page refresh (AC-8)
//
// 2. createServerClient() — for Server Components / Route Handlers / Middleware
//    - Reads cookies from Next.js headers()
//    - Same anon key, but server-side cookie access
//
// Neither client uses the service role key. The service role key
// is ONLY used in apps/server (Express backend).
```

### Next.js Middleware Integration (future, not this story)

The `apps/web/middleware.ts` file will use `createServerClient()` from this story to refresh sessions on every request. That middleware is part of STORY-U-3 (Express Auth Middleware), not this story.

### Environment Variables for Web

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

These are `NEXT_PUBLIC_` prefixed because they are used in client-side code. The anon key is safe to expose -- it is restricted by RLS policies.

---

## Section 7: Files to Create (exact paths, implementation order)

```
# 1. Shared Types (packages/types)
packages/types/src/auth/roles.types.ts          # AuthRole enum, ROLE_HIERARCHY, isValidRole
packages/types/src/auth/auth.types.ts            # AuthUser, AuthSession, AuthTokenPayload, DTOs
packages/types/src/auth/index.ts                 # Barrel export

# 2. Server Error Classes (apps/server)
apps/server/src/errors/base.errors.ts            # JourneyOSError, DomainError (if not already created)
apps/server/src/errors/auth.errors.ts            # AuthenticationError, AuthorizationError, MissingEnvironmentError

# 3. Server Config (apps/server)
apps/server/src/config/env.config.ts             # Zod-based env validation, fail-fast
apps/server/src/config/supabase.config.ts        # SupabaseClientConfig class, singleton

# 4. Web Config (apps/web)
apps/web/src/lib/supabase.ts                     # createBrowserClient, createServerClient

# 5. Tests
packages/types/src/auth/__tests__/auth.types.test.ts
apps/server/src/config/__tests__/env.config.test.ts
apps/server/src/config/__tests__/supabase.config.test.ts
```

---

## Section 8: Dependencies

### NPM Packages

| Package | Version | Location | Purpose |
|---------|---------|----------|---------|
| `@supabase/supabase-js` | `^2.x` | `packages/types`, `apps/server`, `apps/web` | Supabase client SDK |
| `@supabase/ssr` | `^0.5.x` | `apps/web` | Cookie-based session management for Next.js |
| `zod` | `^3.x` | `apps/server` | Environment variable validation schema |
| `vitest` | `^2.x` | all workspaces | Test runner |

### Existing Files (expected to exist or be created by this story)

| File | Status | Notes |
|------|--------|-------|
| `packages/types/package.json` | Must exist | Monorepo shared types package |
| `apps/server/package.json` | Must exist | Express backend |
| `apps/web/package.json` | Must exist | Next.js 15 frontend |
| `apps/server/src/errors/base.errors.ts` | Create if missing | Base error class hierarchy from CODE_STANDARDS |

### Supabase Project

A Supabase project must be provisioned before implementation begins. The project URL and keys are required for env config.

---

## Section 9: Test Fixtures (inline)

### Valid Auth Payloads

```json
{
  "VALID_LOGIN_REQUEST": {
    "email": "dr.osei@msm.edu",
    "password": "SecureP@ssw0rd123"
  },
  "VALID_REGISTER_REQUEST": {
    "email": "new.faculty@msm.edu",
    "password": "NewP@ssw0rd456",
    "display_name": "Dr. New Faculty",
    "institution_domain": "msm.edu"
  },
  "VALID_JWT_PAYLOAD": {
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "dr.osei@msm.edu",
    "role": "faculty",
    "institution_id": "inst-0001-0002-0003-000000000001",
    "is_course_director": true,
    "aud": "authenticated",
    "exp": 1740000000,
    "iat": 1739996400
  },
  "VALID_AUTH_USER": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "dr.osei@msm.edu",
    "role": "faculty",
    "is_course_director": true,
    "institution_id": "inst-0001-0002-0003-000000000001",
    "institution_name": "Morehouse School of Medicine",
    "display_name": "Dr. Amara Osei",
    "onboarding_complete": true
  }
}
```

### Invalid Auth Payloads

```json
{
  "INVALID_LOGIN_MISSING_EMAIL": {
    "password": "SomePassword123"
  },
  "INVALID_LOGIN_MISSING_PASSWORD": {
    "email": "dr.osei@msm.edu"
  },
  "INVALID_LOGIN_BAD_EMAIL": {
    "email": "not-an-email",
    "password": "SomePassword123"
  },
  "INVALID_ROLE_VALUE": "not_a_real_role",
  "EXPIRED_JWT_PAYLOAD": {
    "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "email": "dr.osei@msm.edu",
    "role": "faculty",
    "institution_id": "inst-0001-0002-0003-000000000001",
    "is_course_director": false,
    "aud": "authenticated",
    "exp": 1000000000,
    "iat": 999996400
  }
}
```

### Role Enum Values

```json
{
  "ALL_ROLES": ["superadmin", "institutional_admin", "faculty", "advisor", "student"],
  "ADMIN_ROLES": ["superadmin", "institutional_admin"],
  "ROLE_HIERARCHY_ORDER": [
    { "role": "superadmin", "level": 100 },
    { "role": "institutional_admin", "level": 80 },
    { "role": "faculty", "level": 60 },
    { "role": "advisor", "level": 40 },
    { "role": "student", "level": 20 }
  ]
}
```

### Environment Variable Fixtures

```json
{
  "VALID_ENV": {
    "SUPABASE_URL": "https://test-project.supabase.co",
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key",
    "SUPABASE_JWT_SECRET": "super-secret-jwt-token-with-at-least-32-characters",
    "NODE_ENV": "test"
  },
  "MISSING_URL_ENV": {
    "SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key",
    "SUPABASE_JWT_SECRET": "super-secret-jwt-token-with-at-least-32-characters",
    "NODE_ENV": "test"
  }
}
```

---

## Section 10: API Test Spec (vitest)

### Test Suite: `env.config.test.ts`

```
describe('EnvironmentConfig')
  it('should parse valid environment variables without throwing')
  it('should throw MissingEnvironmentError when SUPABASE_URL is missing')
  it('should throw MissingEnvironmentError when SUPABASE_ANON_KEY is missing')
  it('should throw MissingEnvironmentError when SUPABASE_SERVICE_ROLE_KEY is missing')
  it('should throw MissingEnvironmentError when SUPABASE_JWT_SECRET is missing')
  it('should accept valid NODE_ENV values: development, test, production')
  it('should reject invalid NODE_ENV values')
  it('should validate SUPABASE_URL is a valid URL format')
  it('should export a frozen config object (immutable)')
```

### Test Suite: `supabase.config.test.ts`

```
describe('SupabaseClientConfig')
  it('should create a Supabase client with service role key')
  it('should return the same instance on repeated calls (singleton)')
  it('should use SUPABASE_URL from environment config')
  it('should throw AuthenticationError if env config is invalid')
  it('should expose client via public getter, not direct field access')
```

### Test Suite: `auth.types.test.ts`

```
describe('AuthRole')
  it('should have exactly 5 roles')
  it('should include superadmin, institutional_admin, faculty, advisor, student')
  it('should use lowercase string values matching DB CHECK constraint')

describe('isValidRole')
  it('should return true for all valid role strings')
  it('should return false for invalid role strings')
  it('should return false for empty string')
  it('should return false for undefined/null')

describe('ROLE_HIERARCHY')
  it('should assign superadmin the highest level (100)')
  it('should assign student the lowest level (20)')
  it('should have strictly decreasing levels: superadmin > ia > faculty > advisor > student')
  it('should have an entry for every AuthRole enum value')
```

---

## Section 11: E2E Test Spec

Not applicable. This is an infrastructure story with no user-facing UI. E2E tests for login, registration, and password reset will be defined in STORY-U-3 (Express Auth Middleware) and STORY-U-8 (Registration Wizard).

---

## Section 12: Acceptance Criteria

1. **AC-1:** Supabase project has email/password auth provider enabled. Verified by: Supabase dashboard shows Email provider as "Enabled" or Supabase MCP query confirms it.

2. **AC-2:** JWT secret is stored in `SUPABASE_JWT_SECRET` environment variable and is never present in any committed source file. Verified by: `grep -r` on the codebase finds zero hardcoded JWT secrets.

3. **AC-3:** Three custom email templates exist in Supabase project configuration:
   - Email verification (sent on signup)
   - Invitation (sent when admin invites a user)
   - Password reset (sent on forgot-password request)
   Verified by: Supabase dashboard shows custom templates, not defaults.

4. **AC-4:** `AuthUser` interface is defined in `packages/types/src/auth/auth.types.ts` with fields: `id`, `email`, `role`, `is_course_director`, `institution_id`, `institution_name`, `display_name`, `onboarding_complete`. Verified by: TypeScript compilation succeeds.

5. **AC-5:** `AuthSession` interface is defined with fields: `access_token`, `refresh_token`, `expires_at`, `expires_in`, `token_type`, `user`. Verified by: TypeScript compilation succeeds.

6. **AC-6:** `AuthRole` enum includes exactly: `superadmin`, `institutional_admin`, `faculty`, `student`, `advisor`. String values match the `CHECK` constraint in `user_profiles.role`. Verified by: unit test confirms 5 values matching DB constraint.

7. **AC-7:** `apps/server/src/config/supabase.config.ts` exports a Supabase client singleton using the service role key. The client is created via a class with private fields and public getter (OOP rule). Verified by: unit test confirms singleton behavior.

8. **AC-8:** `apps/web/src/lib/supabase.ts` exports `createBrowserClient` and `createServerClient` functions using `@supabase/ssr` with the public anon key. Sessions persist across page refresh via cookie-based storage. Verified by: manual test -- login, refresh page, still authenticated.

9. **AC-9:** When any required environment variable (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`) is missing, the server process exits immediately with a descriptive `MissingEnvironmentError`. Verified by: unit test removes each var and confirms throw.

10. **AC-10:** All exports are named exports (no default exports). Verified by: `grep -r "export default"` on files created by this story returns zero results.

11. **AC-11:** All error classes extend `JourneyOSError`. No `throw new Error()` in any file. Verified by: code review and grep.

12. **AC-12:** Role is stored in `app_metadata.role`, not `user_metadata`, ensuring users cannot self-modify their role via client SDK. Verified by: Supabase auth hook or trigger sets `app_metadata` on user creation.

---

## Section 13: Source References

Every technical decision in this brief is traced to a canonical source document:

| Claim | Source |
|-------|--------|
| Five roles: superadmin, institutional_admin, faculty, advisor, student | [ARCHITECTURE v10 SS 4.1] |
| "Course Director" is a permission flag, not a role | [ARCHITECTURE v10 SS 4.1] |
| Role stored in `app_metadata.role` (not `user_metadata`) | [ARCHITECTURE v10 SS 4.2], [Story S-U-01-1 Notes] |
| JWT contains `{ role, institution_id, is_course_director }` | [ARCHITECTURE v10 SS 4.2] |
| Supabase Auth + JWT for authentication | [ARCHITECTURE v10 SS 3.1] |
| RLS scoped by `institution_id` | [ARCHITECTURE v10 SS 4.2] |
| Next.js middleware for route guards | [ARCHITECTURE v10 SS 4.2] |
| Express middleware for API enforcement | [ARCHITECTURE v10 SS 4.2] |
| `user_profiles` table DDL | [SUPABASE_DDL v1 SS Auth & Institutional Tables] |
| `institutions` table DDL | [SUPABASE_DDL v1 SS Auth & Institutional Tables] |
| RLS policy pattern | [SUPABASE_DDL v1 SS Row-Level Security Policies] |
| `POST /api/v1/auth/me` response shape | [API_CONTRACT v1 SS Auth & Users] |
| `GET /api/v1/users` endpoint | [API_CONTRACT v1 SS Auth & Users] |
| `PATCH /api/v1/users/:id` endpoint | [API_CONTRACT v1 SS Auth & Users] |
| Error codes (UNAUTHORIZED, FORBIDDEN, etc.) | [API_CONTRACT v1 SS Error Codes] |
| API response envelope `{ data, error, meta }` | [API_CONTRACT v1 SS Conventions] |
| OOP: Private fields, public getters, constructor DI | [CODE_STANDARDS SS 3.1] |
| Named exports only, no default exports | [CODE_STANDARDS SS 4.4] |
| Custom error classes, no raw `throw new Error()` | [CODE_STANDARDS SS 3.4] |
| Error class hierarchy (`JourneyOSError` base) | [CODE_STANDARDS SS 3.4] |
| Dependency injection via constructor | [CODE_STANDARDS SS 3.3] |
| File naming: `{name}.{category}.ts` for backend | [CODE_STANDARDS SS 3.2] |
| Monorepo: apps/web, apps/server, packages/types | [ARCHITECTURE v10 SS 3.7] |
| `packages/shared-types` for shared interfaces | [ARCHITECTURE v10 SS 3.7] |
| Persona: Dr. Amara Osei (Faculty/Course Director) | [PRODUCT_BRIEF SS Personas] |
| Persona: Marcus Williams (Student) | [PRODUCT_BRIEF SS Personas] |
| Persona: Dr. Kenji Takahashi (Institutional Admin) | [PRODUCT_BRIEF SS Personas] |
| Persona: Fatima Al-Rashid (Advisor) | [PRODUCT_BRIEF SS Personas] |
| SuperAdmin role for Journey OS team | [ARCHITECTURE v10 SS 4.1] |

---

## Section 14: Environment Prerequisites

### Supabase Project Setup

1. **Create Supabase project** at [supabase.com](https://supabase.com) or via CLI.
2. **Enable email/password provider:** Dashboard > Authentication > Providers > Email.
3. **Disable email confirmations for dev** (optional): Dashboard > Authentication > Settings > uncheck "Enable email confirmations" for local development speed. Re-enable for staging/production.
4. **Note project credentials:**
   - Project URL: `https://<project-ref>.supabase.co`
   - Anon (public) key: safe to expose in client
   - Service role key: server-only, never expose to client
   - JWT secret: used for manual JWT verification

### Environment Variables

#### `apps/server/.env`

```bash
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...                          # Public anon key
SUPABASE_SERVICE_ROLE_KEY=eyJ...                   # NEVER expose to client
SUPABASE_JWT_SECRET=<jwt-secret>                   # For manual JWT decode/verify

# App
NODE_ENV=development
PORT=3001
```

#### `apps/web/.env.local`

```bash
# Supabase (NEXT_PUBLIC_ prefix = available in browser)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### .gitignore Requirements

Ensure these patterns exist in `.gitignore`:

```
.env
.env.local
.env.*.local
```

### Local Development

1. Install dependencies: `pnpm install` (monorepo uses pnpm workspaces)
2. Copy env templates: `cp apps/server/.env.example apps/server/.env`
3. Fill in Supabase credentials from project dashboard
4. Run server: `pnpm --filter @journey-os/server dev`
5. Run web: `pnpm --filter @journey-os/web dev`

### Supabase CLI (optional, for local dev)

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Start local Supabase (Docker required)
supabase start

# Local credentials are printed on start:
# API URL: http://localhost:54321
# Anon key: eyJ...
# Service role key: eyJ...
```

---

## Section 15: Figma / Make Prototype

Not applicable. This story creates no UI components. The Supabase client configuration is consumed by future stories that build login, registration, and password reset pages (STORY-U-5, STORY-U-8, STORY-U-11).

---

## Implementation Notes

### OOP Pattern for Supabase Client

```typescript
// apps/server/src/config/supabase.config.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { envConfig } from './env.config';

/**
 * Singleton Supabase client for server-side operations.
 * Uses service role key for full database access (bypasses RLS).
 * [CODE_STANDARDS SS 3.1] — private fields, public getter, constructor DI pattern.
 */
export class SupabaseClientConfig {
  private static _instance: SupabaseClientConfig | null = null;
  private readonly _client: SupabaseClient;

  private constructor() {
    this._client = createClient(
      envConfig.SUPABASE_URL,
      envConfig.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  static getInstance(): SupabaseClientConfig {
    if (!SupabaseClientConfig._instance) {
      SupabaseClientConfig._instance = new SupabaseClientConfig();
    }
    return SupabaseClientConfig._instance;
  }

  get client(): SupabaseClient {
    return this._client;
  }

  /** For testing: reset singleton. */
  static resetInstance(): void {
    SupabaseClientConfig._instance = null;
  }
}

export function getSupabaseClient(): SupabaseClient {
  return SupabaseClientConfig.getInstance().client;
}
```

### Env Validation Pattern

```typescript
// apps/server/src/config/env.config.ts

import { z } from 'zod';
import { MissingEnvironmentError } from '../errors/auth.errors';

const envSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_JWT_SECRET: z.string().min(32, 'SUPABASE_JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    throw new MissingEnvironmentError(missing);
  }
  return Object.freeze(result.data);
}

/** Validated, frozen environment config. Fails fast on import if invalid. */
export const envConfig: EnvConfig = validateEnv();
```

### Error Classes

```typescript
// apps/server/src/errors/auth.errors.ts

import { JourneyOSError } from './base.errors';

export class AuthenticationError extends JourneyOSError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'UNAUTHORIZED');
  }
}

export class AuthorizationError extends JourneyOSError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'FORBIDDEN');
  }
}

export class MissingEnvironmentError extends JourneyOSError {
  constructor(public readonly missing: string[]) {
    super(
      `Missing or invalid environment variables:\n${missing.map(m => `  - ${m}`).join('\n')}`,
      'MISSING_ENVIRONMENT'
    );
  }
}
```

### Base Error Class

```typescript
// apps/server/src/errors/base.errors.ts

/**
 * Base error class for all Journey OS errors.
 * [CODE_STANDARDS SS 3.4] — Custom error classes only. No raw throw new Error().
 */
export class JourneyOSError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DomainError extends JourneyOSError {
  constructor(message: string) {
    super(message, 'DOMAIN_ERROR');
  }
}
```

### Web Client Pattern

```typescript
// apps/web/src/lib/supabase.ts

import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create Supabase client for use in Client Components.
 * Uses cookie-based session persistence via @supabase/ssr.
 * Session survives page refresh (AC-8).
 */
export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Create Supabase client for use in Server Components, Route Handlers,
 * and Server Actions. Reads cookies from Next.js request context.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components (read-only).
            // This is expected and safe to ignore.
          }
        },
      },
    }
  );
}
```

### Custom Email Templates

#### Verification Email

```html
<h2>Welcome to Journey OS</h2>
<p>Hi {{ .Email }},</p>
<p>Please verify your email address to complete your registration.</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
<p>This link will expire in 24 hours.</p>
<p>If you did not create an account, please ignore this email.</p>
<p>-- The Journey OS Team</p>
```

#### Invitation Email

```html
<h2>You're Invited to Journey OS</h2>
<p>Hi,</p>
<p>You have been invited to join {{ .InstitutionName }} on Journey OS.</p>
<p><a href="{{ .ConfirmationURL }}">Accept Invitation</a></p>
<p>This invitation will expire in 7 days.</p>
<p>-- The Journey OS Team</p>
```

#### Password Reset Email

```html
<h2>Reset Your Password</h2>
<p>Hi {{ .Email }},</p>
<p>We received a request to reset your Journey OS password.</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
<p>-- The Journey OS Team</p>
```

---

*Brief generated: 2026-02-19. This document is self-contained. All source data is inlined. No external lookups required for implementation.*
