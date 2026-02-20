# STORY-SA-6: Rejection Workflow

**Epic:** E-04 (Institution Lifecycle)
**Feature:** F-02
**Sprint:** 3
**Lane:** superadmin (P1)
**Size:** S
**Old ID:** S-SA-04-4

---

## User Story
As a **SuperAdmin**, I need to reject an institution application with a reason so that the applicant is notified and the decision is recorded for audit.

## Acceptance Criteria
- [ ] Reject action requires a reason (text field, min 10 characters)
- [ ] Application status transitions: `pending` -> `rejected`
- [ ] Rejection reason stored in `applications.rejection_reason` column
- [ ] Rejection timestamp (`reviewed_at`) and rejecting SuperAdmin ID (`reviewed_by`) recorded
- [ ] Notification email sent to applicant with rejection reason and professional messaging
- [ ] Rejected applications remain visible in queue with 'rejected' filter
- [ ] Re-application: applicant can submit a new application after rejection (duplicate detection skips rejected applications)
- [ ] Duplicate rejection prevention: if application status is not 'pending', return 409 Conflict
- [ ] Rejection reason is audit-critical: never allow deletion of rejection records
- [ ] 5 API tests

## Reference Screens
**None** -- backend + actions within Review Queue (STORY-SA-3). The reject action is triggered from the rejection modal with reason textarea in the Application Review Queue.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/institution/rejection.types.ts` (exists) |
| Service | apps/server | `src/services/institution/rejection.service.ts` |
| Controller | apps/server | `src/controllers/institution/rejection.controller.ts` |
| Routes | apps/server | `src/routes/admin/application-review.routes.ts` (update, add reject endpoint) |
| Email | apps/server | `src/services/email/rejection-email.service.ts` |
| Tests | apps/server | `src/controllers/institution/__tests__/rejection.controller.test.ts` |

## Database Schema

### Supabase — updates `applications` table (from STORY-SA-1)
- `status` -> 'rejected'
- `rejection_reason` -> text (populated)
- `reviewed_at` -> now()
- `reviewed_by` -> admin UUID

No new tables needed. No Neo4j changes required (rejected applications don't create institution nodes).

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/admin/applications/:id/reject` | SuperAdmin | Reject application with reason |

### POST Request Body
```json
{
  "reason": "string (min 10 chars, required)"
}
```

### POST Response
```json
{
  "data": {
    "application_id": "uuid",
    "status": "rejected",
    "reviewed_at": "ISO8601"
  }
}
```

## Dependencies
- **Blocked by:** STORY-SA-3 (Review Queue UI must exist for the reject action)
- **Blocks:** None
- **Cross-lane:** None

## Testing Requirements
### API Tests (5)
1. Successful rejection transitions status to 'rejected' with reason stored
2. Missing reason (or < 10 chars) returns 422 Validation Error
3. Application status transitions correctly from 'pending' to 'rejected'
4. Email dispatch called with rejection reason (mocked)
5. Non-SuperAdmin receives 403 Forbidden

### Additional Edge Cases
- Already rejected/approved application returns 409 Conflict
- Rejection reason is preserved and cannot be modified after rejection

## Implementation Notes
- Reuses the same route group as STORY-SA-5 (approval). Both endpoints live under `/api/v1/admin/applications/:id/`.
- The rejection email should be professional and include: reason for rejection, next steps (re-apply or contact support), and a branded footer.
- Rejection reason minimum length (10 chars) enforced both client-side (in the review modal from STORY-SA-3) and server-side via Zod validation.
- Unlike approval, rejection does NOT create any new records in institutions or invitations tables. It only updates the existing application record.
- No Neo4j writes needed for rejection -- only Supabase update.
- The duplicate detection in STORY-SA-1 should be updated to skip rejected applications (applicant can re-apply after rejection).
- Rejection records are immutable for audit purposes. No soft-delete, no status reversal. If a mistake is made, the applicant must submit a new application.
- Express `req.params` values are `string | string[]` -- narrow with `typeof === "string"`.
