/**
 * User reassignment types.
 * [STORY-SA-4] SuperAdmin reassigns users between institutions.
 */

/** Request body for user reassignment */
export interface UserReassignmentRequest {
  readonly target_institution_id: string;
  readonly reason?: string;
}

/** Result returned after successful reassignment */
export interface UserReassignmentResult {
  readonly user_id: string;
  readonly from_institution_id: string;
  readonly from_institution_name: string;
  readonly to_institution_id: string;
  readonly to_institution_name: string;
  readonly courses_archived: number;
  readonly course_director_reset: boolean;
  readonly audit_log_id: string;
  readonly reassigned_at: string;
}

/** Shape of the audit_log entry for reassignment */
export interface ReassignmentAuditEntry {
  readonly user_id: string;
  readonly action: "user_reassignment";
  readonly entity_type: "profile";
  readonly entity_id: string;
  readonly old_values: {
    readonly institution_id: string;
    readonly is_course_director: boolean;
  };
  readonly new_values: {
    readonly institution_id: string;
    readonly is_course_director: boolean;
  };
  readonly metadata: {
    readonly from_institution_name: string;
    readonly to_institution_name: string;
    readonly courses_archived: number;
    readonly reason: string | null;
  };
}
