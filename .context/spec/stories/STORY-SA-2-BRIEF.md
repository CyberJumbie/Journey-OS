# STORY-SA-2 Brief: Global User Directory

## 0. Lane & Priority

```yaml
story_id: STORY-SA-2
old_id: S-SA-07-1
lane: superadmin
lane_priority: 1
within_lane_order: 2
sprint: 3
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-SA-4 — User Reassignment
personas_served: [superadmin]
epic: E-07 (Cross-Institution User Management)
feature: F-03 (User & Role Management)
user_flow: UF-06 (Cross-Institution User Management)
```

## 1. Summary

Build a **global user directory** at `/admin/users` that allows SuperAdmin to view, search, filter, and sort all users across all institutions. Unlike institution-scoped user lists (future IA stories), this directory has no `institution_id` scoping — SuperAdmin sees everyone. The page includes a data table with pagination, filtering by role/institution/status, and cross-institution search by name or email.

Key constraints:
- **SuperAdmin only** — RBAC enforced (403 for all other roles)
- Cursor-based pagination (25 items/page)
- Efficient query: indexed on `(email, institution_id, role)`
- Click-through to user detail (detail page is future scope — just link for now)

## 2. Task Breakdown

1. **Types** — Create `GlobalUserListItem`, `GlobalUserListQuery`, `GlobalUserListResponse` types
2. **Service** — `GlobalUserService` with `list()` method supporting pagination, filtering, sorting, search
3. **Controller** — `GlobalUserController` with `handleList()` method
4. **Routes** — Protected route `GET /api/v1/admin/users` with RBAC `require("superadmin")`
5. **Database indexes** — Add composite index for performant queries
6. **Frontend page** — `/admin/users` page (SuperAdmin layout)
7. **Frontend table** — `GlobalUserTable` component with sorting, filtering, pagination
8. **Wire up** — Register route in `apps/server/src/index.ts` after auth middleware
9. **API tests** — 14 tests covering list, pagination, filtering, sorting, search, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/user/global-user.types.ts

import { AuthRole } from "../auth/roles.types";

/** Sort fields for user directory */
export type GlobalUserSortField =
  | "full_name"
  | "email"
  | "role"
  | "institution_name"
  | "is_active"
  | "last_login_at"
  | "created_at";

export type SortDirection = "asc" | "desc";

/** Query parameters for the global user list endpoint */
export interface GlobalUserListQuery {
  readonly page?: number;           // Default: 1
  readonly limit?: number;          // Default: 25, max: 100
  readonly sort_by?: GlobalUserSortField;  // Default: "created_at"
  readonly sort_dir?: SortDirection;       // Default: "desc"
  readonly search?: string;         // Searches name + email (ILIKE)
  readonly role?: AuthRole;         // Filter by role
  readonly institution_id?: string; // Filter by institution
  readonly is_active?: boolean;     // Filter by active status
}

/** Single user row in the directory */
export interface GlobalUserListItem {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly is_active: boolean;
  readonly institution_id: string | null;
  readonly institution_name: string | null;
  readonly last_login_at: string | null;
  readonly created_at: string;
}

