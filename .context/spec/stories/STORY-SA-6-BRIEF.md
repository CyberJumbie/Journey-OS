# STORY-SA-6 Brief: Rejection Workflow

## 0. Lane & Priority

```yaml
story_id: STORY-SA-6
old_id: S-SA-04-4
lane: superadmin
lane_priority: 1
within_lane_order: 6
sprint: 3
size: S
depends_on:
  - STORY-SA-3 (superadmin) — Application Review Queue (provides list/detail UI)
blocks: []
personas_served: [superadmin]
epic: E-04 (Institution Lifecycle)
feature: F-02 (Institution Management)
user_flow: UF-04 (Institution Approval)
```

## 1. Summary

Build the **rejection workflow** that allows SuperAdmin to reject a pending waitlist application with a mandatory reason. On rejection: the application status transitions `pending → rejected`, the rejection reason and reviewer info are recorded for audit, and a notification email is sent to the applicant explaining the decision with next steps (re-apply or contact support).

This is the fourth step in the E-04 Institution Lifecycle pipeline: SA-1 (submit) → SA-3 (review) → SA-5 (approve) / **SA-6 (reject)**.

Key constraints:
- **SuperAdmin only** — RBAC enforced
- Rejection reason is mandatory (min 10 characters) — audit-critical
- Rejection records are immutable — never allow deletion
- Rejected applicants can submit a new application (no blacklisting)
- Email notification should be professional with next steps
- Reuses `ApplicationReviewService` from SA-3 for status validation
- Prevent double-rejection: check status is `pending` before processing

## 2. Task Breakdown

1. **Types** — Create `ApplicationRejectionRequest`, `ApplicationRejectionResult` in `packages/types/src/institution/rejection.types.ts`
2. **Error classes** — `RejectionReasonRequiredError`, `ApplicationAlreadyProcessedError` in `apps/server/src/errors/rejection.error.ts`
3. **Service** — `RejectionService` with `reject()` method
4. **Email service** — `RejectionEmailService` with `sendNotification()` — stubbed for Sprint 3
5. **Controller** — `RejectionController` with `handleReject()` method
6. **Routes** — Protected route `PATCH /api/v1/admin/applications/:id/reject` with RBAC
7. **Frontend** — Wire reject button in SA-3's review queue/detail modal
8. **Wire up** — Register route in `apps/server/src/index.ts`
9. **API tests** — 5 tests covering rejection, validation, auth

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/institution/rejection.types.ts

/** Request body for rejecting an application */
export interface ApplicationRejectionRequest {
  readonly reason: string;  // Min 10 characters, required
}

