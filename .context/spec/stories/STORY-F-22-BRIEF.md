# STORY-F-22 Brief: Inngest Notification Triggers

## 0. Lane & Priority

```yaml
story_id: STORY-F-22
old_id: S-F-34-3
lane: faculty
lane_priority: 3
within_lane_order: 22
sprint: 19
size: M
depends_on:
  - STORY-F-10 (faculty) — Notification Service must exist to persist and push notifications
blocks: []
personas_served: [faculty, institutional_admin]
epic: E-34 (Notification System)
feature: F-16 (Notifications & Real-time)
```

## 1. Summary

Build **Inngest notification trigger functions** that listen for system events and automatically create notifications via the existing NotificationService. Six trigger functions respond to events emitted by other services: batch completion, review requests, review decisions, gap scan completions, kaizen drift detection, and kaizen lint completions. Each trigger resolves the correct recipient(s) using a **TriggerResolverService** that maps event context to target user IDs.

Key constraints:
- Inngest functions are idempotent (event ID used as dedup key)
- Recipient resolution is centralized in TriggerResolverService (not duplicated per trigger)
- Notification content is built by structured message builders per trigger type
- `review.request` may notify multiple eligible reviewers via bulk notification creation
- Notification batching: rapid successive events (e.g., 10 batch items completing) should produce 1 summary notification
- Custom error class: `NotificationTriggerError`

## 2. Task Breakdown

| # | Task | File | Est |
|---|------|------|-----|
| 1 | Define trigger event types, recipient resolution types | `packages/types/src/notification/trigger.types.ts` | 30m |
| 2 | Create barrel export for notification types | `packages/types/src/notification/index.ts` | 5m |
| 3 | Update root barrel export | `packages/types/src/index.ts` | 5m |
| 4 | Create `NotificationTriggerError` error class | `apps/server/src/errors/notification.errors.ts` | 15m |
| 5 | Export new error | `apps/server/src/errors/index.ts` | 5m |
| 6 | Implement `TriggerResolverService` | `apps/server/src/services/notification/trigger-resolver.service.ts` | 60m |
| 7 | Implement `notify-batch-complete.fn.ts` | `apps/server/src/inngest/functions/notify-batch-complete.fn.ts` | 30m |
| 8 | Implement `notify-review-request.fn.ts` | `apps/server/src/inngest/functions/notify-review-request.fn.ts` | 30m |
| 9 | Implement `notify-review-decision.fn.ts` | `apps/server/src/inngest/functions/notify-review-decision.fn.ts` | 30m |
| 10 | Implement `notify-gap-scan.fn.ts` | `apps/server/src/inngest/functions/notify-gap-scan.fn.ts` | 30m |
| 11 | Implement `notify-kaizen.fn.ts` (drift + lint) | `apps/server/src/inngest/functions/notify-kaizen.fn.ts` | 30m |
| 12 | Write API tests (12 tests) | `apps/server/src/__tests__/notification/triggers.test.ts` | 90m |

**Total estimate:** ~6 hours (Size M)

## 3. Data Model (inline, complete)

### `packages/types/src/notification/trigger.types.ts`

