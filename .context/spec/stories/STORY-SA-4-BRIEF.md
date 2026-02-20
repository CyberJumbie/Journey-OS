# STORY-SA-4 Brief: User Reassignment

## 0. Lane & Priority

```yaml
story_id: STORY-SA-4
old_id: S-SA-07-2
lane: superadmin
lane_priority: 1
within_lane_order: 4
sprint: 3
size: M
depends_on:
  - STORY-SA-2 (superadmin) — Global User Directory ✅ DONE
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks: []
personas_served: [superadmin]
epic: E-07 (Cross-Institution User Management)
feature: F-03 (User & Role Management)
user_flow: UF-06 (Cross-Institution User Management)
```

## 1. Summary

Build a **user reassignment** feature that allows SuperAdmin to move a user from one institution to another. Accessible from the global user directory (SA-2), this feature updates the user's `institution_id` in Supabase `profiles`, updates the Neo4j `BELONGS_TO` relationship via DualWrite, archives the user's course memberships from the old institution, resets the Course Director flag (institution-scoped), logs an audit trail, and sends a notification email to the affected user.

This is the final story in the E-07 (Cross-Institution User Management) epic: SA-2 (directory) → **SA-4 (reassignment)**.

Key constraints:
- **SuperAdmin only** — RBAC enforced
- DualWrite: Supabase first → Neo4j second → `sync_status` tracking
- Cannot reassign to same institution (400 error)
- Course memberships archived, not deleted
- Course Director flag reset on reassignment (CD is institution-scoped)
- Audit log entry created in `audit_log` table
- Concurrent reassignment guard (optimistic locking via `updated_at`)

## 2. Task Breakdown

1. **Types** — Create `UserReassignmentRequest`, `UserReassignmentResult` in `packages/types/src/user/reassignment.types.ts`
2. **Error classes** — `SameInstitutionError`, `UserReassignmentError`, `InstitutionNotFoundError` in `apps/server/src/errors/reassignment.error.ts`
3. **Service** — `UserReassignmentService` with `reassign()` method handling the full pipeline
4. **Email service** — `ReassignmentEmailService` with `sendNotification()` — stubbed for Sprint 3, logs to console
5. **Controller** — `UserReassignmentController` with `handleReassign()` method
6. **Routes** — Protected route `POST /api/v1/admin/users/:userId/reassign` with RBAC
7. **Frontend page** — Reassignment confirmation modal accessible from user detail
8. **Wire up** — Register route in `apps/server/src/index.ts` after auth middleware
9. **API tests** — 16 tests covering reassignment, dual-write, audit, errors, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/user/reassignment.types.ts

/** Request body for user reassignment */
export interface UserReassignmentRequest {
  readonly target_institution_id: string;
  readonly reason?: string;
}

/** Result returned after successful reassignment */
export interface UserReassignmentResult {
  readonly user_id: string;
  readonly from_institution_id: string;
  readonly from_institution_name: string;
  readonly to_institution_id: string;
  readonly to_institution_name: string;
  readonly courses_archived: number;
  readonly course_director_reset: boolean;
  readonly audit_log_id: string;
  readonly reassigned_at: string;
}

