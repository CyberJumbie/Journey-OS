# PSUPP-012: Per-Course Analytics (/analytics/course/:courseId)
**Group:** Analytics Hub
**Component:** `CourseAnalytics` | `pages/analytics/CourseAnalytics.tsx`
**Priority:** P1
**Depends:** P3-013 (course detail), P3-007 (heatmap data)
**Specialist:** @frontend-specialist

**As a** faculty member
**I want** a dedicated per-course analytics page showing generation trends, coverage, and quality over time
**So that** I can track whether my question generation efforts are improving curriculum coverage

## Acceptance Criteria
- Route: `/analytics/course/:courseId`
- Linked from: course detail dashboard, analytics home
- Endpoint: `GET /api/v1/analytics/courses/:courseId` — returns `CourseAnalyticsData` (already defined in 06_SCREEN_BACKEND_MAP.md)
- Charts (all Recharts):
  1. **Weekly Generation Trend** — BarChart: questions generated per week (last 12 weeks)
  2. **Difficulty Distribution** — PieChart: Easy/Medium/Hard counts
  3. **Generation Activity** — AreaChart: daily generation count (last 30 days)
  4. **Topic Frequency** — HorizontalBarChart: top 10 topics by question count
  5. **USMLE Coverage Bars** — per system: covered SubConcepts / total SubConcepts
- Summary KPIs row: Total Questions, Approved, Approval Rate, Avg Critic Score
- Date range filter: last 7d / 30d / 90d / all time
- Export: "Download as CSV" → streams course analytics data

## Files to Create
- `frontend/src/app/(faculty)/analytics/course/[courseId]/page.tsx`
- `frontend/src/hooks/useCourseAnalytics.ts`

## Smoke Test
```bash
curl "localhost:3001/api/v1/analytics/courses/medi-531?range=30d" \
  -H "Authorization: Bearer $JWT" | jq '{weekly_data: (.weekly_data | length), blueprint_coverage: (.blueprint_coverage | length)}'
# Expected: weekly_data array present, blueprint_coverage has 16 systems
```
