/**
 * Invitation acceptance types.
 * [STORY-U-9] Types for invitation token validation and acceptance flow.
 */

/** Result of token validation (returned to frontend for display) */
export interface InvitationTokenPayload {
  readonly invitation_id: string;
  readonly email: string;
  readonly role: string;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly expires_at: string;
  readonly is_valid: boolean;
}

/** Request body for accepting an invitation */
export interface InvitationAcceptRequest {
  readonly token: string;
  readonly password: string;
  readonly full_name: string;
}

/** Result returned after successful acceptance */
export interface InvitationAcceptResult {
  readonly user_id: string;
  readonly email: string;
  readonly role: string;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly accepted_at: string;
}
