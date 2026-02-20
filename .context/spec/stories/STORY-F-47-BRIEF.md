# STORY-F-47 Brief: Batch Controls

## 0. Lane & Priority

```yaml
story_id: STORY-F-47
old_id: S-F-20-4
lane: faculty
lane_priority: 3
within_lane_order: 47
sprint: 14
size: M
depends_on:
  - STORY-F-39 (faculty) — Inngest Batch Pipeline (batch pipeline must exist to control)
blocks: []
personas_served: [faculty]
epic: E-20 (Bulk Generation)
feature: F-09 (AI Generation)
user_flow: UF-20 (Bulk Generation)
```

## 1. Summary

Build **pause, resume, and cancel controls** for batch generation jobs. Pause stops dispatching new items while in-progress items complete. Resume continues dispatching from where paused. Cancel stops all pending items while in-progress items complete, then marks the batch as `cancelled` (preserving all completed items). Paused state persists across server restarts via Inngest step state. Controls are disabled when the batch is in a terminal state (completed/cancelled/failed). A confirmation dialog protects the cancel action.

Key constraints:
- **Inngest step patterns** — `step.waitForEvent('batch.resume')` for pause, cancellation flag check before dispatch
- Status transitions: `running` -> `paused` -> `running` or `cancelled`
- In-progress items cannot be cancelled mid-LLM-call — they complete and results are kept
- Cancelled batch preserves all completed items (no data loss)
- Confirmation dialog for cancel (destructive action)
- Paused state survives server restart via Inngest step state

## 2. Task Breakdown

1. **Types** — Create `BatchControlAction`, `BatchControlRequest`, `BatchControlResponse`, `BatchStatusTransition` in `packages/types/src/generation/batch-control.types.ts`
2. **Error classes** — `InvalidBatchStatusTransitionError` in `apps/server/src/errors/batch.errors.ts` (extend)
3. **Service** — `BatchControlService` with `pause()`, `resume()`, `cancel()` methods
4. **Controller** — `BatchControlController` with `handlePause()`, `handleResume()`, `handleCancel()` endpoints
5. **Inngest functions** — `batchControl` function handling pause/resume/cancel signals
6. **Frontend components** — `BatchControls` button group, `CancelConfirmDialog` modal
7. **API tests** — 10 tests for pause/resume cycle, cancel, state persistence, status transitions

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/batch-control.types.ts

/** Batch control actions */
export type BatchControlAction = "pause" | "resume" | "cancel";

/** Batch control request */
export interface BatchControlRequest {
  readonly action: BatchControlAction;
}

/** Batch control response */
export interface BatchControlResponse {
  readonly batchId: string;
  readonly previousStatus: string;
  readonly newStatus: string;
  readonly action: BatchControlAction;
  readonly timestamp: string;
}

/** Valid status transitions */
export const VALID_STATUS_TRANSITIONS: Record<string, readonly BatchControlAction[]> = {
  running: ["pause", "cancel"],
  paused: ["resume", "cancel"],
} as const;

/** Terminal states (no controls available) */
export const TERMINAL_STATES = ["completed", "completed_with_errors", "failed", "cancelled"] as const;

/** Batch control button config */
export interface BatchControlButtonConfig {
  readonly action: BatchControlAction;
  readonly label: string;
  readonly icon: string;              // Lucide icon name
  readonly variant: "default" | "destructive" | "outline";
  readonly requiresConfirmation: boolean;
}

