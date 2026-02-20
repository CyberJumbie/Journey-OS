/**
 * Inngest function: notify-kaizen
 * [STORY-F-22] Handles both kaizen.drift.detected and kaizen.lint.complete events.
 * Lint notifications are suppressed when critical_findings === 0.
 */

import type { KaizenDriftPayload, KaizenLintPayload } from "@journey-os/types";
import { inngest } from "../client";
import type { NotificationService } from "../../services/notification/notification.service";
import type { NotificationRepository } from "../../repositories/notification.repository";
import type { TriggerResolverService } from "../../services/notification/trigger-resolver.service";

export function createNotifyKaizenDrift(deps: {
  notificationService: NotificationService;
  notificationRepository: NotificationRepository;
  triggerResolver: TriggerResolverService;
}) {
  return inngest.createFunction(
    { id: "notify-kaizen-drift", retries: 3 },
    { event: "kaizen.drift.detected" },
    async ({ event, step }) => {
      const payload = event.data as KaizenDriftPayload;

      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "kaizen.drift.detected",
        );
      });

      if (exists) {
        return { skipped: true, reason: "duplicate" };
      }

      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("kaizen.drift.detected", payload);
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
            trigger_type: "kaizen.drift.detected",
          },
        });
      });

      return { notified: resolved.user_ids.length };
    },
  );
}

export function createNotifyKaizenLint(deps: {
  notificationService: NotificationService;
  notificationRepository: NotificationRepository;
  triggerResolver: TriggerResolverService;
}) {
  return inngest.createFunction(
    { id: "notify-kaizen-lint", retries: 3 },
    { event: "kaizen.lint.complete" },
    async ({ event, step }) => {
      const payload = event.data as KaizenLintPayload;

      if (payload.critical_findings === 0) {
        return { skipped: true, reason: "no_critical_findings" };
      }

      const exists = await step.run("check-dedup", async () => {
        return deps.notificationRepository.existsByEventId(
          payload.event_id,
          "kaizen.lint.complete",
        );
      });

      if (exists) {
        return { skipped: true, reason: "duplicate" };
      }

      const resolved = await step.run("resolve-recipients", async () => {
        return deps.triggerResolver.resolve("kaizen.lint.complete", payload);
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
            trigger_type: "kaizen.lint.complete",
          },
        });
      });

      return { notified: resolved.user_ids.length };
    },
  );
}
