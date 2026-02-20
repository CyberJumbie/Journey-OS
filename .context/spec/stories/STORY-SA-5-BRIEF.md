# STORY-SA-5 Brief: Approval Workflow

## 0. Lane & Priority

```yaml
story_id: STORY-SA-5
old_id: S-SA-04-3
lane: superadmin
lane_priority: 1
within_lane_order: 5
sprint: 3
size: M
depends_on:
  - STORY-SA-3 (superadmin) — Application Review Queue (provides the list/detail UI)
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-U-9 — Invitation Acceptance Flow
  - STORY-IA-1 — Institution Settings Page
  - STORY-IA-4 — Program Management
  - STORY-IA-5 — Faculty Invitation
  - STORY-SA-7 — Institution List Dashboard
  - STORY-SA-8 — Institution Suspend/Reactivate
personas_served: [superadmin]
epic: E-04 (Institution Lifecycle)
feature: F-02 (Institution Management)
user_flow: UF-04 (Institution Approval)
```

## 1. Summary

Build the **approval workflow** that allows SuperAdmin to approve a pending waitlist application. On approval:
1. Application status transitions `pending → approved` with reviewer info recorded
2. A new **institution** record is created in Supabase (`status='approved'`)
3. An **Institution node** is created in Neo4j via DualWrite pattern
4. An **invitation** record is created for the contact email with `role=institutional_admin`
5. An **invitation email** is dispatched with a branded link `/invite/accept?token=xxx`

This is the third and most critical step in the E-04 pipeline: SA-1 (submit) → SA-3 (review) → **SA-5 (approve)**. This story is the **second most-blocked cross-lane blocker** — it gates U-9, IA-1, IA-4, IA-5, SA-7, SA-8.

Key constraints:
- **SuperAdmin only** — RBAC enforced
- DualWrite: Supabase institution first → Neo4j Institution node second
- Rollback: if Neo4j fails, institution is created but `sync_status` tracked for retry
- Prevent double-approval: check status is `pending` before processing
- Invitation token: crypto-random, 48 chars, expires in 7 days
- Email service abstracted for swappable providers (stubbed for Sprint 3)

## 2. Task Breakdown

1. **Types** — Create `InstitutionCreateRequest`, `InstitutionApprovalResult`, `Invitation` in `packages/types/src/institution/`
2. **Migration** — Create `invitations` table in Supabase
3. **Migration** — Add `institution_type`, `accreditation_body` columns to `institutions` table
4. **Error classes** — `DuplicateApprovalError`, `InstitutionCreationError` in `apps/server/src/errors/institution.error.ts`
5. **Institution service** — `InstitutionService` with `createFromApplication()` method
6. **Invitation email service** — `InvitationEmailService` with `sendInvitation()` — stubbed for Sprint 3
7. **Approval controller** — `ApprovalController` with `handleApprove()` method
8. **Routes** — Protected route `PATCH /api/v1/admin/applications/:id/approve` with RBAC
9. **Frontend** — Wire approve button in SA-3's review queue/detail modal
10. **Wire up** — Register route in `apps/server/src/index.ts` after auth middleware
11. **API tests** — 16 tests covering approval, institution creation, invitation, dual-write, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/institution/approval.types.ts

/** Request to approve an application (body is minimal — most data from application record) */
export interface ApplicationApprovalRequest {
  readonly domain: string;  // SuperAdmin must specify the institution domain
}

/** Result returned after successful approval */
export interface InstitutionApprovalResult {
  readonly application_id: string;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly institution_domain: string;
  readonly invitation_id: string;
  readonly invitation_email: string;
  readonly invitation_expires_at: string;
  readonly approved_at: string;
  readonly approved_by: string;
}
```

```typescript
// packages/types/src/institution/invitation.types.ts

/** Invitation record stored in Supabase */
export interface Invitation {
  readonly id: string;
  readonly token: string;
  readonly email: string;
  readonly role: string;
  readonly institution_id: string;
  readonly created_by: string;
  readonly expires_at: string;
  readonly accepted_at: string | null;
  readonly created_at: string;
}

/** Internal shape for creating an invitation */
export interface InvitationCreateParams {
  readonly email: string;
  readonly role: "institutional_admin";
  readonly institution_id: string;
  readonly created_by: string;
}
```

**Existing type to extend:**
```typescript
// packages/types/src/institution/institution.types.ts
// Add institution_type and accreditation_body to Institution interface

