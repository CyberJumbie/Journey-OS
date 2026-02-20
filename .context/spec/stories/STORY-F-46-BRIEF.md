# STORY-F-46 Brief: Batch Progress UI

## 0. Lane & Priority

```yaml
story_id: STORY-F-46
old_id: S-F-20-3
lane: faculty
lane_priority: 3
within_lane_order: 46
sprint: 14
size: M
depends_on:
  - STORY-F-39 (faculty) — Inngest Batch Pipeline (batch pipeline must exist to monitor)
blocks: []
personas_served: [faculty]
epic: E-20 (Bulk Generation)
feature: F-09 (AI Generation)
user_flow: UF-20 (Bulk Generation)
```

## 1. Summary

Build a **real-time batch progress view** at `/faculty/generate/batch/:batchId` that shows completion status, success rates, and errors as items are generated. The view uses SSE streaming (not polling) for real-time updates, displays a progress bar with percentage, status breakdown (completed/in_progress/failed/pending), an individual item status feed, and a batch summary card. Faculty can see error details per item via expandable rows and an estimated time remaining based on current throughput.

Key constraints:
- **SSE streaming** for real-time updates (not polling)
- Event types: `item.started`, `item.completed`, `item.failed`, `batch.progress`, `batch.complete`
- Throughput rate: rolling average of last 10 completions
- Progress view accessible from batch history list
- Auto-scroll to latest item with option to pause scroll
- Persisted progress snapshots for page refresh resilience

## 2. Task Breakdown

1. **Types** — Create `BatchProgressEvent`, `BatchProgressState`, `BatchItemStatus`, `ThroughputRate` in `packages/types/src/generation/batch-progress.types.ts`
2. **SSE Service** — `BatchSSEService` for streaming batch progress events
3. **Controller** — `BatchProgressController` with SSE endpoint `GET /api/v1/generation/batch/:batchId/progress`
4. **Frontend page** — `/faculty/generate/batch/:batchId` page
5. **Frontend components** — `BatchProgressBar`, `BatchItemFeed`, `BatchSummaryCard`
6. **SSE client hook** — `useBatchProgress()` custom hook consuming SSE stream
7. **API tests** — 10 tests for SSE connection, progress calculation, status updates, error reporting

## 3. Data Model (inline, complete)

```typescript
// packages/types/src/generation/batch-progress.types.ts

/** SSE event types for batch progress */
export type BatchProgressEventType =
  | "item.started"
  | "item.completed"
  | "item.failed"
  | "batch.progress"
  | "batch.complete"
  | "heartbeat";

/** Batch progress SSE event */
export interface BatchProgressEvent {
  readonly id: string;
  readonly event: BatchProgressEventType;
  readonly data: string; // JSON stringified payload
}

/** Item started event payload */
export interface ItemStartedPayload {
  readonly itemId: string;
  readonly itemIndex: number;
  readonly startedAt: string;
}

/** Item completed event payload */
export interface ItemCompletedPayload {
  readonly itemId: string;
  readonly itemIndex: number;
  readonly generationId: string;
  readonly durationMs: number;
  readonly completedAt: string;
}

/** Item failed event payload */
export interface ItemFailedPayload {
  readonly itemId: string;
  readonly itemIndex: number;
  readonly errorMessage: string;
  readonly retryCount: number;
  readonly willRetry: boolean;
}

/** Batch progress snapshot payload */
export interface BatchProgressSnapshot {
  readonly batchId: string;
  readonly totalItems: number;
  readonly completedItems: number;
  readonly failedItems: number;
  readonly inProgressItems: number;
  readonly pendingItems: number;
  readonly percentage: number;        // 0-100
  readonly estimatedTimeRemainingMs: number;
  readonly throughputRate: number;    // Items per minute
}

/** Batch complete event payload */
export interface BatchCompletePayload {
  readonly batchId: string;
  readonly status: string;
  readonly totalItems: number;
  readonly completedItems: number;
  readonly failedItems: number;
  readonly totalDurationMs: number;
}

/** Client-side batch progress state */
export interface BatchProgressClientState {
  readonly connected: boolean;
  readonly snapshot: BatchProgressSnapshot | null;
  readonly itemFeed: readonly BatchItemFeedEntry[];
  readonly isComplete: boolean;
  readonly autoScroll: boolean;
}

/** Individual item entry in the feed */
export interface BatchItemFeedEntry {
  readonly itemId: string;
  readonly itemIndex: number;
  readonly status: "started" | "completed" | "failed";
  readonly generationId?: string;
  readonly errorMessage?: string;
  readonly durationMs?: number;
  readonly timestamp: string;
}

/** Throughput calculation */
export interface ThroughputRate {
  readonly itemsPerMinute: number;
  readonly rollingWindowSize: number;  // Last N completions used
  readonly lastUpdated: string;
}
```

