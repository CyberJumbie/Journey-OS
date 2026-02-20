# STORY-IA-25: Institution Overview Table

**Epic:** E-36 (Admin Dashboard & KPIs)
**Feature:** F-17
**Sprint:** 9
**Lane:** institutional_admin (P2)
**Size:** M
**Old ID:** S-IA-36-2

---

## User Story
As an **Institutional Admin (Dr. Kenji Takahashi)**, I need an institution overview table showing status, user counts, and activity metrics so that I can monitor departmental and program health within my institution.

## Acceptance Criteria
- [ ] InstitutionOverviewTable: programs/departments within the institution as rows
- [ ] Columns: program name, status, faculty count, student count, course count, questions generated, last activity
- [ ] Sortable by any column, searchable by program name
- [ ] Row click expands inline detail: list of courses in that program with individual stats
- [ ] Summary row at bottom: institution totals
- [ ] Status indicators consistent with platform-wide design (Active/Draft/Archived)
- [ ] Export table as CSV
- [ ] Data fetched from `GET /api/admin/institution/overview`
- [ ] 8-10 API tests: table rendering, sorting, search, expand/collapse, summary totals, CSV export

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/AdminDashboard.tsx` (overview section) | `apps/web/src/components/organisms/institution-overview-table/institution-overview-table.tsx` | Extract the institution overview section from AdminDashboard. Replace inline styles with design tokens. Replace `C` color constants and `sans`/`serif`/`mono` font refs with Tailwind design token classes. Use `@tanstack/react-table` for sortable columns. Remove `useBreakpoint` hook (use Tailwind responsive classes). Remove React Router navigation. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/admin/institution-overview.types.ts` |
| Service | apps/server | `src/services/admin/admin-dashboard.service.ts` (update) |
| Controller | apps/server | `src/controllers/admin/dashboard.controller.ts` (update) |
| View - Organism | apps/web | `src/components/organisms/institution-overview-table/institution-overview-table.tsx` |
| View - Molecule | apps/web | `src/components/molecules/program-detail-row.tsx` |
| Utils | apps/web | `src/utils/csv-export.ts` |
| Hook | apps/web | `src/hooks/use-institution-overview.ts` |
| Tests | apps/server | `src/controllers/admin/__tests__/institution-overview.test.ts` |
| Tests | apps/web | `src/components/organisms/institution-overview-table/__tests__/institution-overview-table.test.tsx` |

## Database Schema
No new tables. Aggregation queries across existing `programs`, `courses`, `profiles`, `questions` tables.

### Aggregation Query Pattern
```sql
SELECT p.id, p.name, p.status,
  COUNT(DISTINCT CASE WHEN pr.role = 'faculty' THEN pr.id END) AS faculty_count,
  COUNT(DISTINCT CASE WHEN pr.role = 'student' THEN pr.id END) AS student_count,
  COUNT(DISTINCT c.id) AS course_count
FROM programs p
LEFT JOIN courses c ON c.program_id = p.id
LEFT JOIN profiles pr ON pr.program_id = p.id
WHERE p.institution_id = $institution_id
GROUP BY p.id
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/institution/overview` | institutional_admin | Get institution overview with program metrics |

## Dependencies
- **Blocked by:** S-IA-36-1 (admin dashboard page)
- **Blocks:** None
- **Cross-epic:** None

## Testing Requirements
### API Tests (8)
1. GET /admin/institution/overview returns programs with correct counts
2. Programs scoped to authenticated admin's institution
3. Summary totals match sum of individual program metrics
4. Search filter by program name works
5. Sortable by each column
6. Expandable row returns courses within program
7. CSV export contains all visible data
8. Unauthorized user gets 403

## Implementation Notes
- Table uses shadcn/ui `DataTable` with `@tanstack/react-table` -- consistent with S-SA-05-1
- Expandable rows: use `react-table` row expansion API, render `ProgramDetailRow` inline
- CSV export: generate on client side from current table data (including filters/sort applied)
- Scoped to current user's institution via auth context -- no cross-institution data exposure
- Last activity: most recent `activity_events.created_at` per program
- Verify actual table/column names via `list_tables` before writing queries