/** Shape of the audit_log entry for reassignment */
export interface ReassignmentAuditEntry {
  readonly user_id: string;
  readonly action: "user_reassignment";
  readonly entity_type: "profile";
  readonly entity_id: string;
  readonly old_values: {
    readonly institution_id: string;
    readonly is_course_director: boolean;
  };
  readonly new_values: {
    readonly institution_id: string;
    readonly is_course_director: boolean;
  };
  readonly metadata: {
    readonly from_institution_name: string;
    readonly to_institution_name: string;
    readonly courses_archived: number;
    readonly reason: string | null;
  };
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Uses existing tables:

```sql
-- Existing tables used:

-- profiles (update institution_id, is_course_director)
-- profiles.institution_id UUID FK -> institutions(id)
-- profiles.is_course_director BOOLEAN DEFAULT false
-- profiles.updated_at TIMESTAMPTZ DEFAULT NOW()

-- institutions (lookup source and target)
-- institutions.id UUID PK
-- institutions.name TEXT
-- institutions.status TEXT CHECK ('waitlisted'|'approved'|'suspended')

-- course_members (archive old institution courses)
-- course_members.id UUID PK
-- course_members.course_id UUID FK -> courses(id)
-- course_members.user_id UUID FK -> profiles(id)
-- course_members.role TEXT CHECK ('student'|'faculty'|'ta'|'observer')
-- course_members.enrolled_at TIMESTAMPTZ

-- audit_log (record reassignment event)
-- audit_log.id UUID PK
-- audit_log.user_id UUID FK -> profiles(id)
-- audit_log.action TEXT
-- audit_log.entity_type TEXT
-- audit_log.entity_id UUID
-- audit_log.old_values JSONB
-- audit_log.new_values JSONB
-- audit_log.metadata JSONB
-- audit_log.ip_address INET
-- audit_log.user_agent TEXT
-- audit_log.created_at TIMESTAMPTZ

-- NOTE: course_members table does NOT have a `status` column.
-- To archive, DELETE rows for old institution courses (not soft-delete).
-- Alternatively, the story can add a `status` column via migration.
```

**Migration needed — add status column to course_members for soft archival:**
```sql
-- Migration: add_status_to_course_members
ALTER TABLE course_members
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'archived'));

CREATE INDEX IF NOT EXISTS idx_course_members_user_status
  ON course_members(user_id, status);
```

## 5. API Contract (complete request/response)

### POST /api/v1/admin/users/:userId/reassign (Auth: SuperAdmin only)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `userId` | string (UUID) | The profile ID of the user to reassign |

**Request Body:**
```json
{
  "target_institution_id": "inst-uuid-2",
  "reason": "Faculty transfer to partner institution"
}
```

**Success Response (200):**
```json
{
  "data": {
    "user_id": "user-uuid-1",
    "from_institution_id": "inst-uuid-1",
    "from_institution_name": "Morehouse School of Medicine",
    "to_institution_id": "inst-uuid-2",
    "to_institution_name": "Howard University College of Medicine",
    "courses_archived": 3,
    "course_director_reset": true,
    "audit_log_id": "audit-uuid-1",
    "reassigned_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-SuperAdmin role |
| 400 | `SAME_INSTITUTION` | Target institution = current institution |
| 400 | `VALIDATION_ERROR` | Missing target_institution_id, invalid UUID |
| 404 | `USER_NOT_FOUND` | User ID does not exist |
| 404 | `INSTITUTION_NOT_FOUND` | Target institution ID does not exist or not approved |
| 409 | `CONCURRENT_MODIFICATION` | User was modified by another admin (stale `updated_at`) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Reassignment Modal (accessible from Global User Directory)

**Trigger:** "Reassign" button on user row or user detail view in `/admin/users`

**Component hierarchy:**
```
ReassignmentConfirmModal (organism — client component)
  ├── UserSummary (current user info: name, email, current institution)
  ├── InstitutionSelect (dropdown of active institutions, excluding current)
  ├── ReasonInput (optional text area)
  ├── ImpactSummary (computed after institution selected)
  │     ├── "X active course memberships will be archived"
  │     ├── "Course Director flag will be reset" (if applicable)
  │     └── "User will receive a notification email"
  ├── ConfirmButton ("Reassign User" — primary, destructive styling)
  └── CancelButton
```

**States:**
1. **Idle** — Modal open, institution dropdown populated, no selection
2. **Selected** — Institution chosen, impact summary computed
3. **Confirming** — Loading spinner on confirm button, form disabled
4. **Success** — Success toast, modal closes, table refreshes
5. **Error** — Error message inline (same institution, not found, etc.)

**Design tokens:**
- Destructive action button: `error-red` background
- Impact summary: `warning-yellow` background card
- Typography: Source Sans 3

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/user/reassignment.types.ts` | Types | Create |
| 2 | `packages/types/src/user/index.ts` | Types | Edit (add reassignment export) |
| 3 | Supabase migration via MCP (course_members status column) | Database | Apply |
| 4 | `apps/server/src/errors/reassignment.error.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 6 | `apps/server/src/services/email/reassignment-email.service.ts` | Service | Create (stub) |
| 7 | `apps/server/src/services/user/user-reassignment.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/user/user-reassignment.controller.ts` | Controller | Create |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add protected route) |
| 10 | `apps/web/src/components/admin/reassignment-confirm-modal.tsx` | Component | Create |
| 11 | `apps/web/src/components/admin/global-user-directory.tsx` | Component | Edit (add Reassign button) |
| 12 | `apps/server/src/__tests__/user-reassignment.controller.test.ts` | Tests | Create |
| 13 | `apps/server/src/__tests__/user-reassignment.service.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-2 | superadmin | **DONE** | Global User Directory — the UI entry point for reassignment |
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.SUPERADMIN)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `packages/types/src/institution/institution.types.ts` — `Institution`, `InstitutionStatus`
- `apps/web/src/components/admin/global-user-directory.tsx` — Existing directory component (add reassign button)

### Neo4j (optional for Sprint 3)
- Neo4j dual-write for `BELONGS_TO` relationship is part of the spec but can be implemented as a no-op stub if Neo4j is not running. Mark `sync_status` field on profile for future sync.

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

// Mock target user for reassignment
export const MOCK_TARGET_USER = {
  id: "user-1",
  email: "jsmith@msm.edu",
  full_name: "Dr. Jane Smith",
  role: "faculty",
  is_course_director: true,
  is_active: true,
  institution_id: "inst-1",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock institutions
export const MOCK_SOURCE_INSTITUTION = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
  status: "approved",
};

