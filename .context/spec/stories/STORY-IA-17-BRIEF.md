# STORY-IA-17 Brief: User Deactivation

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-17
old_id: S-IA-06-3
lane: institutional_admin
lane_priority: 2
within_lane_order: 17
sprint: 3
size: S
depends_on:
  - STORY-IA-1 (institutional_admin) — User List & Invitation (user detail context)
blocks: []
personas_served: [institutional_admin]
epic: E-06 (Per-Institution User Management)
feature: F-03 (User & Role Management)
user_flow: UF-05 (User & Role Management)
```

---

## 1. Summary

Build a **user deactivation** feature that allows an Institutional Admin to soft-delete a user within their institution. Deactivation sets `status='deactivated'` on the profile, disables the user's Supabase auth account (bans the user), and updates the Neo4j Person node via DualWrite. Deactivated users cannot log in but their data is preserved for audit and potential reactivation. A reactivation option reverses the process. Both actions create audit log entries.

Key constraints:
- **Soft-delete only** -- never hard-delete user records
- **Supabase admin API:** `supabase.auth.admin.updateUserById(id, { banned: true })` for deactivation
- **DualWrite:** Update both Supabase profiles and Neo4j Person node status
- **Reactivation** reverses the ban and sets `status='active'`
- **Cascade effects:** Deactivated faculty should not appear in course assignment dropdowns
- **Audit log:** Every deactivation/reactivation recorded with who, when, reason

---

## 2. Task Breakdown

Implementation order follows: **Types -> Errors -> Service -> Controller -> Routes -> Frontend -> Tests**

### Task 1: Create deactivation types
- **File:** `packages/types/src/user/deactivation.types.ts`
- **Action:** Export `DeactivateUserRequest`, `ReactivateUserRequest`, `DeactivationAuditLog`

### Task 2: Update user barrel export
- **File:** `packages/types/src/user/index.ts`
- **Action:** Re-export from `deactivation.types.ts`

### Task 3: Create deactivation error classes
- **File:** `apps/server/src/errors/deactivation.error.ts`
- **Action:** Create `DeactivationError`, `UserAlreadyDeactivatedError`, `UserAlreadyActiveError`, `CannotDeactivateSelfError` extending `JourneyOSError`

### Task 4: Build UserDeactivationService
- **File:** `apps/server/src/services/user/user-deactivation.service.ts`
- **Action:** `deactivate(userId, reason, deactivatedBy)` and `reactivate(userId, reactivatedBy)`. Uses Supabase admin API to ban/unban, updates profile status, DualWrite to Neo4j, creates audit log.

### Task 5: Build UserDeactivationController
- **File:** `apps/server/src/controllers/user/user-deactivation.controller.ts`
- **Action:** `handleDeactivate(req, res)` and `handleReactivate(req, res)`. Validates request, ensures institutional scoping.

### Task 6: Register routes
- **File:** `apps/server/src/index.ts`
- **Action:** Add `PATCH /api/v1/institution/users/:id/deactivate` and `PATCH /api/v1/institution/users/:id/reactivate` with InstitutionalAdmin RBAC

### Task 7: Build DeactivationConfirmModal
- **File:** `apps/web/src/components/institution/deactivation-confirm-modal.tsx`
- **Action:** Confirmation dialog showing user name, role, impact summary, and required reason textarea

### Task 8: Write service tests
- **File:** `apps/server/src/services/user/__tests__/user-deactivation.service.test.ts`
- **Action:** 5 tests covering deactivation, login prevention, reactivation, auth enforcement, audit log

---

## 3. Data Model

```typescript
// packages/types/src/user/deactivation.types.ts

/** Request to deactivate a user */
export interface DeactivateUserRequest {
  readonly reason: string;  // Required -- why is this user being deactivated?
}

/** Request to reactivate a user (no body needed, but included for consistency) */
export interface ReactivateUserRequest {
  readonly note?: string;   // Optional reactivation note
}

/** Audit log entry for deactivation/reactivation */
export interface DeactivationAuditLog {
  readonly id: string;
  readonly user_id: string;
  readonly action: "deactivated" | "reactivated";
  readonly performed_by: string;
  readonly reason: string | null;
  readonly note: string | null;
  readonly created_at: string;
}

/** Impact summary for the confirmation dialog */
export interface DeactivationImpact {
  readonly user_name: string;
  readonly role: string;
  readonly is_course_director: boolean;
  readonly active_courses: number;      // Courses they direct (if CD)
  readonly pending_proposals: number;   // Unresolved FULFILLS proposals
}
```

---

## 4. Database Schema

```sql
-- Migration: create_deactivation_audit_log
CREATE TABLE deactivation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  action TEXT NOT NULL CHECK (action IN ('deactivated', 'reactivated')),
  performed_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deactivation_audit_user
  ON deactivation_audit_log(user_id, created_at DESC);
CREATE INDEX idx_deactivation_audit_institution
  ON deactivation_audit_log(institution_id, created_at DESC);

