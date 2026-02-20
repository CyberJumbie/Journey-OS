# STORY-IA-33: Cross-Course Comparison

**Epic:** E-33 (Course & Teaching Analytics)
**Feature:** F-15
**Sprint:** 18
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-33-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a cross-course comparison view so that I can identify which courses have strong item banks and which need attention.

## Acceptance Criteria
- [ ] Multi-course comparison table: courses as rows, metrics as columns
- [ ] Metrics: total items, approved count, average quality, SLO coverage %, Bloom diversity
- [ ] Radar chart: overlay up to 5 courses on multi-axis chart for visual comparison
- [ ] Ranking: sortable by any metric column
- [ ] Highlight: courses below institutional thresholds flagged with warning indicators
- [ ] Drill-down: click course row to navigate to course analytics detail
- [ ] Export comparison as CSV or PDF
- [ ] Time period selector for temporal scoping
- [ ] 8-12 API tests: multi-course query, ranking, threshold flagging, export

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/analytics/InstitutionalAnalytics.tsx` | `apps/web/src/app/(protected)/analytics/comparison/page.tsx` | Replace `C` color constants and custom font refs with design tokens. Remove `useBreakpoint` hook, `useNavigate`, `useLocation`. Convert `export default` (required for page.tsx). Replace mock department/faculty data with course comparison API. Add radar chart via recharts RadarChart. Add threshold warning indicators. Add CSV/PDF export buttons. Use `@tanstack/react-table` for sortable comparison table. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/analytics/comparison.types.ts` |
| Service | apps/server | `src/services/analytics/course-comparison.service.ts` |
| Controller | apps/server | `src/controllers/analytics/course-comparison.controller.ts` |
| Route | apps/server | `src/routes/analytics/course-comparison.routes.ts` |
| View - Page | apps/web | `src/app/(protected)/analytics/comparison/page.tsx` |
| View - Table | apps/web | `src/components/organisms/analytics/comparison-table.tsx` |
| View - Radar | apps/web | `src/components/organisms/analytics/course-radar-chart.tsx` |
| View - Export | apps/web | `src/components/molecules/comparison-export.tsx` |
| Hook | apps/web | `src/hooks/use-course-comparison.ts` |
| Tests | apps/server | `src/controllers/analytics/__tests__/course-comparison.test.ts` |

## Database Schema
No new tables. Aggregation queries across `courses`, `questions`, `slos`, `review_actions`.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/analytics/comparison` | institutional_admin | Get cross-course comparison metrics |
| GET | `/api/v1/analytics/comparison/export` | institutional_admin | Export comparison data |

Query params: `period`, `format` (csv/pdf)

## Dependencies
- **Blocked by:** S-IA-33-1 (course analytics queries exist to aggregate across)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /analytics/comparison returns metrics for all courses in institution
2. Metrics include total items, approved count, quality, coverage, Bloom diversity
3. Courses sorted by specified metric column
4. Threshold flagging marks courses below configured minimums
5. Radar chart data formatted for recharts RadarChart
6. Comparison scoped to admin's institution
7. CSV export contains all comparison data
8. PDF export generates downloadable file
9. Period filtering scopes metrics temporally
10. Unauthorized user gets 403

## Implementation Notes
- Radar chart axes: Quality, Coverage, Volume, Bloom Diversity, Difficulty Balance
- Bloom diversity: entropy measure of Bloom level distribution (higher = more diverse)
- Institutional thresholds configurable in admin settings (e.g., min coverage 70%, min quality 3.5)
- Comparison limited to courses within admin's institution scope
- PDF export using server-side rendering (e.g., @react-pdf/renderer)
- Recharts RadarChart: use hex with `/* token: --color-name */` comments for stroke/fill SVG props
- Prototype shows department-level metrics with faculty performance -- adapt to course-level comparison
- Use `@tanstack/react-table` for sortable table with column definitions