## 4. Database Schema (inline, complete)

No new tables needed. Reads from `batch_jobs` and `batch_items` tables created in STORY-F-39.

```sql
-- No migration required for this story.
-- Uses existing batch_jobs and batch_items tables from F-39.
```

## 5. API Contract (complete request/response)

### GET /api/v1/generation/batch/:batchId/progress (Auth: Faculty, owner only)

**SSE Response (200, Content-Type: text/event-stream):**
```
id: prog-1
event: batch.progress
data: {"batchId":"batch-uuid-1","totalItems":20,"completedItems":0,"failedItems":0,"inProgressItems":1,"pendingItems":19,"percentage":0,"estimatedTimeRemainingMs":600000,"throughputRate":0}

id: item-1
event: item.started
data: {"itemId":"item-uuid-1","itemIndex":0,"startedAt":"2026-02-19T12:00:05Z"}

id: item-2
event: item.completed
data: {"itemId":"item-uuid-1","itemIndex":0,"generationId":"gen-uuid-1","durationMs":28000,"completedAt":"2026-02-19T12:00:33Z"}

id: item-3
event: item.failed
data: {"itemId":"item-uuid-3","itemIndex":2,"errorMessage":"LLM provider timeout","retryCount":1,"willRetry":true}

id: prog-2
event: batch.progress
data: {"batchId":"batch-uuid-1","totalItems":20,"completedItems":12,"failedItems":1,"inProgressItems":5,"pendingItems":2,"percentage":60,"estimatedTimeRemainingMs":120000,"throughputRate":3.6}

id: done-1
event: batch.complete
data: {"batchId":"batch-uuid-1","status":"completed_with_errors","totalItems":20,"completedItems":18,"failedItems":2,"totalDurationMs":330000}
```

**Error Responses (non-stream):**

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Non-faculty or not batch owner |
| 404 | `NOT_FOUND` | Batch ID does not exist |

### GET /api/v1/generation/batch/:batchId (Auth: Faculty, owner only) — from F-39

Used on page load to get initial batch state before SSE connection.

## 6. Frontend Spec

### Page: `/faculty/generate/batch/:batchId` (Faculty layout)

**Route:** `apps/web/src/app/(dashboard)/faculty/generate/batch/[batchId]/page.tsx`

**Component hierarchy:**
```
BatchProgressPage (page.tsx — default export)
  ├── BatchSummaryCard (molecule)
  │     ├── Config recap (course, target count, difficulty)
  │     ├── Start time, elapsed time
  │     ├── Throughput rate (items/min)
  │     └── Status badge (running/completed/failed)
  ├── BatchProgressBar (molecule)
  │     ├── Progress bar (completed/total with percentage)
  │     └── Status breakdown: completed (green), in_progress (blue), failed (red), pending (gray)
  └── BatchItemFeed (organism)
        ├── Auto-scroll toggle button
        └── Item rows (scrollable)
              ├── ItemRow: index, status icon, duration, generationId link
              └── ErrorDetailRow (expandable — shows error message for failed items)
```

**States:**
1. **Connecting** — "Connecting to batch progress..." spinner
2. **Running** — Real-time progress bar, item feed updating
3. **Paused** — Progress bar frozen, "Paused" badge (controlled by F-47)
4. **Completed** — Final stats, all items listed, "View Generated Items" link
5. **Completed with Errors** — Final stats with error count, failed items expandable
6. **Failed** — Error message, "Retry Failed" option
7. **Disconnected** — "Connection lost, reconnecting..." with retry