-- RLS
ALTER TABLE deactivation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY deactivation_audit_institution_scope ON deactivation_audit_log
  USING (institution_id = current_setting('app.institution_id')::UUID);
```

**Existing tables modified:**
```
profiles (
  -- is_active BOOLEAN DEFAULT true  (already exists)
  -- Used: SET is_active = false for deactivation
)
```

**Neo4j update:**
```cypher
// Deactivate Person node
MATCH (p:Person {id: $userId})
SET p.status = 'deactivated', p.deactivated_at = datetime()

// Reactivate Person node
MATCH (p:Person {id: $userId})
SET p.status = 'active', p.deactivated_at = null
```

---

## 5. API Contract

### PATCH /api/v1/institution/users/:id/deactivate (Auth: InstitutionalAdmin)

**Request Body:**
```json
{ "reason": "Faculty member has left the institution" }
```

**Success Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid-1",
    "status": "deactivated",
    "deactivated_at": "2026-02-19T14:00:00Z",
    "audit_log_id": "audit-uuid-1"
  },
  "error": null
}
```

### PATCH /api/v1/institution/users/:id/reactivate (Auth: InstitutionalAdmin)

**Request Body:**
```json
{ "note": "Faculty member returning for spring semester" }
```

**Success Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid-1",
    "status": "active",
    "reactivated_at": "2026-02-19T15:00:00Z",
    "audit_log_id": "audit-uuid-2"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-InstitutionalAdmin or wrong institution |
| 400 | `VALIDATION_ERROR` | Missing reason for deactivation |
| 404 | `NOT_FOUND` | User not found in this institution |
| 409 | `ALREADY_DEACTIVATED` | User is already deactivated |
| 409 | `ALREADY_ACTIVE` | User is already active |
| 422 | `CANNOT_DEACTIVATE_SELF` | Admin trying to deactivate themselves |

---

## 6. Frontend Spec

### Component: DeactivationConfirmModal

**File:** `apps/web/src/components/institution/deactivation-confirm-modal.tsx`

**Component hierarchy:**
```
DeactivationConfirmModal (client component)
  ├── ImpactSummary
  │     ├── UserName + Role badge
  │     ├── CoursesAffected (count if CD)
  │     └── WarningMessage ("This user will lose access immediately")
  ├── ReasonTextarea (required, min 10 characters)
  ├── CancelButton
  └── ConfirmButton (destructive variant, red)
```

**States:**
1. **Idle** -- Modal closed
2. **Open** -- Modal visible with impact summary and reason input
3. **Submitting** -- Confirm button disabled with spinner
4. **Success** -- Toast notification, modal closes, table refreshes
5. **Error** -- Inline error message below the form

**Design tokens:**
- Destructive button: `--color-destructive` red variant
- Warning text: `--color-warning` amber
- Modal: `--radius-lg`, `--shadow-lg`, max-width 480px
- Spacing: `--spacing-4` form gaps, `--spacing-6` section gaps

---

## 7. Files to Create

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/deactivation.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add deactivation export) |
| 3 | Supabase migration via MCP (audit log table) | Database | Apply |
| 4 | `apps/server/src/errors/deactivation.error.ts` | Errors | Create |
| 5 | `apps/server/src/services/user/user-deactivation.service.ts` | Service | Create |
| 6 | `apps/server/src/controllers/user/user-deactivation.controller.ts` | Controller | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add deactivation routes) |
| 8 | `apps/web/src/components/institution/deactivation-confirm-modal.tsx` | Component | Create |
| 9 | `apps/server/src/services/user/__tests__/user-deactivation.service.test.ts` | Tests | Create |

---

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-IA-1 | institutional_admin | **PENDING** | User list page provides the context where deactivate button lives |

### NPM Packages (already installed)
- `@supabase/supabase-js` -- Supabase admin API for ban/unban
- `neo4j-driver` -- Neo4j driver for DualWrite
- `vitest` -- Testing
- `zod` -- Request validation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` -- `getSupabaseClient()` (needs admin client)
- `apps/server/src/config/neo4j.config.ts` -- `Neo4jClientConfig`
- `apps/server/src/middleware/rbac.middleware.ts` -- `rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN)`
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError`

---

## 9. Test Fixtures

```typescript
import { DeactivateUserRequest, DeactivationAuditLog } from "@journey-os/types";

// Mock InstitutionalAdmin performing the action
export const INST_ADMIN_USER = {
  sub: "ia-uuid-1",
  email: "admin@msm.edu",
  role: "institutional_admin" as const,
  institution_id: "inst-uuid-1",
  is_course_director: false,
};

// Mock target user to deactivate
export const TARGET_USER = {
  id: "user-uuid-1",
  email: "faculty@msm.edu",
  full_name: "Dr. Jane Smith",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
  is_course_director: true,
  is_active: true,
};

// Mock already deactivated user
export const DEACTIVATED_USER = {
  ...TARGET_USER,
  id: "user-uuid-2",
  is_active: false,
};

// Mock user from different institution
export const OTHER_INST_USER = {
  ...TARGET_USER,
  id: "user-uuid-3",
  institution_id: "inst-uuid-2",
};

// Valid deactivation request
export const VALID_DEACTIVATION: DeactivateUserRequest = {
  reason: "Faculty member has left the institution effective January 2026",
};

// Mock audit log entry
export const MOCK_AUDIT_LOG: DeactivationAuditLog = {
  id: "audit-uuid-1",
  user_id: "user-uuid-1",
  action: "deactivated",
  performed_by: "ia-uuid-1",
  reason: "Faculty member has left the institution effective January 2026",
  note: null,
  created_at: "2026-02-19T14:00:00Z",
};

// Mock Supabase admin ban response
export const MOCK_BAN_RESPONSE = {
  data: { user: { id: "user-uuid-1", banned: true } },
  error: null,
};
```

