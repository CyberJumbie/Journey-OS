/**
 * Notification preference types for per-type, per-channel delivery configuration.
 * [STORY-F-16] Stored in user_preferences table as JSONB.
 *
 * NOTE: Named "NotificationPreferenceType" (not "NotificationType") to avoid
 * collision with the existing NotificationType in notification/notification.types.ts.
 */

/**
 * Notification preference type identifiers.
 * These are categories of notifications users can configure.
 */
export type NotificationPreferenceType =
  | "batch_complete"
  | "review_request"
  | "review_decision"
  | "gap_scan"
  | "lint_alert"
  | "system";

/**
 * Delivery channels for notifications.
 * email channel: preference stored but delivery not yet implemented.
 */
export type NotificationChannel = "in_app" | "email";

/**
 * Per-type channel toggles.
 */
export interface NotificationChannelPreference {
  readonly in_app: boolean;
  readonly email: boolean;
}

/**
 * Full notification preference matrix.
 * Keys are NotificationPreferenceType, values are channel toggles.
 */
export type NotificationPreferenceMatrix = Readonly<
  Record<NotificationPreferenceType, NotificationChannelPreference>
>;

/**
 * Stored user preferences row from user_preferences table.
 */
export interface UserPreferencesRow {
  readonly id: string;
  readonly user_id: string;
  readonly notification_preferences: NotificationPreferenceMatrix;
  readonly generation_preferences: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * GET /api/v1/settings/notifications response payload.
 */
export interface NotificationPreferencesResponse {
  readonly preferences: NotificationPreferenceMatrix;
}

/**
 * PUT /api/v1/settings/notifications request body.
 * Partial update: only include types being changed.
 */
export interface UpdateNotificationPreferencesRequest {
  readonly preferences: Partial<
    Record<NotificationPreferenceType, Partial<NotificationChannelPreference>>
  >;
}

/**
 * Default preferences: all in_app enabled, all email disabled.
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceMatrix = {
  batch_complete: { in_app: true, email: false },
  review_request: { in_app: true, email: false },
  review_decision: { in_app: true, email: false },
  gap_scan: { in_app: true, email: false },
  lint_alert: { in_app: true, email: false },
  system: { in_app: true, email: false },
};

/**
 * All valid notification preference types (for validation).
 */
export const NOTIFICATION_PREFERENCE_TYPES: readonly NotificationPreferenceType[] =
  [
    "batch_complete",
    "review_request",
    "review_decision",
    "gap_scan",
    "lint_alert",
    "system",
  ] as const;
