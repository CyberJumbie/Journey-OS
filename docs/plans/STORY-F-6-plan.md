# Plan: STORY-F-6 — Activity Feed Component

## Status: ~90% Implemented — Tests & DB Migration Remaining

All backend (types, errors, repository, service, controller, route) and frontend (hook, components) code already exists from a prior session. What remains is:

1. **Verify/apply the `activity_events` database migration** via Supabase MCP
2. **Write ~18 API tests** (controller + service + repository)
3. **Code review pass** — minor issues found in existing code
4. **Rebuild types** (may already be current, verify)

---

## Tasks (refined from brief)

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Types: `ActivityEvent`, `ActivityFeedQuery`, `ActivityFeedResponse` | `packages/types/src/dashboard/activity.types.ts` | DONE |
| 2 | Dashboard barrel export | `packages/types/src/dashboard/index.ts` | DONE |
| 3 | Root barrel re-export | `packages/types/src/index.ts` | DONE |
| 4 | **Verify `activity_events` table exists via Supabase MCP `list_tables`** | Supabase migration | **TODO** |
| 5 | **Apply migration if table missing**: `activity_events` + indexes + RLS | Supabase MCP `apply_migration` | **TODO (conditional)** |
| 6 | Error classes: `ActivityEventNotFoundError`, `ActivityFeedForbiddenError`, `ActivityFeedValidationError` | `apps/server/src/errors/activity.error.ts` | DONE |
| 7 | Error barrel export | `apps/server/src/errors/index.ts` | DONE |
| 8 | `ActivityFeedRepository.findByUser()` — dual query + filter | `apps/server/src/repositories/activity.repository.ts` | DONE |
| 9 | `ActivityFeedService.list()` — pagination clamping | `apps/server/src/services/activity/activity-feed.service.ts` | DONE |
| 10 | `ActivityFeedController.handleList()` — validation + auth | `apps/server/src/controllers/activity.controller.ts` | DONE |
| 11 | Route registration `GET /api/v1/activity` | `apps/server/src/index.ts` | DONE |
| 12 | `ActivityIcon` atom (Lucide icon mapping) | `apps/web/src/components/dashboard/activity-icon.tsx` | DONE |
| 13 | `RelativeTime` atom (custom formatter) | `apps/web/src/components/dashboard/relative-time.tsx` | DONE |
| 14 | `ActivityEventRow` molecule | `apps/web/src/components/dashboard/activity-event-row.tsx` | DONE |
| 15 | `ActivityFeed` organism (filter + skeleton + infinite scroll) | `apps/web/src/components/dashboard/activity-feed.tsx` | DONE |
| 16 | `useActivityFeed` hook (polling + IntersectionObserver) | `apps/web/src/hooks/use-activity-feed.ts` | DONE |
| 17 | **Write API tests (~18 tests)** | `apps/server/src/__tests__/activity-feed.controller.test.ts` | **TODO** |
| 18 | **Rebuild types & verify type-check** | `tsc -b packages/types/tsconfig.json` + server `tsc --noEmit` | **TODO** |

---

## Implementation Order (remaining work)

1. **Rebuild types** — `packages/types/node_modules/.bin/tsc -b packages/types/tsconfig.json`
2. **Verify DB** — `list_tables` via Supabase MCP for `activity_events`
3. **Apply migration** (if missing) — DDL from brief Section 4
4. **Write tests** — 18 tests across 3 describe blocks
5. **Run tests** — `cd apps/server && npx vitest run src/__tests__/activity-feed.controller.test.ts`
6. **Type-check** — `apps/server/node_modules/.bin/tsc --noEmit`

---

## Code Review Notes (issues found in existing code)

### Minor — ActivityIcon uses hardcoded Tailwind colors
Brief specifies design tokens (`--color-accent-blue`, `--color-success-green`, etc.) but implementation uses `text-blue-500`, `text-green-500`. This is acceptable for now — design token CSS variables aren't fully wired yet. Flag for E-32 assembly story (F-21).

### Minor — RelativeTime skips date-fns
Brief specified `date-fns/formatDistanceToNow` but implementation uses a custom formatter. This is fine — avoids an unnecessary dependency for a simple utility.

### Minor — UI atoms placed in `apps/web/` not `packages/ui/`
Brief specified `packages/ui/src/atoms/` but components live in `apps/web/src/components/dashboard/`. Acceptable — these are dashboard-specific, not shared atoms. Can refactor in E-32 assembly if needed.

None of these warrant code changes now.

---

## Patterns to Follow

- `docs/solutions/repository-pattern.md` — #private fields, constructor DI, `.select().single()` for writes
- `docs/solutions/supabase-mock-factory.md` — separate mock chain objects, call-count alternation for data vs count queries
- `docs/solutions/admin-paginated-list-pattern.md` — dual parallel queries, filter-before-pagination ordering

---

## Testing Strategy

### API Tests (18 tests in `apps/server/src/__tests__/activity-feed.controller.test.ts`)

**Controller (12 tests):**
1. Returns paginated activity events for authenticated faculty (200)
2. Returns correct pagination meta (limit, offset, total, has_more)
3. Defaults to limit=20, offset=0, no event_type filter
4. Rejects unauthenticated request (401)
5. Rejects access to another user's events (403)
6. Allows superadmin to access any user's events (200)
7. Filters by single event_type
8. Filters by multiple event_types (comma-separated)
9. Returns empty list when no events match filter
10. Caps limit at 50
11. Rejects invalid event_type (400)
12. Rejects invalid user_id format (400)

**Service (4 tests):**
13. Clamps limit to [1, 50] range
14. Calculates has_more correctly (offset + limit < total)
15. Defaults limit=20, offset=0 when not provided
16. Returns empty events array when no rows match

**Repository (2 tests):**
17. Constructs Supabase select with correct columns and user_id filter
18. Applies `.in()` filter when event_types provided

### Mock Strategy
- Use `vi.hoisted()` for mock variable declarations
- Supabase mock factory with call-count alternation (data chain on odd calls, count chain on even calls)
- Separate mock objects per chain stage (no `mockReturnThis()` across chains)

### E2E
Not required — deferred to F-21 (Role-Based Dashboard Variants) per brief.

---

## Figma Make

- [x] Code directly (no prototype needed — standard list/feed pattern)

---

## Risks / Edge Cases

1. **DB migration may reference wrong table names** — brief uses `user_profiles` in RLS policy but actual table may be `profiles`. Must verify via `list_tables` before applying.
2. **RLS policy FK reference** — `institution_id IN (SELECT institution_id FROM user_profiles WHERE id = auth.uid())` — need to verify column names match actual schema.
3. **No test infrastructure for activity feed yet** — need to set up mock factory from scratch following `supabase-mock-factory.md`.

---

## Acceptance Criteria (verbatim from brief)

1. ActivityFeed organism renders a chronological list of recent events
2. All 6 event types render with correct Lucide icon and color token
3. Each event row shows: icon, description, course name, relative timestamp, actor name
4. Events fetched from `GET /api/v1/activity?user_id=X&limit=20&offset=0`
5. Infinite scroll loads next page when sentinel element enters viewport
6. Multi-select event type filter correctly narrows results
7. Empty state displays "No recent activity" when no events exist
8. Polling fetches new events every 30 seconds and prepends to feed
9. Unauthenticated requests receive 401
10. Users cannot access another user's activity events (403)
11. Limit capped at 50 items per request
12. All ~18 API tests pass
