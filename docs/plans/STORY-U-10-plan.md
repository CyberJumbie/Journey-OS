# Implementation Plan: STORY-U-10 — Role-Based Dashboard Routing

## Overview

Build Next.js middleware + routing infrastructure for auth session management and role-based dashboard access.

**Size:** S | **Sprint:** 3 | **Lane:** Universal (P0)

## Implementation Order

Types → Utilities → Middleware → Route Handler → Pages → Tests

---

## Phase 1: Supabase Middleware Client

### Task 1.1: Create middleware Supabase client

**File:** `apps/web/src/lib/supabase/middleware.ts`

Create a `createMiddlewareClient(request)` function following the Supabase SSR pattern for Next.js middleware. This client:
- Reads cookies from the incoming `NextRequest`
- Writes refreshed cookies to both the request and response
- Returns `{ supabase, response }` tuple

**Pattern:** Follow Supabase SSR docs `updateSession` pattern — create server client with cookie getAll/setAll that bridges request → response cookies.

**Key:** Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` env var (matches existing `supabase.ts`).

---

## Phase 2: Route Utilities

### Task 2.1: Create dashboard route mapping

**File:** `apps/web/src/lib/auth/dashboard-routes.ts`

Named exports:
- `DASHBOARD_ROUTES: Record<AuthRole, string>` — maps role → path
- `getDashboardPath(role: string): string` — returns path or `/unauthorized`
- `isPublicRoute(pathname: string): boolean` — checks against PUBLIC_ROUTES list
- `isAuthRoute(pathname: string): boolean` — login/register/forgot-password (redirect if already authed)
- `getPathRole(pathname: string): AuthRole | null` — reverse lookup: path → required role
- `isRoleAllowedOnPath(role: string, pathname: string): boolean` — SuperAdmin can access any dashboard

**Route mapping:**
```
superadmin → /admin
institutional_admin → /institution
faculty → /faculty
student → /student
advisor → /advisor
```

**Import:** `AuthRole` from `@journey-os/types` (verify the path alias works in web app — may need direct import from `../../packages/types`).

---

## Phase 3: Next.js Middleware

### Task 3.1: Create middleware

**File:** `apps/web/src/middleware.ts` (default export required by Next.js)

**Logic:**
1. Create Supabase middleware client
2. Call `supabase.auth.getUser()` to refresh session + validate JWT
3. Route classification:
   - **Static assets** (`_next/static`, `_next/image`, `favicon.ico`, images) → pass through (handled by `config.matcher`)
   - **Public routes** (login, register, forgot-password, unauthorized, auth/callback) → pass through
   - **Auth routes** (login, register) + user IS authenticated → redirect to `getDashboardPath(role)`
   - **Protected routes** + user NOT authenticated → redirect to `/login?next={originalPath}`
   - **Protected routes** + user authenticated but wrong role → redirect to their own dashboard
4. Return `supabaseResponse` (preserves cookies)

**Matcher config:**
```typescript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Critical:** Must use `getUser()` not `getSession()` — Supabase docs warn that `getSession()` doesn't validate the JWT in middleware.

---

## Phase 4: Auth Callback Route Handler

### Task 4.1: Create PKCE code exchange handler

**File:** `apps/web/src/app/auth/callback/route.ts`

**Logic:**
1. Extract `code` and `next` from URL search params
2. If `code` exists, create server Supabase client and call `exchangeCodeForSession(code)`
3. On success → redirect to `next` param (default `/`)
4. On failure → redirect to `/auth/auth-code-error` or `/login?error=auth_code`

**Named export:** `GET` function (Next.js route handler convention).

**Note:** This handler is shared by email confirmation AND password reset flows.

---

## Phase 5: Pages & Components

### Task 5.1: Login form component

**File:** `apps/web/src/components/auth/login-form.tsx`

- `"use client"` directive
- State: `email`, `password`, `formState` ("idle" | "loading" | "error"), `errorMessage`
- Uses `createBrowserClient()` from `@web/lib/supabase`
- Submit: `supabase.auth.signInWithPassword({ email, password })`
- On success: `router.push(getDashboardPath(user.role))` or redirect to `next` param from URL
- On error: display error message
- Links: "Forgot password?" → `/forgot-password`, "Create account" → `/register`
- Match styling of `forgot-password-form.tsx`

### Task 5.2: Login page

**File:** `apps/web/src/app/(auth)/login/page.tsx`

```typescript
export const metadata = { title: "Login — Journey OS" };
export default function LoginPage() { return <LoginForm />; }
```

### Task 5.3: Unauthorized page

**File:** `apps/web/src/app/unauthorized/page.tsx`

Simple standalone page (NOT in auth layout — no card wrapper needed):
- "Access Denied" heading
- Description text
- Links to login and home

### Task 5.4: Dashboard layout

**File:** `apps/web/src/app/(dashboard)/layout.tsx`

Minimal layout — just a container. Future stories will add sidebar navigation.

### Task 5.5: Dashboard placeholder pages (5 files)

Each in `apps/web/src/app/(dashboard)/{role}/page.tsx`:
- `admin/page.tsx` — SuperAdmin
- `institution/page.tsx` — Institutional Admin
- `faculty/page.tsx` — Faculty
- `student/page.tsx` — Student
- `advisor/page.tsx` — Advisor

Each shows: role heading, "Coming soon" text, sign out button.

### Task 5.6: Update root page

**File:** `apps/web/src/app/page.tsx` (MODIFY)

Change from static "Journey OS" heading to a server component that:
1. Gets user via `createServerClient()` + `getUser()`
2. If authenticated → redirect to dashboard
3. If not → redirect to `/login`

---

## Phase 6: Tests

### Task 6.1: Dashboard routes unit tests

**File:** `apps/web/src/__tests__/lib/auth/dashboard-routes.test.ts`

Test all exports: `getDashboardPath`, `isPublicRoute`, `isAuthRoute`, `getPathRole`, `isRoleAllowedOnPath`.

~20 test cases covering all roles, all route types, edge cases.

---

## Risk Checklist

- [ ] Verify `@journey-os/types` import works in web app (may need tsconfig paths or direct relative import)
- [ ] Verify Next.js 16 still uses `middleware.ts` (not `proxy.ts` — Supabase docs reference `proxy.ts` but that may be a future convention)
- [ ] Ensure middleware doesn't run on API routes if Express server handles those separately
- [ ] Test that `createBrowserClient()` from existing `supabase.ts` works with `signInWithPassword`
- [ ] Confirm `user.app_metadata.role` is accessible from the Supabase `getUser()` response in middleware context
