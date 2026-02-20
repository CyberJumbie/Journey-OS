# STORY-SA-8 Brief: Institution Suspend/Reactivate

## 0. Lane & Priority

```yaml
story_id: STORY-SA-8
old_id: S-SA-05-3
lane: superadmin
lane_priority: 1
within_lane_order: 8
sprint: 9
size: S
depends_on:
  - STORY-SA-7 (superadmin) — Institution List Dashboard (UI entry point)
  - STORY-SA-5 (superadmin) — Approval Workflow (institutions exist, institution model)
blocks: []
personas_served: [superadmin]
epic: E-05 (Institution Monitoring)
feature: F-02 (Institution Management)
user_flow: UF-05 (Institution Monitoring)
```

## 1. Summary

Build **suspend and reactivate** actions for institutions. SuperAdmin can suspend an institution (setting its status to `suspended` and disabling all user logins for that institution) or reactivate a previously suspended institution (restoring `active` status and re-enabling logins). All status changes are logged in an `institution_status_changes` audit table with the acting admin, timestamp, and reason. A middleware check on every authenticated request verifies that the user's institution is not suspended.

This is the second step in the E-05 Institution Monitoring pipeline: SA-7 (list) → **SA-8 (suspend/reactivate)** → SA-9 (detail view).

Key constraints:
- **SuperAdmin only** — RBAC enforced
- Suspend does NOT delete data — all data preserved for reactivation
- Reason field required when suspending (stored in audit table)
- DualWrite: update institution status in Supabase first, then Neo4j
- Middleware: verify `institution.status !== 'suspended'` on every authenticated request
- Confirmation dialog before suspend showing impacted user count
- Email notification to institution admin on suspend/reactivate (stubbed)

## 2. Task Breakdown

1. **Types** — Create `InstitutionSuspendRequest`, `InstitutionReactivateRequest`, `InstitutionStatusChangeResult`, `InstitutionStatusChange` in `packages/types/src/admin/institution-lifecycle.types.ts`
2. **Migration** — Create `institution_status_changes` audit table
3. **Error classes** — `InstitutionAlreadySuspendedError`, `InstitutionNotSuspendedError`, `SuspendReasonRequiredError` in `apps/server/src/errors/institution-lifecycle.error.ts`
4. **Middleware** — `InstitutionStatusMiddleware` to block suspended institution users
5. **Service** — `InstitutionLifecycleService` with `suspend()` and `reactivate()` methods
6. **Controller** — Update `InstitutionController` with `handleSuspend()` and `handleReactivate()`
7. **Frontend** — `SuspendDialog` organism with confirmation and reason input
8. **Wire up** — Register routes, add middleware to chain
9. **API tests** — 8 tests covering suspend, reactivate, auth, audit

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/admin/institution-lifecycle.types.ts

/** Request body for suspending an institution */
export interface InstitutionSuspendRequest {
  readonly reason: string;  // Required, min 10 characters
}

/** Request body for reactivating an institution (no reason needed) */
export interface InstitutionReactivateRequest {
  readonly reason?: string;  // Optional note
}

/** Result returned after status change */
export interface InstitutionStatusChangeResult {
  readonly institution_id: string;
  readonly institution_name: string;
  readonly from_status: string;
  readonly to_status: string;
  readonly reason: string | null;
  readonly changed_by: string;
  readonly changed_at: string;
  readonly affected_users: number;
}

/** Audit record for institution status changes */
export interface InstitutionStatusChange {
  readonly id: string;
  readonly institution_id: string;
  readonly from_status: string;
  readonly to_status: string;
  readonly reason: string | null;
  readonly actor_id: string;
  readonly created_at: string;
}
```

## 4. Database Schema (inline, complete)

### New table: `institution_status_changes`
```sql
-- Migration: create_institution_status_changes
CREATE TABLE institution_status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL,
    reason TEXT,
    actor_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for listing status changes by institution
CREATE INDEX idx_institution_status_changes_institution
  ON institution_status_changes(institution_id, created_at DESC);

-- RLS
ALTER TABLE institution_status_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin reads institution status changes" ON institution_status_changes
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "SuperAdmin inserts institution status changes" ON institution_status_changes
    FOR INSERT WITH CHECK (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );
```

### Existing tables used:
```sql
-- institutions (update status)
-- institutions.id UUID PK
-- institutions.name TEXT
-- institutions.status TEXT CHECK ('approved'|'suspended'|...)
-- institutions.updated_at TIMESTAMPTZ

