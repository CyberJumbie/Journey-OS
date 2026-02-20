# STORY-SA-7: Institution List Dashboard

**Epic:** E-05 (Institution Monitoring)
**Feature:** F-02
**Sprint:** 9
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-05-1

---

## User Story
As a **SuperAdmin**, I need a filterable institution list dashboard with status indicators so that I can monitor all institutions on the platform and quickly identify those needing attention.

## Acceptance Criteria
- [ ] Institution list page at `/admin/institutions` (SuperAdmin only)
- [ ] Data table columns: checkbox (bulk select), name (with Building2 icon), status badge, user count, course count, last activity (relative time), created date, actions (more menu)
- [ ] Status indicators with icon + color: Active (green, CheckCircle2), Pending (yellow, Clock), Suspended (red, XCircle)
- [ ] Stat cards above table: Total Institutions, Active count, Pending count, Total Users (aggregated)
- [ ] Filters: status dropdown (all, active, pending, suspended), search by name with debounce (300ms)
- [ ] Sortable by: name, status, users, courses, last_activity, created
- [ ] Pagination: server-side, 20 per page with Previous/Next navigation
- [ ] Row click navigates to institution detail view (STORY-SA-9) at `/admin/institutions/[id]`
- [ ] Bulk select with checkbox: shows selected count and Export button
- [ ] Loading skeleton state, error state with retry, empty state with Building2 icon
- [ ] Admin layout with sidebar (AdminSidebar nav: Dashboard, Applications, Institutions, Users, Settings)
- [ ] Sidebar: collapsible on desktop (hover expand), fixed on tablet/mobile with overlay
- [ ] RBAC: SuperAdmin only
- [ ] 8-10 API tests

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/InstitutionListDashboard.tsx` | `apps/web/src/app/(protected)/admin/institutions/page.tsx` | Replace inline styles with Tailwind + design tokens. Extract data table into reusable organism. Replace mock data with API fetch. Convert to Next.js App Router. Use `@tanstack/react-table` for sort/filter/select. |
| `components/layout/AdminLayout.tsx` | `apps/web/src/app/(protected)/admin/layout.tsx` | Convert to Next.js App Router layout. Wrap admin route group. Use design tokens for colors. Named export not needed (layout.tsx requires default export). |
| `components/layout/AdminSidebar.tsx` | `apps/web/src/components/admin/admin-sidebar.tsx` | Convert from React Router `Link` to Next.js `Link`. Replace `useLocation` with `usePathname`. Add SuperAdmin nav items (Dashboard, Applications, Institutions, Users, Settings). Make collapsible with hover-expand on desktop. Extract as named export organism. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/institution-monitoring.types.ts` (exists) |
| Service | apps/server | `src/services/admin/institution-monitoring.service.ts` |
| Controller | apps/server | `src/controllers/admin/institution.controller.ts` |
| Routes | apps/server | `src/routes/admin/institution.routes.ts` |
| Layout | apps/web | `src/app/(protected)/admin/layout.tsx` |
| Organisms | apps/web | `src/components/admin/admin-sidebar.tsx`, `src/components/admin/institution-list-table.tsx`, `src/components/admin/institution-stat-cards.tsx` |
| Molecules | apps/web | `src/components/admin/institution-status-badge.tsx` |
| Page | apps/web | `src/app/(protected)/admin/institutions/page.tsx` |
| Hook | apps/web | `src/hooks/use-institution-list.ts` |
| Tests | apps/server | `src/controllers/admin/__tests__/institution-monitoring.test.ts` |
| Tests | apps/web | `src/components/admin/__tests__/institution-list-table.test.tsx` |

## Database Schema

### Supabase -- queries against `institutions` table (created in STORY-SA-5)
- All columns from STORY-SA-5 schema
- Aggregation subqueries:
  - `user_count`: `SELECT COUNT(*) FROM profiles WHERE institution_id = institutions.id`
  - `course_count`: `SELECT COUNT(*) FROM courses c JOIN programs p ON c.program_id = p.id WHERE p.institution_id = institutions.id`
  - `last_activity`: most recent `activity_events.created_at` for that institution (or profiles.last_login_at)
- Index needed: `idx_institutions_status` on status column

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/institutions` | SuperAdmin | List institutions with aggregates |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | string | - | Filter by status |
| `search` | string | - | Search by institution name |
| `sort_by` | string | "name" | Sort column |
| `sort_dir` | string | "asc" | Sort direction |

### Response Shape
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "status": "active|pending|suspended",
      "user_count": 342,
      "course_count": 28,
      "last_activity": "ISO8601|null",
      "created_at": "ISO8601"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_pages": 5,
    "total_count": 96
  }
}
```

## Dependencies
- **Blocked by:** STORY-SA-5 (institutions must exist in the system)
- **Blocks:** STORY-SA-8 (Institution Suspend/Reactivate), STORY-SA-9 (Institution Detail View)
- **Cross-lane:** STORY-SA-5 (institution lifecycle from Sprint 4)

## Testing Requirements
### API Tests (10)
1. List returns paginated institutions with aggregated counts
2. Status filter returns only matching institutions
3. Search by name returns matching results (case-insensitive)
4. Sort by user_count descending works correctly
5. Sort by created_at ascending works correctly
6. Pagination returns correct total_pages and total_count
7. Non-SuperAdmin receives 403 Forbidden
8. Empty search results return empty array with pagination
9. Aggregated user_count matches actual profiles count
10. Aggregated course_count matches actual courses via programs join

### Component Tests (3)
1. Status badge renders correct color and icon for each status
2. Table renders institution rows with correct columns
3. Empty state renders when no institutions match filter

## Implementation Notes
- The prototype's `InstitutionListDashboard.tsx` has a complete sidebar embedded inline. This must be extracted into a shared admin layout.
- The admin layout should be at `apps/web/src/app/(protected)/admin/layout.tsx` (default export required for Next.js).
- The sidebar organism at `src/components/admin/admin-sidebar.tsx` is a named export.
- The prototype sidebar nav items define the SuperAdmin navigation: Dashboard, Applications, Institutions, Users, Settings. This is different from the institutional_admin sidebar.
- Use `@tanstack/react-table` with shadcn/ui `DataTable` pattern for the table.
- The relative time formatting (`3m ago`, `2h ago`, `5d ago`) should be a shared utility function.
- User count and course count are aggregated -- consider using a Supabase view or RPC for efficient aggregation rather than N+1 queries.
- The bulk select + Export feature is UI-only for now (export implementation is future scope).
- Status badge colors must use design tokens, not hardcoded hex. Map: active -> `--color-success`, pending -> `--color-warning`, suspended -> `--color-danger`.
- When building Supabase queries with conditional filters, apply all `.eq()` filters BEFORE `.order()` and `.range()`.
