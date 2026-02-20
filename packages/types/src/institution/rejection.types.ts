/**
 * Types for application rejection workflow.
 * [STORY-SA-6] SuperAdmin rejects waitlist applications with mandatory reason.
 */

/** Request body for rejecting an application */
export interface ApplicationRejectionRequest {
  readonly reason: string; // Min 10 characters, required
}

/** Result returned after successful rejection */
export interface ApplicationRejectionResult {
  readonly application_id: string;
  readonly institution_name: string;
  readonly status: "rejected";
  readonly rejection_reason: string;
  readonly rejected_by: string;
  readonly rejected_at: string;
}
