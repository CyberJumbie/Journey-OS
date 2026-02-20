# Plan: STORY-SA-8 — Institution Suspend/Reactivate

## Summary
SuperAdmin suspend/reactivate actions for institutions. Updates status in DB, logs changes to audit table, counts affected users, and adds middleware to block suspended institution users on every authenticated request. Size S.

## Tasks (implementation order)

| # | Task | File | Action |
|---|------|------|--------|
| 1 | Define lifecycle types (`InstitutionSuspendRequest`, `InstitutionReactivateRequest`, `InstitutionStatusChangeResult`, `InstitutionStatusChange`) | `packages/types/src/admin/institution-lifecycle.types.ts` | Create |
| 2 | Add lifecycle export to barrel | `packages/types/src/admin/index.ts` | Edit |
| 3 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | Run |
| 4 | Create `institution_status_changes` audit table | Supabase MCP migration | Apply |
| 5 | Create error classes: `InstitutionAlreadySuspendedError`, `InstitutionNotSuspendedError`, `SuspendReasonRequiredError` | `apps/server/src/errors/institution-lifecycle.error.ts` | Create |
| 6 | Add lifecycle errors to barrel | `apps/server/src/errors/index.ts` | Edit (single edit, re-read after) |
| 7 | Create `InstitutionStatusMiddleware` — blocks suspended institution users | `apps/server/src/middleware/institution-status.middleware.ts` | Create |
| 8 | Create `InstitutionLifecycleService` with `suspend()` and `reactivate()` | `apps/server/src/services/admin/institution-lifecycle.service.ts` | Create |
| 9 | Create `InstitutionLifecycleController` with `handleSuspend()` and `handleReactivate()` | `apps/server/src/controllers/admin/institution-lifecycle.controller.ts` | Create |
| 10 | Wire routes + middleware in main app | `apps/server/src/index.ts` | Edit (add controller import, 2 routes, middleware — single edit) |
| 11 | Create `SuspendDialog` component | `apps/web/src/components/admin/suspend-dialog.tsx` | Create |
| 12 | Create `ReactivateDialog` component | `apps/web/src/components/admin/reactivate-dialog.tsx` | Create |
| 13 | Write controller tests (12 tests) | `apps/server/src/controllers/admin/__tests__/institution-lifecycle.controller.test.ts` | Create |
| 14 | Write service tests (5 tests) | `apps/server/src/services/admin/__tests__/institution-lifecycle.service.test.ts` | Create |
| 15 | Write middleware tests (3 tests) | `apps/server/src/middleware/__tests__/institution-status.middleware.test.ts` | Create |

## Implementation Order
Types (1-3) → Migration (4) → Errors (5-6) → Middleware (7) → Service (8) → Controller (9) → Routes (10) → Frontend (11-12) → Tests (13-15)

## Deviations from Brief

1. **Controller file name:** Brief says edit `institution.controller.ts` — that file doesn't exist. Create `institution-lifecycle.controller.ts` instead (matches existing naming: `institution-monitoring.controller.ts`).

2. **Test file location:** Brief puts tests in `apps/server/src/__tests__/institution-lifecycle.test.ts`. Codebase convention colocates tests in `__tests__/` subdirs next to implementation. Split into 3 files: controller, service, middleware tests.

3. **Middleware placement:** Brief says middleware runs BEFORE `RbacMiddleware`. In the actual codebase, RBAC is applied per-route (not global). InstitutionStatusMiddleware should be global on `/api/v1` — inserted after `createAuthMiddleware()` and before `createEmailVerificationMiddleware()`.

## Patterns to Follow

- **Controller pattern:** Match `InstitutionMonitoringController` — `#service` private field, `handleXyz(req, res)` methods, `ApiResponse<T>` responses, try/catch with specific error → status mapping
- **Middleware pattern:** Match `createAuthMiddleware()` / `createEmailVerificationMiddleware()` — factory function returning Express middleware
- **Service pattern:** Match `InstitutionMonitoringService` — `#supabaseClient` private field, constructor DI
- **Error pattern:** Match `DuplicateApprovalError` — extend `JourneyOSError`, custom code string
- **Dialog pattern:** Match `approval-confirm-dialog.tsx` / `rejection-confirm-dialog.tsx` — client component, props for onConfirm/onCancel
- **Route pattern:** `app.post("/api/v1/admin/institutions/:id/suspend", rbac.require(AuthRole.SUPERADMIN), (req, res) => controller.handleSuspend(req, res))`
- **Barrel file editing:** Single Edit call, re-read after to verify PostToolUse hook didn't strip exports (CLAUDE.md critical rule)
- **Express params:** `typeof req.params.id === "string"` narrowing before use
- **AuthRole enum:** Use `AuthRole.SUPERADMIN`, never string literal `"superadmin"`

## Testing Strategy

- **Controller tests (12):** Suspend success, result shape, 401 unauth, 403 non-SA, 400 missing reason, 400 short reason, 400 already suspended, 404 not found, reactivate success, reactivate result, reactivate non-suspended, reactivate 403
- **Service tests (5):** Suspend updates status, creates audit record, counts users, reactivate updates status, reactivate creates audit record
- **Middleware tests (3):** Allows active institution, blocks suspended institution (403), skips for users without institution_id (superadmin)
- **E2E:** Not required (no critical journey)

## Frontend Notes

- `SuspendDialog`: Confirmation modal with institution summary, impact warning (user count), required reason textarea (min 10 chars), destructive red "Suspend" button
- `ReactivateDialog`: Simpler modal with institution summary, optional reason, green "Reactivate" button
- Both triggered from institution list row actions (already existing in `institution-list-dashboard.tsx`)

## NPM Dependencies
None new. All existing: `@supabase/supabase-js`, `express`, `vitest`.

## Risks / Edge Cases

1. **Race condition:** Two superadmins suspending the same institution simultaneously. Mitigation: check current status in service before update — second call gets `InstitutionAlreadySuspendedError`.
2. **Middleware performance:** Institution status lookup on every request adds 1 DB query. Mitigation: SuperAdmin users (no `institution_id`) skip the check entirely. For regular users, the query hits an indexed PK lookup — sub-ms.
3. **DualWrite to Neo4j:** Optional — if Neo4j driver unavailable, log warning and continue. Don't block the primary Supabase write.
4. **Status mapping:** DB uses `approved` (not `active`). Display layer maps `approved → active`. Suspend/reactivate operates on DB values: `approved ↔ suspended`.
5. **Barrel file stripping:** PostToolUse eslint hook may strip exports. Re-read after editing `errors/index.ts` and `types/admin/index.ts`.

## Acceptance Criteria (from brief)
- AC-1: SuperAdmin can suspend an active institution via `POST /api/v1/admin/institutions/:id/suspend`
- AC-2: SuperAdmin can reactivate a suspended institution via `POST /api/v1/admin/institutions/:id/reactivate`
- AC-3: Suspend requires a reason (min 10 characters)
- AC-4: Confirmation dialog shows impacted user count before suspend
- AC-5: Status change recorded in `institution_status_changes` audit table with actor, timestamp, reason
- AC-6: Suspended institution users see "Your institution has been suspended" on API requests (403)
- AC-7: Status change reflected in institution list and detail views immediately
- AC-8: Suspend does NOT delete data — all data preserved
- AC-9: Non-SuperAdmin roles receive 403 Forbidden
- AC-10: Email notification to institution admin (stubbed for Sprint 9)
- AC-11: All ~20 API tests pass
