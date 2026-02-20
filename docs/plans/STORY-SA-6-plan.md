# Plan: STORY-SA-6 — Rejection Workflow

## Tasks (from brief, with refinements)

1. **Create rejection types** → `packages/types/src/institution/rejection.types.ts` + edit barrel
2. **Create rejection error classes** → `apps/server/src/errors/rejection.error.ts` + edit barrel
3. **Create RejectionEmailService stub** → `apps/server/src/services/email/rejection-email.service.ts`
4. **Create RejectionService** → `apps/server/src/services/institution/rejection.service.ts`
5. **Create RejectionController + wire route** → `apps/server/src/controllers/institution/rejection.controller.ts` + edit `index.ts`
6. **Create RejectionConfirmDialog + wire into review queue** → `apps/web/src/components/admin/rejection-confirm-dialog.tsx` + edit `application-review-queue.tsx`
7. **Write API tests** → service test (4) + controller test (9) = ~13 tests

## Implementation Order

Types → Errors → EmailService (stub) → Service → Controller + Route → Frontend → API Tests

## Patterns to Follow

- **Approval workflow pattern** (`docs/solutions/approval-workflow-pattern.md`) — same fetch-validate-update flow, simpler (single table, no rollback needed)
- **ApprovalController** as structural mirror — same error handling shape, same RBAC + params pattern
- **Email stub pattern** — same as `InvitationEmailService` and `ReassignmentEmailService` (interface + console.log stub)
- **CRITICAL**: Add imports AND route registration in a single Edit call to `index.ts` (prevents PostToolUse hook from stripping unused imports)
- **Express params**: Narrow `req.params.id` with `typeof === "string"` before use

## Key Decisions

- **Reuse `ApplicationNotFoundError`** from `errors/application.error.ts` (already has correct code `"NOT_FOUND"`)
- **New `ApplicationAlreadyProcessedError`** covers both "already approved" and "already rejected" — one error class, not two
- **No new DB migration** — `rejection_reason`, `reviewed_by`, `reviewed_at` columns already exist on `waitlist_applications` (from SA-1)
- **Single-table update** — no multi-table write, no rollback needed (simpler than SA-5)

## Testing Strategy

- **Service tests (4):** happy path, already-processed, missing reason, short reason
- **Controller tests (9):** 200 success, 400 missing reason, 400 short reason, 400 already-processed (rejected), 400 already-processed (approved), 404 not found, 400 missing id param, 500 unexpected, validates `rejected_by` from token
- **E2E:** No — not a critical journey

## Risks / Edge Cases

- **PostToolUse hook** may strip barrel exports or imports — re-read after editing barrel files
- **Concurrent reject + approve race** — both check `status = 'pending'`. Supabase `.update().eq("status", "pending")` acts as optimistic lock. If 0 rows match, treat as already-processed.
- **Reason whitespace padding** — trim before length check to prevent `"          "` (10 spaces) passing validation

## Acceptance Criteria (verbatim from brief)

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
