/**
 * Inngest function: notify-gap-scan
 * [STORY-F-22] Notifies course owner when gap scan completes.
 */

import type { GapScanCompletePayload } from "@journey-os/types";
import { inngest } from "../client";
import type { NotificationService } from "../../services/notification/notification.service";
import type { NotificationRepository } from "../../repositories/notification.repository";
import type { TriggerResolverService } from "../../services/notification/trigger-resolver.service";

export function createNotifyGapScan(deps: {
  notificationService: NotificationService;
  notificationRepository: NotificationRepository;
  triggerResolver: TriggerResolverService;
}) {
  return inngest.createFunction(
    { id: "notify-gap-scan", retries: 3 },
    { event: "gap.scan.complete" },
    async ({ event, step }) => {
      const payload = event.data as GapScanCompletePayload;

      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "gap.scan.complete",
        );
      });

      if (exists) {
        return { skipped: true, reason: "duplicate" };
      }

      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("gap.scan.complete", payload);
      });

      await step.run("create-notification", async () => {
        return deps.notificationService.create({
          user_id: resolved.user_ids[0]!,
          type: "course",
          title: resolved.title,
          body: resolved.body,
          action_url: resolved.action_url,
          metadata: {
            event_id: payload.event_id,
            trigger_type: "gap.scan.complete",
          },
        });
      });

      return { notified: resolved.user_ids.length };
    },
  );
}