```typescript
/**
 * Notification trigger event names.
 */
export type NotificationTriggerEvent =
  | "batch.complete"
  | "review.request"
  | "review.decision"
  | "gap.scan.complete"
  | "kaizen.drift.detected"
  | "kaizen.lint.complete";

/**
 * Base payload shared by all trigger events.
 */
export interface BaseTriggerPayload {
  readonly event_id: string;
  readonly timestamp: string;
}

/**
 * Batch completion event payload.
 */
export interface BatchCompletePayload extends BaseTriggerPayload {
  readonly batch_id: string;
  readonly owner_id: string;
  readonly total_items: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly batch_name: string;
}

/**
 * Review request event payload.
 */
export interface ReviewRequestPayload extends BaseTriggerPayload {
  readonly review_id: string;
  readonly question_id: string;
  readonly requester_id: string;
  readonly assigned_reviewer_ids: ReadonlyArray<string>;
  readonly question_title: string;
}

/**
 * Review decision event payload.
 */
export interface ReviewDecisionPayload extends BaseTriggerPayload {
  readonly review_id: string;
  readonly question_id: string;
  readonly reviewer_id: string;
  readonly generator_id: string;
  readonly decision: "approved" | "rejected" | "revision_requested";
  readonly comment: string;
  readonly question_title: string;
}

/**
 * Gap scan completion event payload.
 */
export interface GapScanCompletePayload extends BaseTriggerPayload {
  readonly scan_id: string;
  readonly course_id: string;
  readonly course_owner_id: string;
  readonly gaps_found: number;
  readonly critical_gaps: number;
  readonly course_name: string;
}

/**
 * Kaizen drift detected event payload.
 */
export interface KaizenDriftPayload extends BaseTriggerPayload {
  readonly drift_id: string;
  readonly institution_id: string;
  readonly metric_name: string;
  readonly current_value: number;
  readonly threshold: number;
  readonly severity: "warning" | "critical";
}

/**
 * Kaizen lint completion event payload.
 */
export interface KaizenLintPayload extends BaseTriggerPayload {
  readonly lint_run_id: string;
  readonly institution_id: string;
  readonly total_findings: number;
  readonly critical_findings: number;
  readonly warning_findings: number;
}

/**
 * Union of all trigger payloads.
 */
export type TriggerPayload =
  | BatchCompletePayload
  | ReviewRequestPayload
  | ReviewDecisionPayload
  | GapScanCompletePayload
  | KaizenDriftPayload
  | KaizenLintPayload;

/**
 * Resolved recipient(s) for a trigger.
 */
export interface ResolvedRecipients {
  readonly user_ids: ReadonlyArray<string>;
  readonly notification_type: string;
  readonly title: string;
  readonly body: string;
  readonly action_url: string | null;
}

/**
 * Trigger dedup key structure.
 */
export interface TriggerDedupKey {
  readonly event_id: string;
  readonly trigger_type: NotificationTriggerEvent;
}
```

## 4. Database Schema (inline, complete)

No new tables required. Notifications are persisted via the existing `notifications` table (created in STORY-F-10). Deduplication uses the `event_id` field stored in the notification `metadata` JSONB column to prevent duplicate notifications on event replay.

```sql
-- No migration needed. Existing notifications table supports:
-- metadata JSONB with { event_id, trigger_type } for dedup
-- Verify idempotency by querying:
-- SELECT 1 FROM notifications WHERE metadata->>'event_id' = $1 AND metadata->>'trigger_type' = $2
```

## 5. API Contract (complete request/response)

No new REST endpoints. Inngest functions are triggered by internal events, not HTTP requests. The functions use the existing NotificationService which persists to the `notifications` table and pushes via Socket.io.

**Inngest event contracts:**

| Event Name | Trigger Function | Recipients |
|------------|-----------------|------------|
| `batch.complete` | `notify-batch-complete` | Batch owner |
| `review.request` | `notify-review-request` | Assigned reviewer(s) |
| `review.decision` | `notify-review-decision` | Question generator |
| `gap.scan.complete` | `notify-gap-scan` | Course owner |
| `kaizen.drift.detected` | `notify-kaizen` | Institutional admins |
| `kaizen.lint.complete` | `notify-kaizen` | Institutional admins (if critical > 0) |

## 6. Frontend Spec

Not applicable for this story. Notifications created by these triggers are displayed by the Bell Dropdown Component (STORY-F-23) and the existing notification list UI. No new frontend components are needed.

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/types/src/notification/trigger.types.ts` | Types | Create |
| 2 | `packages/types/src/notification/index.ts` | Types | Create or Edit |
| 3 | `packages/types/src/index.ts` | Types | Edit (add notification export) |
| 4 | `apps/server/src/errors/notification.errors.ts` | Errors | Create |
| 5 | `apps/server/src/errors/index.ts` | Errors | Edit (add export) |
| 6 | `apps/server/src/services/notification/trigger-resolver.service.ts` | Service | Create |
| 7 | `apps/server/src/inngest/functions/notify-batch-complete.fn.ts` | Inngest | Create |
| 8 | `apps/server/src/inngest/functions/notify-review-request.fn.ts` | Inngest | Create |
| 9 | `apps/server/src/inngest/functions/notify-review-decision.fn.ts` | Inngest | Create |
| 10 | `apps/server/src/inngest/functions/notify-gap-scan.fn.ts` | Inngest | Create |
| 11 | `apps/server/src/inngest/functions/notify-kaizen.fn.ts` | Inngest | Create |
| 12 | `apps/server/src/__tests__/notification/triggers.test.ts` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-F-10 | faculty | Required | NotificationService must exist to persist + push notifications |
| STORY-U-3 | universal | **DONE** | Auth context for user resolution |
| STORY-U-6 | universal | **DONE** | RBAC for institutional admin identification |

### Cross-Epic Dependencies (event sources)
| Story | Epic | Why |
|-------|------|-----|
| S-F-20-1 | E-20 | Emits `batch.complete` events |
| S-F-22-2 | E-22 | Emits `review.request` and `review.decision` events |
| S-IA-37-1 | E-37 | Emits `kaizen.drift.detected` and `kaizen.lint.complete` events |

### NPM Packages (already installed)
- `inngest` -- Durable function execution
- `@supabase/supabase-js` -- Supabase client for notification persistence
- `vitest` -- Testing

### Existing Files Needed
- `apps/server/src/services/notification/notification.service.ts` -- NotificationService (STORY-F-10)
- `apps/server/src/inngest/client.ts` -- Inngest client instance
- `apps/server/src/errors/base.errors.ts` -- `JourneyOSError` base class
- `packages/types/src/auth/roles.types.ts` -- `AuthRole` enum

## 9. Test Fixtures (inline)

```typescript
import type {
  BatchCompletePayload,
  ReviewRequestPayload,
  ReviewDecisionPayload,
  GapScanCompletePayload,
  KaizenDriftPayload,
  KaizenLintPayload,
} from "@journey-os/types";

