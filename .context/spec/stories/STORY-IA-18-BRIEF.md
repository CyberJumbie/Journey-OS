# STORY-IA-18 Brief: Role Assignment & CD Flag

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-18
old_id: S-IA-06-2
lane: institutional_admin
lane_priority: 2
within_lane_order: 18
sprint: 3
size: M
depends_on:
  - STORY-IA-1 (institutional_admin) — User List & Invitation (user detail view context)
blocks: []
personas_served: [institutional_admin]
epic: E-06 (Per-Institution User Management)
feature: F-03 (User & Role Management)
user_flow: UF-05 (User & Role Management)
```

---

## 1. Summary

Build a **role assignment and Course Director flag toggle** feature for the user detail/edit view. An Institutional Admin can change a user's role (faculty, student, advisor) and toggle the Course Director (CD) flag for faculty members. Role changes update both Supabase `app_metadata.role` (via admin API) and the Neo4j Person node via DualWrite. Every role change creates an audit log entry. A confirmation dialog warns before destructive role changes.

Key constraints:
- **Roles:** faculty, student, advisor (InstitutionalAdmin cannot assign superadmin or institutional_admin)
- **CD flag:** Boolean, only meaningful for faculty role. Reject CD flag for non-faculty.
- **JWT claims update:** Role change must update `app_metadata.role` via Supabase admin API
- **DualWrite:** Profile update in Supabase first, Neo4j Person node second
- **Audit log:** Every role change recorded with from_role, to_role, performer
- **Confirmation dialog:** Destructive action warning before role change

---

## 2. Task Breakdown

Implementation order follows: **Types -> Errors -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create role assignment types
- **File:** `packages/types/src/user/role-assignment.types.ts`
- **Action:** Export `AssignRoleRequest`, `ToggleCDFlagRequest`, `RoleChangeAuditLog`, `AssignableRole`

### Task 2: Update user barrel export
- **File:** `packages/types/src/user/index.ts`
- **Action:** Re-export from `role-assignment.types.ts`

### Task 3: Create role assignment error classes
- **File:** `apps/server/src/errors/role-assignment.error.ts`
- **Action:** Create `RoleAssignmentError`, `InvalidRoleError`, `CDFlagNonFacultyError`, `ConcurrentRoleUpdateError` extending `JourneyOSError`

### Task 4: Build RoleAssignmentService
- **File:** `apps/server/src/services/user/role-assignment.service.ts`
- **Action:** `assignRole(userId, newRole, performedBy)` and `toggleCDFlag(userId, isCourseDirector, performedBy)`. Updates Supabase profile + app_metadata, DualWrite to Neo4j, creates audit log.

### Task 5: Build RoleAssignmentController
- **File:** `apps/server/src/controllers/user/role-assignment.controller.ts`
- **Action:** `handleAssignRole(req, res)` and `handleToggleCDFlag(req, res)`. Validates request, ensures institution scoping.

### Task 6: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add `PATCH /api/v1/institution/users/:id/role` and `PATCH /api/v1/institution/users/:id/cd-flag` with InstitutionalAdmin RBAC

### Task 7: Build user detail page
- **File:** `apps/web/src/app/(protected)/institution/users/[id]/page.tsx`
- **Action:** Default export page with user detail, role select, CD flag toggle

### Task 8: Build RoleSelect component
- **File:** `apps/web/src/components/institution/role-select.tsx`
- **Action:** Dropdown with faculty, student, advisor options

### Task 9: Build CDFlagToggle component
- **File:** `apps/web/src/components/institution/cd-flag-toggle.tsx`
- **Action:** Toggle switch, only visible when role is faculty

### Task 10: Write service tests
- **File:** `apps/server/src/services/user/__tests__/role-assignment.service.test.ts`
- **Action:** 10 tests covering role update, CD flag, dual-write, auth, audit

### Task 11: Write controller tests
- **File:** `apps/server/src/controllers/user/__tests__/role-assignment.controller.test.ts`
- **Action:** 5 tests covering validation, RBAC, institution scoping

---

## 3. Data Model

```typescript
// packages/types/src/user/role-assignment.types.ts