-- profiles (count affected users, lookup actor)
-- profiles.institution_id UUID FK -> institutions(id)
```

## 5. API Contract (complete request/response)

### POST /api/v1/admin/institutions/:id/suspend (Auth: SuperAdmin only)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | The institution ID to suspend |

**Request Body:**
```json
{
  "reason": "Policy violation: unauthorized sharing of assessment content."
}
```

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "institution_name": "Example Medical School",
    "from_status": "approved",
    "to_status": "suspended",
    "reason": "Policy violation: unauthorized sharing of assessment content.",
    "changed_by": "sa-uuid-1",
    "changed_at": "2026-02-19T14:00:00Z",
    "affected_users": 450
  },
  "error": null
}
```

### POST /api/v1/admin/institutions/:id/reactivate (Auth: SuperAdmin only)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | The institution ID to reactivate |

**Request Body:**
```json
{
  "reason": "Policy review complete, institution compliance verified."
}
```

**Success Response (200):**
```json
{
  "data": {
    "institution_id": "inst-uuid-1",
    "institution_name": "Example Medical School",
    "from_status": "suspended",
    "to_status": "approved",
    "reason": "Policy review complete, institution compliance verified.",
    "changed_by": "sa-uuid-1",
    "changed_at": "2026-02-19T16:00:00Z",
    "affected_users": 450
  },
  "error": null
}
```

**Error Responses (both endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-SuperAdmin role |
| 400 | `VALIDATION_ERROR` | Missing reason (suspend only), reason < 10 chars |
| 400 | `INSTITUTION_ALREADY_SUSPENDED` | Suspend called on already-suspended institution |
| 400 | `INSTITUTION_NOT_SUSPENDED` | Reactivate called on non-suspended institution |
| 404 | `NOT_FOUND` | Institution ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Middleware: InstitutionStatusMiddleware

**Blocked Response (403):**
```json
{
  "data": null,
  "error": {
    "code": "INSTITUTION_SUSPENDED",
    "message": "Your institution has been suspended. Please contact your administrator."
  }
}
```

## 6. Frontend Spec

### SuspendDialog (organism — triggered from institution list or detail view)

**Component hierarchy:**
```
SuspendDialog (organism — client component)
  ├── InstitutionSummary (name, domain, current status)
  ├── ImpactWarning (yellow card)
  │     ├── "This will prevent all [N] users from logging in"
  │     └── "All data will be preserved"
  ├── SuspendReasonTextarea (required, min 10 chars)
  │     ├── Character count indicator
  │     └── Validation message
  ├── ConfirmButton ("Suspend Institution" — destructive red)
  └── CancelButton
```

### ReactivateDialog (simpler — triggered from suspended institution row)

```
ReactivateDialog (organism — client component)
  ├── InstitutionSummary (name, domain, "suspended" status)
  ├── ReasonTextarea (optional note)
  ├── ConfirmButton ("Reactivate Institution" — green)
  └── CancelButton
```

**Design tokens:**
- Suspend button: Error Red (destructive)
- Reactivate button: Green `#69a338`
- Impact warning: Warning Yellow background
- Surface: White `#ffffff` dialog
- Typography: Source Sans 3

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/admin/institution-lifecycle.types.ts` | Types | Create |
| 2 | `packages/types/src/admin/index.ts` | Types | Edit (add lifecycle export) |
| 3 | Supabase migration: `institution_status_changes` table | Database | Apply via MCP |
| 4 | `apps/server/src/errors/institution-lifecycle.error.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add exports) |
| 6 | `apps/server/src/middleware/institution-status.middleware.ts` | Middleware | Create |
| 7 | `apps/server/src/services/admin/institution-lifecycle.service.ts` | Service | Create |
| 8 | `apps/server/src/controllers/admin/institution.controller.ts` | Controller | Edit (add suspend/reactivate handlers) |
| 9 | `apps/server/src/index.ts` | Routes | Edit (add routes, add middleware to chain) |
| 10 | `apps/web/src/components/admin/suspend-dialog.tsx` | Component | Create |
| 11 | `apps/web/src/components/admin/reactivate-dialog.tsx` | Component | Create |
| 12 | `apps/server/src/__tests__/institution-lifecycle.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-7 | superadmin | **PENDING** | Institution list dashboard — UI entry point for suspend/reactivate |
| STORY-SA-5 | superadmin | **PENDING** | Approval workflow creates institutions with status='approved' |
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/auth.middleware.ts` — `AuthMiddleware` (institution-status runs after this)
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.SUPERADMIN)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`

### Neo4j (optional)
- DualWrite: update `(:Institution {status: 'suspended'})` in Neo4j
- If driver not available, skip and log warning

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

// Mock active institution
export const MOCK_ACTIVE_INSTITUTION = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
  status: "approved",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

// Mock suspended institution
export const MOCK_SUSPENDED_INSTITUTION = {
  ...MOCK_ACTIVE_INSTITUTION,
  id: "inst-2",
  name: "Suspended Medical School",
  status: "suspended",
};

// Mock user from suspended institution (should be blocked)
export const MOCK_SUSPENDED_USER = {
  sub: "user-uuid-1",
  email: "faculty@suspended.edu",
  role: "faculty" as const,
  institution_id: "inst-2",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

// Valid suspend request
export const VALID_SUSPEND_REQUEST = {
  reason: "Policy violation: unauthorized sharing of assessment content.",
};

// Invalid: reason too short
export const SHORT_REASON_SUSPEND = {
  reason: "Bad.",
};

// Valid reactivate request
export const VALID_REACTIVATE_REQUEST = {
  reason: "Policy review complete, compliance verified.",
};

// Mock user count for institution
export const MOCK_USER_COUNT = 450;
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/__tests__/institution-lifecycle.test.ts`

