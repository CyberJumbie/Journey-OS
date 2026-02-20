# STORY-ST-8: Trend Charts

**Epic:** E-43 (Student Progress Analytics)
**Feature:** F-20
**Sprint:** 28
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-43-1

---

## User Story
As a **Student (Marcus Williams)**, I need to see trend charts showing my mastery improvement over time so that I can understand my learning trajectory and stay motivated.

## Acceptance Criteria
- [ ] Line chart showing overall mastery percentage over time (daily/weekly granularity toggle)
- [ ] Multi-series chart: one line per USMLE system (toggleable via legend clicks)
- [ ] Date range selector: last 7 days, 30 days, 90 days, all time
- [ ] Hover tooltip showing exact values at data points
- [ ] Legend with system names and current mastery values
- [ ] Milestone markers on chart (e.g., "Started Cardiology review")
- [ ] Responsive: chart resizes on viewport change
- [ ] Loading skeleton matching chart dimensions
- [ ] Empty state when insufficient data points (< 2 sessions)
- [ ] Analytics page at `/student/analytics`

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/student/StudentAnalytics.tsx` (overall structure) | `apps/web/src/app/(protected)/student/analytics/page.tsx` | Convert to Next.js page with `export default`. Replace DashboardLayout wrapper with student layout from STORY-ST-2. |
| `pages/student/StudentProgress.tsx` (topic mastery with trends) | `apps/web/src/components/student/mastery-trend-chart.tsx` | Extract the trend visualization. Replace mock data with API call. Use Recharts LineChart with design token colors. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/student/analytics.types.ts` |
| Service | apps/server | `src/modules/student/services/mastery-trend.service.ts` |
| Controller | apps/server | `src/modules/student/controllers/student-analytics.controller.ts` |
| Route | apps/server | `src/modules/student/routes/student-analytics.routes.ts` |
| View (Page) | apps/web | `src/app/(protected)/student/analytics/page.tsx` |
| Template | apps/web | `src/components/templates/student-analytics-template.tsx` |
| Organism | apps/web | `src/components/student/mastery-trend-chart.tsx` |
| Molecule | apps/web | `src/components/student/chart-date-range-selector.tsx` |
| Molecule | apps/web | `src/components/student/chart-legend.tsx` |
| API Tests | apps/server | `src/modules/student/__tests__/mastery-trend.service.test.ts` |

## Database Schema
No additional tables. Aggregates from `mastery_history` table (defined in STORY-ST-3) and `practice_sessions`.

**Query pattern:**
```sql
SELECT
  DATE_TRUNC('day', created_at) as date,
  AVG(mastery_after) as avg_mastery
FROM mastery_history
WHERE student_id = $1
  AND created_at >= $2
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date ASC;
```

Per-system: join with concept's USMLE system tag and group by system + date.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/student/analytics/trends` | Student | Mastery trend time series |

**Query parameters:**
- `range` (`7d`, `30d`, `90d`, `all`)
- `granularity` (`daily`, `weekly`)
- `systems` (comma-separated system names, default all)

**Response shape:**
```typescript
{
  overall: Array<{ date: string; mastery: number }>;
  bySystem: Record<string, Array<{ date: string; mastery: number }>>;
  milestones: Array<{ date: string; label: string }>;
}
```

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-ST-2 (student dashboard exists)
- **Cross-epic:** None

## Testing Requirements
- **API Tests (70%):** Trend service returns correct time series for given date range. Daily vs weekly granularity produces different aggregation. Per-system breakdown contains only requested systems. Empty response for students with no mastery history. Date range filtering excludes out-of-range data.
- **E2E (0%):** No critical journey for trend charts.

## Implementation Notes
- Data aggregation happens server-side; API returns time-series arrays. No client-side heavy computation.
- Use Recharts `<LineChart>` with `<Line>` per system series. Colors from design tokens.
- Charting SVG props (`stroke`, `fill`) use hex with `/* token: --color-name */` comment per architecture rules.
- Consider `React.memo` or `useMemo` for expensive chart re-renders on data changes.
- Chart color palette: assign each USMLE system a consistent color from the design token palette.
- Milestone markers are optional stretch goal; implement as vertical reference lines on the chart.
