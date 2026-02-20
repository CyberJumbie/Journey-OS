# STORY-F-12: Course Cards

**Epic:** E-32 (Faculty Dashboard)
**Feature:** F-15
**Sprint:** 8
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-32-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need course overview cards with quick action buttons so that I can see the status of each course I teach and jump directly to generation, review, or coverage analysis.

## Acceptance Criteria
- [ ] CourseCard molecule: course title, code, term, question count, coverage percentage, status badge
- [ ] Quick action buttons: Generate (-> workbench), Review (-> review queue), Coverage (-> heatmap)
- [ ] Course cards grid: 3 columns on desktop, 2 on tablet, 1 on mobile
- [ ] Cards sorted by: most recent activity (default), alphabetical, coverage (ascending for gap focus)
- [ ] Visual coverage indicator: mini progress bar on each card
- [ ] Course status badge: Active (green), Draft (yellow), Archived (gray)
- [ ] Empty state: "No courses assigned" with link to contact admin
- [ ] Data fetched from Supabase RPC with aggregate counts
- [ ] 8-10 API tests: rendering, card content, quick actions, sorting, responsive layout, empty state
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. Must match canonical `journey-os-dashboard.jsx`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/dashboard/FacultyDashboard.tsx` (course cards section) | `apps/web/src/components/dashboard/course-cards-grid.tsx` | Extract course cards section into standalone organism. Replace hardcoded mock data with API-driven data. |
| `.context/source/05-reference/app/app/pages/faculty/FacultyDashboard.tsx` | (reference for course card layout) | Cross-reference for card layout and data expectations. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/dashboard/course-card.types.ts` |
| Atoms | packages/ui | `src/atoms/status-badge.tsx`, `src/atoms/mini-progress-bar.tsx` |
| Molecules | packages/ui | `src/molecules/course-card.tsx` |
| Organisms | apps/web | `src/components/dashboard/course-cards-grid.tsx` |
| Service | apps/server | `src/services/dashboard/faculty-course.service.ts` |
| Hooks | apps/web | `src/hooks/use-faculty-courses.ts` |
| Tests | apps/web | `src/components/dashboard/__tests__/course-cards-grid.test.tsx` |

## Database Schema
No new tables. Data aggregated from existing `courses`, `sections`, `sessions` tables via Supabase RPC.

### Supabase RPC -- `get_faculty_course_cards(faculty_user_id)`
Returns per course: `{ id, title, code, term, question_count, coverage_pct, status, last_activity_at }`

See `docs/solutions/dashboard-rpc-aggregate-pattern.md`.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/dashboard/courses` | Faculty+ | Get course cards with aggregate data |

Query params: `sort` (activity, alphabetical, coverage).

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-1 (course model), STORY-U-3 (auth)
- **Cross-lane:** STORY-F-1 (Sprint 4 course model)

## Testing Requirements
### API Tests (8-10)
1. Faculty course service returns courses for user
2. Course Director sees all program courses
3. Aggregate data includes question_count and coverage_pct
4. Sort by activity returns most recent first
5. Sort by coverage ascending returns lowest first
6. CourseCard renders title, code, status badge
7. Mini progress bar shows coverage percentage
8. Quick action buttons link to correct routes
9. Empty state shown when no courses assigned
10. Responsive grid: 3 columns desktop, 2 tablet, 1 mobile

## Implementation Notes
- Data fetched from `/api/v1/dashboard/courses` -- returns courses where user is faculty or course director.
- Coverage percentage sourced from latest coverage snapshot for each course.
- Quick action routes: Generate -> `/workbench?course=<id>&mode=generate`, Review -> `/review?course=<id>`, Coverage -> `/coverage?course=<id>`.
- Mini progress bar reuses the same color scale as the heatmap: red/yellow/green.
- Sort control: dropdown above the grid, persisted in localStorage.
- Course Director sees all courses in their program; faculty sees only assigned courses.
- Supabase PostgREST `.in()` only works on direct table columns. To filter+count through intermediate tables, query the intermediate table directly. See `docs/solutions/enriched-view-service-pattern.md`.
- In jsdom component tests with repeated UI elements (card grids), use `getAllBy*` variants.
