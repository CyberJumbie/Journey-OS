# STORY-U-10 Brief: Role-Based Dashboard Routing

## 0. Lane & Priority

```yaml
story_id: STORY-U-10
old_id: S-U-01-4
lane: universal
lane_priority: 0
within_lane_order: 10
epic: E-01 (Auth Infrastructure)
feature: F-01
sprint: 3
size: S
depends_on:
  - STORY-U-1 (universal) — Supabase Auth Setup ✅ DONE
  - STORY-U-3 (universal) — Express Auth Middleware ✅ DONE
blocks: []
personas_served: [superadmin, institutional_admin, faculty, student, advisor]
```

## 1. Summary

Build the Next.js middleware and route-guard infrastructure that:
1. Refreshes Supabase auth sessions via middleware on every request
2. Redirects unauthenticated users to `/login` from protected routes
3. Redirects authenticated users to their role-specific dashboard after login
4. Provides an auth callback route handler for PKCE code exchange (email confirmation, password reset)
5. Preserves deep links through the login flow via `next` query param
6. Shows an `/unauthorized` page for unknown/missing roles

This is the **client-side routing counterpart** to the server-side RBAC middleware (STORY-U-6). It does NOT implement dashboard content — only the routing skeleton and placeholder pages.

**User Flows Satisfied:**
- UF-01: Login → role-specific dashboard redirect
- UF-02: Direct URL access → login redirect → return to intended page
- UF-03: Unknown role → unauthorized page

## 2. Task Breakdown

1. Create Supabase middleware client utility (`apps/web/src/lib/supabase/middleware.ts`)
2. Create Next.js middleware (`apps/web/src/middleware.ts`) — session refresh + route protection
3. Create auth callback route handler (`apps/web/src/app/auth/callback/route.ts`) — PKCE code exchange
4. Create login page (`apps/web/src/app/(auth)/login/page.tsx`) + login form component
5. Create role-to-path mapping utility (`apps/web/src/lib/auth/dashboard-routes.ts`)
6. Create unauthorized page (`apps/web/src/app/unauthorized/page.tsx`)
7. Create dashboard layout (`apps/web/src/app/(dashboard)/layout.tsx`) — protected shell
8. Create 5 role-specific dashboard placeholder pages
9. Update home page (`/`) to redirect based on auth state
10. Write API tests for dashboard-routes utility

## 3. Data Model (inline, complete)

No new data models. Uses existing types:

```typescript
// packages/types/src/auth/roles.types.ts (EXISTS)
enum AuthRole {
  SUPERADMIN = "superadmin",
  INSTITUTIONAL_ADMIN = "institutional_admin",
  FACULTY = "faculty",
  ADVISOR = "advisor",
  STUDENT = "student",
}

// packages/types/src/auth/auth.types.ts (EXISTS)
interface AuthTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: AuthRole;
  readonly institution_id: string;
  readonly is_course_director: boolean;
  readonly aud: string;
  readonly exp: number;
  readonly iat: number;
}
```

## 4. Database Schema (inline, complete)

No new tables or migrations. Uses existing `auth.users` and `profiles` tables.

## 5. API Contract (complete request/response)

### GET /auth/callback (Next.js Route Handler — NOT Express)

Handles Supabase PKCE code exchange after email confirmation or password reset.

**Query Parameters:**
- `code` (string) — Auth code from Supabase redirect
- `next` (string, optional) — Path to redirect to after exchange (default: `/`)

**Response:** 302 redirect to `next` path on success, `/auth/auth-code-error` on failure.

### No new Express API endpoints

Role information comes from the Supabase JWT decoded client-side. The middleware uses `supabase.auth.getUser()` for server-side validation.

## 6. Frontend Spec

### Route Map

```
/                              → Redirect: authed → dashboard, unauthed → /login
/(auth)/login                  → Login form (public)
/(auth)/forgot-password        → Forgot password form (EXISTS)
/(auth)/register               → Registration wizard (EXISTS)
/auth/callback                 → PKCE code exchange route handler
/unauthorized                  → Unauthorized page (public)
/(dashboard)/admin             → SuperAdmin dashboard placeholder
/(dashboard)/institution       → Institutional Admin dashboard placeholder
/(dashboard)/faculty           → Faculty dashboard placeholder
/(dashboard)/student           → Student dashboard placeholder
/(dashboard)/advisor           → Advisor dashboard placeholder
```

