/**
 * Inngest function: notify-review-request
 * [STORY-F-22] Creates notifications for all assigned reviewers.
 */

import type { ReviewRequestPayload } from "@journey-os/types";
import { inngest } from "../client";
import type { NotificationService } from "../../services/notification/notification.service";
import type { NotificationRepository } from "../../repositories/notification.repository";
import type { TriggerResolverService } from "../../services/notification/trigger-resolver.service";

export function createNotifyReviewRequest(deps: {
  notificationService: NotificationService;
  notificationRepository: NotificationRepository;
  triggerResolver: TriggerResolverService;
}) {
  return inngest.createFunction(
    { id: "notify-review-request", retries: 3 },
    { event: "review.request" },
    async ({ event, step }) => {
      const payload = event.data as ReviewRequestPayload;

      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "review.request",
        );
      });

      if (exists) {
        return { skipped: true, reason: "duplicate" };
      }

      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("review.request", payload);
      });

      await step.run("create-notifications", async () => {
        return deps.notificationService.createBatch({
          user_ids: [...resolved.user_ids],
          type: "alert",
          title: resolved.title,
          body: resolved.body,
          action_url: resolved.action_url,
          metadata: {
            event_id: payload.event_id,
            trigger_type: "review.request",
          },
        });
      });

      return { notified: resolved.user_ids.length };
    },
  );
}