export const MOCK_TARGET_INSTITUTION = {
  id: "inst-2",
  name: "Howard University College of Medicine",
  domain: "howard.edu",
  status: "approved",
};

// Mock course memberships to archive
export const MOCK_COURSE_MEMBERSHIPS = [
  { id: "cm-1", course_id: "course-1", user_id: "user-1", role: "faculty", status: "active" },
  { id: "cm-2", course_id: "course-2", user_id: "user-1", role: "faculty", status: "active" },
  { id: "cm-3", course_id: "course-3", user_id: "user-1", role: "faculty", status: "active" },
];

// Valid reassignment request
export const VALID_REASSIGNMENT = {
  target_institution_id: "inst-2",
  reason: "Faculty transfer to partner institution",
};

// Invalid: same institution
export const SAME_INSTITUTION_REASSIGNMENT = {
  target_institution_id: "inst-1",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/user-reassignment.controller.test.ts`

```
describe("UserReassignmentController")
  describe("handleReassign")
    ✓ reassigns user to target institution (200)
    ✓ returns result with from/to institution names and archived count
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ rejects same institution reassignment (400 SAME_INSTITUTION)
    ✓ rejects missing target_institution_id (400 VALIDATION_ERROR)
    ✓ returns 404 for non-existent user ID
    ✓ returns 404 for non-existent target institution
    ✓ returns 404 for non-approved target institution (waitlisted/suspended)
```

**File:** `apps/server/src/__tests__/user-reassignment.service.test.ts`

```
describe("UserReassignmentService")
  describe("reassign")
    ✓ updates user's institution_id in profiles table
    ✓ resets is_course_director to false when user was CD
    ✓ preserves is_course_director as false when user was not CD
    ✓ archives active course memberships for old institution
    ✓ creates audit_log entry with correct old/new values and metadata
    ✓ calls email service with notification details
    ✓ throws SameInstitutionError when target = current
    ✓ throws UserReassignmentError when user not found
    ✓ throws InstitutionNotFoundError when target institution not found
    ✓ returns courses_archived=0 when user has no course memberships
```

**Total: ~19 tests** (9 controller + 10 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. User reassignment is not part of the 5 critical user journeys.

## 12. Acceptance Criteria

1. SuperAdmin can reassign a user to a different institution via `POST /api/v1/admin/users/:userId/reassign`
2. Non-SuperAdmin roles receive 403 Forbidden
3. User's `institution_id` is updated in `profiles` table
4. Course Director flag (`is_course_director`) is reset to `false` on reassignment
5. Active course memberships for the old institution are archived (status='archived')
6. Audit log entry created with from/to institution details and admin ID
7. Notification email service called (stubbed for Sprint 3)
8. Reassignment to same institution returns 400 `SAME_INSTITUTION`
9. Non-existent user or institution returns 404
10. Non-approved target institution returns 404
11. Response includes `courses_archived` count and `course_director_reset` flag
12. All ~19 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Reassign user between institutions | UF-06 § Cross-Institution User Management |
| SuperAdmin manages users across all institutions | F-03 § User & Role Management |
| Reassignment updates institution_id | S-SA-07-2 § Acceptance Criteria |
| DualWrite for Neo4j BELONGS_TO | S-SA-07-2 § Notes: "DELETE old BELONGS_TO, CREATE new BELONGS_TO" |
| Course Director flag reset | S-SA-07-2 § Notes: "CD is institution-scoped" |
| Course archival pattern | S-SA-07-2 § Notes: "set course_membership.status='archived'" |
| Audit log table schema | SUPABASE_DDL_v1 § audit_log |
| profiles table schema | SUPABASE_DDL_v1 § profiles |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `profiles`, `institutions`, `course_members`, `audit_log` tables exist
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Neo4j:** Optional for Sprint 3. DualWrite will stub Neo4j operations if driver not available.

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware in `index.ts`. Use `rbac.require(AuthRole.SUPERADMIN)`.
- **Express params:** `req.params.userId` is `string | string[]` in strict mode — narrow with `typeof === "string"` before use.
- **Course archival:** The `course_members` table currently has no `status` column. A migration must add `status TEXT DEFAULT 'active' CHECK ('active', 'archived')` before archival logic works.
- **Audit log:** Use existing `audit_log` table — no new table needed. Format: `action='user_reassignment'`, `entity_type='profile'`, `entity_id=userId`.
- **Email stub:** `ReassignmentEmailService.sendNotification()` should log to console in Sprint 3. Abstract with an interface (`EmailProvider`) so a real provider (Resend/SendGrid) can be swapped in later.
- **Neo4j stub:** If `Neo4jClientConfig` is not available (env vars missing), skip the graph write and log a warning. Mark a conceptual `sync_status` for future retry — but don't add a column to profiles; just log it.
- **Concurrent guard:** Read user's `updated_at` before modifying, include it in the UPDATE WHERE clause to detect concurrent changes.