---

## 10. API Test Spec

**File:** `apps/server/src/services/user/__tests__/user-deactivation.service.test.ts`

```
describe("UserDeactivationService")
  describe("deactivate")
    it("sets profile is_active=false in Supabase")
    it("bans user via Supabase admin API (auth.admin.updateUserById with banned:true)")
    it("updates Neo4j Person node status to 'deactivated' via DualWrite")
    it("creates audit log entry with reason, performer, and timestamp")
    it("throws UserAlreadyDeactivatedError when user is already deactivated")
    it("throws CannotDeactivateSelfError when admin tries to deactivate themselves")
    it("throws NotFoundError when user does not belong to admin's institution")
  describe("reactivate")
    it("sets profile is_active=true in Supabase")
    it("unbans user via Supabase admin API (auth.admin.updateUserById with banned:false)")
    it("updates Neo4j Person node status to 'active' via DualWrite")
    it("creates audit log entry for reactivation")
    it("throws UserAlreadyActiveError when user is already active")
```

**Total: ~12 tests**

---

## 11. E2E Test Spec

**File:** `apps/web/e2e/user-deactivation.spec.ts`

```
describe("User Deactivation")
  it("InstitutionalAdmin can deactivate a user and see deactivated status badge")
    1. Login as InstitutionalAdmin demo account
    2. Navigate to /institution/users
    3. Click on an active user row
    4. Click "Deactivate" button
    5. Enter reason in confirmation modal
    6. Submit and verify success toast
    7. Verify user shows 'deactivated' status badge in list
```

**Total: 1 E2E test**

---

## 12. Acceptance Criteria

1. Deactivate button visible on user detail view with confirmation dialog
2. Confirmation dialog shows user name, role, and impact summary
3. Soft-delete: sets `is_active=false`, does not remove records
4. Deactivated users cannot log in (Supabase auth banned)
5. Deactivated users appear in list with 'deactivated' status badge
6. DualWrite updates both Supabase profile and Neo4j Person node
7. Reactivation reverses the ban and sets `is_active=true`
8. Audit log entry created for every deactivation and reactivation
9. Admin cannot deactivate themselves (422 error)
10. All 12 API tests pass
11. 1 E2E test passes

---

## 13. Source References

| Claim | Source |
|-------|--------|
| Soft-delete pattern | S-IA-06-3 Notes |
| Supabase admin ban API | S-IA-06-3 Notes: `auth.admin.updateUserById` |
| Reactivation reverses ban | S-IA-06-3 Notes |
| Cascade effects on deactivation | S-IA-06-3 Notes |
| Audit log fields | S-IA-06-3 Acceptance Criteria |
| DualWrite pattern | CLAUDE.md Database Rules |

---

## 14. Environment Prerequisites

- **Supabase:** Project running, `profiles` table exists with `is_active` column
- **Neo4j:** Instance running with Person nodes
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Supabase service role key** needed for admin API calls (`auth.admin.updateUserById`)
- **STORY-IA-1 must be complete** -- user list page exists

---

## 15. Implementation Notes

- **Supabase admin API:** Use the service role client (not the anon/user client) for `supabase.auth.admin.updateUserById(userId, { banned: true })`. The service role key must be available in server environment.
- **Cannot deactivate self:** Check `req.user.sub !== req.params.id` before proceeding. Throw `CannotDeactivateSelfError` if they match. An admin locking themselves out is a support nightmare.
- **Institution scoping:** Verify the target user belongs to the same institution as the admin. Use the profiles table `WHERE id = $userId AND institution_id = $institutionId`.
- **Cascade awareness:** When deactivating a Course Director, downstream features should filter out deactivated users from assignment dropdowns. This story does NOT implement the filter -- it just sets the status. Downstream queries should check `is_active=true`.
- **Reason field:** Required for deactivation (min 10 characters), stored in audit log. This is for compliance -- institutions need to document why access was revoked.
- **Private fields pattern:** `UserDeactivationService` uses `readonly #supabaseClient`, `readonly #supabaseAdmin`, `readonly #neo4jClient` with constructor DI.
- **Reactivation:** The same service handles reactivation. It's the reverse operation: `banned: false`, `is_active: true`, Neo4j `status: 'active'`.
