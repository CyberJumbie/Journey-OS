/**
 * TriggerResolverService — maps trigger events to notification recipients.
 * [STORY-F-22] Centralized recipient resolution for all Inngest notification triggers.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NotificationTriggerEvent,
  TriggerPayload,
  BatchCompletePayload,
  ReviewRequestPayload,
  ReviewDecisionPayload,
  GapScanCompletePayload,
  KaizenDriftPayload,
  KaizenLintPayload,
  ResolvedRecipients,
} from "@journey-os/types";
import { NotificationTriggerError } from "../../errors";

export class TriggerResolverService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async resolve(
    event: NotificationTriggerEvent,
    payload: TriggerPayload,
  ): Promise<ResolvedRecipients> {
    switch (event) {
      case "batch.complete":
        return this.#resolveBatchComplete(payload as BatchCompletePayload);
      case "review.request":
        return this.#resolveReviewRequest(payload as ReviewRequestPayload);
      case "review.decision":
        return this.#resolveReviewDecision(payload as ReviewDecisionPayload);
      case "gap.scan.complete":
        return this.#resolveGapScan(payload as GapScanCompletePayload);
      case "kaizen.drift.detected":
        return this.#resolveKaizenDrift(payload as KaizenDriftPayload);
      case "kaizen.lint.complete":
        return this.#resolveKaizenLint(payload as KaizenLintPayload);
      default:
        throw new NotificationTriggerError(
          `Unknown trigger event: ${event as string}`,
        );
    }
  }

  #resolveBatchComplete(payload: BatchCompletePayload): ResolvedRecipients {
    const failedText =
      payload.failed > 0 ? ` (${String(payload.failed)} failed)` : "";

    return {
      user_ids: [payload.owner_id],
      notification_type: "alert",
      title: "Batch generation complete",
      body: `"${payload.batch_name}" finished: ${String(payload.succeeded)}/${String(payload.total_items)} succeeded${failedText}.`,
      action_url: null,
    };
  }

  #resolveReviewRequest(payload: ReviewRequestPayload): ResolvedRecipients {
    return {
      user_ids: [...payload.assigned_reviewer_ids],
      notification_type: "alert",
      title: "Review requested",
      body: `You have been asked to review "${payload.question_title}".`,
      action_url: null,
    };
  }

  #resolveReviewDecision(payload: ReviewDecisionPayload): ResolvedRecipients {
    const decisionLabel = payload.decision.replace("_", " ");
    const commentText =
      payload.comment.length > 0 ? `: ${payload.comment}` : "";

    return {
      user_ids: [payload.generator_id],
      notification_type: "alert",
      title: `Review ${decisionLabel}`,
      body: `"${payload.question_title}" was ${decisionLabel}${commentText}.`,
      action_url: null,
    };
  }

  #resolveGapScan(payload: GapScanCompletePayload): ResolvedRecipients {
    return {
      user_ids: [payload.course_owner_id],
      notification_type: "course",
      title: "Gap scan complete",
      body: `"${payload.course_name}" scan found ${String(payload.gaps_found)} gaps (${String(payload.critical_gaps)} critical).`,
      action_url: null,
    };
  }

  async #resolveKaizenDrift(
    payload: KaizenDriftPayload,
  ): Promise<ResolvedRecipients> {
    const adminIds = await this.#resolveInstitutionalAdmins(
      payload.institution_id,
    );

    return {
      user_ids: adminIds,
      notification_type: "alert",
      title: `Kaizen drift detected (${payload.severity})`,
      body: `Metric "${payload.metric_name}" at ${String(payload.current_value)} is below threshold ${String(payload.threshold)}.`,
      action_url: null,
    };
  }

  async #resolveKaizenLint(
    payload: KaizenLintPayload,
  ): Promise<ResolvedRecipients> {
    const adminIds = await this.#resolveInstitutionalAdmins(
      payload.institution_id,
    );

    return {
      user_ids: adminIds,
      notification_type: "alert",
      title: "Kaizen lint complete",
      body: `Lint run found ${String(payload.total_findings)} findings (${String(payload.critical_findings)} critical, ${String(payload.warning_findings)} warnings).`,
      action_url: null,
    };
  }

  async #resolveInstitutionalAdmins(institutionId: string): Promise<string[]> {
    const { data, error } = await this.#supabaseClient
      .from("profiles")
      .select("id")
      .eq("institution_id", institutionId)
      .eq("role", "institutional_admin");

    if (error) {
      throw new NotificationTriggerError(
        `Failed to resolve institutional admins: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      throw new NotificationTriggerError(
        `No institutional admins found for institution: ${institutionId}`,
      );
    }

    return data.map((row: { id: string }) => row.id);
  }
}