/** Mock batch complete event */
export const MOCK_BATCH_COMPLETE: BatchCompletePayload = {
  event_id: "evt-batch-001",
  timestamp: "2026-02-19T12:00:00Z",
  batch_id: "batch-uuid-001",
  owner_id: "user-uuid-001",
  total_items: 25,
  succeeded: 23,
  failed: 2,
  batch_name: "Cardiology Question Set",
};

/** Mock review request event */
export const MOCK_REVIEW_REQUEST: ReviewRequestPayload = {
  event_id: "evt-review-001",
  timestamp: "2026-02-19T12:00:00Z",
  review_id: "review-uuid-001",
  question_id: "question-uuid-001",
  requester_id: "user-uuid-001",
  assigned_reviewer_ids: ["reviewer-uuid-001", "reviewer-uuid-002"],
  question_title: "Cardiac Physiology MCQ #12",
};

/** Mock review decision event */
export const MOCK_REVIEW_DECISION: ReviewDecisionPayload = {
  event_id: "evt-decision-001",
  timestamp: "2026-02-19T12:00:00Z",
  review_id: "review-uuid-001",
  question_id: "question-uuid-001",
  reviewer_id: "reviewer-uuid-001",
  generator_id: "user-uuid-001",
  decision: "approved",
  comment: "Excellent question, meets quality standards.",
  question_title: "Cardiac Physiology MCQ #12",
};

/** Mock gap scan complete event */
export const MOCK_GAP_SCAN: GapScanCompletePayload = {
  event_id: "evt-gap-001",
  timestamp: "2026-02-19T12:00:00Z",
  scan_id: "scan-uuid-001",
  course_id: "course-uuid-001",
  course_owner_id: "user-uuid-001",
  gaps_found: 5,
  critical_gaps: 2,
  course_name: "Medical Sciences I",
};

/** Mock kaizen drift event */
export const MOCK_KAIZEN_DRIFT: KaizenDriftPayload = {
  event_id: "evt-drift-001",
  timestamp: "2026-02-19T12:00:00Z",
  drift_id: "drift-uuid-001",
  institution_id: "inst-uuid-001",
  metric_name: "average_question_quality",
  current_value: 0.62,
  threshold: 0.75,
  severity: "critical",
};

/** Mock kaizen lint event */
export const MOCK_KAIZEN_LINT: KaizenLintPayload = {
  event_id: "evt-lint-001",
  timestamp: "2026-02-19T12:00:00Z",
  lint_run_id: "lint-uuid-001",
  institution_id: "inst-uuid-001",
  total_findings: 12,
  critical_findings: 3,
  warning_findings: 9,
};

/** Duplicate event ID for idempotency testing */
export const DUPLICATE_EVENT_ID = "evt-batch-001";
```

## 10. API Test Spec (vitest -- PRIMARY)

### `apps/server/src/__tests__/notification/triggers.test.ts` (12 tests)

```
describe("Notification Triggers")
  describe("notify-batch-complete")
    it creates notification for batch owner with success/failure summary
    it skips duplicate notification when event_id already processed (idempotency)

  describe("notify-review-request")
    it creates notifications for all assigned reviewers (bulk)
    it includes question title in notification body

  describe("notify-review-decision")
    it notifies question generator of approval decision
    it notifies question generator of rejection with comment

  describe("notify-gap-scan")
    it notifies course owner when gaps detected
    it includes gap count and critical gap count in body

  describe("notify-kaizen")
    it notifies institutional admins of drift detection
    it notifies institutional admins when critical lint findings > 0
    it does NOT notify when kaizen lint has 0 critical findings

  describe("TriggerResolverService")
    it resolves correct recipient user IDs for each event type
