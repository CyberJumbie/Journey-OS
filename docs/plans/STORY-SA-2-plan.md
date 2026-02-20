# Implementation Plan: STORY-SA-2 — Global User Directory

## Overview
SuperAdmin-only user directory at `/admin/users` showing all users across all institutions. Paginated table with filtering, sorting, and search. Protected route with RBAC enforcement.

## Implementation Order: Types → Migration → Service → Controller → Routes → Frontend → Tests

---

### Step 1: Types (packages/types)

**Create** `packages/types/src/user/global-user.types.ts`:
- `GlobalUserSortField` — union of sortable column names
- `SortDirection` — `"asc" | "desc"`
- `GlobalUserListQuery` — query params interface (page, limit, sort_by, sort_dir, search, role, institution_id, is_active)
- `GlobalUserListItem` — single user row (joined with institution name)
- `GlobalUserListResponse` — `{ users, meta: { page, limit, total, total_pages } }`

**Create** `packages/types/src/user/index.ts`:
- Re-export all from `global-user.types.ts`

**Edit** `packages/types/src/index.ts`:
- Add `export * from "./user";`

---

### Step 2: Database Migration (Supabase MCP)

**Apply migration** `add_global_user_directory_indexes`:
- `idx_profiles_email` (if not exists)
- `idx_profiles_role`
- `idx_profiles_institution_id`
- `idx_profiles_is_active`
- `idx_profiles_last_login_at`
- `idx_profiles_role_institution` (composite)

Note: These are performance indexes only — no schema changes.

---

### Step 3: GlobalUserService

**Create** `apps/server/src/services/user/global-user.service.ts`:

```
class GlobalUserService {
  #supabaseClient: SupabaseClient

  constructor(supabaseClient)

  async list(query: GlobalUserListQuery): Promise<GlobalUserListResponse>
    - validate & clamp: page >= 1, limit between 1-100 (default 25)
    - validate sort_by against ALLOWED_SORT_FIELDS set
    - build Supabase query:
      - select('id, email, full_name, role, is_course_director, is_active, institution_id, last_login_at, created_at, institutions(name)')
      - apply filters: role, institution_id, is_active (when present)
      - apply search: .or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
      - apply order: .order(sort_by, { ascending: sort_dir === 'asc' })
      - apply pagination: .range(offset, offset + limit - 1)
    - get total count with separate count query (or { count: 'exact', head: true })
    - map results: rename institutions.name → institution_name
    - return { users, meta: { page, limit, total, total_pages: ceil(total/limit) } }
}

const ALLOWED_SORT_FIELDS = new Set<GlobalUserSortField>([
  "full_name", "email", "role", "institution_name", "is_active", "last_login_at", "created_at"
]);
```

**Note:** `institution_name` sort needs special handling — sort on the joined column. May need raw SQL or a view if Supabase client doesn't support sorting on joined fields. Fallback: sort on `institution_id` for now, add a Supabase database view later.

---

### Step 4: GlobalUserController

**Create** `apps/server/src/controllers/user/global-user.controller.ts`:

```
class GlobalUserController {
  #globalUserService: GlobalUserService

  constructor(globalUserService)

  async handleList(req: Request, res: Response): Promise<void>
    - parse query params from req.query (strings → numbers where needed)
    - validate role param with isValidRole() if present
    - call service.list(query)
    - 200 with ApiResponse<GlobalUserListResponse>
    - catch ValidationError → 400
    - catch unknown → 500
}
```

---

### Step 5: Route Registration

**Edit** `apps/server/src/index.ts`:
- Import GlobalUserService, GlobalUserController, createRbacMiddleware
- Register AFTER auth middleware:
  ```
  const rbac = createRbacMiddleware();
  const globalUserService = new GlobalUserService(supabaseClient);
  const globalUserController = new GlobalUserController(globalUserService);

  app.get("/api/v1/admin/users", rbac.require("superadmin"), (req, res) =>
    globalUserController.handleList(req, res)
  );
  ```

---

### Step 6: Frontend

**Create** `apps/web/src/app/(protected)/admin/users/page.tsx`:
- Default export page component
- Renders `<GlobalUserDirectory />`
- Protected layout (requires auth)

**Create** `apps/web/src/components/admin/global-user-directory.tsx`:
- `"use client"` component
- State: query params (page, search, filters, sort)
- Fetch `GET /api/v1/admin/users?...` with query params
- Sub-components (inline, not separate files at MVP):
  - Search input with debounce (300ms)
  - Filter dropdowns (role, institution, status)
  - Data table with sortable column headers
  - Role badges (color-coded)
  - Active/inactive status indicator
  - Pagination controls (prev/next + page numbers)
- Loading: skeleton rows
- Empty: "No users found" with reset filters link
- Error: retry button

---

### Step 7: API Tests

**Create** `apps/server/src/__tests__/global-user.controller.test.ts`:

Mock Supabase client + auth/RBAC middleware for all tests. Test:

Controller tests:
1. Returns paginated user list for SuperAdmin (200)
2. Returns users with institution_name from joined query
3. Returns correct pagination meta
4. Rejects unauthenticated request (401)
5. Rejects non-SuperAdmin (faculty → 403)
6. Rejects non-SuperAdmin (institutional_admin → 403)
7. Filters by role query parameter
8. Filters by institution_id
9. Filters by is_active
10. Searches by name (case-insensitive)
11. Searches by email (case-insensitive)
12. Sorts by valid field + direction
13. Rejects invalid sort_by field (400)
14. Caps limit at 100
15. Returns empty list when no users match

Service tests:
16. Calculates total_pages correctly

---

## Key Design Decisions

1. **Offset-based pagination** (not cursor-based): SuperAdmin directory with < 10K users doesn't need cursor efficiency. Simpler to implement and allows jumping to specific pages.
2. **No user detail page yet**: Clicking a row doesn't navigate anywhere. SA-4 (User Reassignment) will add the detail panel.
3. **Supabase join for institution_name**: Using `.select('*, institutions(name)')` for the join. If sorting on institution_name proves tricky, we'll sort client-side or create a database view.
4. **Count query**: Use Supabase's `{ count: 'exact', head: true }` option for efficient total count without fetching all rows.

## Risk Mitigation

- **Performance with many users**: Indexes added in migration. At MVP scale (< 1000 users) this is more than sufficient.
- **Sorting on joined column**: If Supabase client doesn't support `.order('institutions.name')`, fall back to sorting `institution_id` server-side and handle `institution_name` sort client-side.
- **RLS bypass for SuperAdmin**: Existing RLS policies with SuperAdmin bypass should work. Test this explicitly.

## Estimated Files Changed
- 2 new type files, 1 edited
- 1 migration (Supabase MCP — indexes only)
- 1 new service file
- 1 new controller file
- 1 edited server index
- 2 new frontend files
- 1 new test file
- **Total: 7 new, 2 edited**
