# STORY-IA-11: Course Analytics Page

**Epic:** E-33 (Course & Teaching Analytics)
**Feature:** F-15 (Faculty Dashboard & Analytics)
**Sprint:** 18
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-33-1

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a course analytics page showing item statistics and Bloom/USMLE distribution charts so that I can assess the quality and alignment of generated content per course.

## Acceptance Criteria
- [ ] Course selector: dropdown to choose course for analysis
- [ ] KPI cards: total items, approved rate, average quality score, SLO coverage %
- [ ] Bloom distribution chart: bar chart showing question counts per Bloom level
- [ ] USMLE system distribution: bar chart showing question counts per USMLE system
- [ ] Difficulty distribution: pie chart showing easy/medium/hard breakdown
- [ ] Quality trend: line chart of average composite score over time
- [ ] Generation velocity: items generated per week trend line
- [ ] Filterable by date range and question type
- [ ] Course selector shows only courses the admin has access to (RBAC scoped)
- [ ] Date range default: last 30 days, with presets for 7d, 30d, 90d, all-time

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/analytics/Analytics.tsx` | `apps/web/src/app/(protected)/admin/analytics/courses/page.tsx` | Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract chart components into reusable organisms. |
| `pages/analytics/CourseAnalytics.tsx` | `apps/web/src/components/analytics/course-analytics-dashboard.tsx` | Extract KPI cards, Bloom chart, USMLE chart, difficulty pie into separate molecules. Use Recharts for charts with hex + `/* token */` comments for SVG props. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/analytics/course-analytics.types.ts` |
| Service | apps/server | `src/services/analytics/course-analytics.service.ts` |
| Controller | apps/server | `src/controllers/analytics/course-analytics.controller.ts` |
| Routes | apps/server | `src/routes/admin/course-analytics.routes.ts` |
| Organisms | apps/web | `src/components/analytics/course-analytics-dashboard.tsx` |
| Molecules | apps/web | `src/components/analytics/course-kpi-cards.tsx`, `src/components/analytics/bloom-distribution-chart.tsx`, `src/components/analytics/usmle-distribution-chart.tsx`, `src/components/analytics/difficulty-pie-chart.tsx`, `src/components/analytics/quality-trend-chart.tsx` |
| Page | apps/web | `src/app/(protected)/admin/analytics/courses/page.tsx` |
| Tests | apps/server | `src/services/analytics/__tests__/course-analytics.test.ts` |

## Database Schema

No new tables. Aggregates from existing `questions`, `question_tags`, `question_scores` tables.

Consider Supabase materialized views for expensive aggregate queries.

**No Neo4j schema changes.**

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/analytics/courses/:courseId` | InstitutionalAdmin+ | Get analytics for a specific course |
| GET | `/api/v1/admin/analytics/courses/:courseId/trends` | InstitutionalAdmin+ | Get time-series trend data |

## Dependencies
- **Blocked by:** STORY-IA-3 (coverage data exists for SLO coverage % KPI)
- **Blocks:** None
- **Cross-lane:** Faculty lane generates the questions being analyzed

## Testing Requirements
### API Tests (8-12)
- Analytics queries: correct aggregate counts per Bloom level, per USMLE system
- Course scoping: only questions from specified course included
- Date filtering: respects date range parameters
- Aggregate accuracy: approved rate, average quality score, SLO coverage % match
- Auth enforcement: 403 for non-admin roles
- Institution scoping: admin cannot access courses outside their institution
- Empty course: returns zero values with correct chart structure
- Trend data: correct weekly aggregation for generation velocity

## Implementation Notes
- Charts built with Recharts -- consistent with other analytics pages.
- Recharts SVG props (`stroke`, `fill`) cannot use CSS custom properties -- use hex with `/* token: --color-name */` comment.
- Design tokens for chart colors: use a consistent palette across all analytics pages.
- Use `Promise.all` for independent aggregate queries (Bloom distribution, USMLE distribution, etc.).
- Institution scoping: courses have no direct `institution_id` -- join through `programs.institution_id`.
- Consider Supabase materialized views for expensive aggregate queries that run frequently.
- Service uses `readonly #supabaseClient` with constructor DI.