/** Default control button configs */
export const CONTROL_BUTTONS: readonly BatchControlButtonConfig[] = [
  { action: "pause", label: "Pause", icon: "Pause", variant: "outline", requiresConfirmation: false },
  { action: "resume", label: "Resume", icon: "Play", variant: "default", requiresConfirmation: false },
  { action: "cancel", label: "Cancel", icon: "XCircle", variant: "destructive", requiresConfirmation: true },
] as const;
```

## 4. Database Schema (inline, complete)

No new tables needed. Batch control updates the `status` field in existing `batch_jobs` table (from F-39). Inngest manages the pause/resume state internally.

```sql
-- No migration required for this story.
-- Updates batch_jobs.status: running <-> paused, running/paused -> cancelled
-- Inngest manages pause/resume state via step.waitForEvent pattern.
```

## 5. API Contract (complete request/response)

### POST /api/v1/generation/batch/:batchId/pause (Auth: Faculty, owner only)

**Success Response (200):**
```json
{
  "data": {
    "batchId": "batch-uuid-1",
    "previousStatus": "running",
    "newStatus": "paused",
    "action": "pause",
    "timestamp": "2026-02-19T12:05:00Z"
  },
  "error": null
}
```

### POST /api/v1/generation/batch/:batchId/resume (Auth: Faculty, owner only)

**Success Response (200):**
```json
{
  "data": {
    "batchId": "batch-uuid-1",
    "previousStatus": "paused",
    "newStatus": "running",
    "action": "resume",
    "timestamp": "2026-02-19T12:10:00Z"
  },
  "error": null
}
```

### POST /api/v1/generation/batch/:batchId/cancel (Auth: Faculty, owner only)

**Success Response (200):**
```json
{
  "data": {
    "batchId": "batch-uuid-1",
    "previousStatus": "running",
    "newStatus": "cancelled",
    "action": "cancel",
    "timestamp": "2026-02-19T12:15:00Z"
  },
  "error": null
}
```

**Error Responses (all endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty or not batch owner |
| 404 | `NOT_FOUND` | Batch ID does not exist |
| 409 | `INVALID_TRANSITION` | Action not valid for current status (e.g., pause on completed) |

## 6. Frontend Spec

### Components (embedded in batch progress page from F-46)

**Component hierarchy:**
```
BatchControls (molecule — embedded in BatchProgressPage)
  ├── PauseButton (visible when running)
  ├── ResumeButton (visible when paused)
  ├── CancelButton (visible when running or paused)
  └── CancelConfirmDialog (modal — opens on cancel click)
        ├── Warning message: "This will stop all pending items. Completed items will be preserved."
        ├── Confirm button (Red, destructive)
        └── Cancel button (outlined)
```

**States:**
1. **Running** — Pause and Cancel buttons enabled
2. **Paused** — Resume and Cancel buttons enabled, Pause hidden
3. **Terminal** — All buttons disabled with "Batch [status]" label
4. **Confirming Cancel** — Modal open with warning and confirmation
5. **Processing** — Button shows spinner while API call in progress

**Design tokens:**
- Pause button: Outline variant, Navy Deep (#002c76) border
- Resume button: Default variant, Green (#69a338) background
- Cancel button: Destructive variant, Red background
- Dialog overlay: Semi-transparent black
- Warning text: Red accent color

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/batch-control.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Edit (add batch-control export) |
| 3 | `apps/server/src/errors/batch.errors.ts` | Errors | Edit (add `InvalidBatchStatusTransitionError`) |
| 4 | `apps/server/src/services/generation/batch-control.service.ts` | Service | Create |
| 5 | `apps/server/src/controllers/generation/batch-control.controller.ts` | Controller | Create |
| 6 | `apps/server/src/inngest/functions/batch-control.fn.ts` | Inngest | Create |
| 7 | `apps/server/src/index.ts` | Routes | Edit (add batch control routes) |
| 8 | `apps/web/src/components/generation/BatchControls.tsx` | Component | Create |
| 9 | `apps/web/src/components/generation/CancelConfirmDialog.tsx` | Component | Create |
| 10 | `apps/server/src/__tests__/generation/batch-control.test.ts` | Tests | Create |
| 11 | `apps/web/src/__tests__/generation/BatchControls.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-39 | faculty | NOT STARTED | Batch pipeline must exist (batch_jobs table, Inngest orchestrator) |
| STORY-F-46 | faculty | NOT STARTED | Batch progress page where controls are embedded |
| STORY-U-6 | universal | **DONE** | RBAC middleware |

### NPM Packages (already installed)
- `inngest` — Inngest client (from F-39)
- `@radix-ui/react-dialog` — Dialog component (via shadcn/ui)
- All other packages from F-39 dependencies

### Existing Files Needed
- `apps/server/src/repositories/batch-job.repository.ts` — Batch job status updates (from F-39)
- `apps/server/src/inngest/functions/batch-generate.fn.ts` — Orchestrator to send control signals to (from F-39)
- `apps/server/src/middleware/auth.middleware.ts` — Auth middleware
- `apps/server/src/middleware/rbac.middleware.ts` — RBAC middleware

## 9. Test Fixtures (inline)

```typescript
// Mock batch jobs in various states
export const MOCK_RUNNING_BATCH = {
  id: "batch-uuid-1",
  user_id: "faculty-uuid-1",
  status: "running",
  total_items: 20,
  completed_items: 8,
  failed_items: 0,
};

export const MOCK_PAUSED_BATCH = {
  ...MOCK_RUNNING_BATCH,
  status: "paused",
};

export const MOCK_COMPLETED_BATCH = {
  ...MOCK_RUNNING_BATCH,
  status: "completed",
  completed_items: 20,
};

export const MOCK_CANCELLED_BATCH = {
  ...MOCK_RUNNING_BATCH,
  status: "cancelled",
  completed_items: 8,
};

// Mock Faculty user (batch owner)
export const BATCH_OWNER = {
  sub: "faculty-uuid-1",
  email: "dr.jones@msm.edu",
  role: "faculty" as const,
  institution_id: "inst-uuid-1",
};

// Mock non-owner faculty (should be denied)
export const NON_OWNER = {
  ...BATCH_OWNER,
  sub: "faculty-uuid-2",
  email: "dr.smith@msm.edu",
};

// Mock Inngest event sender
export const mockInngestSend = vi.fn().mockResolvedValue(undefined);
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/generation/batch-control.test.ts`

