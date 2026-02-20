# STORY-SA-7 Brief: Institution List Dashboard

## 0. Lane & Priority

```yaml
story_id: STORY-SA-7
old_id: S-SA-05-1
lane: superadmin
lane_priority: 1
within_lane_order: 7
sprint: 9
size: M
depends_on:
  - STORY-SA-5 (superadmin) — Approval Workflow (institutions exist in system)
blocks:
  - STORY-SA-8 — Institution Suspend/Reactivate
  - STORY-SA-9 — Institution Detail View
personas_served: [superadmin]
epic: E-05 (Institution Monitoring)
feature: F-02 (Institution Management)
user_flow: UF-05 (Institution Monitoring)
```

## 1. Summary

Build an **institution list dashboard** at `/admin/institutions` where SuperAdmin can view all institutions in a paginated, filterable, sortable data table. Each row shows institution name, status (with color-coded indicators), user count, course count, last activity date, and creation date. SuperAdmin can filter by status, search by name, sort by any column, and click a row to navigate to the institution detail view (SA-9). The table also supports bulk selection for status changes and includes an "Add Institution" button linking to the existing manual creation flow.

This is the first step in the E-05 Institution Monitoring pipeline: **SA-7 (institution list)** → SA-8 (suspend/reactivate) → SA-9 (detail view).

Key constraints:
- **SuperAdmin only** — RBAC enforced (403 for all other roles)
- Server-side pagination (20 per page)
- User count and course count are aggregated via subqueries
- Last activity: most recent `activity_events.created_at` for that institution
- Data table uses shadcn/ui `DataTable` with `@tanstack/react-table`
- Status indicators: Active (green), Pending (yellow), Suspended (red), Archived (gray)

## 2. Task Breakdown

1. **Types** — Create `InstitutionListItem`, `InstitutionListQuery`, `InstitutionListResponse` in `packages/types/src/admin/institution-monitoring.types.ts`
2. **Service** — `InstitutionMonitoringService` with `list()` method and aggregation queries
3. **Controller** — `InstitutionController` with `handleList()` method
4. **Routes** — Protected route `GET /api/v1/admin/institutions` with RBAC
5. **Atom** — `StatusIndicator` component with color mapping
6. **Organism** — `InstitutionListTable` with sortable headers and pagination
7. **Page** — `/admin/institutions` SuperAdmin dashboard page
8. **Hook** — `useInstitutionList()` for data fetching and state management
9. **Wire up** — Register route in `apps/server/src/index.ts`
10. **API tests** — 10 tests covering list, filtering, sorting, pagination, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/admin/institution-monitoring.types.ts

/** Institution status values */
export type InstitutionMonitoringStatus = "active" | "pending" | "suspended" | "archived";

/** Sort fields for institution list */
export type InstitutionListSortField =
  | "name"
  | "status"
  | "user_count"
  | "course_count"
  | "last_activity"
  | "created_at";

export type SortDirection = "asc" | "desc";

/** Query parameters for institution list endpoint */
export interface InstitutionListQuery {
  readonly page?: number;                    // Default: 1
  readonly limit?: number;                   // Default: 20, max: 100
  readonly sort_by?: InstitutionListSortField; // Default: "created_at"
  readonly sort_dir?: SortDirection;           // Default: "desc"
  readonly status?: InstitutionMonitoringStatus | "all"; // Default: "all"
  readonly search?: string;                  // Search by institution name
}

/** Single institution row in the list */
export interface InstitutionListItem {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly status: InstitutionMonitoringStatus;
  readonly user_count: number;
  readonly course_count: number;
  readonly last_activity: string | null;
  readonly created_at: string;
}

