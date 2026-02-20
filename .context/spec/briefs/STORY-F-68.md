# STORY-F-68: Repository Statistics

**Epic:** E-25 (Item Bank Browser & Export)
**Feature:** F-11
**Sprint:** 18
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-25-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need an aggregate statistics dashboard for the item bank so that I can understand the composition, quality distribution, and coverage of my question repository.

## Acceptance Criteria
- [ ] Total item count by status (approved, draft, pending_review, retired, etc.)
- [ ] Distribution charts: Bloom level, difficulty, question type (from tags/metadata), USMLE system
- [ ] Quality metrics: average `quality_score`, score distribution histogram
- [ ] Coverage heatmap: SLO coverage by question count (SLO x Bloom level matrix)
- [ ] Trend charts: items added per week/month over time (from `created_at`)
- [ ] Course-scoped and institution-scoped views (faculty sees own courses; admin sees all)
- [ ] KPI cards: total items, average quality, coverage percentage, items this month
- [ ] Data refresh: cached aggregates with manual refresh button
- [ ] 8-12 API tests: each aggregate query, scope filtering, cache behavior

## Reference Screens
> Stats section of the Repository page prototype.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/repository/Repository.tsx` (stats section) | `apps/web/src/components/repository/statistics-kpi-cards.tsx`, `apps/web/src/components/repository/distribution-charts.tsx`, `apps/web/src/components/repository/coverage-heatmap.tsx` | Extract the 4 KPI stat cards into `StatisticsKPICards` molecule; build distribution charts with Recharts using hex colors with `/* token: --color-name */` comments; coverage heatmap as a custom grid component with intensity-mapped background colors |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/item-bank/statistics.types.ts` |
| Service | apps/server | `src/services/item-bank/statistics.service.ts` |
| Controller | apps/server | `src/controllers/item-bank/statistics.controller.ts` |
| View | apps/web | `src/app/(protected)/repository/statistics/page.tsx` |
| Components | apps/web | `src/components/repository/statistics-kpi-cards.tsx`, `src/components/repository/distribution-charts.tsx`, `src/components/repository/coverage-heatmap.tsx`, `src/components/repository/trend-chart.tsx` |
| Tests | apps/server | `src/services/item-bank/__tests__/statistics.service.test.ts` |

## Database Schema
No new tables. All aggregates computed from existing `assessment_items` table via Supabase RPC functions for performance:

```sql
-- RPC function for aggregate statistics
CREATE OR REPLACE FUNCTION get_item_bank_statistics(p_course_ids uuid[])
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'by_status', jsonb_object_agg(status, cnt) FROM (
      SELECT status, COUNT(*) as cnt FROM assessment_items
      WHERE course_id = ANY(p_course_ids) GROUP BY status
    ) s,
    'avg_quality', AVG(quality_score),
    'by_difficulty', ...
  )
  FROM assessment_items WHERE course_id = ANY(p_course_ids);
$$ LANGUAGE sql STABLE;
```

Consider a `statistics_cache` table or in-memory cache with TTL if aggregate queries become expensive.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/item-bank/statistics` | Aggregate statistics (query: `?scope=course&courseId=...`) |
| GET | `/api/item-bank/statistics/trends` | Time-series trend data (items per week/month) |
| GET | `/api/item-bank/statistics/coverage` | SLO coverage heatmap data |
| POST | `/api/item-bank/statistics/refresh` | Force cache refresh |

## Dependencies
- **Blocks:** none
- **Blocked by:** STORY-F-64 (item bank has items to compute statistics on)
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: total count by status, average quality score computation, difficulty distribution, Bloom level distribution, course-scoped filtering, institution-scoped filtering (admin role), trend data weekly/monthly, coverage matrix dimensions, cache TTL behavior, refresh endpoint clears cache, empty course returns zeros
- 0 E2E tests

## Implementation Notes
- Aggregate queries on `assessment_items` can be expensive for large banks. Use Supabase RPC functions (`.rpc()`) for complex aggregations rather than multiple `.from().select()` calls.
- Charts built with Recharts (shadcn/ui compatible). Hex colors with `/* token */` comments per architecture rule: e.g., `stroke="#1a5632" /* token: --green-dark */`.
- Coverage heatmap: matrix of SLOs (rows) vs. Bloom levels (columns). Cell color intensity maps to question count. Use Tailwind `bg-opacity-*` or computed `rgba()` for intensity.
- Course-scoped view is default for faculty role; institution-scoped available for `institutional_admin` and `superadmin` roles.
- Consider materialized views or periodic cron for frequently computed aggregates.
- Auto-refresh interval: 5 minutes on the statistics page via `setInterval` in `useEffect`. Manual refresh button triggers `POST /refresh`.
- Wrap independent Supabase queries in `Promise.all` (CLAUDE.md rule).
