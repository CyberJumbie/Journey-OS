# STORY-F-6: Activity Feed Component

**Epic:** E-32 (Faculty Dashboard)
**Feature:** F-15
**Sprint:** 8
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-32-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need an activity feed showing recent generation, review, and approval events so that I can quickly see what has happened across my courses and stay up to date on question development progress.

## Acceptance Criteria
- [ ] ActivityFeed organism renders chronological list of recent events
- [ ] Event types: `question_generated`, `question_reviewed`, `question_approved`, `question_rejected`, `coverage_gap_detected`, `bulk_generation_complete`
- [ ] Each event shows: icon, event description, course name, timestamp (relative: "2h ago"), actor name
- [ ] Events fetched from `/api/v1/activity?user_id=X&limit=20&offset=0`
- [ ] Infinite scroll pagination (load more on scroll to bottom)
- [ ] Filter by event type (multi-select dropdown)
- [ ] Empty state: "No recent activity" with prompt to start generating
- [ ] Real-time updates: new events prepend to feed without page refresh (polling every 30s)
- [ ] 8-10 API tests: rendering, event types, pagination, filtering, empty state, real-time update
- [ ] Named exports only, TypeScript strict, design tokens only

## Reference Screens
> Refactor these prototype files for production. Must match canonical `journey-os-dashboard.jsx`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `.context/source/05-reference/app/app/pages/dashboard/FacultyDashboard.tsx` (activity feed section) | `apps/web/src/components/dashboard/activity-feed.tsx` | Extract activity feed section into standalone organism. Replace inline styles with design tokens. |
| `.context/source/05-reference/app/app/pages/faculty/FacultyDashboard.tsx` | (reference only) | Cross-reference for data shape and layout expectations. |
| `.context/source/05-reference/app/app/components/shared/DashboardComponents.tsx` | Split into atoms/molecules | Extract ActivityEventRow molecule and ActivityIcon atom. |
| `.context/source/05-reference/screens/journey-os-dashboard.jsx` | (canonical visual authority) | Match layout, spacing, and visual treatment from canonical dashboard. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/dashboard/activity.types.ts` |
| Atoms | packages/ui | `src/atoms/activity-icon.tsx`, `src/atoms/relative-time.tsx` |
| Molecules | packages/ui | `src/molecules/activity-event-row.tsx` |
| Organisms | apps/web | `src/components/dashboard/activity-feed.tsx` |
| Service | apps/server | `src/services/activity/activity-feed.service.ts` |
| Repository | apps/server | `src/repositories/activity.repository.ts` |
| Controller | apps/server | `src/controllers/activity/activity.controller.ts` |
| Hooks | apps/web | `src/hooks/use-activity-feed.ts` |
| Tests | apps/web | `src/components/dashboard/__tests__/activity-feed.test.tsx` |
| Tests | apps/server | `src/services/activity/__tests__/activity-feed.test.ts` |

## Database Schema

### Supabase -- `activity_events` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `user_id` | uuid | NOT NULL, FK -> auth.users |
| `institution_id` | uuid | NOT NULL, FK -> institutions |
| `event_type` | varchar(50) | NOT NULL |
| `entity_id` | uuid | NULL |
| `entity_type` | varchar(50) | NULL |
| `metadata` | jsonb | NULL |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |

INDEX on (user_id, created_at DESC).

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/activity` | Faculty+ | List activity events (paginated, filterable) |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-U-3 (auth/RBAC)
- **Cross-lane:** None

## Testing Requirements
### API Tests (8-10)
1. GET activity returns paginated events ordered by created_at DESC
2. Pagination with offset and limit works correctly
3. Filter by event_type returns only matching events
4. Multiple event type filter (OR logic)
5. Empty result returns empty array, not error
6. ActivityFeed renders event list from mock data
7. ActivityEventRow displays icon, description, course, timestamp
8. Relative time displays correctly ("2h ago", "yesterday")
9. Infinite scroll triggers load more
10. Polling interval fetches new events

## Implementation Notes
- Activity events stored in Supabase `activity_events` table.
- Events are written by other services (generation, review, coverage) -- ActivityFeedService is read-only.
- Polling (30s) is acceptable for MVP; Socket.io real-time upgrade planned for E-35.
- Infinite scroll: use `IntersectionObserver` on a sentinel element at bottom of feed.
- Relative time formatting: use `date-fns/formatDistanceToNow`.
- Activity icons use Lucide icons from shadcn/ui icon set, mapped by event_type.
- Split DashboardComponents.tsx into atomic components per Atomic Design pattern.
- When testing components that import from `@journey-os/ui`, mock the entire package with `vi.mock("@journey-os/ui", ...)`.
- In jsdom tests, use `afterEach(() => cleanup())` since auto-cleanup may not run with `globals: false`.
