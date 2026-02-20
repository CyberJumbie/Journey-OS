---
name: nextjs-auth-middleware-pattern
tags: [nextjs, supabase, middleware, auth, route-protection, ssr]
story: STORY-U-10
date: 2026-02-19
---
# Next.js Auth Middleware Pattern

## Problem
Next.js middleware needs to refresh Supabase sessions, protect routes, and do role-based routing — all before the page renders.

## Solution
Three-layer approach:
1. **Middleware client** (`lib/supabase/middleware.ts`) — bridges request/response cookies
2. **Route utilities** (`lib/auth/dashboard-routes.ts`) — pure functions for route classification
3. **Middleware** (`middleware.ts`) — orchestrates session refresh + guards

### Key decisions
- Use `getUser()` not `getSession()` — Supabase docs warn `getSession()` doesn't validate JWT
- SuperAdmin can access any dashboard path (override check)
- Auth routes (login, register, forgot-password) redirect authenticated users to their dashboard
- Deep link preserved via `?next=` query param
- `/reset-password` is public (user arrives with session from code exchange, may not have full metadata)

### Middleware client pattern
```typescript
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  return { supabase, response: () => response };
}
```

Note: `response` is returned as a getter function `() => response` because `setAll` may replace the response object during session refresh.

### Route classification
```typescript
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/unauthorized", "/apply"];
const AUTH_ROUTES = ["/login", "/register", "/forgot-password"]; // subset: redirect authenticated users away
```

## When to use
- Any Next.js app with Supabase auth and role-based routing
- When you need middleware session refresh (required for SSR)

## When NOT to use
- Client-only SPAs (use browser client directly)
- Apps without role-based dashboards
