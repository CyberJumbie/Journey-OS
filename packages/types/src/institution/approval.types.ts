/**
 * Approval workflow types.
 * [STORY-SA-5] SuperAdmin approves waitlist applications → creates institution + invitation.
 */

/** Request body for approving an application */
export interface ApplicationApprovalRequest {
  readonly domain: string;
}

/** Result returned after successful approval */
export interface InstitutionApprovalResult {
  readonly application_id: string;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly institution_domain: string;
  readonly invitation_id: string;
  readonly invitation_email: string;
  readonly invitation_expires_at: string;
  readonly approved_at: string;
  readonly approved_by: string;
}