/** Roles that an InstitutionalAdmin can assign */
export type AssignableRole = "faculty" | "student" | "advisor";

/** Request to assign a new role to a user */
export interface AssignRoleRequest {
  readonly role: AssignableRole;
}

/** Request to toggle the Course Director flag */
export interface ToggleCDFlagRequest {
  readonly is_course_director: boolean;
}

/** Audit log entry for role changes */
export interface RoleChangeAuditLog {
  readonly id: string;
  readonly user_id: string;
  readonly institution_id: string;
  readonly change_type: "role_change" | "cd_flag_change";
  readonly from_value: string;
  readonly to_value: string;
  readonly performed_by: string;
  readonly created_at: string;
}

/** User detail with role info for the edit view */
export interface UserRoleDetail {
  readonly id: string;
  readonly email: string;
  readonly full_name: string;
  readonly role: AssignableRole;
  readonly is_course_director: boolean;
  readonly is_active: boolean;
  readonly institution_id: string;
  readonly last_login_at: string | null;
  readonly created_at: string;
}
```

---

## 4. Database Schema

```sql
-- Migration: create_role_change_audit_log
CREATE TABLE role_change_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('role_change', 'cd_flag_change')),
  from_value TEXT NOT NULL,
  to_value TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_role_audit_user
  ON role_change_audit_log(user_id, created_at DESC);
CREATE INDEX idx_role_audit_institution
  ON role_change_audit_log(institution_id, created_at DESC);

-- RLS
ALTER TABLE role_change_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY role_audit_institution_scope ON role_change_audit_log
  USING (institution_id = current_setting('app.institution_id')::UUID);
```

**Existing tables modified:**
```
profiles (
  -- role TEXT  (already exists, updated on role change)
  -- is_course_director BOOLEAN  (already exists, toggled)
)
```

**Neo4j update:**
```cypher
// Update Person node role
MATCH (p:Person {id: $userId})
SET p.role = $newRole, p.updated_at = datetime()

// Update Person node CD flag
MATCH (p:Person {id: $userId})
SET p.is_course_director = $isCourseDirector, p.updated_at = datetime()
```

---

## 5. API Contract

### PATCH /api/v1/institution/users/:id/role (Auth: InstitutionalAdmin)

**Request Body:**
```json
{ "role": "faculty" }
```

**Success Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid-1",
    "role": "faculty",
    "previous_role": "student",
    "audit_log_id": "audit-uuid-1"
  },
  "error": null
}
```

### PATCH /api/v1/institution/users/:id/cd-flag (Auth: InstitutionalAdmin)

**Request Body:**
```json
{ "is_course_director": true }
```

