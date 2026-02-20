# Plan: STORY-F-6 + STORY-F-7 + STORY-F-8 (Parallel)

## Overview

Three faculty-lane stories executed in parallel:
- **F-6** — Activity Feed Component (API + UI, new `activity_events` table)
- **F-7** — KPI Strip Component (API + UI, queries existing tables)
- **F-8** — Help & FAQ Pages (frontend-only, static content, Next.js API route)

## Conflict Points & Coordination

F-6 and F-7 both create the `packages/types/src/dashboard/` directory and both edit:
1. `packages/types/src/dashboard/index.ts` — barrel file (create once, both export from it)
2. `packages/types/src/index.ts` — add `export * from "./dashboard"` (one edit)
3. `apps/server/src/index.ts` — register new routes (two separate edits)

**Strategy:** Build F-6 and F-7 types together first (shared `dashboard/index.ts`), then diverge for server + UI. F-8 is fully independent (`help/` types, `apps/web` only).

---

## Implementation Order

### Phase 1: Types (all three stories)

| # | Task | File | Story |
|---|------|------|-------|
| 1 | Create `ActivityEvent`, `ActivityEventType`, `ActivityFeedQuery`, `ActivityFeedResponse` types | `packages/types/src/dashboard/activity.types.ts` | F-6 |
| 2 | Create `KpiMetric`, `KpiPeriod`, `TrendDirection`, `KpiQuery`, `KpiResponse` types | `packages/types/src/dashboard/kpi.types.ts` | F-7 |
| 3 | Create dashboard barrel export (activity + kpi) | `packages/types/src/dashboard/index.ts` | F-6+F-7 |
| 4 | Create `FAQEntry`, `FAQCategory`, `HelpSection`, `HelpSearchResult`, etc. | `packages/types/src/help/help.types.ts` | F-8 |
| 5 | Create help barrel export | `packages/types/src/help/index.ts` | F-8 |
| 6 | Edit root barrel — add `export * from "./dashboard"` and `export * from "./help"` | `packages/types/src/index.ts` | ALL |
| 7 | Rebuild types: `tsc -b packages/types/tsconfig.json` | — | ALL |

### Phase 2: Database (F-6 + F-7)

| # | Task | Story |
|---|------|-------|
| 8 | Verify actual table names via `list_tables` (MCP) | F-6+F-7 |
| 9 | Apply migration: `activity_events` table + indexes + RLS | F-6 |
| 10 | Apply migration: performance indexes on `assessment_items` | F-7 |

### Phase 3: Server — Errors, Repos, Services, Controllers (F-6 + F-7)