### Role-to-Path Mapping

```typescript
const DASHBOARD_ROUTES: Record<AuthRole, string> = {
  superadmin: "/admin",
  institutional_admin: "/institution",
  faculty: "/faculty",
  student: "/student",
  advisor: "/advisor",
};
```

### Middleware Route Classification

```typescript
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/unauthorized", "/auth/callback"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"]; // Redirect TO dashboard if already authed
const PROTECTED_ROUTES = ["/admin", "/institution", "/faculty", "/student", "/advisor"];
```

### Login Form Component

```typescript
// apps/web/src/components/auth/login-form.tsx
interface LoginFormProps {}

// States: "idle" | "loading" | "error"
// Fields: email (string), password (string)
// Submit: supabase.auth.signInWithPassword({ email, password })
// On success: redirect to DASHBOARD_ROUTES[user.role] or `next` param
// On error: show error banner (red text)
// Links: "Forgot password?" → /forgot-password, "Register" → /register
```

**Design Tokens (matching existing patterns):**
- Primary blue: `#2b71b9` (buttons, focus rings)
- Error red: `text-red-600`
- Card layout: matches `(auth)/layout.tsx` — `min-h-screen`, `max-w-md`, `shadow-md`
- Font: Geist (inherited from root layout)

### Unauthorized Page

Simple centered page with:
- "Access Denied" heading
- "You don't have permission to access this page." message
- "Go to Login" link → `/login`
- "Go to Dashboard" link → `/` (which redirects based on role)

### Dashboard Layout

```typescript
// apps/web/src/app/(dashboard)/layout.tsx
// Minimal shell: just wraps children
// Future stories will add nav sidebar, header, etc.
// For now: basic container with white bg
```

### Dashboard Placeholder Pages

Each page shows:
- Role name as heading (e.g., "Faculty Dashboard")
- "Coming soon" message
- Sign out button (calls `supabase.auth.signOut()` then redirects to `/login`)

## 7. Files to Create (exact paths, implementation order)

```
1. apps/web/src/lib/supabase/middleware.ts          — Supabase client for middleware context
2. apps/web/src/lib/auth/dashboard-routes.ts        — Role-to-path mapping + helpers
3. apps/web/src/middleware.ts                        — Next.js middleware (session refresh + guards)
4. apps/web/src/app/auth/callback/route.ts          — PKCE code exchange handler
5. apps/web/src/app/(auth)/login/page.tsx            — Login page
6. apps/web/src/components/auth/login-form.tsx       — Login form component
7. apps/web/src/app/unauthorized/page.tsx            — Unauthorized page
8. apps/web/src/app/(dashboard)/layout.tsx           — Protected dashboard shell
9. apps/web/src/app/(dashboard)/admin/page.tsx       — SuperAdmin placeholder
10. apps/web/src/app/(dashboard)/institution/page.tsx — InstitutionalAdmin placeholder
11. apps/web/src/app/(dashboard)/faculty/page.tsx     — Faculty placeholder
12. apps/web/src/app/(dashboard)/student/page.tsx     — Student placeholder
13. apps/web/src/app/(dashboard)/advisor/page.tsx     — Advisor placeholder
```

**Files to Modify:**
```
14. apps/web/src/app/page.tsx                        — Root redirect logic
```

## 8. Dependencies

### Stories (all DONE)
- STORY-U-1 (Supabase Auth Setup) ✅ — provides `createBrowserClient`, `createServerClient`
- STORY-U-3 (Express Auth Middleware) ✅ — provides `AuthTokenPayload`, `AuthRole`

### NPM Packages (all already installed)
- `@supabase/ssr` ^0.8.0 — `createServerClient` for middleware
- `@supabase/supabase-js` ^2.97.0 — auth methods
- `next` 16.1.6 — middleware API

### Existing Files Needed
- `apps/web/src/lib/supabase.ts` — existing browser + server client factories
- `apps/web/src/app/(auth)/layout.tsx` — shared auth page layout
- `packages/types/src/auth/roles.types.ts` — `AuthRole` enum
- `packages/types/src/auth/auth.types.ts` — `AuthTokenPayload`, `AuthUser`

## 9. Test Fixtures (inline)

