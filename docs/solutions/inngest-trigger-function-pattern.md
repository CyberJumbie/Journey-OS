---
name: inngest-trigger-function-pattern
tags: [inngest, notifications, triggers, durable-functions, DI]
story: STORY-F-22
date: 2026-02-20
---
# Inngest Trigger Function Pattern

## Problem
System events (batch completion, review decisions, gap scans) need to trigger
notifications reliably. Functions must be idempotent (safe to replay), support
retry, and use dependency injection for testability.

## Solution

### 1. Factory Function with DI

Each trigger is a factory function that receives dependencies and returns an
Inngest function. This allows constructor-injected services without global singletons.

```typescript
// apps/server/src/inngest/functions/notify-batch-complete.fn.ts
import type { BatchCompletePayload } from "@journey-os/types";
import { inngest } from "../client";
import type { NotificationService } from "../../services/notification/notification.service";
import type { NotificationRepository } from "../../repositories/notification.repository";
import type { TriggerResolverService } from "../../services/notification/trigger-resolver.service";

export function createNotifyBatchComplete(deps: {
  notificationService: NotificationService;
  notificationRepository: NotificationRepository;
  triggerResolver: TriggerResolverService;
}) {
  return inngest.createFunction(
    { id: "notify-batch-complete", retries: 3 },
    { event: "batch.complete" },
    async ({ event, step }) => {
      const payload = event.data as BatchCompletePayload;

      // Step 1: Idempotency check
      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "batch.complete",
        );
      });
      if (exists) return { skipped: true, reason: "duplicate" };

      // Step 2: Resolve recipients
      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("batch.complete", payload);
      });

      // Step 3: Create notification
      await step.run("create-notification", async () => {
        return deps.notificationService.create({
          user_id: resolved.user_ids[0]!,
          type: "alert",
          title: resolved.title,
          body: resolved.body,
          action_url: resolved.action_url,
          metadata: {
            event_id: payload.event_id,
            trigger_type: "batch.complete",
          },
        });
      });

      return { notified: resolved.user_ids.length };
    },
  );
}
```

### 2. Registration in Express

```typescript
// apps/server/src/index.ts
import { serve } from "inngest/express";
import { inngest, createNotifyBatchComplete, ... } from "./inngest";

const triggerResolver = new TriggerResolverService(supabaseClient);
const inngestDeps = { notificationService, notificationRepository, triggerResolver };

app.use("/api/inngest", serve({
  client: inngest,
  functions: [
    createNotifyBatchComplete(inngestDeps),
    // ... other triggers
  ],
}));
```

### 3. Idempotency via Metadata JSONB

Store `event_id` + `trigger_type` in notification `metadata` column. Check before
creating to prevent duplicates on event replay.

```typescript
// Repository method
async existsByEventId(eventId: string, triggerType: string): Promise<boolean> {
  const { count } = await this.#supabaseClient
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("metadata->>event_id", eventId)
    .eq("metadata->>trigger_type", triggerType);
  return (count ?? 0) > 0;
}
```

### 4. Testing

Mock the Inngest step runner to execute callbacks immediately:

```typescript
function createMockStep() {
  return {
    run: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
  };
}
```

Access mock calls with cast through `unknown` (TS strict mode):

```typescript
const callArg = (
  mockCreate.mock.calls as unknown as Array<Array<{ body: string }>>
)[0]![0]!;
```

## When to Use
- Backend event-driven notifications triggered by system events
- Any Inngest function that needs DI for services/repositories

## When Not to Use
- Simple cron jobs (use Inngest scheduled functions directly)
- Sync request/response handlers (use Express controllers)