export interface Institution {
  readonly id: string;
  readonly name: string;
  readonly domain: string;
  readonly institution_type: InstitutionType | null;
  readonly accreditation_body: string | null;
  readonly status: InstitutionStatus;
  readonly approved_at: string | null;
  readonly approved_by: string | null;
  readonly settings: Record<string, unknown>;
  readonly created_at: string;
  readonly updated_at: string;
}
```

## 4. Database Schema (inline, complete)

### New table: `invitations`
```sql
-- Migration: create_invitations_table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('institutional_admin', 'faculty', 'student', 'advisor')),
    institution_id UUID NOT NULL REFERENCES institutions(id),
    created_by UUID NOT NULL REFERENCES profiles(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup (invitation acceptance)
CREATE INDEX idx_invitations_token ON invitations(token);
-- Index for listing invitations by institution
CREATE INDEX idx_invitations_institution ON invitations(institution_id);
-- Index for listing invitations by email
CREATE INDEX idx_invitations_email ON invitations(email);

-- RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin manages invitations" ON invitations
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin'
    );

CREATE POLICY "Institutional admin manages own institution invitations" ON invitations
    FOR ALL USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'institutional_admin'
        AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    );
```

### Alter existing: `institutions`
```sql
-- Migration: add_type_and_accreditation_to_institutions
ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS institution_type TEXT
        CHECK (institution_type IN ('md', 'do', 'combined')),
    ADD COLUMN IF NOT EXISTS accreditation_body TEXT;
