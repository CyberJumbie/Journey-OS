/**
 * Inngest function: notify-batch-complete
 * [STORY-F-22] Creates notification for batch owner when generation completes.
 */

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

      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "batch.complete",
        );
      });

      if (exists) {
        return { skipped: true, reason: "duplicate" };
      }

      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("batch.complete", payload);
      });

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