/** Paginated response for the global user list */
export interface GlobalUserListResponse {
  readonly users: GlobalUserListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Uses existing `profiles` table joined with `institutions`.

```sql
-- Migration: add_global_user_directory_indexes
-- Performance indexes for cross-institution user queries

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id ON profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_last_login_at ON profiles(last_login_at);

-- Composite index for common filter + sort combinations
CREATE INDEX IF NOT EXISTS idx_profiles_role_institution ON profiles(role, institution_id);
```

**Existing table used:**
```
profiles (
  id UUID PK,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT CHECK ('superadmin'|'institutional_admin'|'faculty'|'student'|'advisor'),
  institution_id UUID FK -> institutions(id),
  is_course_director BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  ...
)

institutions (
  id UUID PK,
  name TEXT,
  domain TEXT UNIQUE,
  status TEXT,
  ...
)
```

**Query pattern (service layer via Supabase client):**
```sql
SELECT p.id, p.email, p.full_name, p.role, p.is_course_director,
       p.is_active, p.institution_id, i.name AS institution_name,
       p.last_login_at, p.created_at
FROM profiles p
LEFT JOIN institutions i ON p.institution_id = i.id
WHERE ($search IS NULL OR p.full_name ILIKE '%' || $search || '%' OR p.email ILIKE '%' || $search || '%')
  AND ($role IS NULL OR p.role = $role)
  AND ($institution_id IS NULL OR p.institution_id = $institution_id)
  AND ($is_active IS NULL OR p.is_active = $is_active)
ORDER BY $sort_by $sort_dir
LIMIT $limit OFFSET ($page - 1) * $limit;
```

## 5. API Contract (complete request/response)

### GET /api/v1/admin/users (Auth: SuperAdmin only)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 25 | Items per page (max 100) |
| `sort_by` | string | `created_at` | Sort field |
| `sort_dir` | string | `desc` | Sort direction |
| `search` | string | — | Search name/email (ILIKE) |
| `role` | string | — | Filter by AuthRole |
| `institution_id` | string | — | Filter by institution UUID |
| `is_active` | boolean | — | Filter by active status |

**Success Response (200):**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid-1",
        "email": "jsmith@msm.edu",
        "full_name": "Dr. Jane Smith",
        "role": "institutional_admin",
        "is_course_director": false,
        "is_active": true,
        "institution_id": "inst-uuid-1",
        "institution_name": "Morehouse School of Medicine",
        "last_login_at": "2026-02-18T14:30:00Z",
        "created_at": "2026-01-15T09:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 25,
      "total": 142,
      "total_pages": 6
    }
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-SuperAdmin role |
| 400 | `VALIDATION_ERROR` | Invalid query params (e.g., limit > 100, invalid sort field) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/admin/users` (SuperAdmin layout)

**Route:** `apps/web/src/app/(protected)/admin/users/page.tsx`

**Component hierarchy:**
```
AdminUsersPage (page.tsx — default export)
  └── GlobalUserDirectory (client component)
        ├── SearchBar (text input for name/email search)
        ├── FilterBar
        │     ├── RoleFilter (dropdown: all roles)
        │     ├── InstitutionFilter (dropdown: all institutions)
        │     └── StatusFilter (dropdown: active/inactive/all)
        ├── GlobalUserTable
        │     ├── SortableHeader (click to sort columns)
        │     └── UserRow (per-row: name, email, role badge, institution, status, last login)
        └── Pagination (page numbers + prev/next)
