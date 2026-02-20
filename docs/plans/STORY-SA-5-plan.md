# Plan: STORY-SA-5 — Approval Workflow

## Summary

SuperAdmin approves a pending waitlist application → creates institution + invitation → sends email stub. Critical path blocker: gates U-9, IA-1, IA-4, IA-5, SA-7, SA-8.

## Tasks (implementation order)

| # | Task | File | Action |
|---|------|------|--------|
| 1 | Approval types | `packages/types/src/institution/approval.types.ts` | Create |
| 2 | Invitation types | `packages/types/src/institution/invitation.types.ts` | Create |
| 3 | Extend Institution interface | `packages/types/src/institution/institution.types.ts` | Edit — add `institution_type`, `accreditation_body` |
| 4 | Barrel exports | `packages/types/src/institution/index.ts` | Edit — add approval + invitation exports |
| 5 | Migration: `invitations` table | Supabase MCP | Apply |
| 6 | Migration: alter `institutions` | Supabase MCP | Apply |
| 7 | Institution error classes | `apps/server/src/errors/institution.error.ts` | Create — `DuplicateApprovalError`, `InstitutionCreationError`, `DuplicateDomainError` |
| 8 | Error barrel | `apps/server/src/errors/index.ts` | Edit — add institution exports |
| 9 | Institution service | `apps/server/src/services/institution/institution.service.ts` | Create — `createFromApplication()` |
| 10 | Email service stub | `apps/server/src/services/email/invitation-email.service.ts` | Create — logs to console |
| 11 | Approval controller | `apps/server/src/controllers/institution/approval.controller.ts` | Create — `handleApprove()` |
| 12 | Route registration | `apps/server/src/index.ts` | Edit — `PATCH /api/v1/admin/applications/:id/approve` |
| 13 | Approval confirm dialog | `apps/web/src/components/admin/approval-confirm-dialog.tsx` | Create — domain input + confirm |
| 14 | Wire approve in detail modal | `apps/web/src/components/admin/application-detail-modal.tsx` | Edit — enable button, open dialog |
| 15 | Wire approve in review queue | `apps/web/src/components/admin/application-review-queue.tsx` | Edit — enable button, open dialog |
| 16 | Service tests | `apps/server/src/services/institution/__tests__/institution.service.test.ts` | Create — 8 tests |
| 17 | Controller tests | `apps/server/src/controllers/institution/__tests__/approval.controller.test.ts` | Create — 9 tests |

## Implementation Order

Types (1-4) → Migrations (5-6) → Errors (7-8) → Service (9-10) → Controller (11) → Routes (12) → View (13-15) → Tests (16-17)

## Patterns to Follow

- **Admin paginated list pattern** — `docs/solutions/admin-paginated-list-pattern.md` (route registration, controller error handling)
- **Supabase mock factory** — `docs/solutions/supabase-mock-factory.md` (separate mock objects per chain stage)
- **RBAC pattern** — `docs/solutions/rbac-middleware-pattern.md` (`AuthRole.SUPERADMIN` enum, not string)
- **OOP** — `#privateField` syntax, constructor DI, public getters
- **Express params** — narrow `req.params.id` with `typeof === "string"`

## Key Design Decisions

1. **No full DualWriteService yet** — Sprint 3 stubs the Neo4j write with a try/catch log warning
2. **Email stub** — `InvitationEmailService` logs the invitation link to console; interface allows Resend/SendGrid swap later
3. **Sequential rollback** — Supabase JS has no transactions; if institution insert fails after application update, revert application status to `pending`
4. **Token generation** — `crypto.randomBytes(36).toString('base64url').slice(0, 48)` for URL-safe 48-char tokens
5. **Domain uniqueness** — check `institutions` table before insert; return 409 on duplicate

## Testing Strategy

- **API tests (17 total):**
  - Service (8): approval state transition, institution creation, invitation creation, token generation, email dispatch, duplicate approval, duplicate domain, rollback on failure
  - Controller (9): success 200, auth 401, RBAC 403, duplicate approval 400, rejected app 400, not found 404, missing domain 400, duplicate domain 409, result shape
- **E2E:** None for this story (deferred to E-04 epic completion)

## Figma Make

- [ ] Code directly (dialog is simple enough; shadcn Dialog + Input + Button)

## Risks / Edge Cases

1. **Race condition:** Two SuperAdmins approve the same application simultaneously → mitigated by checking `status = 'pending'` at query time (optimistic locking via WHERE clause)
2. **Orphaned institution:** Application update succeeds but institution insert fails → rollback application status to `pending`
3. **Domain collision:** Institution domain already exists → 409 before any mutations
4. **Token uniqueness:** Extremely unlikely collision with 48-char crypto-random, but `UNIQUE` constraint on `invitations.token` provides safety net

## Acceptance Criteria (from brief)

1. SuperAdmin can approve a pending application via `PATCH /api/v1/admin/applications/:id/approve`
2. Application status transitions `pending → approved` with `reviewed_by` and `reviewed_at` set
3. New institution record created in Supabase with `status='approved'`, `institution_type`, `accreditation_body`
4. Invitation record created with crypto-random 48-char token, `role='institutional_admin'`, expires in 7 days
5. Invitation email service called with branded link `/invite/accept?token=xxx`
6. Duplicate approval returns 400 `DUPLICATE_APPROVAL`
7. Duplicate domain returns 409 `DUPLICATE_DOMAIN`
8. Non-existent application returns 404
9. Non-SuperAdmin roles receive 403 Forbidden
10. Approve button enabled in SA-3's review queue (previously disabled)
11. Optimistic UI update on approve click
12. All ~17 API tests pass
