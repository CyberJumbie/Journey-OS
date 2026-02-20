# STORY-IA-32: Personal Analytics Page

**Epic:** E-33 (Course & Teaching Analytics)
**Feature:** F-15
**Sprint:** 18
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-33-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a personal analytics page showing generation velocity, quality trends, and activity metrics so that faculty can track their productivity and improvement over time.

## Acceptance Criteria
- [ ] Generation velocity: items generated per day/week with trend line
- [ ] Quality trend: average composite score over time with rolling average
- [ ] Approval rate: percentage of items approved vs. rejected vs. revised
- [ ] Review turnaround: average time from generation to final review decision
- [ ] Top performing categories: which Bloom levels and question types score highest
- [ ] Comparison: personal metrics vs. institution average (anonymized)
- [ ] Activity heatmap: GitHub-style contribution grid showing daily generation activity
- [ ] Time period filter: This Week, This Month, This Semester, All Time
- [ ] Stats cards: Questions Generated, Questions Approved, Time Saved, Repository Contributions
- [ ] Filterable by course and date range
- [ ] 8-12 API tests: personal metrics, comparison queries, date filtering, activity data

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/analytics/PersonalDashboard.tsx` | `apps/web/src/app/(protected)/analytics/personal/page.tsx` | Replace `DashboardLayout` with route group layout. Convert `export default` (required for page.tsx). Replace static mock data with API calls. Add recharts-based velocity chart, quality trend chart, and activity heatmap components. Replace hardcoded `text-3xl font-bold` with design token typography. Use shadcn/ui Card for stats cards. Add achievements section from prototype. Remove React Router navigation. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/analytics/personal-analytics.types.ts` |
| Service | apps/server | `src/services/analytics/personal-analytics.service.ts` |
| Controller | apps/server | `src/controllers/analytics/personal-analytics.controller.ts` |
| Route | apps/server | `src/routes/analytics/personal-analytics.routes.ts` |
| View - Page | apps/web | `src/app/(protected)/analytics/personal/page.tsx` |
| View - Velocity | apps/web | `src/components/organisms/analytics/velocity-chart.tsx` |
| View - Quality | apps/web | `src/components/organisms/analytics/quality-trend-chart.tsx` |
| View - Heatmap | apps/web | `src/components/organisms/analytics/activity-heatmap.tsx` |
| View - Stats | apps/web | `src/components/molecules/personal-stats-cards.tsx` |
| Hook | apps/web | `src/hooks/use-personal-analytics.ts` |
| Tests | apps/server | `src/controllers/analytics/__tests__/personal-analytics.test.ts` |

## Database Schema
No new tables. Aggregation queries across existing `questions`, `review_actions`, `activity_events` tables.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/analytics/personal` | authenticated | Get personal analytics data |
| GET | `/api/v1/analytics/personal/activity` | authenticated | Get activity heatmap data |

Query params: `period` (week/month/semester/all), `courseId` (optional)

## Dependencies
- **Blocked by:** S-IA-33-1 (analytics service infrastructure exists)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (10)
1. GET /analytics/personal returns velocity, quality, approval metrics
2. Personal analytics scoped to authenticated user's own data
3. Date filtering by period works correctly
4. Course filtering scopes metrics to specific course
5. Institution comparison returns anonymized averages
6. Activity heatmap returns 52 weeks x 7 days data
7. Review turnaround computed correctly from timestamps
8. Top performing categories sorted by score
9. Empty data returns zero metrics (not errors)
10. Unauthorized user gets 403

## Implementation Notes
- Personal analytics scoped by `user_id` from auth context -- faculty can only see own data
- Institution comparison uses anonymized aggregates -- no individual faculty data exposed
- Activity heatmap: 52 weeks x 7 days grid, color intensity = generation count
- Review turnaround computed from `question.created_at` to `review_action.created_at` delta
- All charts use `recharts` -- use hex values with `/* token: --color-name */` comments for SVG props
- Prototype shows achievements/badges (Trophy, CheckCircle, FileText) -- include as optional gamification
- Stats cards mirror prototype layout: Generated, Approved, Time Saved, Contributions
