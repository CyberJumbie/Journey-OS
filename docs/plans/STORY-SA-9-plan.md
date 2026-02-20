# Plan: STORY-SA-9 — Institution Detail View

## Tasks (from brief, with refinements)

1. **Types** → `packages/types/src/admin/institution-detail.types.ts` (create)
   - `InstitutionDetail`, `InstitutionMetrics`, `UserBreakdownEntry`, `ActivityTimelineEntry`, `MonthlyTrend`, `StorageUsage`
2. **Types barrel** → `packages/types/src/admin/index.ts` (edit — add detail exports)
3. **Rebuild types** → `tsc -b packages/types/tsconfig.json`
4. **Error class** → No new error class needed. Reuse `InstitutionNotFoundError` from `registration.error.ts` (code: `"INSTITUTION_NOT_FOUND"`)
5. **Service** → `apps/server/src/services/admin/institution-monitoring.service.ts` (edit — add `getDetail()` method)
   - Fetch institution record, then `Promise.all()` for: user breakdown, active users 30d, course count, question metrics, activity timeline, monthly trends, storage
   - Each sub-query wrapped in try/catch for missing tables → return 0/null/empty
   - Monthly trends: fill missing months with `value: 0` for continuous chart data
6. **Controller** → `apps/server/src/controllers/admin/institution-monitoring.controller.ts` (edit — add `handleGetDetail()` method)
   - Validate `req.params.id` is string, call `service.getDetail(id)`, return `ApiResponse<InstitutionDetail>`
   - Catch `InstitutionNotFoundError` → 404
7. **Routes** → `apps/server/src/index.ts` (edit — add `GET /api/v1/admin/institutions/:id/detail`)
   - Register AFTER existing institution monitoring routes, before lifecycle routes
   - Reuse existing `institutionMonitoringController` instance
8. **Install recharts** → `pnpm --filter @journey-os/web add recharts`
9. **Molecule: MetricCard** → `packages/ui/src/molecules/metric-card.tsx` (create)
   - Props: `label`, `value`, `icon?`. Format numbers with locale. Design tokens: Parchment bg, Navy Deep value text.
   - Note: `packages/ui/src/molecules/` directory doesn't exist yet — create it
10. **Molecule: UsageChart** → `packages/ui/src/molecules/usage-chart.tsx` (create)
    - Props: `data: MonthlyTrend[]`, `type: 'line' | 'bar'`, `title`. Uses Recharts `<ResponsiveContainer>`, `<LineChart>` / `<BarChart>`
11. **Hook** → `apps/web/src/hooks/use-institution-detail.ts` (create)
    - Fetch `GET /api/v1/admin/institutions/:id/detail`, return `{ data, isLoading, error, refetch }`
12. **Organism: InstitutionDetailHeader** → `apps/web/src/components/admin/institution-detail-header.tsx` (create)
    - Name (Lora), StatusIndicator (reuse from SA-7), domain, type, accreditation, created date
13. **Organism: InstitutionMetricsGrid** → `apps/web/src/components/admin/institution-metrics-grid.tsx` (create)
    - 2x3 grid of MetricCards. Storage card formats bytes → human-readable
14. **Organism: UserBreakdownTable** → `apps/web/src/components/admin/user-breakdown-table.tsx` (create)
    - Table rows: role name, count, percentage bar
15. **Organism: InstitutionActivityTimeline** → `apps/web/src/components/admin/institution-activity-timeline.tsx` (create)
    - Left-aligned vertical timeline, last 10 events, relative timestamps
16. **Page** → `apps/web/src/app/(protected)/admin/institutions/[id]/page.tsx` (create)
    - Server component wrapping `InstitutionDetailDashboard` client component
    - States: loading (skeleton), data, error (retry), not found (404)
    - Back button → `/admin/institutions`
17. **API tests** → `apps/server/src/__tests__/institution-detail.test.ts` (create)
    - ~16 tests: 5 controller + 11 service (see brief §10)

## Implementation Order

Types → Types barrel → Rebuild types → Service → Controller → Routes → Install recharts → Molecules → Hook → Organisms → Page → API Tests

## Patterns to Follow

- `docs/solutions/supabase-mock-factory.md` — For test mocking of Supabase client chains
- `docs/solutions/rbac-middleware-pattern.md` — SuperAdmin-only route protection
- Existing `InstitutionMonitoringService.list()` pattern — extend with `getDetail()` using same class structure
- Existing `InstitutionMonitoringController.handleList()` — mirror error handling pattern for `handleGetDetail()`

## Codebase Findings (deviations from brief)

| Brief says | Actual codebase | Action |
|------------|----------------|--------|
| Controller file: `institution.controller.ts` | Actual: `institution-monitoring.controller.ts` | Use actual filename |
| Create `packages/ui/src/molecules/` | Directory doesn't exist | Create it |
| `recharts` already installed | NOT in `apps/web/package.json` | Install with pnpm |
| No error class needed | `InstitutionNotFoundError` exists in `registration.error.ts` | Reuse it |

## Testing Strategy

- **API tests (16 total):**
  - Controller (5): valid detail 200, includes all fields, 401 unauth, 403 non-SA, 404 not found
  - Service (11): institution record, total_users aggregation, user_breakdown grouping, active_users_30d, courses=0 when table missing, questions=0 when table missing, empty timeline, empty trends, storage=0 when no docs, timeline limited to 10, trends for 12 months
- **E2E:** Not required for this story (part of combined SA-7+8+9 journey later)

## Figma Make

- [ ] Prototype first
- [x] Code directly (dashboard with standard grid layout and Recharts)

## Risks / Edge Cases

1. **Missing tables** — `courses`, `activity_events`, `uploaded_documents`, `questions` may not exist. Service must catch Supabase errors and return defaults.
2. **Monthly trend gaps** — If some months have no activity, must fill with `value: 0` for continuous chart rendering.
3. **Activity timeline actor join** — Needs join from `activity_events` to `profiles` for actor name/email. If `activity_events` table doesn't exist, return empty array.
4. **Large institution** — User breakdown query should be fast (GROUP BY on indexed FK), but timeline needs `ORDER BY created_at DESC LIMIT 10`.
5. **Barrel file stripping** — PostToolUse eslint hook may strip exports from `packages/types/src/admin/index.ts`. Must re-read and verify after edit (per CLAUDE.md).

## Acceptance Criteria (verbatim from brief)

1. SuperAdmin can view institution detail at `/admin/institutions/[id]`
2. Header shows institution name, status badge, domain, type, accreditation, creation date
3. Metrics section: total users, active users (30d), total courses, questions generated, questions approved
4. User breakdown table shows role distribution with counts
5. Activity timeline shows last 10 significant events
6. Storage usage: document count and total size
7. Monthly active users line chart (Recharts)
8. Questions generated per month bar chart (Recharts)
9. Back navigation to institution list
10. Non-SuperAdmin roles receive 403 Forbidden
11. Non-existent institution returns 404
12. Gracefully handles missing tables (courses, activity_events, etc.) with 0/null/empty
13. All ~16 API tests pass
