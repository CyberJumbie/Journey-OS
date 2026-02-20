# STORY-F-47: Batch Controls

**Epic:** E-20 (Bulk Generation)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 14
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-20-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need pause, resume, and cancel controls for batch generation so that I can manage long-running batch jobs without losing completed work.

## Acceptance Criteria
- [ ] Pause button: stops dispatching new items, in-progress items complete
- [ ] Resume button: resumes dispatching from where paused
- [ ] Cancel button: stops all pending items, in-progress items complete, batch marked `cancelled`
- [ ] Confirmation dialog for cancel action (destructive)
- [ ] Paused state persisted: survives server restart via Inngest step state
- [ ] Status transitions: `running` -> `paused` -> `running` or `cancelled`
- [ ] Cancelled batch preserves all completed items (no data loss)
- [ ] Controls disabled when batch is in terminal state (completed/cancelled/failed)
- [ ] 8-12 API tests: pause/resume cycle, cancel with in-progress items, state persistence, status transitions
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/operations/BulkOperations.tsx` (pause/resume/cancel) | `apps/web/src/components/generation/batch-controls.tsx` | Extract BatchControls molecule and CancelConfirmDialog molecule; replace inline styles with Tailwind design tokens; convert to named exports |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/batch-control.types.ts` |
| Service | apps/server | `src/services/generation/batch-control.service.ts` |
| Controller | apps/server | `src/controllers/generation/batch-control.controller.ts` |
| Route | apps/server | `src/routes/generation/batch-control.routes.ts` |
| Inngest | apps/server | `src/inngest/functions/batch-control.fn.ts` |
| View - Controls | apps/web | `src/components/generation/batch-controls.tsx` |
| View - Dialog | apps/web | `src/components/generation/cancel-confirm-dialog.tsx` |
| Tests | apps/server | `src/services/generation/__tests__/batch-control.test.ts` |

## Database Schema
No new tables. Updates `batch_jobs.status` column (STORY-F-39).

Status transitions:
```
pending -> running -> paused -> running (resume)
pending -> running -> paused -> cancelled
pending -> running -> completed | completed_with_errors | failed
pending -> running -> cancelled
```

## API Endpoints

### POST /api/v1/generation/batch/:batchId/pause
**Auth:** JWT required (batch owner)
**Success Response (200):**
```json
{ "data": { "batchId": "uuid", "status": "paused" }, "error": null }
```

### POST /api/v1/generation/batch/:batchId/resume
**Auth:** JWT required (batch owner)
**Success Response (200):**
```json
{ "data": { "batchId": "uuid", "status": "running" }, "error": null }
```

### POST /api/v1/generation/batch/:batchId/cancel
**Auth:** JWT required (batch owner)
**Success Response (200):**
```json
{ "data": { "batchId": "uuid", "status": "cancelled", "completedItems": 12, "cancelledItems": 8 }, "error": null }
```

**Error Responses:**
| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_STATE_TRANSITION` | Pause on non-running, resume on non-paused, cancel on terminal |
| 403 | `FORBIDDEN` | Non-owner |
| 404 | `NOT_FOUND` | Invalid batchId |

## Dependencies
- **Blocked by:** STORY-F-39 (batch pipeline exists to control)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: pause running batch, resume paused batch, cancel running batch, cancel paused batch, invalid state transition rejected (pause on paused), completed batch controls disabled, cancelled batch preserves completed items, auth guard (non-owner rejected), status persistence across Inngest steps, in-progress items complete on cancel
- 0 E2E tests

## Implementation Notes
- Inngest pause/resume: use `step.waitForEvent('batch.resume')` pattern after pause signal.
- Cancel sends `batch.cancel` event; orchestrator checks cancellation flag before each new dispatch.
- In-progress items cannot be cancelled mid-LLM-call — they complete and result is kept.
- Consider adding a "Retry Failed" button that re-dispatches only failed items from a completed batch (future enhancement).
- Batch control endpoints: `POST /api/v1/generation/batch/:batchId/pause|resume|cancel`.
- Every controller handler MUST extract `user.id` from `req` and pass to service layer for ownership checks.
- Don't use Radix UI Dialog tests in jsdom — test callback behavior with `fireEvent` on simple button mocks.
