# STORY-IA-7: Weekly Schedule View

**Epic:** E-09 (Course SLO Linking & Scheduling)
**Feature:** F-04 (Course Management)
**Sprint:** 4
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-09-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need a weekly schedule view for courses so that I can see session timing and material slots organized by week.

## Acceptance Criteria
- [ ] Weekly calendar component showing sessions for a selected course
- [ ] Week selector: navigate between weeks of the academic term
- [ ] Session cards display: title, time, section, assigned materials count
- [ ] Material slot indicators showing upload status (empty, pending, processed)
- [ ] Responsive layout: works on desktop and tablet viewports
- [ ] Loading skeleton while schedule data fetches
- [ ] Empty state for weeks with no sessions

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/WeekView.tsx` | `apps/web/src/app/(protected)/courses/[id]/schedule/page.tsx` | Convert to Next.js App Router with dynamic route param. Replace inline styles with Tailwind + design tokens. Extract WeeklySchedule organism, SessionCard molecule, WeekSelector molecule. Use `@web/*` path alias. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/course/schedule.types.ts` |
| Service | apps/server | `src/services/course/schedule.service.ts` |
| Controller | apps/server | `src/controllers/course/schedule.controller.ts` |
| Routes | apps/server | `src/routes/course/schedule.routes.ts` |
| Organisms | apps/web | `src/components/course/weekly-schedule.tsx` |
| Molecules | apps/web | `src/components/course/session-card.tsx`, `src/components/course/week-selector.tsx` |
| Page | apps/web | `src/app/(protected)/courses/[id]/schedule/page.tsx` |
| Tests | apps/server | `src/controllers/course/__tests__/schedule.controller.test.ts` |

## Database Schema

No new tables. Queries existing `sessions` and `materials` tables.

**Query pattern:** Fetch sessions for a course filtered by week_number, with material counts via join.

```sql
SELECT s.id, s.title, s.start_time, s.end_time, s.week_number, s.day_of_week,
       sec.title AS section_title,
       COUNT(m.id) AS material_count,
       COUNT(m.id) FILTER (WHERE m.status = 'processed') AS processed_count
FROM sessions s
JOIN sections sec ON s.section_id = sec.id
LEFT JOIN materials m ON m.session_id = s.id
WHERE sec.course_id = $course_id AND s.week_number = $week
GROUP BY s.id, sec.title
ORDER BY s.day_of_week, s.start_time;
```

**No Neo4j schema changes.**

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/courses/:id/schedule` | InstitutionalAdmin+ / Faculty | Get sessions for a week (query param: `?week=N`) |

## Dependencies
- **Blocked by:** STORY-F-3 (session model and hierarchy from E-08)
- **Blocks:** None
- **Cross-lane:** Faculty lane also uses this schedule view

## Testing Requirements
### API Tests (8-10)
- Schedule fetch: returns sessions for specified course and week
- Week filtering: different week numbers return different sessions
- Empty week: returns empty array with correct structure
- Material counts: correct total and processed counts per session
- Auth enforcement: 401 for unauthenticated, 403 for unauthorized
- Invalid course_id: returns 404
- Default week: returns first week if no `?week` param
- Session ordering: sorted by day_of_week then start_time

## Implementation Notes
- WeeklySchedule is an Organism containing SessionCard Molecules and WeekSelector Molecule.
- Sessions are grouped by `day_of_week` within the selected week.
- Material slot indicator is a visual badge: grey (empty), yellow (pending), green (processed).
- Use design tokens for calendar grid spacing and colors.
- Week number is derived from `session.week_number` field set during course creation.
- Express `req.params.id` is `string | string[]` -- narrow with `typeof === "string"` before passing to service.
- Use Supabase `!inner` join syntax for sections -> courses filtering.