```

**States:**
1. **Loading** — Skeleton table while fetching
2. **Empty** — "No users found" message (with reset filters link)
3. **Data** — Table with users, sortable headers, filter chips
4. **Error** — Error message with retry button
5. **Filtering** — Loading indicator while refetching with new params

**Design tokens:**
- Surface: White card on Parchment background (admin shell)
- Role badges: color-coded by role (existing design system)
- Active/Inactive: Green `#69a338` / Muted gray
- Typography: Source Sans 3 for table data, DM Mono for email column
- Spacing: 16px cell padding, 24px section gap

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/global-user.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Create |
| 3 | `packages/types/src/index.ts` | Types | Edit (add user export) |
| 4 | Supabase migration via MCP (indexes) | Database | Apply |
| 5 | `apps/server/src/services/user/global-user.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/user/global-user.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add protected route) |
| 8 | `apps/web/src/app/(protected)/admin/users/page.tsx` | View | Create |
| 9 | `apps/web/src/components/admin/global-user-directory.tsx` | Component | Create |
| 10 | `apps/server/src/__tests__/global-user.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client (joined queries)
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `createRbacMiddleware()`, `rbac.require("superadmin")`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`, `PaginationMeta`
- `packages/types/src/auth/roles.types.ts` — `AuthRole`, `isValidRole()`

## 9. Test Fixtures (inline)

```typescript
// Mock SuperAdmin user
export const SUPERADMIN_USER = {
  sub: "sa-uuid-1",
  email: "admin@journeyos.com",
  role: "superadmin" as const,
  institution_id: "",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock faculty user (should be denied)
export const FACULTY_USER = {
  ...SUPERADMIN_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock user list for service tests
export const MOCK_USERS = [
  {
    id: "user-1",
    email: "jsmith@msm.edu",
    full_name: "Dr. Jane Smith",
    role: "institutional_admin",
    is_course_director: false,
    is_active: true,
    institution_id: "inst-1",
    institution_name: "Morehouse School of Medicine",
    last_login_at: "2026-02-18T14:30:00Z",
    created_at: "2026-01-15T09:00:00Z",
  },
  {
    id: "user-2",
    email: "bwilson@howard.edu",
    full_name: "Dr. Brian Wilson",
    role: "faculty",
    is_course_director: true,
    is_active: true,
    institution_id: "inst-2",
    institution_name: "Howard University College of Medicine",
    last_login_at: "2026-02-17T10:00:00Z",
    created_at: "2026-01-20T08:00:00Z",
  },
  {
    id: "user-3",
    email: "astudent@msm.edu",
    full_name: "Alice Student",
    role: "student",
    is_course_director: false,
    is_active: false,
    institution_id: "inst-1",
    institution_name: "Morehouse School of Medicine",
    last_login_at: null,
    created_at: "2026-02-01T12:00:00Z",
  },
];
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/global-user.controller.test.ts`

```
describe("GlobalUserController")
  describe("handleList")
    ✓ returns paginated user list for SuperAdmin (200)
    ✓ returns users with institution_name joined from institutions table
    ✓ returns correct pagination meta (page, limit, total, total_pages)
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ filters by role query parameter
    ✓ filters by institution_id query parameter
    ✓ filters by is_active query parameter
    ✓ searches by name (case-insensitive ILIKE)
    ✓ searches by email (case-insensitive ILIKE)
    ✓ sorts by any valid sort field + direction
    ✓ rejects invalid sort_by field (400 VALIDATION_ERROR)
    ✓ caps limit at 100 when higher value requested
    ✓ returns empty list with meta when no users match filters

describe("GlobalUserService")
  describe("list")
    ✓ builds correct Supabase query with all filters applied
    ✓ calculates total_pages correctly (ceil of total/limit)
```

**Total: ~16 tests** (14 controller + 2 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. The global user directory is not part of the 5 critical user journeys.

## 12. Acceptance Criteria

1. SuperAdmin can access `/admin/users` and see all users across all institutions
2. Non-SuperAdmin roles receive 403 Forbidden
3. Table displays: name, email, role, institution, active status, last login
4. Columns are sortable (click header to toggle asc/desc)
5. Users can be filtered by role, institution, and active status
6. Search by name or email works cross-institution (case-insensitive)
7. Pagination works correctly with 25 items per page
8. Empty state shown when no users match filters
9. Limit is capped at 100 items per page
10. All 16 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Global user directory for SuperAdmin | UF-06 § Cross-Institution User Management |
| SuperAdmin bypasses institution scoping | ARCHITECTURE_v10 § 4.1: role hierarchy |
| User table columns | S-SA-07-1 § Acceptance Criteria |
| `GET /api/v1/users` endpoint | API_CONTRACT_v1 § User Management |
| profiles table schema | SUPABASE_DDL_v1 § user_profiles |
| institutions table schema | SUPABASE_DDL_v1 § institutions |
| RBAC SuperAdmin-only | F-03 § User & Role Management: "SuperAdmin manages users across ALL institutions" |
| Pagination pattern | API_CONTRACT_v1 § Conventions: `?page=1&limit=20` |

## 14. Environment Prerequisites

- **Supabase:** Project running, `profiles` and `institutions` tables exist, performance indexes applied
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware in index.ts. Use `rbac.require("superadmin")` middleware.
- **Supabase join query:** Use `.select('*, institutions(name)')` syntax for the LEFT JOIN to get institution_name.
- **Pagination:** Offset-based (not cursor-based) is fine for SuperAdmin directory — dataset won't be massive enough to warrant cursor pagination at MVP.
- **No user detail page yet** — Clicking a row is future scope (SA-4 or beyond). For now, the table is read-only.
- **Institution filter dropdown** — Fetch all institutions for the dropdown. At MVP scale this is fine (< 10 institutions).
