# STORY-SA-2: Global User Directory

**Epic:** E-07 (Cross-Institution User Management)
**Feature:** F-03
**Sprint:** 3
**Lane:** superadmin (P1)
**Size:** M
**Old ID:** S-SA-07-1

---

## User Story
As a **SuperAdmin**, I need a global user directory that spans all institutions so that I can search, filter, and manage any user on the platform regardless of their institution.

## Acceptance Criteria
- [ ] Global user directory page at `/admin/users` (SuperAdmin only)
- [ ] Table columns: name (with CD badge if course director), email, role, institution, status (active/inactive dot indicator), last login
- [ ] Sortable by: name, email, role, status, last login
- [ ] Filterable by: role (all, superadmin, institutional_admin, faculty, advisor, student), status (all, active, inactive)
- [ ] Cross-institution search by name or email with debounced input
- [ ] Pagination: 25 items per page with Previous/Next navigation and page count display
- [ ] Click-through to user detail (future story)
- [ ] RBAC: SuperAdmin only (403 for all other roles)
- [ ] Performance: efficient query with indexes on (email, institution_id, role)
- [ ] Empty state with "No users found" message and "Reset Filters" button
- [ ] Loading skeleton state (5 placeholder rows with pulse animation)
- [ ] Error state with retry button
- [ ] Filter bar in white card above data table
- [ ] Total user count displayed above filter bar and in filter bar
- [ ] 10 API tests: list endpoint, cross-institution query, pagination, filtering, sorting, search, auth enforcement, role restriction, empty results, institution filter

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md`.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/admin/AdminUserDirectory.tsx` | `apps/web/src/app/(protected)/admin/users/page.tsx` | Extract inline sidebar into shared admin layout (from STORY-SA-7). Replace inline styles with Tailwind + design tokens. Extract data table into organism. Replace `useNavigate`/`useLocation` with Next.js routing. Convert mock data to API fetch via custom hook. Extract role badge colors to design token mapping. Replace manual pagination with cursor-based. Use `@tanstack/react-table` for sorting/filtering. |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/user/global-user.types.ts` (exists) |
| Repository | apps/server | `src/repositories/global-user.repository.ts` |
| Service | apps/server | `src/services/user/global-user.service.ts` |
| Controller | apps/server | `src/controllers/user/global-user.controller.ts` |
| Routes | apps/server | `src/routes/admin/user-management.routes.ts` |
| Organisms | apps/web | `src/components/admin/global-user-table.tsx` |
| Molecules | apps/web | `src/components/admin/user-role-badge.tsx`, `src/components/admin/user-status-indicator.tsx` |
| Page | apps/web | `src/app/(protected)/admin/users/page.tsx` |
| Hook | apps/web | `src/hooks/use-global-user-list.ts` |
| Tests | apps/server | `src/controllers/user/__tests__/global-user.controller.test.ts` |

## Database Schema

### Supabase — queries across existing tables
- `profiles` table: id, full_name, email, role, is_active, is_course_director, last_login_at, institution_id
- JOIN `institutions` table: id, name (for institution column display)
- Indexes needed: `idx_profiles_email`, `idx_profiles_institution_role` (institution_id, role)

### Neo4j — read-only queries
```
(Person)-[:BELONGS_TO]->(Institution)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/users` | SuperAdmin | List users with filtering, sorting, pagination |
| GET | `/api/v1/admin/users/:id` | SuperAdmin | Get single user detail (future) |

### Query Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 25 | Items per page (max 100) |
| `sort_by` | string | "name" | Sort column |
| `sort_dir` | string | "asc" | Sort direction |
| `search` | string | - | Search by name or email |
| `role` | string | - | Filter by role |
| `is_active` | boolean | - | Filter by active status |

## Dependencies
- **Blocked by:** S-U-01-3 (RBAC middleware required)
- **Blocks:** STORY-SA-4 (User Reassignment)
- **Cross-lane:** STORY-IA-1 (reuses user table patterns from institution-scoped user management)

## Testing Requirements
### API Tests (10)
1. List returns paginated users with correct fields
2. Cross-institution search returns users from multiple institutions
3. Pagination returns correct page count and page data
4. Role filter returns only users of specified role
5. Status filter returns only active or inactive users
6. Sort by name ascending/descending works correctly
7. Non-SuperAdmin receives 403 Forbidden
8. Unauthenticated request receives 401 Unauthorized
9. Empty search results return empty array with correct pagination metadata
10. Institution filter returns only users from specified institution

## Implementation Notes
- Unlike STORY-IA-1 which scopes to one institution, this directory has NO institution_id scoping by default.
- The prototype includes a full sidebar -- extract this into the shared admin layout created in STORY-SA-7.
- The prototype's `AdminUserDirectory.tsx` embeds sidebar navigation. In production, use Next.js App Router layout at `apps/web/src/app/(protected)/admin/layout.tsx`.
- Role badge colors: superadmin=purple, institutional_admin=blue, faculty=green, advisor=orange, student=gray. Map to design tokens.
- CD (Course Director) badge shown inline with name for faculty users with `is_course_director: true`.
- Consider database indexing on `(email, institution_id, role)` for performant cross-institution queries.
- Express `req.query` values need casting -- `role` should be cast to the role union type, not `as string`.
- Supabase query: apply all `.eq()` filters BEFORE `.order()` and `.range()`.
