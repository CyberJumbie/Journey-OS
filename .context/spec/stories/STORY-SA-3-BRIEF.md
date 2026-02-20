# STORY-SA-3 Brief: Application Review Queue

## 0. Lane & Priority

```yaml
story_id: STORY-SA-3
old_id: S-SA-04-2
lane: superadmin
lane_priority: 1
within_lane_order: 3
sprint: 3
size: M
depends_on:
  - STORY-SA-1 (superadmin) — Waitlist Application Form ✅ DONE
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-SA-5 — Approval Workflow
  - STORY-SA-6 — Rejection Workflow
personas_served: [superadmin]
epic: E-04 (Institution Lifecycle)
feature: F-02 (Institution Management)
user_flow: UF-04 (Institution Approval)
```

## 1. Summary

Build an **application review queue** at `/admin/applications` where SuperAdmin can view all waitlist applications in a paginated, filterable, sortable table. Each row shows the institution name, type, contact info, submitted date, and status. SuperAdmin can click any row to view full application details in a modal. The table also provides Approve/Reject action buttons per row, but the actual approve/reject logic is deferred to SA-5 and SA-6 — this story only wires the UI buttons and the read-only API endpoints.

This is the second step in the E-04 Institution Lifecycle pipeline: SA-1 (submit) → **SA-3 (review queue)** → SA-5 (approve) / SA-6 (reject).

Key constraints:
- **SuperAdmin only** — RBAC enforced (403 for all other roles)
- Reads from existing `waitlist_applications` table (created in SA-1)
- Offset-based pagination (20 items/page)
- Filterable by status (pending, approved, rejected, all)
- Sortable by submitted date, institution name
- Detail endpoint returns full application record by ID

## 2. Task Breakdown

1. **Types** — Create `ApplicationReviewItem`, `ApplicationReviewQuery`, `ApplicationReviewResponse`, `ApplicationDetail` in `packages/types/src/institution/review.types.ts`
2. **Error classes** — `ApplicationNotFoundError` in `apps/server/src/errors/application.error.ts` (edit existing file)
3. **Service** — `ApplicationReviewService` with `list()` and `getById()` methods
4. **Controller** — `ApplicationReviewController` with `handleList()` and `handleGetById()` methods
5. **Routes** — Protected routes `GET /api/v1/admin/applications` and `GET /api/v1/admin/applications/:id` with RBAC
6. **Frontend page** — `/admin/applications` page (SuperAdmin layout)
7. **Frontend components** — `ApplicationReviewTable` (organism), `ApplicationDetailModal` (organism)
8. **Wire up** — Register routes in `apps/server/src/index.ts` after auth middleware
9. **API tests** — 14 tests covering list, detail, pagination, filtering, sorting, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/institution/review.types.ts

import { ApplicationStatus, InstitutionType } from "./application.types";

/** Sort fields for the application review queue */
export type ApplicationReviewSortField = "created_at" | "institution_name";

export type SortDirection = "asc" | "desc";

/** Query parameters for the application review list endpoint */
export interface ApplicationReviewQuery {
  readonly page?: number;              // Default: 1
  readonly limit?: number;             // Default: 20, max: 100
  readonly sort_by?: ApplicationReviewSortField;  // Default: "created_at"
  readonly sort_dir?: SortDirection;              // Default: "desc"
  readonly status?: ApplicationStatus | "all";    // Default: "all"
}

/** Single application row in the review queue */
export interface ApplicationReviewItem {
  readonly id: string;
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly status: ApplicationStatus;
  readonly created_at: string;
}

