# STORY-IA-1 Brief: User List & Invitation

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-1
old_id: S-IA-06-1
lane: institutional_admin
lane_priority: 2
within_lane_order: 1
sprint: 3
size: L
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
  - STORY-SA-5 (superadmin) — Approval Workflow (creates institutions + invitations table)
blocks:
  - STORY-IA-17 — User Deactivation
  - STORY-IA-18 — Role Assignment & CD Flag
  - STORY-F-1 — Course CRUD
personas_served: [institutional_admin]
epic: E-06 (Per-Institution User Management)
feature: F-03 (User & Role Management)
user_flow: UF-05 (User & Role Management)
```

---

## 1. Summary

Build an **institution-scoped user list** at `/institution/users` plus an **invite modal** for InstitutionalAdmin to invite new users. Unlike the global SuperAdmin directory (SA-2), this page shows ONLY users belonging to `req.user.institution_id`. The invite flow creates a record in the `invitations` table (from SA-5), sends an email via `UserInvitationEmailService`, and the invited user appears with `status='pending'` in the list.

Key constraints:
- **InstitutionalAdmin only** -- RBAC enforced with `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`
- Institution scoping: all queries filter by `req.user.institution_id`
- Invite creates an `invitations` record with role pre-assigned
- Pagination: 25 items/page, offset-based
- DualWrite for invitations is NOT required at MVP (Supabase-only)

---

## 2. Task Breakdown

Implementation order follows: **Types -> Errors -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create InstitutionUser types
- **File:** `packages/types/src/user/institution-user.types.ts`
- **Action:** Export `InstitutionUserStatus`, `InstitutionUserSortField`, `InstitutionUserListQuery`, `InstitutionUserListItem`, `InstitutionUserListResponse`, `InviteUserRequest`, `InviteUserResponse`

### Task 2: Export types from barrel
- **File:** `packages/types/src/user/index.ts`
- **Action:** Edit to re-export from `institution-user.types.ts`

### Task 3: Create invitation error classes
- **File:** `apps/server/src/errors/invitation.error.ts`
- **Action:** Create `InvitationError`, `DuplicateInvitationError`, `InvitationExpiredError`, `InvitationLimitError` extending `JourneyOSError`

### Task 4: Build InstitutionUserService
- **File:** `apps/server/src/services/user/institution-user.service.ts`
- **Action:** `list(institutionId, query)` and `invite(institutionId, invitedBy, payload)` methods. List joins `profiles` + `invitations` for pending users. Invite checks for duplicate email, creates invitation record, triggers email.

### Task 5: Build UserInvitationEmailService
- **File:** `apps/server/src/services/email/user-invitation-email.service.ts`
- **Action:** `sendInvitation(email, role, inviterName, institutionName, token)` method. Uses Supabase Edge Function or SMTP transport. At MVP, logs the email payload (actual sending deferred).

### Task 6: Build InstitutionUserController
- **File:** `apps/server/src/controllers/user/institution-user.controller.ts`
- **Action:** `handleList(req, res)` and `handleInvite(req, res)` methods. Extracts `institution_id` from `req.user`. Validates query params / request body.

### Task 7: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add protected routes after auth middleware: `GET /api/v1/institution/users` and `POST /api/v1/institution/users/invite` with `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`

### Task 8: Build frontend user list page
- **File:** `apps/web/src/app/(protected)/institution/users/page.tsx`
- **Action:** Default export page component rendering `InstitutionUserList`

### Task 9: Build UserList component
- **File:** `apps/web/src/components/institution/user-list.tsx`
- **Action:** Client component with table, search, filters, pagination, invite button

### Task 10: Build InviteUserModal component
- **File:** `apps/web/src/components/institution/invite-user-modal.tsx`
- **Action:** Modal with email input, role dropdown, optional CD flag, submit handler

### Task 11: Write service tests
- **File:** `apps/server/src/services/user/__tests__/institution-user.service.test.ts`
- **Action:** 10 tests covering list filtering, pagination, invite creation, duplicate detection

### Task 12: Write controller tests
- **File:** `apps/server/src/controllers/user/__tests__/institution-user.controller.test.ts`
- **Action:** 5 tests covering auth, RBAC, validation, success responses

---

## 3. Data Model

```typescript
// packages/types/src/user/institution-user.types.ts

import { AuthRole } from "../auth/roles.types";
import { SortDirection } from "../common/pagination.types";

/** User status within an institution */
export type InstitutionUserStatus = "active" | "pending" | "deactivated";

/** Sortable fields for institution user list */
export type InstitutionUserSortField =
  | "full_name"
  | "email"
  | "role"
  | "status"
  | "last_login_at";