**Success Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid-1",
    "is_course_director": true,
    "audit_log_id": "audit-uuid-2"
  },
  "error": null
}
```

### GET /api/v1/institution/users/:id (Auth: InstitutionalAdmin)

**Success Response (200):**
```json
{
  "data": {
    "id": "user-uuid-1",
    "email": "jsmith@msm.edu",
    "full_name": "Dr. Jane Smith",
    "role": "faculty",
    "is_course_director": true,
    "is_active": true,
    "institution_id": "inst-uuid-1",
    "last_login_at": "2026-02-18T14:30:00Z",
    "created_at": "2026-01-15T09:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin or wrong institution |
| 400 | `INVALID_ROLE` | Role not in (faculty, student, advisor) |
| 400 | `CD_FLAG_NON_FACULTY` | Trying to set CD flag on non-faculty user |
| 404 | `NOT_FOUND` | User not found in this institution |
| 409 | `CONCURRENT_UPDATE` | Optimistic lock conflict |

---

## 6. Frontend Spec

### Page: `/institution/users/[id]` (User Detail)

**Route:** `apps/web/src/app/(protected)/institution/users/[id]/page.tsx`

**Component hierarchy:**
```
UserDetailPage (page.tsx -- default export)
  └── UserDetailView (client component)
        ├── UserInfoHeader (name, email, status badge, last login)
        ├── RoleSelect (dropdown: faculty, student, advisor)
        ├── CDFlagToggle (toggle switch, only visible when role=faculty)
        ├── RoleChangeConfirmModal
        │     ├── ImpactWarning ("Changing role from X to Y will...")
        │     ├── ConfirmButton
        │     └── CancelButton
        ├── DeactivateButton (from STORY-IA-17)
        └── AuditHistory (list of recent role changes, read-only)
```

**States:**
1. **Loading** -- Skeleton layout while fetching user detail
2. **Viewing** -- User detail displayed with current role and CD flag
3. **Editing** -- Role dropdown or CD toggle changed, confirm modal opens
4. **Submitting** -- Confirm button disabled with spinner
5. **Success** -- Toast notification, data refreshed
6. **Error** -- Inline error message

**Design tokens:**
- Role badges: `--badge-faculty` green, `--badge-student` blue, `--badge-advisor` purple
- CD flag toggle: `--color-primary` Navy Deep when active
- Confirmation modal: `--radius-lg`, `--shadow-lg`, max-width 480px
- Warning text: `--color-warning` amber for destructive role changes

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/role-assignment.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add role-assignment export) |
| 3 | Supabase migration via MCP (role audit log table) | Database | Apply |
| 4 | `apps/server/src/errors/role-assignment.error.ts` | Errors | Create |
| 5 | `apps/server/src/services/user/role-assignment.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/user/role-assignment.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add role assignment routes) |
| 8 | `apps/web/src/app/(protected)/institution/users/[id]/page.tsx` | View | Create |
| 9 | `apps/web/src/components/institution/role-select.tsx` | Component | Create |
| 10 | `apps/web/src/components/institution/cd-flag-toggle.tsx` | Component | Create |
| 11 | `apps/server/src/services/user/__tests__/role-assignment.service.test.ts` | Tests | Create |
| 12 | `apps/server/src/controllers/user/__tests__/role-assignment.controller.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-1 | institutional_admin | **PENDING** | User list page exists, provides navigation to user detail |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase admin API for app_metadata update
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing
- `zod` -- Request validation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()` (needs admin client)
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`
- `packages/types/src/auth/roles.types.ts` -- `AuthRole`

---

## 9. Test Fixtures

```typescript
import { AssignRoleRequest, ToggleCDFlagRequest, RoleChangeAuditLog } from "@journey-os/types";

// Mock InstitutionalAdmin performing the action
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
};

// Mock target user (currently a student)
export const TARGET_STUDENT = {
  id: "user-uuid-1",
  email: "student@msm.edu",
  full_name: "Alex Johnson",
  role: "student" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  is_active: true,
};

// Mock target user (currently faculty without CD)
export const TARGET_FACULTY = {
  id: "user-uuid-2",
  email: "faculty@msm.edu",
  full_name: "Dr. Jane Smith",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  is_active: true,
};

// Mock target user from different institution
export const OTHER_INST_USER = {
  ...TARGET_STUDENT,
  id: "user-uuid-3",
  institution_id: "inst-uuid-2",
};

// Valid role assignment request
export const VALID_ROLE_REQUEST: AssignRoleRequest = {
  role: "faculty",
};

// Valid CD flag toggle request
export const VALID_CD_FLAG_REQUEST: ToggleCDFlagRequest = {
  is_course_director: true,
};

// Invalid role request
export const INVALID_ROLE_REQUEST = {
  role: "superadmin", // Not assignable by InstitutionalAdmin
};

// Mock audit log entry
export const MOCK_ROLE_AUDIT: RoleChangeAuditLog = {
  id: "audit-uuid-1",
  user_id: "user-uuid-1",
  institution_id: "inst-uuid-1",
  change_type: "role_change",
  from_value: "student",
  to_value: "faculty",
  performed_by: "ia-uuid-1",
  created_at: "2026-02-19T14:00:00Z",
};

// Mock Supabase admin update response
export const MOCK_ADMIN_UPDATE_RESPONSE = {
  data: { user: { id: "user-uuid-1", app_metadata: { role: "faculty" } } },
  error: null,
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/user/__tests__/role-assignment.service.test.ts`

```
describe("RoleAssignmentService")
  describe("assignRole")
    it("updates profile role in Supabase")
    it("updates app_metadata.role via Supabase admin API")
    it("updates Neo4j Person node role via DualWrite")
    it("creates audit log entry with from_role and to_role")
    it("throws InvalidRoleError for non-assignable roles (superadmin, institutional_admin)")
    it("throws NotFoundError when user not in admin's institution")
    it("clears CD flag when role changed FROM faculty to non-faculty")
  describe("toggleCDFlag")
    it("sets is_course_director=true on faculty user")
    it("throws CDFlagNonFacultyError when user is not faculty")
    it("creates audit log entry for CD flag change")
    it("updates Neo4j Person node is_course_director via DualWrite")
```

**File:** `apps/server/src/controllers/user/__tests__/role-assignment.controller.test.ts`

```
describe("RoleAssignmentController")
  describe("handleAssignRole")
    it("returns 200 with updated role for valid request")
    it("returns 400 for invalid role value")
    it("returns 403 for non-InstitutionalAdmin")
  describe("handleToggleCDFlag")
    it("returns 200 with updated CD flag")
    it("returns 400 when target user is not faculty")
```

**Total: ~16 tests** (11 service + 5 controller)

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/role-assignment.spec.ts`

```
describe("Role Assignment")
  it("InstitutionalAdmin can change a user's role and toggle CD flag")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/users
    3. Click on a user row to view detail
    4. Change role from student to faculty via dropdown
    5. Confirm in confirmation dialog
    6. Verify role badge updates
    7. Toggle CD flag on (now visible for faculty)
    8. Verify CD flag is checked
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Role dropdown shows faculty, student, advisor options on user detail view
2. Role change updates Supabase profile and app_metadata.role
3. Role change updates Neo4j Person node via DualWrite
4. CD flag toggle visible only for faculty role users
5. CD flag stored in profile and Neo4j Person node
6. CD flag grants additional permissions (course creation, SLO management)
7. Confirmation dialog shown before role change
8. Audit log entry created for every role change and CD flag change
9. Invalid roles (superadmin, institutional_admin) are rejected with 400
10. CD flag on non-faculty user is rejected with 400
11. Clearing CD flag when demoting from faculty role
12. All 16 API tests pass
13. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Role dropdown options | S-IA-06-2 Acceptance Criteria |
| CD flag separate from role | S-IA-06-2 Notes |
| JWT claims update via admin API | S-IA-06-2 Notes |
| Audit log for compliance | S-IA-06-2 Notes |
| DualWrite pattern | CLAUDE.md Database Rules |
| Confirmation dialog for destructive actions | S-IA-06-2 Acceptance Criteria |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `profiles` table exists with `role` and `is_course_director` columns
- **Neo4j:** Instance running with Person nodes
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Supabase service role key** needed for admin API calls (`auth.admin.updateUserById`)
- **STORY-IA-1 must be complete** -- user list page provides navigation context

---

## 15. Implementation Notes

- **app_metadata update:** Use `supabase.auth.admin.updateUserById(userId, { app_metadata: { role: newRole } })`. This updates the JWT claims. The user's next token refresh will include the new role.
- **CD flag auto-clear:** When changing a user's role FROM faculty to student/advisor, automatically set `is_course_director = false`. A student cannot be a Course Director.
- **Optimistic locking:** Consider adding a `version` or `updated_at` check to prevent concurrent role updates. If two admins edit the same user simultaneously, the second should get a 409 Conflict.
- **No self-role-change:** An InstitutionalAdmin should not be able to change their own role (they'd lose access). Validate `req.user.sub !== req.params.id` for role changes.
- **Assignable roles:** Only `faculty`, `student`, `advisor` are assignable. The `superadmin` and `institutional_admin` roles cannot be assigned through this UI -- they require platform-level operations.
- **Private fields pattern:** `RoleAssignmentService` uses `readonly #supabaseClient`, `readonly #supabaseAdmin`, `readonly #neo4jClient` with constructor DI.
- **Audit log table:** Separate from the deactivation audit log (STORY-IA-17). Role changes need `from_value` and `to_value` fields which are different from deactivation's `reason` field.