/** Full application detail (returned by GET /:id) */
export interface ApplicationDetail {
  readonly id: string;
  readonly institution_name: string;
  readonly institution_type: InstitutionType;
  readonly accreditation_body: string;
  readonly contact_name: string;
  readonly contact_email: string;
  readonly contact_phone: string;
  readonly student_count: number;
  readonly website_url: string;
  readonly reason: string;
  readonly status: ApplicationStatus;
  readonly submitted_ip: string;
  readonly reviewed_by: string | null;
  readonly reviewed_at: string | null;
  readonly rejection_reason: string | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/** Paginated response for the application review list */
export interface ApplicationReviewResponse {
  readonly applications: readonly ApplicationReviewItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Reads from existing `waitlist_applications` table (created in SA-1).

```sql
-- Existing table used:
-- waitlist_applications (
--   id UUID PK,
--   institution_name TEXT,
--   institution_type TEXT CHECK ('md'|'do'|'combined'),
--   accreditation_body TEXT,
--   contact_name TEXT,
--   contact_email TEXT,
--   contact_phone TEXT DEFAULT '',
--   student_count INTEGER CHECK > 0,
--   website_url TEXT DEFAULT '',
--   reason TEXT DEFAULT '',
--   status TEXT DEFAULT 'pending' CHECK ('pending'|'approved'|'rejected'),
--   submitted_ip INET,
--   reviewed_by UUID FK -> profiles(id),
--   reviewed_at TIMESTAMPTZ,
--   rejection_reason TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- )

-- Existing indexes (created in SA-1):
-- idx_waitlist_applications_contact_email
-- idx_waitlist_applications_institution_name
-- idx_waitlist_applications_status

-- Additional index for sort performance:
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_created_at
  ON waitlist_applications(created_at DESC);
```

## 5. API Contract (complete request/response)

### GET /api/v1/admin/applications (Auth: SuperAdmin only)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | Sort field: `created_at` or `institution_name` |
| `sort_dir` | string | `desc` | Sort direction: `asc` or `desc` |
| `status` | string | `all` | Filter: `pending`, `approved`, `rejected`, or `all` |

**Success Response (200):**
```json
{
  "data": {
    "applications": [
      {
        "id": "uuid-1",
        "institution_name": "Morehouse School of Medicine",
        "institution_type": "md",
        "contact_name": "Dr. Jane Smith",
        "contact_email": "jsmith@msm.edu",
        "status": "pending",
        "created_at": "2026-02-19T12:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "total_pages": 1
    }
  },
  "error": null
}
```

### GET /api/v1/admin/applications/:id (Auth: SuperAdmin only)

**Success Response (200):**
```json
{
  "data": {
    "id": "uuid-1",
    "institution_name": "Morehouse School of Medicine",
    "institution_type": "md",
    "accreditation_body": "LCME",
    "contact_name": "Dr. Jane Smith",
    "contact_email": "jsmith@msm.edu",
    "contact_phone": "+1-404-555-0100",
    "student_count": 450,
    "website_url": "https://www.msm.edu",
    "reason": "Interested in AI-powered assessment tools",
    "status": "pending",
    "submitted_ip": "192.168.1.1",
    "reviewed_by": null,
    "reviewed_at": null,
    "rejection_reason": null,
    "created_at": "2026-02-19T12:00:00Z",
    "updated_at": "2026-02-19T12:00:00Z"
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
| 404 | `NOT_FOUND` | Application ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Page: `/admin/applications` (SuperAdmin layout)

**Route:** `apps/web/src/app/(protected)/admin/applications/page.tsx`

**Component hierarchy:**
```
AdminApplicationsPage (page.tsx — default export)
  └── ApplicationReviewQueue (client component)
        ├── StatusFilter (dropdown: all, pending, approved, rejected)
        ├── ApplicationReviewTable (organism)
        │     ├── SortableHeader (institution name, submitted date)
        │     └── ApplicationRow (per-row: name, type, contact, date, status badge, actions)
        ├── ApplicationDetailModal (organism — opens on "View Details" click)
        │     ├── Full application data display
        │     ├── Approve button (disabled — wired in SA-5)
        │     └── Reject button (disabled — wired in SA-6)
        └── Pagination (page numbers + prev/next)
```

**States:**
1. **Loading** — Skeleton table while fetching
2. **Empty** — "No applications found" with reset filters link
3. **Data** — Table with applications, sortable headers, status filter
4. **Detail** — Modal showing full application (triggered by row click or "View Details")
5. **Error** — Error message with retry button

**Design tokens:**
- Status badges: pending = `warning-yellow`, approved = `success-green` `#69a338`, rejected = `error-red`
- Surface: White card on Parchment background (admin shell)
- Typography: Source Sans 3 for table data
- Spacing: 16px cell padding, 24px section gap

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/institution/review.types.ts` | Types | Create |
| 2 | `packages/types/src/institution/index.ts` | Types | Edit (add review export) |
| 3 | Supabase migration via MCP (created_at index) | Database | Apply |
| 4 | `apps/server/src/errors/application.error.ts` | Errors | Edit (add ApplicationNotFoundError) |
| 5 | `apps/server/src/services/institution/application-review.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/institution/application-review.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add protected routes) |
| 8 | `apps/web/src/app/(protected)/admin/applications/page.tsx` | View | Create |
| 9 | `apps/web/src/components/admin/application-review-queue.tsx` | Component | Create |
| 10 | `apps/web/src/components/admin/application-detail-modal.tsx` | Component | Create |
| 11 | `apps/server/src/__tests__/application-review.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-1 | superadmin | **DONE** | Created `waitlist_applications` table and submission endpoint |
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` — `createRbacMiddleware()`, `rbac.require(AuthRole.SUPERADMIN)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `apps/server/src/errors/application.error.ts` — Existing error classes (add `ApplicationNotFoundError`)
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `packages/types/src/institution/application.types.ts` — `ApplicationStatus`, `InstitutionType`

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

// Mock application list for service tests
export const MOCK_APPLICATIONS = [
  {
    id: "app-1",
    institution_name: "Morehouse School of Medicine",
    institution_type: "md",
    contact_name: "Dr. Jane Smith",
    contact_email: "jsmith@msm.edu",
    status: "pending",
    created_at: "2026-02-19T12:00:00Z",
  },
  {
    id: "app-2",
    institution_name: "Howard University College of Medicine",
    institution_type: "md",
    contact_name: "Dr. Brian Wilson",
    contact_email: "bwilson@howard.edu",
    status: "approved",
    created_at: "2026-02-18T10:00:00Z",
  },
  {
    id: "app-3",
    institution_name: "PCOM Georgia",
    institution_type: "do",
    contact_name: "Dr. Lisa Chen",
    contact_email: "lchen@pcom.edu",
    status: "rejected",
    created_at: "2026-02-17T08:00:00Z",
  },
];

// Mock full application detail
export const MOCK_APPLICATION_DETAIL = {
  id: "app-1",
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  accreditation_body: "LCME",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI-powered assessment tools",
  status: "pending",
  submitted_ip: "192.168.1.1",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/application-review.controller.test.ts`

```
describe("ApplicationReviewController")
  describe("handleList")
    ✓ returns paginated application list for SuperAdmin (200)
    ✓ returns correct pagination meta (page, limit, total, total_pages)
    ✓ defaults to page=1, limit=20, sort_by=created_at, sort_dir=desc
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ filters by status=pending
    ✓ filters by status=approved
    ✓ filters by status=rejected
    ✓ returns all statuses when status=all or omitted
    ✓ sorts by institution_name ascending
    ✓ rejects invalid sort_by field (400 VALIDATION_ERROR)
    ✓ caps limit at 100 when higher value requested
    ✓ returns empty list with meta when no applications match filter

  describe("handleGetById")
    ✓ returns full application detail for valid ID (200)
    ✓ returns 404 for non-existent application ID
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)

describe("ApplicationReviewService")
  describe("list")
    ✓ builds correct Supabase query with status filter applied
    ✓ calculates total_pages correctly (ceil of total/limit)
  describe("getById")
    ✓ returns full application record by ID
    ✓ throws ApplicationNotFoundError when ID not found
```

**Total: ~20 tests** (16 controller + 4 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full Institution Lifecycle flow (SA-1 → SA-3 → SA-5/SA-6) is complete.

## 12. Acceptance Criteria

1. SuperAdmin can access `/admin/applications` and see all waitlist applications
2. Non-SuperAdmin roles receive 403 Forbidden
3. Table displays: institution name, type, contact name, contact email, status badge, submitted date
4. Applications are sortable by submitted date and institution name
5. Applications are filterable by status (pending, approved, rejected, all)
6. Pagination works correctly with 20 items per page
7. Clicking "View Details" opens a modal with full application data
8. Empty state shown when no applications match the filter
9. Limit is capped at 100 items per page
10. GET /:id returns 404 for non-existent application
11. All ~20 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Review queue for SuperAdmin | UF-04 § Steps 2-4: "Click View Waitlist, see pending list, click row to expand details" |
| SuperAdmin reviews waitlist | ARCHITECTURE_v10 § 4.1: "Reviews waitlist → approves institutions" |
| Table columns | S-SA-04-2 § Acceptance Criteria |
| Status lifecycle | SUPABASE_DDL_v1 § waitlist_applications: `CHECK (status IN ('pending', 'approved', 'rejected'))` |
| `GET /api/v1/waitlist?status=pending` | UF-04 § APIs called |
| `PATCH /api/v1/waitlist/:id` | UF-04 § APIs called (deferred to SA-5/SA-6) |
| Reusable table organism | S-SA-04-2 § Notes: "Table component should be reusable" |
| Status badge colors | S-SA-04-2 § Notes: "pending=yellow, approved=green, rejected=red" |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `waitlist_applications` table exists (from SA-1)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware in `index.ts`. Use `rbac.require(AuthRole.SUPERADMIN)` middleware.
- **Follows SA-2 list pattern:** The `ApplicationReviewService.list()` should mirror `GlobalUserService.list()` — parallel data + count queries, conditional filter chaining, explicit row mapping.
- **Supabase select fields:** List endpoint selects only summary fields (`id, institution_name, institution_type, contact_name, contact_email, status, created_at`). Detail endpoint selects all fields.
- **Approve/Reject buttons:** Wire up in the UI but render as disabled with tooltip "Coming soon". The actual PATCH endpoints are built in SA-5 and SA-6.
- **Status filter "all":** When status is "all" or omitted, do not add `.eq("status", ...)` to the query.
- **Route path:** Use `/api/v1/admin/applications` (not `/api/v1/waitlist`) to match the admin namespace pattern from SA-2.
