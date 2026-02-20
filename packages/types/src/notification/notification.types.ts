/**
 * Notification types — matches actual DB schema.
 * Columns: id, user_id, type, title, body (nullable), action_url, action_label,
 * is_read, read_at, created_at, institution_id (nullable), metadata (nullable).
 */

export type NotificationType =
  | "system"
  | "course"
  | "assessment"
  | "enrollment"
  | "announcement"
  | "alert";

export const VALID_NOTIFICATION_TYPES: readonly NotificationType[] = [
  "system",
  "course",
  "assessment",
  "enrollment",
  "announcement",
  "alert",
] as const;

/** Raw DB row shape */
export interface NotificationRow {
  readonly id: string;
  readonly user_id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string | null;
  readonly action_url: string | null;
  readonly action_label: string | null;
  readonly is_read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
  readonly institution_id: string | null;
  readonly metadata: Record<string, unknown> | null;
}

/** API-safe output */
export interface Notification {
  readonly id: string;
  readonly user_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string | null;
  readonly action_url: string | null;
  readonly action_label: string | null;
  readonly is_read: boolean;
  readonly read_at: string | null;
  readonly created_at: string;
  readonly institution_id: string | null;
  readonly metadata: Record<string, unknown> | null;
}

export interface NotificationResponse {
  readonly notification: Notification;
}

export interface CreateNotificationRequest {
  readonly user_id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body?: string | null;
  readonly action_url?: string | null;
  readonly action_label?: string | null;
  readonly institution_id?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

export interface CreateBatchNotificationRequest {
  readonly user_ids: readonly string[];
  readonly type: NotificationType;
  readonly title: string;
  readonly body?: string | null;
  readonly action_url?: string | null;
  readonly action_label?: string | null;
  readonly institution_id?: string | null;
  readonly metadata?: Record<string, unknown> | null;
}

export interface NotificationListQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly unread_only?: boolean;
  readonly type?: NotificationType;
}

export interface NotificationListResponse {
  readonly notifications: readonly Notification[];
  readonly meta: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly total_pages: number;
  };
}

export interface UnreadCountResponse {
  readonly count: number;
}

export interface MarkReadResponse {
  readonly notification: Notification;
}

export interface MarkAllReadResponse {
  readonly updated_count: number;
}