```

**Total: 12 tests**

## 11. E2E Test Spec (Playwright -- CONDITIONAL)

Not required for this story. Inngest functions are backend-only with no user-facing UI. Notification delivery will be tested end-to-end when the Bell Dropdown (STORY-F-23) and the triggering workflows are integrated.

## 12. Acceptance Criteria

1. `batch.complete` event triggers notification to batch owner with success/failure summary
2. `review.request` event triggers notifications to all assigned reviewers
3. `review.decision` event triggers notification to question generator with decision and comment
4. `gap.scan.complete` event triggers notification to course owner with gap count
5. `kaizen.drift.detected` triggers notification to institutional admins with severity
6. `kaizen.lint.complete` triggers notification to institutional admins only if `critical_findings > 0`
7. Each trigger function is idempotent: replaying an event with the same `event_id` does not create duplicate notifications
8. TriggerResolverService correctly maps each event type to target user(s)
9. Custom error class `NotificationTriggerError` used for all trigger failures
10. All 12 API tests pass
11. TypeScript strict mode, named exports only

## 13. Source References

| Claim | Source |
|-------|--------|
| Inngest for durable functions | ARCHITECTURE_v10 Section 4.3: "Inngest for background job orchestration" |
| Notification triggers on system events | S-F-34-3: "automatic notifications triggered by system events" |
| Idempotency via event ID dedup | S-F-34-3: "Trigger functions are idempotent (safe to replay)" |
| Recipient resolution service | S-F-34-3: "TriggerResolverService maps event to target user(s)" |
| Bulk notification for review.request | S-F-34-3: "may notify multiple eligible reviewers" |
| Custom error class | S-F-34-3: "NotificationTriggerError" |
| Notification batching consideration | S-F-34-3: "send 1 summary notification" |

## 14. Environment Prerequisites

- **Inngest:** Dev server running (`npx inngest-cli@latest dev`)
- **Supabase:** Project running, `notifications` table exists (STORY-F-10)
- **Express:** Server running on port 3001 with Inngest route registered
- **No Neo4j needed** for this story
- **No new npm packages** required

## 15. Implementation Notes

- **Inngest function pattern:**

```typescript
import { inngest } from "../client";
import type { BatchCompletePayload } from "@journey-os/types";

export const notifyBatchComplete = inngest.createFunction(
  { id: "notify-batch-complete", retries: 3 },
  { event: "batch.complete" },
  async ({ event, step }) => {
    const payload = event.data as BatchCompletePayload;

    // Step 1: Check idempotency
    const exists = await step.run("check-dedup", async () => {
      return notificationService.existsByEventId(payload.event_id, "batch.complete");
    });
    if (exists) return { skipped: true, reason: "duplicate" };

    // Step 2: Resolve recipients
    const resolved = await step.run("resolve-recipients", async () => {
      return triggerResolver.resolve("batch.complete", payload);
    });

    // Step 3: Create notification
    await step.run("create-notification", async () => {
      return notificationService.create({
        user_ids: resolved.user_ids,
        type: resolved.notification_type,
        title: resolved.title,
        body: resolved.body,
        action_url: resolved.action_url,
        metadata: { event_id: payload.event_id, trigger_type: "batch.complete" },
      });
    });

    return { notified: resolved.user_ids.length };
  },
);
```

- **TriggerResolverService pattern:**

```typescript
export class TriggerResolverService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async resolve(event: NotificationTriggerEvent, payload: TriggerPayload): Promise<ResolvedRecipients> {
    switch (event) {
      case "batch.complete":
        return this.#resolveBatchComplete(payload as BatchCompletePayload);
      case "review.request":
        return this.#resolveReviewRequest(payload as ReviewRequestPayload);
      // ... other cases
    }
  }
}
```

- **Idempotency:** Before creating a notification, query `notifications` table for matching `metadata->>'event_id'` and `metadata->>'trigger_type'`. If found, skip creation.

- **Kaizen lint suppression:** If `critical_findings === 0`, do not create a notification. This prevents noise from clean lint runs.

- **OOP:** TriggerResolverService uses JS `#private` fields, constructor DI for SupabaseClient.

- **vi.hoisted()** needed for Inngest and NotificationService mocks in tests.

- **Error class:**

```
JourneyOSError
  └── NotificationTriggerError (code: "NOTIFICATION_TRIGGER_ERROR")
```
