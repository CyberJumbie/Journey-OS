# STORY-IA-5: Admin Dashboard Page

**Epic:** E-36 (Admin Dashboard & KPIs)
**Feature:** F-17 (Admin Dashboard & Data Integrity)
**Sprint:** 9
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-36-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a system-wide health dashboard with KPI cards so that I can monitor platform health, usage trends, and data integrity across my institution at a glance.

## Acceptance Criteria
- [ ] AdminDashboardPage at `/admin/dashboard` with KPI cards row + system health section + quick actions
- [ ] KPI cards: Total Users, Active Courses, Questions Generated, Sync Health (%)
- [ ] Each KPI card shows: value, trend vs. previous period, sparkline mini-chart
- [ ] System health section: API response time (p95), error rate (last 24h), storage usage
- [ ] Quick actions: "Manage Users", "View Coverage", "View Sync Status", "Browse Knowledge Graph"
- [ ] Auto-refresh: KPIs update every 60 seconds (pause when tab not visible via Page Visibility API)
- [ ] Sync Health KPI: percentage of records with `sync_status = 'synced'` across all dual-written tables
- [ ] RBAC: InstitutionalAdmin and SuperAdmin access

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/AdminDashboard.tsx` | `apps/web/src/app/(protected)/admin/dashboard/page.tsx` | Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract KPI card into reusable molecule. |
| `pages/institution/InstitutionalAdminDashboard.tsx` | `apps/web/src/components/admin/admin-dashboard-template.tsx` | Extract dashboard layout as template. Split KPI data fetching into custom hook. |
| `components/layout/AdminLayout.tsx` | `apps/web/src/app/(protected)/admin/layout.tsx` | Convert to Next.js layout with default export. Integrate with auth context. |
| `components/layout/AdminSidebar.tsx` | `apps/web/src/components/layout/admin-sidebar.tsx` | Replace hardcoded nav items with config-driven menu. Use design tokens for spacing/colors. |
| `components/layout/AdminDashboardLayout.tsx` | `apps/web/src/components/layout/admin-dashboard-layout.tsx` | Merge with AdminLayout or use as nested layout wrapper. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/dashboard.types.ts` |
| Service | apps/server | `src/services/admin/admin-dashboard.service.ts` |
| Controller | apps/server | `src/controllers/admin/dashboard.controller.ts` |
| Routes | apps/server | `src/routes/admin/dashboard.routes.ts` |
| Atoms | packages/ui | `src/atoms/sparkline.tsx` |
| Molecules | packages/ui | `src/molecules/admin-kpi-card.tsx`, `src/molecules/quick-action-card.tsx` |
| Template | apps/web | `src/components/admin/admin-dashboard-template.tsx` |
| Page | apps/web | `src/app/(protected)/admin/dashboard/page.tsx` |
| Hook | apps/web | `src/hooks/use-admin-dashboard.ts` |
| Tests | apps/server | `src/services/admin/__tests__/admin-dashboard.test.ts` |

## Database Schema

No new tables. Aggregates metrics from existing tables:
- `profiles` (user counts)
- `courses` (active course counts)
- `questions` (generated question counts)
- All dual-written tables (sync_status aggregation)

System health metrics sourced from `system_metrics` table or computed live.

**No Neo4j schema changes.**

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/dashboard/kpis` | InstitutionalAdmin+ | KPI values with trends |
| GET | `/api/v1/admin/dashboard/health` | InstitutionalAdmin+ | System health metrics |

## Dependencies
- **Blocked by:** STORY-U-6 (auth/RBAC), STORY-SA-5 (institution exists)
- **Blocks:** STORY-IA-12 (KaizenML Lint Rule Engine references admin dashboard)
- **Cross-lane:** Universal lane auth infrastructure

## Testing Requirements
### API Tests (8-10)
- KPI endpoint returns correct user count, course count, question count, sync health %
- Metrics scoped to requesting admin's institution_id
- System health returns p95 response time, error rate, storage
- Auto-refresh: verify endpoint is idempotent and lightweight
- Auth enforcement: 403 for non-admin roles
- Empty institution: returns zero values with correct structure
- Trend calculation: compares current vs previous period

## Implementation Notes
- Sparkline uses lightweight inline SVG rendering -- no full charting library needed.
- Auto-refresh: `useInterval` hook with 60s polling; pause when tab is not visible (Page Visibility API).
- Quick action cards use icon + label + description pattern; navigate to respective pages on click.
- Sync Health KPI: `SELECT COUNT(*) FILTER (WHERE sync_status = 'synced') * 100.0 / COUNT(*) FROM ...` across tables.
- Institution scoping: all aggregate queries MUST filter by `institution_id`.
- Use `Promise.all` for independent aggregate queries (user count, course count, etc.) -- never sequential.
- Charting SVG props (sparklines) may use hex with `/* token: --color-name */` comment per architecture rules.