/** Result returned after successful rejection */
export interface ApplicationRejectionResult {
  readonly application_id: string;
  readonly institution_name: string;
  readonly status: "rejected";
  readonly rejection_reason: string;
  readonly rejected_by: string;
  readonly rejected_at: string;
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Updates existing `waitlist_applications` table.

```sql
-- Existing table used:
-- waitlist_applications (
--   id UUID PK,
--   institution_name TEXT,
--   institution_type TEXT CHECK ('md'|'do'|'combined'),
--   contact_name TEXT,
--   contact_email TEXT,
--   status TEXT DEFAULT 'pending' CHECK ('pending'|'approved'|'rejected'),
--   reviewed_by UUID FK -> profiles(id),
--   reviewed_at TIMESTAMPTZ,
--   rejection_reason TEXT,
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- )

-- On rejection, update:
-- status = 'rejected'
-- rejection_reason = $reason
-- reviewed_by = $superadmin_id
-- reviewed_at = NOW()
-- updated_at = NOW()
```

## 5. API Contract (complete request/response)

### PATCH /api/v1/admin/applications/:id/reject (Auth: SuperAdmin only)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | The waitlist application ID to reject |

**Request Body:**
```json
{
  "reason": "Institution does not meet minimum accreditation requirements. Please reapply after obtaining LCME provisional accreditation."
}
```

**Success Response (200):**
```json
{
  "data": {
    "application_id": "app-uuid-1",
    "institution_name": "Example Medical School",
    "status": "rejected",
    "rejection_reason": "Institution does not meet minimum accreditation requirements. Please reapply after obtaining LCME provisional accreditation.",
    "rejected_by": "sa-uuid-1",
    "rejected_at": "2026-02-19T14:00:00Z"
  },
  "error": null
}
```

**Error Responses:**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-SuperAdmin role |
| 400 | `VALIDATION_ERROR` | Missing reason or reason < 10 characters |
| 400 | `APPLICATION_ALREADY_PROCESSED` | Application status is not `pending` (already approved/rejected) |
| 404 | `NOT_FOUND` | Application ID does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

### Reject Action (integrated into SA-3 Review Queue)

**Trigger:** "Reject" button in application table row or detail modal (currently disabled from SA-3 — now enabled)

**Flow:**
```
1. User clicks "Reject" on a pending application row/modal
2. RejectionConfirmDialog opens
   ├── Application summary (institution name, type, contact email)
   ├── RejectionReasonTextarea (required, min 10 chars)
   │     ├── Character count indicator
   │     └── Validation message when < 10 chars
   ├── Impact summary:
   │     ├── "Application will be permanently rejected"
   │     ├── "Rejection email will be sent to [contact_email]"
   │     └── "Applicant may reapply in the future"
   ├── ConfirmButton ("Reject Application" — destructive styling)
   └── CancelButton
3. On confirm: PATCH request, optimistic UI update (status badge → rejected)
4. On success: success toast, row status updates, modal closes
5. On error: error toast, revert optimistic update
```

**Component hierarchy:**
```
RejectionConfirmDialog (organism — client component)
  ├── ApplicationSummary (static display)
  ├── RejectionReasonTextarea (required, min 10 chars)
  ├── ImpactList (bullet list)
  ├── ConfirmButton (destructive — red)
  └── CancelButton
```

**Design tokens:**
- Confirm button: `error-red` background (destructive action)
- Impact summary: `warning-yellow` background card
- Textarea: White `#ffffff` with border
- Typography: Source Sans 3
- Character counter: muted text, turns red when < 10 chars

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/institution/rejection.types.ts` | Types | Create |
| 2 | `packages/types/src/institution/index.ts` | Types | Edit (add rejection export) |
| 3 | `apps/server/src/errors/rejection.error.ts` | Errors | Create |
| 4 | `apps/server/src/errors/index.ts` | Errors | Edit (add rejection exports) |
| 5 | `apps/server/src/services/institution/rejection.service.ts` | Service | Create |
| 6 | `apps/server/src/services/email/rejection-email.service.ts` | Service | Create (stub) |
| 7 | `apps/server/src/controllers/institution/rejection.controller.ts` | Controller | Create |
| 8 | `apps/server/src/index.ts` | Routes | Edit (add protected reject route) |
| 9 | `apps/web/src/components/admin/rejection-confirm-dialog.tsx` | Component | Create |
| 10 | `apps/web/src/components/admin/application-review-queue.tsx` | Component | Edit (enable reject button) |
| 11 | `apps/server/src/controllers/institution/__tests__/rejection.controller.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-SA-3 | superadmin | **PENDING** | Review queue provides the UI shell and list/detail endpoints |
| STORY-SA-1 | superadmin | **DONE** | Created `waitlist_applications` table with rejection_reason column |
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
- `packages/types/src/institution/application.types.ts` — `ApplicationStatus`

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

// Mock pending application (to be rejected)
export const MOCK_PENDING_APPLICATION = {
  id: "app-1",
  institution_name: "Example Medical School",
  institution_type: "md",
  contact_name: "Dr. John Doe",
  contact_email: "jdoe@example.edu",
  status: "pending",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

// Mock already-rejected application (duplicate rejection test)
export const MOCK_REJECTED_APPLICATION = {
  ...MOCK_PENDING_APPLICATION,
  id: "app-2",
  status: "rejected",
  rejection_reason: "Previously rejected",
  reviewed_by: "sa-uuid-1",
  reviewed_at: "2026-02-19T13:00:00Z",
};

// Mock already-approved application
export const MOCK_APPROVED_APPLICATION = {
  ...MOCK_PENDING_APPLICATION,
  id: "app-3",
  status: "approved",
  reviewed_by: "sa-uuid-1",
  reviewed_at: "2026-02-19T13:00:00Z",
};

// Valid rejection request
export const VALID_REJECTION = {
  reason: "Institution does not meet minimum accreditation requirements. Please reapply after obtaining LCME provisional accreditation.",
};

// Invalid: reason too short
export const SHORT_REASON_REJECTION = {
  reason: "No.",
};

// Invalid: missing reason
export const MISSING_REASON_REJECTION = {};
```

## 10. API Test Spec (vitest -- PRIMARY)

**File:** `apps/server/src/controllers/institution/__tests__/rejection.controller.test.ts`

```
describe("RejectionController")
  describe("handleReject")
    ✓ rejects pending application with reason (200)
    ✓ returns result with application_id, rejection_reason, rejected_by, rejected_at
    ✓ rejects unauthenticated request (401)
    ✓ rejects non-SuperAdmin roles (403 FORBIDDEN)
    ✓ rejects missing reason field (400 VALIDATION_ERROR)
    ✓ rejects reason shorter than 10 characters (400 VALIDATION_ERROR)
    ✓ rejects already-rejected application (400 APPLICATION_ALREADY_PROCESSED)
    ✓ rejects already-approved application (400 APPLICATION_ALREADY_PROCESSED)
    ✓ returns 404 for non-existent application ID

describe("RejectionService")
  describe("reject")
    ✓ updates application status to "rejected" with reason, reviewed_by, reviewed_at
    ✓ calls rejection email service with applicant details
    ✓ throws ApplicationAlreadyProcessedError when status is not pending
    ✓ throws RejectionReasonRequiredError when reason is missing or too short
```

**Total: ~13 tests** (9 controller + 4 service)

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this individual story. E2E coverage will be added when the full Institution Lifecycle flow (SA-1 → SA-3 → SA-5/SA-6) is complete.

## 12. Acceptance Criteria

1. SuperAdmin can reject a pending application via `PATCH /api/v1/admin/applications/:id/reject`
2. Rejection requires a reason (min 10 characters)
3. Application status transitions from `pending` to `rejected`
4. Rejection reason, reviewer ID, and timestamp recorded in application record
5. Notification email sent to applicant with rejection reason and next steps
6. Rejected applications remain visible in review queue with `rejected` filter
7. Already-processed applications (approved/rejected) cannot be rejected again (400)
8. Non-SuperAdmin roles receive 403 Forbidden
9. Reject button enabled in SA-3's review queue (previously disabled)
10. Applicant can submit a new application after rejection
11. All ~13 API tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Rejection with reason | S-SA-04-4 § User Story |
| Reason min 10 chars | S-SA-04-4 § Acceptance Criteria |
| Status transition pending→rejected | S-SA-04-4 § Acceptance Criteria |
| Rejection email to applicant | S-SA-04-4 § Acceptance Criteria |
| Rejected visible in queue | S-SA-04-4 § Acceptance Criteria |
| Re-application allowed | S-SA-04-4 § Acceptance Criteria |
| Reuses ApplicationReviewService | S-SA-04-4 § Notes |
| Rejection records immutable | S-SA-04-4 § Notes: "never allow deletion" |
| Professional email with next steps | S-SA-04-4 § Notes |

## 14. Environment Prerequisites

- **Supabase:** Project `hifqdotmnirepgscankl` running, `waitlist_applications` table exists (from SA-1)
- **Express:** Server running on port 3001 with auth + RBAC middleware active
- **Next.js:** Web app running on port 3000
- **No Neo4j needed** for this story

## 15. Implementation Notes

- **Protected route pattern:** Register AFTER auth middleware in `index.ts`. Use `rbac.require(AuthRole.SUPERADMIN)`.
- **Express params:** `req.params.id` is `string | string[]` in strict mode — narrow with `typeof === "string"`.
- **Reuse pattern:** `RejectionService` follows the same pattern as SA-5's `InstitutionService.createFromApplication()` — fetch application, validate status is `pending`, update status + metadata.
- **Email stub:** `RejectionEmailService.sendNotification()` logs to console in Sprint 3. Abstract with interface for future provider swap.
- **Reason validation:** Trim whitespace before length check. Reject if `reason.trim().length < 10`.
- **Immutable records:** Do NOT expose any DELETE endpoint for rejection records. The rejection_reason column on waitlist_applications is write-once.
- **Route grouping:** Add alongside SA-5's approve route: `PATCH /api/v1/admin/applications/:id/approve` and `PATCH /api/v1/admin/applications/:id/reject` share the same route prefix.