| # | Task | File | Story |
|---|------|------|-------|
| 11 | Create `ActivityEventNotFoundError` | `apps/server/src/errors/activity.error.ts` | F-6 |
| 12 | Create `ActivityFeedRepository` (Supabase queries, JS #private) | `apps/server/src/repositories/activity.repository.ts` | F-6 |
| 13 | Create `ActivityFeedService` (list + filter, JS #private) | `apps/server/src/services/activity/activity-feed.service.ts` | F-6 |
| 14 | Create `ActivityFeedController` with `handleList()` | `apps/server/src/controllers/activity.controller.ts` | F-6 |
| 15 | Create `KpiService` (metric calculations, trend logic, role-scoping) | `apps/server/src/services/dashboard/kpi.service.ts` | F-7 |
| 16 | Create `KpiController` with `handleGetKpis()` | `apps/server/src/controllers/dashboard.controller.ts` | F-7 |
| 17 | Register routes in server index: `GET /api/v1/activity` + `GET /api/v1/dashboard/kpis` | `apps/server/src/index.ts` | F-6+F-7 |

### Phase 4: Frontend — F-8 Content + Components

| # | Task | File | Story |
|---|------|------|-------|
| 18 | Create FAQ content data (24+ entries, 6 categories) | `apps/web/src/content/help/faq-data.ts` | F-8 |
| 19 | Create help section content | `apps/web/src/content/help/help-sections.ts` | F-8 |
| 20 | Build `HelpCategoryBadge` atom | `apps/web/src/components/help/HelpCategoryBadge.tsx` | F-8 |
| 21 | Build `HelpSearch` molecule | `apps/web/src/components/help/HelpSearch.tsx` | F-8 |
| 22 | Build `FAQAccordion` molecule | `apps/web/src/components/help/FAQAccordion.tsx` | F-8 |
| 23 | Build `NoResults` molecule | `apps/web/src/components/help/NoResults.tsx` | F-8 |
| 24 | Build `HelpSidebar` organism | `apps/web/src/components/help/HelpSidebar.tsx` | F-8 |
| 25 | Build Help main page | `apps/web/src/app/(dashboard)/help/page.tsx` | F-8 |
| 26 | Build FAQ sub-page | `apps/web/src/app/(dashboard)/help/faq/page.tsx` | F-8 |
| 27 | Create FAQ API route | `apps/web/src/app/api/help/faq/route.ts` | F-8 |

### Phase 5: Frontend — F-6 + F-7 UI Components

| # | Task | File | Story |
|---|------|------|-------|
| 28 | Build `ActivityIcon` atom (6 event types → Lucide icons) | `packages/ui/src/atoms/activity-icon.tsx` | F-6 |
| 29 | Build `RelativeTime` atom (date-fns) | `packages/ui/src/atoms/relative-time.tsx` | F-6 |
| 30 | Install `date-fns` in `apps/web` if not present | — | F-6 |
| 31 | Build `ActivityEventRow` molecule | `packages/ui/src/molecules/activity-event-row.tsx` | F-6 |
| 32 | Build `ActivityFeed` organism (infinite scroll + filter + polling) | `apps/web/src/components/dashboard/activity-feed.tsx` | F-6 |
| 33 | Build `useActivityFeed` hook (polling 30s, IntersectionObserver) | `apps/web/src/hooks/use-activity-feed.ts` | F-6 |
| 34 | Build `TrendIndicator` atom (ChevronUp/Down/Minus + color) | `packages/ui/src/atoms/trend-indicator.tsx` | F-7 |
| 35 | Build `KpiCard` atom (value + label + trend) | `packages/ui/src/atoms/kpi-card.tsx` | F-7 |
| 36 | Build `KpiStrip` molecule (4-col grid + period selector) | `packages/ui/src/molecules/kpi-strip.tsx` | F-7 |
| 37 | Build `useDashboardKpis` hook | `apps/web/src/hooks/use-dashboard-kpis.ts` | F-7 |

### Phase 6: Tests

| # | Task | File | Story | Count |
|---|------|------|-------|-------|
| 38 | Activity feed API tests | `apps/server/src/__tests__/activity-feed.controller.test.ts` | F-6 | ~18 |
| 39 | KPI API tests | `apps/server/src/__tests__/kpi.controller.test.ts` | F-7 | ~21 |
| 40 | FAQ API route tests | `apps/web/src/app/api/help/__tests__/faq.test.ts` | F-8 | 5 |

### Phase 7: Verification

| # | Task |
|---|------|
| 41 | `tsc -b packages/types/tsconfig.json` (rebuild types) |
| 42 | `apps/server/node_modules/.bin/tsc --noEmit` (server type-check) |
| 43 | `cd apps/server && pnpm vitest run` (server tests) |
| 44 | `cd apps/web && pnpm vitest run` (web tests — F-8 FAQ) |
| 45 | Run security advisors via Supabase MCP (check RLS on new table) |

---

## Patterns to Follow

- `docs/solutions/supabase-mock-factory.md` — separate mock objects per chain stage (F-6, F-7 tests)
- `docs/solutions/repository-pattern.md` — Supabase repository with JS #private fields
- `docs/solutions/aggregation-dashboard-rpc-pattern.md` — RPC pattern if KPI calculations need it
- Existing route registration pattern in `apps/server/src/index.ts` — constructor DI, rbac.require()

## Testing Strategy

- **F-6 API tests (18):** Controller (12): auth, RBAC, pagination, filters, validation. Service (4): query building, has_more, ordering. Repository (2): Supabase chain.
- **F-7 API tests (21):** Controller (11): auth, RBAC, periods, scoping. Service (10): metric calculations, trend logic, division-by-zero guards.
- **F-8 API tests (5):** GET /api/help/faq: no filters, category filter, search, no results, invalid category.
- **E2E:** None for any of these stories. Deferred to STORY-F-21.

## Figma Make

- [ ] Code directly (all three stories — existing dashboard shell provides layout precedent)

## Risks / Edge Cases

1. **F-6+F-7 merge conflict on `index.ts`** — Mitigated by making both route edits in a single session.
2. **F-7 queries non-existent tables** — Brief references `assessment_items`, `generation_logs`, `user_profiles`. Must verify via `list_tables` before writing queries. Brief table names may be wrong (known CLAUDE.md rule).
3. **F-7 time_saved metric** — Calculated value (questions * 0.75hrs), not stored. No table needed.
4. **F-7 coverage_score** — Uses `quality_score` column on `assessment_items`. Must verify column exists.
5. **F-6 activity_events FK to `institutions`** — Must verify table name (could be `institutions` or something else).
6. **F-8 Next.js default export** — Help pages require `export default` (App Router exception).
7. **F-8 `(dashboard)` route group** — Must verify this route group exists in `apps/web/src/app/`.
8. **Barrel file stripping** — PostToolUse eslint hook may strip exports from `index.ts`. Re-read and verify after every barrel edit (CLAUDE.md critical rule).

## Acceptance Criteria

### F-6 (Activity Feed)
- AC1: ActivityFeed organism renders chronological event list
- AC2: All 6 event types render with correct Lucide icon and color token
- AC3: Each row shows: icon, description, course name, relative timestamp, actor name
- AC4: Events fetched from `GET /api/v1/activity?user_id=X&limit=20&offset=0`
- AC5: Infinite scroll loads next page via IntersectionObserver
- AC6: Multi-select event type filter narrows results
- AC7: Empty state: "No recent activity"
- AC8: 30s polling prepends new events
- AC9: 401 for unauthenticated, 403 for wrong user
- AC10: Limit capped at 50
- AC11: ~18 API tests pass

### F-7 (KPI Strip)
- AC1: 4 KPI cards: Questions Generated, Approval Rate, Coverage Score, Time Saved
- AC2: Each card shows value, trend arrow, trend percentage
- AC3: Period selector: 7d, 30d, semester
- AC4: Data from `GET /api/v1/dashboard/kpis?user_id=X&period=7d`
- AC5: Faculty = personal scope, course director/admin = institution scope
- AC6: Trend: up (green) >=1%, down (red) >=1%, flat (gray) <1%
- AC7: Division-by-zero guards (0% approval when no reviews, 0% trend when previous=0)
- AC8: Loading skeletons
- AC9: Responsive: 4 cols → 2x2 → stacked
- AC10: Time Saved = questions * 0.75 hrs
- AC11: 401 for unauthenticated, 403 for student role
- AC12: ~21 API tests pass

### F-8 (Help & FAQ)
- AC1: Help page with 6 categorized documentation sections
- AC2: FAQ accordion with expandable Q&A pairs
- AC3: 6 categories: Getting Started, Generation, Review, Templates, Item Bank, Analytics
- AC4: Search across question, answer, tags
- AC5: Deep links: `/help/faq?category=generation`
- AC6: Static TypeScript content, no CMS
- AC7: Responsive sidebar on desktop, inline filter on mobile
- AC8: 5 vitest tests pass
- AC9: TypeScript strict, named exports (except page.tsx default exports)
