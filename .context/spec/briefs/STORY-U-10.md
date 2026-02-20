# STORY-U-10: Role-Based Dashboard Routing

**Epic:** E-01 (Auth Infrastructure)
**Feature:** F-01 (Authentication & Onboarding)
**Sprint:** 3
**Lane:** universal (P0)
**Size:** S
**Old ID:** S-U-01-4

---

## User Story
As an **authenticated user**, I need to be automatically redirected to my persona-specific dashboard after login so that I see the interface relevant to my role without manual navigation.

## Acceptance Criteria
- [ ] After login, user redirected to role-specific dashboard path
- [ ] SuperAdmin -> /admin/dashboard
- [ ] Institutional Admin -> /institution/dashboard
- [ ] Faculty -> /faculty/dashboard
- [ ] Student -> /student/dashboard
- [ ] Advisor -> /advisor/dashboard
- [ ] Unknown/missing role redirects to /unauthorized page
- [ ] Next.js middleware intercepts and redirects on protected routes
- [ ] Unauthenticated users redirected to /login from any protected route
- [ ] Deep linking preserved: redirect back to intended URL after login

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `components/layout/TopNavigation.tsx` | `apps/web/src/components/layout/top-navigation.tsx` | Convert to organism; integrate Supabase auth state for user menu; role-based nav links; replace inline styles with Tailwind design tokens; named export |
| `components/layout/DashboardLayout.tsx` | `apps/web/src/app/(protected)/layout.tsx` | Convert to Next.js App Router layout; compose TopNavigation + sidebar + content area; role-based sidebar items; server component for auth check |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Middleware | apps/web | `src/middleware.ts` (Next.js edge middleware) |
| Util | apps/web | `src/lib/auth/route-guard.ts` |
| View | apps/web | `src/app/(auth)/login/page.tsx`, `src/app/unauthorized/page.tsx` |
| Layout | apps/web | `src/app/(protected)/layout.tsx` |
| Organism | apps/web | `src/components/layout/top-navigation.tsx` |
| Atom | packages/ui | `src/atoms/logo-wordmark.tsx` |

## Database Schema
No new tables. Reads role from Supabase session JWT.

## API Endpoints
No new API endpoints. This is entirely client-side routing logic using Next.js middleware.

## Dependencies
- **Blocked by:** STORY-U-1 (Supabase Auth Setup), STORY-U-3 (Express Auth Middleware)
- **Blocks:** none (enables all persona dashboard stories)
- **Cross-lane:** STORY-U-8 (registration leads to dashboard redirect), STORY-F-6 (Faculty Dashboard), STORY-IA-5 (Admin Dashboard), STORY-ST-2 (Student Dashboard)

## Testing Requirements
- 5 API tests: role-to-path mapping for each role, unknown role redirect, unauthenticated redirect
- 1 E2E test: login -> automatic redirect to correct dashboard based on role

## Implementation Notes
- Next.js 15 middleware runs at the edge; use Supabase auth helpers for SSR token verification.
- Route groups: `(auth)` for login/register, `(protected)` for authenticated pages.
- Deep link preservation: store intended path in URL search params during login redirect. Pattern: `/login?redirect=/faculty/courses/123`.
- Named exports only for all components and utilities (exception: Next.js `middleware.ts` requires `export default`).
- The TopNavigation prototype shows: logo, search bar, notification bell, user avatar with dropdown.
- The DashboardLayout prototype shows: top nav + left sidebar + main content area.
- Replace all hardcoded hex/font values with design tokens.
- Use `@web/*` path alias for imports in apps/web.
- Server components for auth checks in layouts; client components for interactive nav elements.
- Role-based sidebar items should be driven by a declarative config object mapping roles to nav items.