```typescript
// Mock Supabase user with role in app_metadata
const MOCK_FACULTY_USER = {
  id: "user-aaaa-bbbb-cccc-000000000001",
  email: "faculty@example.com",
  app_metadata: {
    role: "faculty",
    institution_id: "inst-aaaa-bbbb-cccc-000000000001",
    is_course_director: false,
  },
  user_metadata: { display_name: "Dr. Test Faculty" },
};

const MOCK_SUPERADMIN_USER = {
  id: "user-aaaa-bbbb-cccc-000000000002",
  email: "admin@journeyos.dev",
  app_metadata: {
    role: "superadmin",
    institution_id: "",
    is_course_director: false,
  },
  user_metadata: { display_name: "Super Admin" },
};

const MOCK_STUDENT_USER = {
  id: "user-aaaa-bbbb-cccc-000000000003",
  email: "student@example.com",
  app_metadata: {
    role: "student",
    institution_id: "inst-aaaa-bbbb-cccc-000000000001",
    is_course_director: false,
  },
  user_metadata: { display_name: "Test Student" },
};

// Invalid role user
const MOCK_UNKNOWN_ROLE_USER = {
  id: "user-aaaa-bbbb-cccc-000000000004",
  email: "unknown@example.com",
  app_metadata: {
    role: "unknown_role",
    institution_id: "inst-aaaa-bbbb-cccc-000000000001",
  },
  user_metadata: {},
};
```

## 10. API Test Spec (vitest — PRIMARY)

### File: `apps/web/src/__tests__/lib/auth/dashboard-routes.test.ts`

```
describe("dashboard-routes")
  describe("getDashboardPath")
    ✓ returns /admin for superadmin role
    ✓ returns /institution for institutional_admin role
    ✓ returns /faculty for faculty role
    ✓ returns /student for student role
    ✓ returns /advisor for advisor role
    ✓ returns /unauthorized for unknown role string

  describe("isPublicRoute")
    ✓ returns true for /login
    ✓ returns true for /register
    ✓ returns true for /forgot-password
    ✓ returns true for /unauthorized
    ✓ returns true for /auth/callback
    ✓ returns false for /admin
    ✓ returns false for /faculty
    ✓ returns false for /

  describe("isAuthRoute")
    ✓ returns true for /login (should redirect to dashboard if authed)
    ✓ returns true for /register
    ✓ returns false for /admin
    ✓ returns false for /unauthorized

  describe("isRoleAllowedOnPath")
    ✓ allows superadmin on /admin
    ✓ allows faculty on /faculty
    ✓ denies student on /admin
    ✓ denies faculty on /institution
    ✓ allows superadmin on any dashboard path (superadmin override)
```

**Total: ~20 unit tests**

## 11. E2E Test Spec (Playwright — CONDITIONAL)

This story IS part of a critical user journey (login → dashboard redirect). However, E2E tests should wait until STORY-U-13+ when real dashboard content exists. For now, only unit tests.

## 12. Acceptance Criteria

1. After login, user is redirected to role-specific dashboard path:
   - SuperAdmin → `/admin`
   - Institutional Admin → `/institution`
   - Faculty → `/faculty`
   - Student → `/student`
   - Advisor → `/advisor`
2. Unknown/missing role redirects to `/unauthorized` page
3. Next.js middleware intercepts all requests and refreshes Supabase session
4. Unauthenticated users redirected to `/login` from any protected route
5. Deep linking preserved: `/faculty/courses?id=123` → login → return to `/faculty/courses?id=123`
6. Already-authenticated users on `/login` are redirected to their dashboard
7. Auth callback route exchanges PKCE code for session successfully
8. Sign out from dashboard placeholder redirects to `/login`
9. All route utility functions have 100% test coverage

## 13. Source References

- [ARCHITECTURE v10 SS 4.1] — AuthRole enum, role hierarchy
- [ARCHITECTURE v10 SS 4.2] — JWT token structure, app_metadata for roles
- [API_CONTRACT v1 SS Auth & Users] — Auth response shapes
- [Supabase SSR Docs] — Next.js middleware pattern with `createServerClient`
- [Next.js App Router Docs] — middleware.ts, route groups, route handlers

## 14. Environment Prerequisites

- **Supabase project** running (local or cloud) with auth configured
- **Environment variables** in `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Web dev server**: `pnpm --filter @journey-os/web dev`

## 15. Figma Make Prototype (Optional)

Not needed. Login form follows existing auth page patterns (forgot-password, register). Dashboard placeholders are trivial layouts.
