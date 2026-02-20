# STORY-IA-26: Sync Status Monitor

**Epic:** E-36 (Admin Dashboard & KPIs)
**Feature:** F-17
**Sprint:** 9
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-36-4

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a sync status monitor showing dual-write health across all tables so that I can detect and investigate data consistency issues between Supabase and Neo4j.

## Acceptance Criteria
- [ ] SyncMonitorPage: table of all dual-written entity types with sync health per type
- [ ] Columns: entity type, total records, synced count, pending count, failed count, sync health (%)
- [ ] Color-coded health: green (>99%), yellow (95-99%), red (<95%)
- [ ] Failed records expandable: shows individual records with failure reason and retry button
- [ ] Manual retry: trigger re-sync for individual failed records or bulk retry all failures
- [ ] Sync history chart: sync health trend over last 7 days (line chart)
- [ ] Auto-refresh every 30 seconds
- [ ] Data fetched from `GET /api/admin/sync/status` and `GET /api/admin/sync/failures`
- [ ] SyncMonitorService queries `sync_status` column across dual-written tables
- [ ] 8-10 API tests: status display, failure list, retry mechanism, health calculation, trend data

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/DataIntegrityDashboard.tsx` | `apps/web/src/app/(protected)/admin/sync-monitor/page.tsx` | Replace `AdminDashboardLayout` with route group layout. Convert `export default` (required for page.tsx). Extract entity counts into sync-status-table component. Replace hardcoded issues array with API data. Replace `getSeverityColor` inline function with design token classes. Add sync health chart using recharts. Add auto-refresh with `useInterval` hook. Add retry action handlers. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/sync-monitor.types.ts` |
| Service | apps/server | `src/services/admin/sync-monitor.service.ts` |
| Controller | apps/server | `src/controllers/admin/sync-monitor.controller.ts` |
| Route | apps/server | `src/routes/admin/sync-monitor.routes.ts` |
| View - Page | apps/web | `src/app/(protected)/admin/sync-monitor/page.tsx` |
| View - Table | apps/web | `src/components/organisms/sync-monitor/sync-status-table.tsx` |
| View - Failures | apps/web | `src/components/organisms/sync-monitor/sync-failure-list.tsx` |
| View - Chart | apps/web | `src/components/molecules/sync-history-chart.tsx` |
| Hook | apps/web | `src/hooks/use-sync-monitor.ts` |
| Tests | apps/server | `src/controllers/admin/__tests__/sync-monitor.test.ts` |
| Tests | apps/web | `src/components/organisms/sync-monitor/__tests__/sync-status-table.test.tsx` |

## Database Schema
No new tables. Queries `sync_status` column across dual-written tables. Uses existing `sync_health_snapshots` table for trend data.

### Health Query Pattern
```sql
SELECT sync_status, COUNT(*)
FROM {table}
WHERE institution_id = $id
GROUP BY sync_status
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/sync/status` | institutional_admin | Get sync health per entity type |
| GET | `/api/v1/admin/sync/failures` | institutional_admin | List failed sync records |
| POST | `/api/v1/admin/sync/retry/:entityType/:entityId` | institutional_admin | Retry individual failed sync |
| POST | `/api/v1/admin/sync/retry-all` | institutional_admin | Bulk retry all failures (max 100) |

## Dependencies
- **Blocked by:** S-IA-36-1 (admin dashboard page)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /admin/sync/status returns health per entity type
2. Health calculation: synced / total * 100
3. GET /admin/sync/failures returns failed records with reasons
4. POST /retry triggers DualWriteService.retrySync
5. POST /retry-all processes up to 100 records
6. Sync status scoped to admin's institution
7. Color coding thresholds: >99% green, 95-99% yellow, <95% red
8. Trend data returns 7 days of snapshots
9. Auto-refresh returns fresh data
10. Unauthorized user gets 403

## Implementation Notes
- Dual-written tables: `institutions`, `users`, `courses`, `programs`, `slos`, `ilos`, `concepts`, `questions` -- all have `sync_status` column
- Sync status values: `synced`, `pending`, `failed`, `retrying`
- Retry mechanism: calls `DualWriteService.retrySync(entityType, entityId)` which re-attempts the Neo4j write
- Sync history: stored in `sync_health_snapshots` table, one row per entity type per day
- Chart uses `recharts` -- use hex values with `/* token: --color-name */` comments for SVG props
- Auto-refresh: `useInterval` with 30s polling, pause on tab hidden via `document.visibilityState`
- Prototype shows orphan/ghost/mismatch issue types -- production maps these to sync_status values
