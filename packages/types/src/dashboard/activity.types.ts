/** Supported activity event types */
export type ActivityEventType =
  | "question_generated"
  | "question_reviewed"
  | "question_approved"
  | "question_rejected"
  | "coverage_gap_detected"
  | "bulk_generation_complete";

/** Metadata JSONB structure for activity events */
export interface ActivityEventMetadata {
  /** Human-readable event description */
  readonly description: string;
  /** Course name associated with this event */
  readonly course_name: string | null;
  /** Display name of the actor who triggered the event */
  readonly actor_name: string;
  /** Number of items (for bulk events) */
  readonly count?: number;
  /** Additional context per event type */
  readonly [key: string]: unknown;
}

/** Single activity event record */
export interface ActivityEvent {
  readonly id: string;
  readonly user_id: string;
  readonly institution_id: string;
  readonly event_type: ActivityEventType;
  readonly entity_id: string;
  readonly entity_type: string;
  readonly metadata: ActivityEventMetadata;
  readonly created_at: string;
}

/** Query parameters for the activity feed endpoint */
export interface ActivityFeedQuery {
  readonly user_id: string;
  /** Default: 20, max: 50 */
  readonly limit?: number;
  /** Default: 0 */
  readonly offset?: number;
  /** Filter by type (multi-select) */
  readonly event_types?: readonly ActivityEventType[];
}

/** Response envelope for the activity feed */
export interface ActivityFeedResponse {
  readonly events: readonly ActivityEvent[];
  readonly meta: {
    readonly limit: number;
    readonly offset: number;
    readonly total: number;
    readonly has_more: boolean;
  };
}