```

### Existing tables used:
```sql
-- waitlist_applications (update status, reviewed_by, reviewed_at)
-- institutions (insert new record)
-- profiles (lookup approving SuperAdmin)
```

## 5. API Contract (complete request/response)

### PATCH /api/v1/admin/applications/:id/approve (Auth: SuperAdmin only)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | The waitlist application ID to approve |

**Request Body:**
```json
{
  "domain": "msm.edu"
}
```

**Success Response (200):**
```json
{
  "data": {
    "application_id": "app-uuid-1",
    "institution_id": "inst-uuid-new",
    "institution_name": "Morehouse School of Medicine",
    "institution_domain": "msm.edu",
    "invitation_id": "inv-uuid-1",
    "invitation_email": "jsmith@msm.edu",
    "invitation_expires_at": "2026-02-26T12:00:00Z",
    "approved_at": "2026-02-19T12:00:00Z",
    "approved_by": "sa-uuid-1"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-SuperAdmin role |
| 400 | `VALIDATION_ERROR` | Missing domain field |
| 400 | `DUPLICATE_APPROVAL` | Application status is not `pending` (already approved/rejected) |
| 404 | `NOT_FOUND` | Application ID does not exist |
| 409 | `DUPLICATE_DOMAIN` | An institution with this domain already exists |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Approve Action (integrated into SA-3 Review Queue)

**Trigger:** "Approve" button in application table row or detail modal (currently disabled from SA-3 — now enabled)

**Flow:**
```
1. User clicks "Approve" on a pending application row/modal
2. ApprovalConfirmDialog opens
   ├── Application summary (institution name, type, contact)
   ├── DomainInput (required — SuperAdmin specifies institution domain)
   ├── Impact summary:
   │     ├── "Institution record will be created"
   │     ├── "Invitation email will be sent to [contact_email]"
   │     └── "Invitation expires in 7 days"
   ├── ConfirmButton ("Approve & Send Invitation")
   └── CancelButton
3. On confirm: PATCH request, optimistic UI update (status badge → approved)
4. On success: success toast, row status updates, modal closes
5. On error: error toast, revert optimistic update
```

**Component hierarchy:**
```
ApprovalConfirmDialog (organism — client component)
  ├── ApplicationSummary (static display)
  ├── DomainInput (text input for institution domain)
  ├── ImpactList (bullet list of what will happen)
  ├── ConfirmButton (primary action)
  └── CancelButton
```

**Design tokens:**
- Confirm button: `success-green` `#69a338` background
- Impact summary: `info-blue` card background
- Typography: Source Sans 3

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/institution/approval.types.ts` | Types | Create |
| 2 | `packages/types/src/institution/invitation.types.ts` | Types | Create |
| 3 | `packages/types/src/institution/institution.types.ts` | Types | Edit (add institution_type, accreditation_body) |
| 4 | `packages/types/src/institution/index.ts` | Types | Edit (add approval, invitation exports) |
| 5 | Supabase migration: `invitations` table | Database | Apply via MCP |
| 6 | Supabase migration: `institutions` alter | Database | Apply via MCP |
| 7 | `apps/server/src/errors/institution.error.ts` | Errors | Create |
| 8 | `apps/server/src/errors/index.ts` | Errors | Edit (add institution exports) |
| 9 | `apps/server/src/services/institution/institution.service.ts` | Service | Create |
| 10 | `apps/server/src/services/email/invitation-email.service.ts` | Service | Create (stub) |
| 11 | `apps/server/src/controllers/institution/approval.controller.ts` | Controller | Create |
| 12 | `apps/server/src/index.ts` | Routes | Edit (add protected route) |
| 13 | `apps/web/src/components/admin/approval-confirm-dialog.tsx` | Component | Create |
| 14 | `apps/web/src/components/admin/application-review-queue.tsx` | Component | Edit (enable approve button) |
| 15 | `apps/server/src/__tests__/institution.service.test.ts` | Tests | Create |
| 16 | `apps/server/src/__tests__/approval.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-3 | superadmin | **PENDING** | Review queue provides the UI shell and list/detail endpoints |
| STORY-U-6 | universal | **DONE** | RBAC middleware for SuperAdmin-only enforcement |
| STORY-SA-1 | superadmin | **DONE** | Created `waitlist_applications` table |

### NPM Packages (already installed)
- `@supabase/supabase-js` — Supabase client
- `express` — Server framework
- `vitest` — Testing
- `crypto` — Node.js built-in for token generation

### Existing Files Needed
- `apps/server/src/config/supabase.config.ts` — `getSupabaseClient()`
- `apps/server/src/middleware/rbac.middleware.ts` — `rbac.require(AuthRole.SUPERADMIN)`
- `apps/server/src/errors/base.errors.ts` — `JourneyOSError`
- `packages/types/src/auth/auth.types.ts` — `ApiResponse<T>`
- `packages/types/src/institution/application.types.ts` — `WaitlistApplication`, `ApplicationStatus`, `InstitutionType`

### Neo4j (optional for Sprint 3)
- Neo4j dual-write creates `(:Institution {id, name, domain, status})` node
- If Neo4j driver not available, log warning and skip graph write
- Track sync status conceptually (log, not persisted column)

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

// Mock pending application (to be approved)
export const MOCK_PENDING_APPLICATION = {
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

// Mock already-approved application (duplicate approval test)
export const MOCK_APPROVED_APPLICATION = {
  ...MOCK_PENDING_APPLICATION,
  id: "app-2",
  status: "approved",
  reviewed_by: "sa-uuid-1",
  reviewed_at: "2026-02-19T13:00:00Z",
};

// Mock created institution (returned after approval)
export const MOCK_CREATED_INSTITUTION = {
  id: "inst-new-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
  institution_type: "md",
  accreditation_body: "LCME",
  status: "approved",
  approved_at: "2026-02-19T12:00:00Z",
  approved_by: "sa-uuid-1",
  settings: {},
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Mock invitation (created during approval)
export const MOCK_INVITATION = {
  id: "inv-1",
  token: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4",
  email: "jsmith@msm.edu",
  role: "institutional_admin",
  institution_id: "inst-new-1",
  created_by: "sa-uuid-1",
  expires_at: "2026-02-26T12:00:00Z",
  accepted_at: null,
  created_at: "2026-02-19T12:00:00Z",
};

// Valid approval request
export const VALID_APPROVAL_REQUEST = {
  domain: "msm.edu",
};

// Duplicate domain (institution already exists with this domain)
export const DUPLICATE_DOMAIN_REQUEST = {
  domain: "existing.edu",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/approval.controller.test.ts`

```
describe("ApprovalController")
  describe("handleApprove")
    ✓ approves pending application and returns result (200)
    ✓ returns institution_id, invitation_id, and invitation_email
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ rejects already-approved application (400 DUPLICATE_APPROVAL)
    ✓ rejects already-rejected application (400 DUPLICATE_APPROVAL)
    ✓ returns 404 for non-existent application ID
    ✓ rejects missing domain field (400 VALIDATION_ERROR)
    ✓ rejects duplicate domain (409 DUPLICATE_DOMAIN)
```

**File:** `apps/server/src/__tests__/institution.service.test.ts`

```
describe("InstitutionService")
  describe("createFromApplication")
    ✓ updates application status to "approved" with reviewed_by and reviewed_at
    ✓ creates institution record with name, domain, type, accreditation_body, status='approved'
    ✓ creates invitation record with token, email, role=institutional_admin, expires_at=7d
    ✓ generates unique 48-char crypto token for invitation
    ✓ calls invitation email service with correct details
    ✓ throws DuplicateApprovalError when application status is not pending
    ✓ throws InstitutionCreationError when domain already exists
    ✓ rolls back application status if institution creation fails
```

**Total: ~17 tests** (9 controller + 8 service)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this individual story. However, when the full Institution Lifecycle E2E (SA-1 → SA-3 → SA-5) is ready, a Playwright test should cover:
1. Submit application via `/apply`
2. Login as SuperAdmin, navigate to `/admin/applications`
3. Click pending application, click "Approve"
4. Verify institution created, invitation sent
5. Verify application status updated to "approved"

This will be added as part of the E-04 epic completion.

## 12. Acceptance Criteria

1. SuperAdmin can approve a pending application via `PATCH /api/v1/admin/applications/:id/approve`
2. Application status transitions from `pending` to `approved` with `reviewed_by` and `reviewed_at` set
3. New institution record created in Supabase with `status='approved'`, `institution_type`, `accreditation_body` from application
4. Invitation record created with crypto-random 48-char token, `role='institutional_admin'`, expires in 7 days
5. Invitation email service called with branded link `/invite/accept?token=xxx`
6. Duplicate approval returns 400 `DUPLICATE_APPROVAL`
7. Duplicate domain returns 409 `DUPLICATE_DOMAIN`
8. Non-existent application returns 404
9. Non-SuperAdmin roles receive 403 Forbidden
10. Approve button enabled in SA-3's review queue (previously disabled)
11. Optimistic UI update on approve click
12. All ~17 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Approve creates institution | UF-04 § Step 6: "Institution created status: approved, invitation email sent" |
| Application status transition | S-SA-04-3 § Acceptance Criteria: "pending → approved" |
| Institution record fields | SUPABASE_DDL_v1 § institutions |
| Invitation with token and role | S-SA-04-3 § Acceptance Criteria: "token, role=institutional_admin, institution_id, expires_at" |
| Branded invitation link | S-SA-04-3 § Acceptance Criteria: "/invite/accept?token=xxx" |
| DualWrite pattern | ARCHITECTURE_v10 § DualWriteService: "Supabase first → Neo4j second" |
| Rollback on Neo4j failure | S-SA-04-3 § Notes: "mark sync_status='pending' and queue for retry" |
| Prevent double-approval | S-SA-04-3 § Notes: "check status before processing (optimistic locking)" |
| SuperAdmin reviews and approves | ARCHITECTURE_v10 § 4.1: "Reviews waitlist → approves institutions" |
| Email service abstraction | S-SA-04-3 § Notes: "abstracted for swappable providers" |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `waitlist_applications` and `institutions` tables exist, `invitations` table created via migration
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **Neo4j:** Optional for Sprint 3. If available, creates `(:Institution)` node. If not, logs warning and skips.

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware in `index.ts`. Use `rbac.require(AuthRole.SUPERADMIN)`.
- **Express params:** `req.params.id` is `string | string[]` in strict mode — narrow with `typeof === "string"`.
- **DualWrite stub:** The full `DualWriteService` class is deferred. For Sprint 3, inline the Supabase write in `InstitutionService`. Add a `try/catch` block for Neo4j that logs a warning if the driver is unavailable.
- **Token generation:** Use `crypto.randomBytes(36).toString('base64url').slice(0, 48)` for a URL-safe 48-char token.
- **Invitation expiry:** 7 days from approval: `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()`.
- **Email stub:** `InvitationEmailService.sendInvitation()` should log the invitation link to console in Sprint 3. Abstract with an interface so Resend/SendGrid can be swapped in later.
- **Domain validation:** Before creating institution, check if domain already exists in `institutions` table. Return 409 if duplicate.
- **Transaction-like behavior:** Since Supabase JS client doesn't support transactions, use sequential operations with manual rollback: if institution insert fails after application update, revert application status back to `pending`.
- **Institution type/accreditation:** Pull `institution_type` and `accreditation_body` from the `waitlist_applications` record — don't require SuperAdmin to re-enter them.