```
describe("InstitutionLifecycleController")
  describe("handleSuspend")
    ✓ suspends active institution with reason (200)
    ✓ returns result with from_status, to_status, affected_users
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ rejects missing reason (400 VALIDATION_ERROR)
    ✓ rejects reason shorter than 10 chars (400 VALIDATION_ERROR)
    ✓ rejects already-suspended institution (400 INSTITUTION_ALREADY_SUSPENDED)
    ✓ returns 404 for non-existent institution

  describe("handleReactivate")
    ✓ reactivates suspended institution (200)
    ✓ returns result with from_status=suspended, to_status=approved
    ✓ rejects non-suspended institution (400 INSTITUTION_NOT_SUSPENDED)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)

describe("InstitutionLifecycleService")
  describe("suspend")
    ✓ updates institution status to 'suspended' in Supabase
    ✓ creates audit record in institution_status_changes
    ✓ counts affected users for the institution

  describe("reactivate")
    ✓ updates institution status to 'approved' in Supabase
    ✓ creates audit record in institution_status_changes

describe("InstitutionStatusMiddleware")
  ✓ allows user from active institution to pass through
  ✓ blocks user from suspended institution with 403
  ✓ skips check for users without institution_id (superadmin)
```

**Total: ~20 tests** (12 controller + 5 service + 3 middleware)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this individual story. E2E will be added when the full Institution Monitoring flow is complete.

## 12. Acceptance Criteria

1. SuperAdmin can suspend an active institution via `POST /api/v1/admin/institutions/:id/suspend`
2. SuperAdmin can reactivate a suspended institution via `POST /api/v1/admin/institutions/:id/reactivate`
3. Suspend requires a reason (min 10 characters)
4. Confirmation dialog shows impacted user count before suspend
5. Status change recorded in `institution_status_changes` audit table with actor, timestamp, reason
6. Suspended institution users see "Your institution has been suspended" on API requests (403)
7. Status change reflected in institution list and detail views immediately
8. Suspend does NOT delete data — all data preserved
9. Non-SuperAdmin roles receive 403 Forbidden
10. Email notification to institution admin (stubbed for Sprint 9)
11. All ~20 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Suspend/reactivate actions | S-SA-05-3 § User Story |
| Reason required for suspend | S-SA-05-3 § Acceptance Criteria |
| Confirmation dialog with user count | S-SA-05-3 § Acceptance Criteria |
| Audit table schema | S-SA-05-3 § Notes: "institution_status_changes" |
| Middleware check on every request | S-SA-05-3 § Notes |
| DualWrite for Neo4j | S-SA-05-3 § Notes |
| Data preserved on suspend | S-SA-05-3 § Notes: "Suspend does NOT delete data" |
| Middleware runs after JWT validation | S-SA-05-3 § Notes |
| API endpoints | S-SA-05-3 § Notes |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `institutions` and `profiles` tables exist, `institution_status_changes` created via migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Neo4j:** Optional. DualWrite stubs if unavailable.

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware. Use `rbac.require(AuthRole.SUPERADMIN)`.
- **Express params:** `req.params.id` is `string | string[]` — narrow with `typeof === "string"`.
- **Middleware placement:** `InstitutionStatusMiddleware` runs AFTER `AuthMiddleware` (needs `req.user.institution_id`) but BEFORE `RbacMiddleware`. For SuperAdmin users (no `institution_id`), skip the check.
- **Institution lookup in middleware:** Query `institutions` table by `req.user.institution_id`. Cache result per request (not globally — institutions can be suspended at any time).
- **DualWrite stub:** Update `(:Institution {id: $id})` SET `status = 'suspended'` in Neo4j. If driver unavailable, log warning.
- **Affected users count:** `SELECT COUNT(*) FROM profiles WHERE institution_id = $id` — include in response for confirmation dialog.
- **Reason validation:** Trim whitespace before length check. Suspend requires min 10 chars. Reactivate reason is optional.
- **Status mapping:** Supabase uses `approved` for active institutions. When suspending: `approved → suspended`. When reactivating: `suspended → approved`.
