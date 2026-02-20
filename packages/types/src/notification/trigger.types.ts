/**
 * Notification trigger event types for Inngest functions.
 * [STORY-F-22] Maps system events to notification creation.
 */

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
