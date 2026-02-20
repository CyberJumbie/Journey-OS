# STORY-F-46: Batch Progress UI

**Epic:** E-20 (Bulk Generation)
**Feature:** F-09 (Generation Workbench)
**Sprint:** 14
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-20-3

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a real-time progress view for batch generation so that I can monitor completion status, success rates, and errors as items are generated.

## Acceptance Criteria
- [ ] Progress bar showing completed/total items with percentage
- [ ] Status breakdown: completed, in_progress, failed, pending counts
- [ ] SSE stream for real-time updates (not polling)
- [ ] Individual item status list: scrollable feed of generated items with pass/fail indicators
- [ ] Error details: expandable row showing validation failures or generation errors per item
- [ ] Estimated time remaining based on current throughput rate
- [ ] Batch summary card: config recap, start time, elapsed time, throughput rate
- [ ] Auto-scroll to latest item with option to pause scroll
- [ ] 8-12 API tests: SSE connection, progress calculation, status updates, error reporting
- [ ] TypeScript strict, named exports only, design tokens only

## Reference Screens
> Refactor these prototype files for production.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/generation/BatchProgress.tsx` | `apps/web/src/app/(protected)/workbench/batch/[batchId]/page.tsx` | Extract BatchProgressBar molecule and BatchItemFeed organism; replace inline styles with Tailwind design tokens; convert to named exports; use `@web/*` path alias |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/generation/batch-progress.types.ts` |
| Controller | apps/server | `src/controllers/generation/batch-progress.controller.ts` |
| Route | apps/server | `src/routes/generation/batch-progress.routes.ts` |
| SSE Service | apps/server | `src/services/generation/batch-sse.service.ts` |
| View - Page | apps/web | `src/app/(protected)/workbench/batch/[batchId]/page.tsx` |
| View - Progress | apps/web | `src/components/generation/batch-progress-bar.tsx` |
| View - Feed | apps/web | `src/components/generation/batch-item-feed.tsx` |
| View - Summary | apps/web | `src/components/generation/batch-summary-card.tsx` |
| Hooks | apps/web | `src/hooks/use-batch-progress.ts` |
| Tests | apps/server | `src/controllers/generation/__tests__/batch-progress.test.ts` |

## Database Schema
No new tables. Reads from `batch_jobs` and `batch_items` tables (STORY-F-39).

## API Endpoints

### GET /api/v1/generation/batch/:batchId/progress
**Auth:** JWT required (batch owner)
**Response:** `text/event-stream`
**SSE Events:**
```
event: item.started
data: {"itemId":"uuid","index":5,"total":20,"timestamp":"..."}

event: item.completed
data: {"itemId":"uuid","questionId":"uuid","index":5,"total":20,"timestamp":"..."}

event: item.failed
data: {"itemId":"uuid","index":5,"error":"ValidationEngineError: stem too short","timestamp":"..."}

event: batch.progress
data: {"completed":5,"failed":1,"pending":14,"inProgress":2,"progress":0.3,"eta_seconds":120}

event: batch.complete
data: {"totalCompleted":18,"totalFailed":2,"duration_ms":180000,"throughput":0.1}

event: heartbeat
data: {}
```

### GET /api/v1/generation/batch/:batchId
**Auth:** JWT required (batch owner)
**Success Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "status": "running",
    "config": {...},
    "totalItems": 20,
    "completedItems": 5,
    "failedItems": 1,
    "startedAt": "...",
    "items": [{ "id": "uuid", "status": "completed", "questionId": "uuid" }, ...]
  },
  "error": null
}
```

## Dependencies
- **Blocked by:** STORY-F-39 (batch pipeline exists to monitor)
- **Blocks:** none
- **Cross-lane:** none

## Testing Requirements
- 8-12 API tests: SSE content-type header, item.started event format, item.completed event format, item.failed with error details, batch.progress calculation, batch.complete event, heartbeat interval, auth guard (401 for non-owner), ETA calculation based on throughput, GET batch status endpoint
- 0 E2E tests
- Use `afterEach(() => cleanup())` in component tests.

## Implementation Notes
- SSE endpoint: `GET /api/v1/generation/batch/:batchId/progress` with `text/event-stream` content type.
- Throughput rate: rolling average of last 10 completions.
- Persist progress snapshots so page refresh does not lose context — read initial state from `batch_jobs`/`batch_items`, then subscribe to SSE for live updates.
- Progress view accessible from batch history list (navigable after leaving page).
- Design tokens for status colors: `--color-success` (completed), `--color-error` (failed), `--color-muted` (pending), `--color-info` (in_progress).
- Express SSE headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- In client `fetch().json()`, cast response with `as` for strict TypeScript.
- Next.js page requires `export default` (exception).
