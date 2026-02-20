# STORY-IA-8: Course Oversight Dashboard

**Epic:** E-09 (Course SLO Linking & Scheduling)
**Feature:** F-04 (Course Management)
**Sprint:** 4
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-09-3

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need an oversight dashboard across all courses so that I can monitor curriculum status, SLO coverage, and course health at a glance.

## Acceptance Criteria
- [ ] Dashboard page showing all courses for the institution in summary cards
- [ ] Summary metrics per course: SLO count, FULFILLS coverage %, content uploads count, processing status
- [ ] Filter by: program, academic year, status
- [ ] Sort by: coverage %, course name, last updated
- [ ] Drill-down: click course card to navigate to course detail
- [ ] Institution-scoped: only courses from admin's institution visible
- [ ] Loading skeleton while data fetches
- [ ] Empty state when no courses match filters

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/courses/CourseDashboard.tsx` | `apps/web/src/app/(protected)/admin/courses/page.tsx` | Convert to Next.js App Router. Replace inline styles with Tailwind + design tokens. Extract CourseSummaryCard into molecule. Focus on admin perspective (oversight, not editing). Use `@web/*` path alias. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/course/course-overview.types.ts` |
| Service | apps/server | `src/services/course/course-overview.service.ts` |
| Controller | apps/server | `src/controllers/course/course-overview.controller.ts` |
| Routes | apps/server | `src/routes/admin/course-overview.routes.ts` |
| Organisms | apps/web | `src/components/admin/course-overview.tsx` |
| Molecules | apps/web | `src/components/admin/course-summary-card.tsx` |
| Page | apps/web | `src/app/(protected)/admin/courses/page.tsx` |
| Tests | apps/server | `src/controllers/course/__tests__/course-overview.controller.test.ts` |

## Database Schema

No new tables. Aggregates from existing tables via a single query:

```sql
SELECT c.id, c.title, c.status, c.updated_at,
       p.name AS program_name,
       COUNT(DISTINCT slo.id) AS slo_count,
       COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'approved') AS fulfilled_count,
       COUNT(DISTINCT m.id) AS upload_count,
       CASE WHEN COUNT(DISTINCT slo.id) > 0
            THEN COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'approved') * 100.0 / COUNT(DISTINCT slo.id)
            ELSE 0 END AS coverage_pct
FROM courses c
JOIN sections sec ON sec.course_id = c.id
JOIN programs p ON p.id = ... -- join through sections or direct FK
LEFT JOIN slos slo ON slo.course_id = c.id
LEFT JOIN fulfills f ON f.slo_id = slo.id
LEFT JOIN materials m ON m.session_id IN (SELECT id FROM sessions WHERE section_id = sec.id)
WHERE p.institution_id = $institution_id
GROUP BY c.id, p.name;
```

**Note:** Verify actual FK paths via `list_tables` before writing DDL -- `courses` may not have direct `institution_id`.

**No Neo4j schema changes.**

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/courses/overview` | InstitutionalAdmin | Aggregated course metrics for institution |

## Dependencies
- **Blocked by:** STORY-F-1 (courses must exist)
- **Blocks:** None
- **Cross-lane:** STORY-U-6 (RBAC: institutional_admin role required)

## Testing Requirements
### API Tests (8-10)
- Overview fetch: returns all courses for institution with metrics
- Filtering: by program, academic year, status
- Sorting: by coverage %, course name, last updated
- Empty state: returns empty array when no courses exist
- Auth enforcement: 403 for non-admin roles
- Institution scoping: admin from institution A cannot see institution B courses
- Metrics accuracy: SLO count, coverage %, upload count match actual data
- Performance: single aggregation query, not N+1 per-course fetches

## Implementation Notes
- Dashboard aggregates data from courses, SLOs, FULFILLS relationships, and content records.
- Coverage % = (SLOs with approved FULFILLS / total SLOs) * 100.
- CourseSummaryCard is a Molecule with a mini progress bar for coverage.
- Use design tokens for card layout, spacing, progress bar colors.
- Performance: use a single aggregation query rather than N+1 per-course fetches. Consider `Promise.all` for independent sub-queries.
- Institution scoping: courses have no direct `institution_id` -- must join through `programs.institution_id`. Verify FK path via `list_tables`.
- Use Supabase `!inner` join syntax for filtering through intermediate tables.
