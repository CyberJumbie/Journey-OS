# STORY-F-7: KPI Strip Component

**Epic:** E-32 (Faculty Dashboard)
**Feature:** F-15
**Sprint:** 8
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-32-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a KPI strip showing key metrics with trend indicators so that I can track my question generation productivity and quality at a glance.

## Acceptance Criteria
- [ ] KPIStrip organism renders 4 metric cards in a horizontal row
- [ ] Metrics: Questions Generated (total), Approval Rate (%), Coverage (%), Time Saved (hours)
- [ ] Each card shows: metric label, current value, trend arrow (up/down/flat), trend percentage vs. previous period
- [ ] Trend period selectable: Last 7 days, Last 30 days, This semester
- [ ] Data fetched from `/api/v1/dashboard/kpis?period=7d`
- [ ] KPI values scoped to current user's courses (faculty) or all courses (course director/admin)
- [ ] Responsive: 4 columns on desktop, 2x2 grid on tablet, stacked on mobile
- [ ] Loading skeleton while data fetches
- [ ] 8-10 API tests: rendering, metric calculations, trend computation, period switching, role-based scoping
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. Must match canonical `journey-os-dashboard.jsx`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/dashboard/FacultyDashboard.tsx` (KPI strip section) | `apps/web/src/components/dashboard/kpi-strip.tsx` | Extract KPI section into standalone organism. Replace hardcoded values with API-driven data. |
| `.context/source/05-reference/app/app/components/shared/stat-card.tsx` | `packages/ui/src/atoms/kpi-card.tsx` | Refactor stat-card into KPI card atom with trend indicator. Use design tokens for colors. |
| `.context/source/05-reference/app/app/components/shared/DashboardComponents.tsx` | Split into atoms/molecules | Extract trend indicator as separate atom. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/dashboard/kpi.types.ts` |
| Atoms | packages/ui | `src/atoms/kpi-card.tsx`, `src/atoms/trend-indicator.tsx` |
| Organisms | apps/web | `src/components/dashboard/kpi-strip.tsx` |
| Service | apps/server | `src/services/dashboard/kpi.service.ts` |
| Controller | apps/server | `src/controllers/dashboard/dashboard.controller.ts` |
| Hooks | apps/web | `src/hooks/use-dashboard-kpis.ts` |
| Tests | apps/web | `src/components/dashboard/__tests__/kpi-strip.test.tsx` |
| Tests | apps/server | `src/services/dashboard/__tests__/kpi.service.test.ts` |

## Database Schema
No new tables. KPI data is aggregated from existing tables via Supabase RPC functions.

### Supabase RPC -- `get_faculty_kpis(user_id, period_start, period_end)`
Returns: `{ questions_generated, approval_rate, coverage_pct, time_saved_hours, prev_questions_generated, prev_approval_rate, prev_coverage_pct, prev_time_saved_hours }`

See `docs/solutions/dashboard-rpc-aggregate-pattern.md` for the RPC aggregation pattern.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/dashboard/kpis` | Faculty+ | Get KPI metrics with trend data |

Query params: `period` (7d, 30d, semester), `scope` (personal, program, institution).

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-U-3 (auth/RBAC for role-based scoping)
- **Cross-lane:** None

## Testing Requirements
### API Tests (8-10)
1. KPI service returns all 4 metrics for valid user
2. Trend computation: positive trend shows up arrow
3. Trend computation: negative trend shows down arrow
4. Trend computation: zero change shows flat indicator
5. Period switching: 7d vs 30d returns different values
6. Role-based scoping: faculty sees personal metrics
7. Role-based scoping: course director sees program metrics
8. KPIStrip renders 4 cards with correct labels
9. Loading skeleton shown while data fetches
10. Responsive layout: 4 columns on desktop, 2x2 on tablet

## Implementation Notes
- Questions Generated: `COUNT(*) FROM questions WHERE creator_id = $userId AND created_at > $periodStart`.
- Approval Rate: `COUNT(status='approved') / COUNT(status IN ('approved','rejected'))` for the period.
- Coverage: average coverage score across user's courses from latest coverage snapshot.
- Time Saved: estimated based on questions generated x average manual authoring time (configurable, default 45 min/question).
- Trend calculation: `((current_period_value - previous_period_value) / previous_period_value) * 100`.
- KPI card uses design tokens: `--color-trend-positive` (green), `--color-trend-negative` (red), `--color-trend-neutral` (gray).
- Use `Promise.all` for independent Supabase queries in KPI service -- never sequential awaits.
- See `docs/solutions/aggregation-dashboard-rpc-pattern.md` for RPC aggregate patterns.
