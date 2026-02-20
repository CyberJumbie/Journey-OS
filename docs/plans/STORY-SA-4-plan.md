# Plan: STORY-SA-4 — User Reassignment

## Summary

SuperAdmin reassigns a user from one institution to another. Updates profile, archives course memberships, resets Course Director flag, creates audit log entry, sends notification email (stub).

## WIP Status — Most Files Already Exist

Previous session created most implementation files. This plan covers **remaining gaps only**.

### Already Done (from WIP)
| # | Task | File | Status |
|---|------|------|--------|
| 1 | Reassignment types | `packages/types/src/user/reassignment.types.ts` | DONE |
| 4 | Error classes | `apps/server/src/errors/reassignment.error.ts` | DONE |
| 5 | Error barrel exports | `apps/server/src/errors/index.ts` | DONE |
| 6 | Email service stub | `apps/server/src/services/email/reassignment-email.service.ts` | DONE |
| 7 | Reassignment service | `apps/server/src/services/user/user-reassignment.service.ts` | DONE |
| 8 | Reassignment controller | `apps/server/src/controllers/user/user-reassignment.controller.ts` | DONE |
| 10 | Reassignment modal | `apps/web/src/components/admin/reassignment-confirm-modal.tsx` | DONE |
| 11 | Wire reassign button | `apps/web/src/components/admin/global-user-directory.tsx` | DONE |
| 12 | Service tests (10) | `apps/server/src/services/user/__tests__/user-reassignment.service.test.ts` | DONE |

### Remaining Tasks (implementation order)
| # | Task | File | Action |
|---|------|------|--------|
| 2 | Barrel export for reassignment types | `packages/types/src/user/index.ts` | Edit — add reassignment type exports |
| 2b | Rebuild types package | `tsc -b packages/types/tsconfig.json` | Run |
| 3 | Migration: course_members status column | Supabase MCP | Apply |
| 9 | Route registration | `apps/server/src/index.ts` | Edit — add `POST /api/v1/admin/users/:userId/reassign` |
| 13 | Controller tests (9) | `apps/server/src/controllers/user/__tests__/user-reassignment.controller.test.ts` | Create |
| 14 | Run all tests | `vitest` | Verify 10 service + 9 controller tests pass |
| 15 | Type-check | `tsc --noEmit` on server | Verify no type errors |

## Implementation Order

Types barrel (2) → Types rebuild (2b) → Migration (3) → Route registration (9) → Controller tests (13) → Run all tests (14) → Type-check (15)

## Patterns to Follow

- **Approval workflow pattern** — `docs/solutions/approval-workflow-pattern.md` (controller error handling shape)
- **Supabase mock factory** — `docs/solutions/supabase-mock-factory.md` (separate mock objects per chain stage)
- **RBAC** — `AuthRole.SUPERADMIN` enum, not string literal
- **Express params** — narrow `req.params.userId` with `typeof === "string"` (already done in controller)
- **Types rebuild** — run `tsc -b packages/types/tsconfig.json` after modifying types

## Key Design Decisions

1. **Course membership archival** — soft-delete via `status='archived'` (migration adds column). Not hard delete.
2. **Concurrent guard** — use `updated_at` in WHERE clause for optimistic locking on profile update
3. **CD flag reset** — always reset `is_course_director=false` on reassignment (CD is institution-scoped)
4. **Email stub** — `ReassignmentEmailService` logs to console, interface allows swap
5. **Neo4j stub** — BELONGS_TO relationship update deferred, log warning if driver unavailable
6. **Audit log** — use existing `audit_log` table with `action='user_reassignment'`, `entity_type='profile'`

## Testing Strategy

- **API tests (19 total):**
  - Service (10): DONE — profile update, CD flag reset, CD flag preserved, course archival, audit log creation, email dispatch, same institution error, user not found, institution not found, zero courses case
  - Controller (9): TODO — success 200, result shape, auth 401, RBAC 403, same institution 400, missing field 400, user 404, institution 404, non-approved institution 404
- **E2E:** None (not a critical journey)

## Figma Make

- [x] Code directly (modal already implemented)

## Risks / Edge Cases

1. **Same institution** — reject early with 400 before any mutations
2. **Concurrent modification** — two admins reassign same user simultaneously → `updated_at` check in WHERE
3. **No course memberships** — valid case, return `courses_archived: 0`
4. **Non-approved target institution** — reject with 404 (only approved institutions are valid targets)
5. **SuperAdmin user** — SuperAdmins have no institution_id; reassignment of SA users should be blocked or handled
6. **Missing `course_members.status` column** — migration MUST be applied before tests or runtime use

## Acceptance Criteria (from brief)

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
