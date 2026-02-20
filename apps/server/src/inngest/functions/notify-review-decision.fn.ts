/**
 * Inngest function: notify-review-decision
 * [STORY-F-22] Notifies question generator of review decision.
 */

import type { ReviewDecisionPayload } from "@journey-os/types";
import { inngest } from "../client";
import type { NotificationService } from "../../services/notification/notification.service";
import type { NotificationRepository } from "../../repositories/notification.repository";
import type { TriggerResolverService } from "../../services/notification/trigger-resolver.service";

export function createNotifyReviewDecision(deps: {
  notificationService: NotificationService;
  notificationRepository: NotificationRepository;
  triggerResolver: TriggerResolverService;
}) {
  return inngest.createFunction(
    { id: "notify-review-decision", retries: 3 },
    { event: "review.decision" },
    async ({ event, step }) => {
      const payload = event.data as ReviewDecisionPayload;

      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "review.decision",
        );
      });

      if (exists) {
        return { skipped: true, reason: "duplicate" };
      }

      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("review.decision", payload);
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
            trigger_type: "review.decision",
          },
        });
      });

      return { notified: resolved.user_ids.length };
    },
  );
}