/** Paginated response for institution list */
export interface InstitutionListResponse {
  readonly institutions: readonly InstitutionListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/** Status indicator color mapping */
export interface StatusIndicatorConfig {
  readonly status: InstitutionMonitoringStatus;
  readonly label: string;
  readonly color: string; // design token reference
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Reads from existing `institutions` table with aggregation subqueries.

```sql
-- Existing tables used:

-- institutions (primary data source)
-- institutions.id UUID PK
-- institutions.name TEXT
-- institutions.domain TEXT
-- institutions.status TEXT CHECK ('approved'|'suspended'|...)
-- institutions.created_at TIMESTAMPTZ
-- institutions.updated_at TIMESTAMPTZ

-- profiles (user count aggregation)
-- profiles.institution_id UUID FK -> institutions(id)

-- courses (course count aggregation — may not exist yet, return 0)
-- courses.institution_id UUID FK -> institutions(id)

-- activity_events (last activity — may not exist yet, return null)
-- activity_events.institution_id UUID FK -> institutions(id)
-- activity_events.created_at TIMESTAMPTZ

-- Aggregation query pattern:
-- SELECT i.*,
--   (SELECT COUNT(*) FROM profiles WHERE institution_id = i.id) AS user_count,
--   (SELECT COUNT(*) FROM courses WHERE institution_id = i.id) AS course_count,
--   (SELECT MAX(created_at) FROM activity_events WHERE institution_id = i.id) AS last_activity
-- FROM institutions i
-- WHERE ($status = 'all' OR i.status = $status)
--   AND ($search IS NULL OR i.name ILIKE '%' || $search || '%')
-- ORDER BY $sort_by $sort_dir
-- LIMIT $limit OFFSET ($page - 1) * $limit

-- Index for name search performance:
CREATE INDEX IF NOT EXISTS idx_institutions_name_trgm
  ON institutions USING gin (name gin_trgm_ops);
```

## 5. API Contract (complete request/response)

### GET /api/v1/admin/institutions (Auth: SuperAdmin only)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | Sort field |
| `sort_dir` | string | `desc` | Sort direction: `asc` or `desc` |
| `status` | string | `all` | Filter: `active`, `pending`, `suspended`, `archived`, or `all` |
| `search` | string | — | Search by institution name (ILIKE) |

**Success Response (200):**
```json
{
  "data": {
    "institutions": [
      {
        "id": "inst-uuid-1",
        "name": "Morehouse School of Medicine",
        "domain": "msm.edu",
        "status": "active",
        "user_count": 450,
        "course_count": 12,
        "last_activity": "2026-02-19T14:30:00Z",
        "created_at": "2026-01-15T10:00:00Z"
      },
      {
        "id": "inst-uuid-2",
        "name": "Howard University College of Medicine",
        "domain": "howard.edu",
        "status": "active",
        "user_count": 320,
        "course_count": 8,
        "last_activity": "2026-02-18T16:00:00Z",
        "created_at": "2026-01-20T14:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "total_pages": 1
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
| 400 | `VALIDATION_ERROR` | Invalid query params (invalid sort field, status value) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/admin/institutions` (SuperAdmin layout)

**Route:** `apps/web/src/app/(protected)/admin/institutions/page.tsx`

**Component hierarchy:**
```
InstitutionListPage (page.tsx — default export)
  └── InstitutionListDashboard (client component)
        ├── PageHeader
        │     ├── Title ("Institutions")
        │     └── AddInstitutionButton ("Add Institution" → existing flow)
        ├── FilterBar
        │     ├── StatusFilter (dropdown: all, active, pending, suspended, archived)
        │     └── SearchInput (search by institution name, debounced 300ms)
        ├── InstitutionListTable (organism)
        │     ├── SortableHeader (name, status, user count, course count, last activity, created)
        │     ├── InstitutionRow (per-row)
        │     │     ├── InstitutionName (clickable → detail view)
        │     │     ├── StatusIndicator (atom — color-coded badge)
        │     │     ├── UserCount
        │     │     ├── CourseCount
        │     │     ├── LastActivity (relative time: "2 hours ago")
        │     │     └── CreatedDate (formatted)
        │     └── BulkSelectCheckbox (for bulk status changes)
        └── Pagination (page numbers + prev/next)
```

**States:**
1. **Loading** — Skeleton table while fetching
2. **Empty** — "No institutions found" with reset filters link
3. **Data** — Table with institutions, sortable headers, status filter
4. **Error** — Error message with retry button

**Design tokens:**
- Status badges:
  - Active: Green `#69a338`
  - Pending: Warning Yellow
  - Suspended: Error Red
  - Archived: Gray
- Surface: White `#ffffff` card on Parchment `#faf9f6` background
- Typography: Lora for page title, Source Sans 3 for table data
- Spacing: 16px cell padding, 24px section gap
- Row hover: subtle Parchment `#faf9f6` background

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/admin/institution-monitoring.types.ts` | Types | Create |
| 2 | `packages/types/src/admin/index.ts` | Types | Create or Edit (add monitoring export) |
| 3 | Supabase migration (name trgm index) | Database | Apply via MCP |
| 4 | `apps/server/src/services/admin/institution-monitoring.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/admin/institution.controller.ts` | Controller | Create |
| 6 | `apps/server/src/index.ts` | Routes | Edit (add protected institution routes) |
| 7 | `packages/ui/src/atoms/status-indicator.tsx` | Atom | Create |
| 8 | `apps/web/src/hooks/use-institution-list.ts` | Hook | Create |
| 9 | `apps/web/src/components/admin/institution-list-table.tsx` | Organism | Create |
| 10 | `apps/web/src/app/(protected)/admin/institutions/page.tsx` | View | Create |
| 11 | `apps/server/src/__tests__/institution-monitoring.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-5 | superadmin | **PENDING** | Approval workflow creates institution records in the system |
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |
| STORY-SA-1 | superadmin | **DONE** | Waitlist application pipeline (upstream) |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `@tanstack/react-table` — Table management (install if not present)

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.SUPERADMIN)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`

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

// Mock institution list
export const MOCK_INSTITUTIONS = [
  {
    id: "inst-1",
    name: "Morehouse School of Medicine",
    domain: "msm.edu",
    status: "active",
    user_count: 450,
    course_count: 12,
    last_activity: "2026-02-19T14:30:00Z",
    created_at: "2026-01-15T10:00:00Z",
  },
  {
    id: "inst-2",
    name: "Howard University College of Medicine",
    domain: "howard.edu",
    status: "active",
    user_count: 320,
    course_count: 8,
    last_activity: "2026-02-18T16:00:00Z",
    created_at: "2026-01-20T14:00:00Z",
  },
  {
    id: "inst-3",
    name: "PCOM Georgia",
    domain: "pcom.edu",
    status: "suspended",
    user_count: 200,
    course_count: 5,
    last_activity: "2026-02-10T09:00:00Z",
    created_at: "2026-01-25T08:00:00Z",
  },
  {
    id: "inst-4",
    name: "New Medical College",
    domain: "newmed.edu",
    status: "pending",
    user_count: 0,
    course_count: 0,
    last_activity: null,
    created_at: "2026-02-18T12:00:00Z",
  },
];
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/institution-monitoring.test.ts`

```
describe("InstitutionMonitoringController")
  describe("handleList")
    ✓ returns paginated institution list for SuperAdmin (200)
    ✓ returns correct pagination meta (page, limit, total, total_pages)
    ✓ defaults to page=1, limit=20, sort_by=created_at, sort_dir=desc
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ filters by status=active
    ✓ filters by status=suspended
    ✓ returns all statuses when status=all or omitted
    ✓ searches by institution name (ILIKE)
    ✓ sorts by name ascending
    ✓ sorts by user_count descending
    ✓ caps limit at 100 when higher value requested
    ✓ returns empty list when no institutions match

describe("InstitutionMonitoringService")
  describe("list")
    ✓ includes user_count aggregation per institution
    ✓ includes course_count aggregation per institution
    ✓ returns null for last_activity when no activity events exist
    ✓ calculates total_pages correctly (ceil of total/limit)
```

**Total: ~17 tests** (13 controller + 4 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this individual story. E2E will be part of the Institution Monitoring critical journey when SA-7 + SA-8 + SA-9 are all complete.

## 12. Acceptance Criteria

1. SuperAdmin can access `/admin/institutions` and see all institutions
2. Non-SuperAdmin roles receive 403 Forbidden
3. Table columns: name, status (color-coded), user count, course count, last activity, created date
4. Status indicators: Active (green), Pending (yellow), Suspended (red), Archived (gray)
5. Filterable by status (active, pending, suspended, archived, all)
6. Searchable by institution name
7. Sortable by any column
8. Server-side pagination with 20 items per page
9. Row click navigates to institution detail view (`/admin/institutions/[id]`)
10. "Add Institution" button present
11. Empty state shown when no institutions match filter/search
12. All ~17 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Institution list dashboard | S-SA-05-1 § User Story |
| Table columns | S-SA-05-1 § Acceptance Criteria |
| Status indicators with colors | S-SA-05-1 § Acceptance Criteria |
| Filters, search, sort | S-SA-05-1 § Acceptance Criteria |
| Pagination 20/page | S-SA-05-1 § Acceptance Criteria |
| Row click → detail view | S-SA-05-1 § Acceptance Criteria |
| Aggregation queries | S-SA-05-1 § Notes |
| shadcn DataTable | S-SA-05-1 § Notes |
| SuperAdmin-only route | S-SA-05-1 § Notes |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `institutions` and `profiles` tables exist
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story
- **pg_trgm extension:** May need to enable for ILIKE search performance (optional optimization)

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware. Use `rbac.require(AuthRole.SUPERADMIN)`.
- **Follows SA-2 and SA-3 list pattern:** The `InstitutionMonitoringService.list()` mirrors `GlobalUserService.list()` and `ApplicationReviewService.list()` — parallel data + count queries, conditional filter chaining.
- **Aggregation queries:** Use Supabase's `.select()` with subqueries is not directly supported. Instead, use `supabase.rpc()` with a Postgres function, OR run separate count queries and merge. Simpler approach: fetch institutions, then for each batch, run count queries. For MVP, accept N+1 and optimize later with a view or RPC.
- **Status mapping:** The `institutions.status` column uses `approved` (map to `active`), `suspended`, etc. Create a mapping function `mapInstitutionStatus()`.
- **Missing tables:** `courses` and `activity_events` tables may not exist yet. Guard with `try/catch` and return 0/null for those aggregations.
- **DataTable:** Use `@tanstack/react-table` with shadcn/ui `DataTable` pattern. Server-side sorting and pagination via query params.
- **Search debounce:** Frontend debounces search input by 300ms before making API call.
