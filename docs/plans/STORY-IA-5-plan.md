# Plan: STORY-IA-5 — Admin Dashboard Page

## Tasks (from brief, with refinements)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 1 | Define admin dashboard types | `packages/types/src/admin/dashboard.types.ts` | AdminKPI, AdminDashboardData, QuickAction |
| 2 | Create admin barrel export | `packages/types/src/admin/index.ts` | New directory |
| 3 | Export admin module from types root | `packages/types/src/index.ts` | Add `export * from "./admin"` |
| 4 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | Required before downstream type-checks |
| 5 | Implement AdminDashboardService | `apps/server/src/services/admin/admin-dashboard.service.ts` | JS #private, constructor DI, parallel Supabase queries |
| 6 | Implement DashboardController | `apps/server/src/controllers/admin/dashboard.controller.ts` | ApiResponse envelope, institution_id from req.user |
| 7 | Register dashboard route with RBAC | `apps/server/src/index.ts` | Import + route in SINGLE edit (linter hook rule) |
| 8 | Create useAdminDashboard hook | `apps/web/src/hooks/use-admin-dashboard.ts` | 60s auto-refresh, visibility API pause |
| 9 | Create SparklineSVG atom | `apps/web/src/components/admin/sparkline-svg.tsx` | Pure SVG polyline, no chart library |
| 10 | Create KPICard molecule | `apps/web/src/components/admin/kpi-card.tsx` | Trend indicator + sparkline |
| 11 | Create QuickActionCard molecule | `apps/web/src/components/admin/quick-action-card.tsx` | Icon + link + description |
| 12 | Create AdminDashboard organism | `apps/web/src/components/admin/admin-dashboard.tsx` | Composes KPICards, system health, quick actions |
| 13 | Create dashboard page | `apps/web/src/app/(protected)/institution/dashboard/page.tsx` | Server component, default export (Next.js exception) |
| 14 | Write AdminDashboardService tests | `apps/server/src/services/admin/__tests__/admin-dashboard.service.test.ts` | ~12 tests |
| 15 | Write DashboardController tests | `apps/server/src/controllers/admin/__tests__/dashboard.controller.test.ts` | ~5 tests |

## Implementation Order

Types (1-3) → Rebuild (4) → Service (5) → Controller (6) → Route (7) → Hook (8) → Components (9-12) → Page (13) → Tests (14-15)

## Patterns to Follow

- **Supabase mock factory** — `docs/solutions/supabase-mock-factory.md` for service tests
- **Atomic edits** — Add imports AND route registration in single Edit call (linter hook rule)
- **Multi-role RBAC** — `rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN)` (rest params supported)
- **ApiResponse envelope** — `{ data: T | null, error: { code, message } | null }`
- **JS #private fields** — `#supabaseClient`, `#dashboardService` (not TS `private`)
- **Named exports** — All files except the page.tsx (Next.js App Router exception)

## Testing Strategy

- **API tests (~17):**
  - Service: getDashboardData returns correct shape, each KPI query, trend computation (up/down/flat), sparkline length, system health fields, missing table graceful fallback, Supabase error handling
  - Controller: 200 for institutional_admin, 200 for superadmin, ApiResponse shape, 500 on service throw, institution_id passthrough
- **E2E:** No — read-only display page, deferred to IA-25/IA-26

## Figma Make

- [ ] Code directly — no Figma prototype needed. Component hierarchy is well-defined in brief.

## Risks / Edge Cases

1. **Missing tables:** `generated_questions` and `courses` tables may not exist yet. Service must return 0 gracefully (Supabase returns error on missing table, handle with fallback).
2. **Sparkline data:** MVP returns flat sparklines with only current value as last point. Historical data will be added in future stories.
3. **System health placeholders:** API p95, error rate, storage all return 0/placeholder until logging infrastructure exists.
4. **PostToolUse linter hook:** Will strip unused imports from index.ts — must add imports AND usage in one atomic edit.
5. **Types rebuild:** Must run `tsc -b packages/types/tsconfig.json` after creating admin types before type-checking server.

## Acceptance Criteria (verbatim from brief)

- AC-1: Dashboard page exists at `/institution/dashboard`
- AC-2: Four KPI cards displayed: Total Users, Active Courses, Questions Generated, Sync Health
- AC-3: Each KPI card shows value, trend indicator, and sparkline mini-chart
- AC-4: System health section shows API p95, error rate, storage usage
- AC-5: Quick action links: Manage Users, View Coverage, View Sync Status, Browse Knowledge Graph
- AC-6: Auto-refresh every 60 seconds
- AC-7: Auto-refresh pauses when tab is hidden
- AC-8: RBAC: only InstitutionalAdmin and SuperAdmin can access
- AC-9: Loading skeleton shown during initial fetch
- AC-10: Error state with retry button on fetch failure
- AC-11: `GET /api/v1/institution/dashboard` returns correct ApiResponse envelope
- AC-12: JS `#private` fields used (not TS `private`)
- AC-13: Constructor DI: Supabase client injected into AdminDashboardService
- AC-14: Custom error classes only (no raw throw new Error())
- AC-15: 10+ API tests pass