/** Query parameters for institution user list endpoint */
export interface InstitutionUserListQuery {
  readonly page?: number;           // Default: 1
  readonly limit?: number;          // Default: 25, max: 100
  readonly sort_by?: InstitutionUserSortField;  // Default: "full_name"
  readonly sort_dir?: SortDirection;             // Default: "asc"
  readonly search?: string;         // Searches name + email (ILIKE)
  readonly role?: AuthRole;         // Filter by role
  readonly status?: InstitutionUserStatus; // Filter by status
}

/** Single user row in the institution user list */
export interface InstitutionUserListItem {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly status: InstitutionUserStatus;
  readonly last_login_at: string | null;
  readonly created_at: string;
}

/** Paginated response for institution user list */
export interface InstitutionUserListResponse {
  readonly users: readonly InstitutionUserListItem[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

/** Request body for inviting a user */
export interface InviteUserRequest {
  readonly email: string;
  readonly role: "faculty" | "student" | "advisor";
  readonly is_course_director?: boolean;
}

/** Response after successfully creating an invitation */
export interface InviteUserResponse {
  readonly invitation_id: string;
  readonly email: string;
  readonly role: string;
  readonly expires_at: string;
}
```

---

## 4. Database Schema

No new tables. Uses existing `profiles` and `invitations` (from SA-5).

```sql
-- Migration: add_institution_user_list_indexes
-- Performance indexes for institution-scoped user queries

CREATE INDEX IF NOT EXISTS idx_profiles_institution_id_role
  ON profiles(institution_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_institution_id_is_active
  ON profiles(institution_id, is_active);
CREATE INDEX IF NOT EXISTS idx_invitations_institution_id_status
  ON invitations(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email_institution
  ON invitations(email, institution_id);
```

**Existing tables used:**
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
  updated_at TIMESTAMPTZ
)

invitations (
  id UUID PK DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  institution_id UUID FK -> institutions(id),
  invited_by UUID FK -> profiles(id),
  token TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK ('pending'|'accepted'|'expired'|'revoked'),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Query pattern (list -- union active profiles + pending invitations):**
```sql
-- Active users from profiles
SELECT p.id, p.email, p.full_name, p.role, p.is_course_director,
       CASE WHEN p.is_active THEN 'active' ELSE 'deactivated' END AS status,
       p.last_login_at, p.created_at
FROM profiles p
WHERE p.institution_id = $institution_id
  AND ($search IS NULL OR p.full_name ILIKE '%' || $search || '%' OR p.email ILIKE '%' || $search || '%')
  AND ($role IS NULL OR p.role = $role)

UNION ALL

-- Pending invitations (not yet registered)
SELECT i.id, i.email, '' AS full_name, i.role, false AS is_course_director,
       'pending' AS status, NULL AS last_login_at, i.created_at
FROM invitations i
WHERE i.institution_id = $institution_id
  AND i.status = 'pending'
  AND i.email NOT IN (SELECT email FROM profiles WHERE institution_id = $institution_id)

ORDER BY $sort_by $sort_dir
LIMIT $limit OFFSET ($page - 1) * $limit;
```

---

## 5. API Contract

### GET /api/v1/institution/users (Auth: InstitutionalAdmin only)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 25 | Items per page (max 100) |
| `sort_by` | string | `full_name` | Sort field |
| `sort_dir` | string | `asc` | Sort direction |
| `search` | string | -- | Search name/email (ILIKE) |
| `role` | string | -- | Filter by AuthRole |
| `status` | string | -- | Filter: active, pending, deactivated |

**Success Response (200):**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid-1",
        "email": "jsmith@msm.edu",
        "full_name": "Dr. Jane Smith",
        "role": "faculty",
        "is_course_director": true,
        "status": "active",
        "last_login_at": "2026-02-18T14:30:00Z",
        "created_at": "2026-01-15T09:00:00Z"
      },
      {
        "id": "inv-uuid-1",
        "email": "newuser@msm.edu",
        "full_name": "",
        "role": "student",
        "is_course_director": false,
        "status": "pending",
        "last_login_at": null,
        "created_at": "2026-02-19T10:00:00Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 25,
      "total": 48,
      "total_pages": 2
    }
  },
  "error": null
}
```

### POST /api/v1/institution/users/invite (Auth: InstitutionalAdmin only)

**Request Body:**
```json
{
  "email": "newuser@msm.edu",
  "role": "faculty",
  "is_course_director": false
}
```

**Success Response (201):**
```json
{
  "data": {
    "invitation_id": "inv-uuid-1",
    "email": "newuser@msm.edu",
    "role": "faculty",
    "expires_at": "2026-03-05T10:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin or wrong institution |
| 400 | `VALIDATION_ERROR` | Invalid query params or missing email/role |
| 409 | `DUPLICATE_INVITATION` | Active invitation already exists for this email |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. Frontend Spec

### Page: `/institution/users` (InstitutionalAdmin layout)

**Route:** `apps/web/src/app/(protected)/institution/users/page.tsx`

**Component hierarchy:**
```
InstitutionUsersPage (page.tsx -- default export)
  └── InstitutionUserList (client component)
        ├── SearchBar (text input for name/email search, debounced 300ms)
        ├── FilterBar
        │     ├── RoleFilter (dropdown: faculty, student, advisor)
        │     └── StatusFilter (dropdown: active, pending, deactivated, all)
        ├── InstitutionUserTable
        │     ├── SortableHeader (click to sort columns)
        │     └── UserRow (name, email, role badge, CD flag, status badge, last login)
        ├── Pagination (page numbers + prev/next)
        └── InviteUserModal (opened via "Invite User" button)
              ├── EmailInput (with validation)
              ├── RoleSelect (faculty | student | advisor)
              ├── CourseDirectorCheckbox (only visible when role=faculty)
              └── SubmitButton (with loading state)
```

**States:**
1. **Loading** -- Skeleton table rows while fetching
2. **Empty** -- "No users found" message with reset filters link
3. **Data** -- Table with users, sortable headers, active filter chips
4. **Error** -- Error message with retry button
5. **Inviting** -- Modal open, submit button shows spinner
6. **Invite Success** -- Toast notification, modal closes, table refreshes

**Design tokens:**
- Surface: `--color-surface-primary` (white card on parchment)
- Role badges: `--badge-faculty`, `--badge-student`, `--badge-advisor`
- Status: active = `--color-success` green, pending = `--color-warning` amber, deactivated = `--color-muted`
- Typography: Source Sans 3 body, DM Mono for email column
- Spacing: `--spacing-4` cell padding, `--spacing-6` section gap
- Modal: `--radius-lg`, `--shadow-lg`, max-width 480px

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/institution-user.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add institution-user export) |
| 3 | `packages/types/src/index.ts` | Types | Edit (add user barrel) |
| 4 | Supabase migration via MCP (indexes) | Database | Apply |
| 5 | `apps/server/src/errors/invitation.error.ts` | Errors | Create |
| 6 | `apps/server/src/services/user/institution-user.service.ts` | Service | Create |
| 7 | `apps/server/src/services/email/user-invitation-email.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/user/institution-user.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add 2 protected routes) |
| 10 | `apps/web/src/app/(protected)/institution/users/page.tsx` | View | Create |
| 11 | `apps/web/src/components/institution/user-list.tsx` | Component | Create |
| 12 | `apps/web/src/components/institution/invite-user-modal.tsx` | Component | Create |
| 13 | `apps/server/src/services/user/__tests__/institution-user.service.test.ts` | Tests | Create |
| 14 | `apps/server/src/controllers/user/__tests__/institution-user.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | RBAC middleware for InstitutionalAdmin scoped enforcement |
| STORY-SA-5 | superadmin | **PENDING** | Creates `institutions` and `invitations` tables |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase client
- `express` -- Server framework
- `vitest` -- Testing
- `zod` -- Request body validation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` -- `createAuthMiddleware()`
- `apps/server/src/middleware/rbac.middleware.ts` -- `createRbacMiddleware()`, `rbac.requireScoped()`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` -- `ApiResponse<T>`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`

---

## 9. Test Fixtures

```typescript
// Mock InstitutionalAdmin user
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Mock faculty user (should be denied)
export const FACULTY_USER = {
  ...INST_ADMIN_USER,
  sub: "faculty-uuid-1",
  email: "faculty@msm.edu",
  role: "faculty" as const,
};

// Mock admin from different institution (should be denied scoped access)
export const OTHER_INST_ADMIN = {
  ...INST_ADMIN_USER,
  sub: "ia-uuid-2",
  email: "admin@howard.edu",
  institution_id: "inst-uuid-2",
};

// Mock institution user list
export const MOCK_INSTITUTION_USERS = [
  {
    id: "user-1",
    email: "jsmith@msm.edu",
    full_name: "Dr. Jane Smith",
    role: "faculty",
    is_course_director: true,
    status: "active" as const,
    last_login_at: "2026-02-18T14:30:00Z",
    created_at: "2026-01-15T09:00:00Z",
  },
  {
    id: "user-2",
    email: "bwilson@msm.edu",
    full_name: "Dr. Brian Wilson",
    role: "faculty",
    is_course_director: false,
    status: "active" as const,
    last_login_at: "2026-02-17T10:00:00Z",
    created_at: "2026-01-20T08:00:00Z",
  },
  {
    id: "inv-1",
    email: "newstudent@msm.edu",
    full_name: "",
    role: "student",
    is_course_director: false,
    status: "pending" as const,
    last_login_at: null,
    created_at: "2026-02-19T10:00:00Z",
  },
];

// Mock invite request
export const MOCK_INVITE_REQUEST = {
  email: "newhire@msm.edu",
  role: "faculty" as const,
  is_course_director: false,
};

// Mock invite response
export const MOCK_INVITE_RESPONSE = {
  invitation_id: "inv-uuid-new",
  email: "newhire@msm.edu",
  role: "faculty",
  expires_at: "2026-03-05T10:00:00Z",
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/user/__tests__/institution-user.service.test.ts`

```
describe("InstitutionUserService")
  describe("list")
    it("returns paginated user list scoped to institution_id")
    it("includes pending invitations in results with status='pending'")
    it("filters by role query parameter")
    it("filters by status query parameter")
    it("searches by name case-insensitively")
    it("searches by email case-insensitively")
    it("sorts by any valid sort field + direction")
    it("caps limit at 100")
    it("returns empty list with correct meta when no users match")
    it("calculates total_pages correctly")
  describe("invite")
    it("creates invitation record with correct institution_id and role")
    it("throws DuplicateInvitationError when active invitation exists for email")
    it("sets expiration to 14 days from now")
    it("calls email service with correct parameters")
    it("throws InvitationError when email belongs to existing user in same institution")
```

**File:** `apps/server/src/controllers/user/__tests__/institution-user.controller.test.ts`

```
describe("InstitutionUserController")
  describe("handleList")
    it("returns 200 with user list for InstitutionalAdmin")
    it("scopes query to req.user.institution_id")
    it("returns 400 for invalid sort_by field")
  describe("handleInvite")
    it("returns 201 with invitation for valid request")
    it("returns 400 when email is missing")
    it("returns 400 when role is invalid")
    it("returns 409 when duplicate invitation exists")
```

**Total: ~17 tests** (15 service + 7 controller - 5 overlap = ~17 unique)

---

## 11. E2E Test Spec (Playwright)

**File:** `apps/web/e2e/institution-users.spec.ts`

```
describe("Institution User Management")
  it("InstitutionalAdmin can view user list and invite a new user")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/users
    3. Verify table displays users
    4. Click "Invite User" button
    5. Fill email, select role
    6. Submit and verify success toast
    7. Verify new pending user appears in table
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. InstitutionalAdmin can access `/institution/users` and see only users from their institution
2. Non-InstitutionalAdmin roles receive 403 Forbidden
3. Admin from a different institution cannot see users from another institution
4. Table displays: name, email, role badge, CD flag, status badge, last login
5. Pending invitations appear in the list with `status='pending'`
6. Columns are sortable (click header to toggle asc/desc)
7. Users can be filtered by role and status
8. Search by name or email works (case-insensitive)
9. Pagination works correctly with 25 items per page
10. Invite modal allows selecting email, role, and optional CD flag
11. Duplicate invitation for same email returns 409
12. Invited user receives email with registration link (logged at MVP)
13. Empty state shown when no users match filters
14. Limit is capped at 100 items per page
15. All 17 API tests pass
16. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Institution-scoped user list | UF-05 User & Role Management |
| InstitutionalAdmin sees only own institution | ARCHITECTURE_v10 4.1: scoped roles |
| User table columns | S-IA-06-1 Acceptance Criteria |
| Invitation flow | S-IA-06-1 Task Breakdown |
| `invitations` table schema | STORY-SA-5 Brief Database Schema |
| RBAC scoped enforcement | STORY-U-6 Brief Implementation Notes |
| Pagination pattern | API_CONTRACT_v1 Conventions |
| profiles table schema | SUPABASE_DDL_v1 user_profiles |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `profiles` and `invitations` tables exist (SA-5 must be complete)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story (DualWrite deferred for invitations)

---

## 15. Implementation Notes

- **Scoped RBAC:** Use `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)` -- this checks both role AND that the user has an `institution_id`. The controller then uses `req.user.institution_id` for all queries.
- **Union query for pending users:** The list combines active profiles with pending invitations. Use Supabase RPC or two separate queries merged in service layer. Two queries is simpler at MVP.
- **Invitation expiry:** Set `expires_at` to 14 days from creation. A background job to expire invitations is out of scope -- check expiry at query time.
- **Email service:** At MVP, `UserInvitationEmailService.sendInvitation()` logs the email payload to console. Wire up actual SMTP/Resend in a future story.
- **CD flag on invite:** The `is_course_director` flag is only meaningful when `role='faculty'`. Validate this in the controller -- reject CD flag for student/advisor roles.
- **No user detail page yet** -- rows are not clickable. Detail page comes in IA-17/IA-18.
- **Private fields pattern:** Service classes use `readonly #supabaseClient: SupabaseClient` with constructor DI per architecture rules.