**Design tokens:**
- Progress bar segments: completed = Green (#69a338), in_progress = Blue, failed = Red, pending = Gray
- Surface: White (#ffffff) cards on Cream (#f5f3ef) background
- Status badges: running = Blue, completed = Green (#69a338), failed = Red
- Item feed: alternating row backgrounds (white/cream)
- Error detail: Red left border on expandable error rows

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/generation/batch-progress.types.ts` | Types | Create |
| 2 | `packages/types/src/generation/index.ts` | Types | Edit (add batch-progress export) |
| 3 | `apps/server/src/services/generation/batch-sse.service.ts` | Service | Create |
| 4 | `apps/server/src/controllers/generation/batch-progress.controller.ts` | Controller | Create |
| 5 | `apps/server/src/index.ts` | Routes | Edit (add batch progress SSE route) |
| 6 | `apps/web/src/hooks/useBatchProgress.ts` | Hook | Create |
| 7 | `apps/web/src/app/(dashboard)/faculty/generate/batch/[batchId]/page.tsx` | Page | Create |
| 8 | `apps/web/src/components/generation/BatchProgressBar.tsx` | Component | Create |
| 9 | `apps/web/src/components/generation/BatchItemFeed.tsx` | Component | Create |
| 10 | `apps/web/src/components/generation/BatchSummaryCard.tsx` | Component | Create |
| 11 | `apps/server/src/__tests__/generation/batch-progress.test.ts` | Tests | Create |
| 12 | `apps/web/src/__tests__/generation/BatchProgressBar.test.tsx` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-39 | faculty | NOT STARTED | Batch pipeline must exist (batch_jobs/batch_items tables, Inngest functions) |
| STORY-F-38 | faculty | NOT STARTED | SSE middleware pattern reused for batch progress streaming |
| STORY-U-10 | universal | **DONE** | Dashboard routing for faculty layout |

### NPM Packages (already installed)
- All packages from F-38 and F-39 dependencies

### Existing Files Needed
- `apps/server/src/middleware/sse.middleware.ts` — SSE headers middleware (from F-38)
- `apps/server/src/repositories/batch-job.repository.ts` — Batch job queries (from F-39)
- `apps/web/src/app/(dashboard)/faculty/layout.tsx` — Faculty layout

## 9. Test Fixtures (inline)

```typescript
// Mock batch job for initial state
export const MOCK_BATCH_JOB = {
  id: "batch-uuid-1",
  status: "running",
  total_items: 20,
  completed_items: 12,
  failed_items: 1,
  config: {
    targetCount: 20,
    courseId: "course-uuid-1",
    questionType: "single-best-answer",
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
  },
  started_at: "2026-02-19T12:00:00Z",
  created_at: "2026-02-19T11:59:55Z",
};

// Mock SSE events
export const MOCK_PROGRESS_EVENTS = [
  { id: "prog-1", event: "batch.progress", data: '{"batchId":"batch-uuid-1","totalItems":20,"completedItems":12,"failedItems":1,"inProgressItems":5,"pendingItems":2,"percentage":60,"estimatedTimeRemainingMs":120000,"throughputRate":3.6}' },
  { id: "item-1", event: "item.completed", data: '{"itemId":"item-13","itemIndex":12,"generationId":"gen-13","durationMs":28000,"completedAt":"2026-02-19T12:05:00Z"}' },
  { id: "item-2", event: "item.failed", data: '{"itemId":"item-14","itemIndex":13,"errorMessage":"LLM timeout","retryCount":1,"willRetry":true}' },
];

// Mock throughput data
export const MOCK_THROUGHPUT = {
  itemsPerMinute: 3.6,
  rollingWindowSize: 10,
  lastUpdated: "2026-02-19T12:05:00Z",
};

// Mock completed batch
export const MOCK_COMPLETED_BATCH = {
  ...MOCK_BATCH_JOB,
  status: "completed_with_errors",
  completed_items: 18,
  failed_items: 2,
  completed_at: "2026-02-19T12:10:00Z",
};
```

## 10. API Test Spec (vitest — PRIMARY)

**File:** `apps/server/src/__tests__/generation/batch-progress.test.ts`

```
describe("BatchSSEService")
  ✓ creates SSE connection with correct headers
  ✓ emits batch.progress events with current snapshot
  ✓ emits item.started when batch item begins
  ✓ emits item.completed with generationId and duration
  ✓ emits item.failed with error message and retry info
  ✓ emits batch.complete when all items finish
  ✓ calculates throughput rate from rolling average of last 10

describe("BatchProgressController")
  ✓ rejects unauthenticated request (401)
  ✓ rejects non-owner access (403)
  ✓ returns 404 for non-existent batch
  ✓ sets correct SSE headers (Content-Type, Cache-Control, Connection)
  ✓ sends heartbeat every 15s
```

**Total: ~12 tests** (7 service + 5 controller)

## 11. E2E Test Spec (Playwright — CONDITIONAL)

Not required for this story. E2E coverage will be added when the full batch flow (config -> progress -> controls) is complete.

## 12. Acceptance Criteria

1. Progress bar showing completed/total items with percentage
2. Status breakdown: completed, in_progress, failed, pending counts
3. SSE stream for real-time updates (not polling)
4. Individual item status list with pass/fail indicators
5. Error details expandable per item showing validation failures or generation errors
6. Estimated time remaining based on current throughput rate (rolling avg of last 10)
7. Batch summary card: config recap, start time, elapsed time, throughput rate
8. Auto-scroll to latest item with option to pause scroll
9. Page refresh resilience: loads initial state from API, then reconnects SSE
10. All ~12 tests pass
11. TypeScript strict, named exports only (except page.tsx)

## 13. Source References

| Claim | Source |
|-------|--------|
| SSE for real-time updates | S-F-20-3 § Acceptance Criteria: "SSE stream for real-time updates (not polling)" |
| Event types | S-F-20-3 § Notes: "item.started, item.completed, item.failed, batch.progress, batch.complete" |
| Throughput rolling average | S-F-20-3 § Notes: "rolling average of last 10 completions" |
| Progress snapshots for refresh | S-F-20-3 § Notes: "persisting progress snapshots so page refresh doesn't lose context" |
| Status colors | S-F-20-3 § Notes: "success (green), error (red), pending (gray), in_progress (blue)" |
| SSE endpoint path | S-F-20-3 § Notes: "GET /api/generation/batch/:batchId/progress" |

## 14. Environment Prerequisites

- **Express:** Server running on port 3001 with SSE middleware (from F-38) and batch pipeline (from F-39)
- **Supabase:** Project running with `batch_jobs` and `batch_items` tables (from F-39)
- **Next.js:** Web app running on port 3000 with faculty dashboard
- **Inngest:** Dev server running (emitting batch events)

## 15. Figma / Make Prototype

**Progress View Layout:**
```
┌─────────────────────────────────────────┐
│ Batch Summary Card                       │
│ Course: Cardiovascular Pathology         │
│ Target: 20 items | Type: SBA            │
│ Started: 12:00 PM | Elapsed: 5m 30s    │
│ Throughput: 3.6 items/min | Status: ⚡  │
├─────────────────────────────────────────┤
│ Progress: ████████████░░░░░░░ 60%       │
│ ✅ 12 completed | ⏳ 5 running          │
│ ❌ 1 failed     | ⬜ 2 pending          │
├─────────────────────────────────────────┤
│ Item Feed:                    [⏸ Scroll]│
│ #1  ✅ Completed   28s   → gen-uuid-1  │
│ #2  ✅ Completed   31s   → gen-uuid-2  │
│ #3  ❌ Failed      LLM timeout    [▼]  │
│ │   Error: Provider timeout after 30s   │
│ #4  ✅ Completed   25s   → gen-uuid-4  │
│ #5  ⏳ Running...                       │
└─────────────────────────────────────────┘
```

Colors: Green (#69a338) progress/completed, Red for failed, Blue for running, Gray for pending. White (#ffffff) cards on Cream (#f5f3ef).