```
describe("BatchControlService")
  describe("pause")
    ✓ transitions running batch to paused status
    ✓ sends batch.pause Inngest event
    ✓ throws InvalidBatchStatusTransitionError for non-running batch

  describe("resume")
    ✓ transitions paused batch to running status
    ✓ sends batch.resume Inngest event
    ✓ throws InvalidBatchStatusTransitionError for non-paused batch

  describe("cancel")
    ✓ transitions running batch to cancelled status
    ✓ transitions paused batch to cancelled status
    ✓ sends batch.cancel Inngest event
    ✓ throws InvalidBatchStatusTransitionError for terminal state batch
    ✓ preserves completed items (no deletion)

describe("BatchControlController")
  ✓ rejects unauthenticated request (401)
  ✓ rejects non-owner access (403)
  ✓ returns 404 for non-existent batch
  ✓ returns 409 for invalid status transition
```

**File:** `apps/web/src/__tests__/generation/BatchControls.test.tsx`

```
describe("BatchControls")
  ✓ shows Pause and Cancel buttons when batch is running
  ✓ shows Resume and Cancel buttons when batch is paused
  ✓ disables all buttons when batch is in terminal state
  ✓ opens CancelConfirmDialog on cancel button click
  ✓ calls onCancel callback after confirmation
```

**Total: ~20 tests** (11 service + 4 controller + 5 frontend)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full batch flow (config -> progress -> controls) is complete as a critical journey.

## 12. Acceptance Criteria

1. Pause button: stops dispatching new items, in-progress items complete
2. Resume button: resumes dispatching from where paused
3. Cancel button: stops all pending items, in-progress items complete, batch marked `cancelled`
4. Confirmation dialog for cancel action
5. Paused state persisted: survives server restart via Inngest step state
6. Status transitions: `running` -> `paused` -> `running` or `cancelled`
7. Cancelled batch preserves all completed items (no data loss)
8. Controls disabled when batch is in terminal state
9. Invalid transitions return 409 with `INVALID_TRANSITION` code
10. All ~20 tests pass
11. TypeScript strict, named exports only (except page.tsx)

## 13. Source References

| Claim | Source |
|-------|--------|
| Pause/resume/cancel controls | S-F-20-4 § Acceptance Criteria |
| Inngest waitForEvent pattern | S-F-20-4 § Notes: "step.waitForEvent('batch.resume') pattern" |
| Cancel preserves completed items | S-F-20-4 § Acceptance Criteria: "Cancelled batch preserves all completed items" |
| In-progress items complete | S-F-20-4 § Notes: "In-progress items cannot be cancelled mid-LLM-call" |
| Confirmation dialog | S-F-20-4 § Acceptance Criteria: "Confirmation dialog for cancel action (destructive)" |
| Status transitions | S-F-20-4 § Acceptance Criteria: "running → paused → running or cancelled" |
| Control endpoints | S-F-20-4 § Notes: "POST /api/generation/batch/:batchId/pause|resume|cancel" |
| Retry failed button | S-F-20-4 § Notes: "Consider adding Retry Failed button" |

## 14. Environment Prerequisites

- **Express:** Server running on port 3001 with batch pipeline (from F-39)
- **Inngest:** Dev server running for event handling
- **Supabase:** Project running with `batch_jobs` table (from F-39)
- **Next.js:** Web app running on port 3000 with batch progress page (from F-46)

## 15. Figma / Make Prototype

**Controls (embedded in progress page header):**

**Running state:**
```
[⏸ Pause]  [✕ Cancel]
  outline    destructive
```

**Paused state:**
```
[▶ Resume]  [✕ Cancel]
  green       destructive
```

**Terminal state (completed/cancelled/failed):**
```
[⏸ Pause]  [✕ Cancel]    ← all disabled/grayed out
```

**Cancel Confirmation Dialog:**
```
┌────────────────────────────────────┐
│ Cancel Batch Generation?            │
│                                     │
│ ⚠ This will stop all pending items.│
│ In-progress items will complete.    │
│ Completed items will be preserved.  │
│                                     │
│          [Keep Running] [Cancel Batch]│
│           outline         red/destructive│
└────────────────────────────────────┘
```

Colors: Green (#69a338) resume, Navy Deep (#002c76) pause outline, Red for cancel/destructive.
