/**
 * Invitation types.
 * [STORY-SA-5] Invitations sent to institutional admins after application approval.
 */

/** Invitation record stored in Supabase */
export interface Invitation {
  readonly id: string;
  readonly token: string;
  readonly email: string;
  readonly role: string;
  readonly institution_id: string;
  readonly created_by: string;
  readonly expires_at: string;
  readonly accepted_at: string | null;
  readonly created_at: string;
}

/** Internal shape for creating an invitation */
export interface InvitationCreateParams {
  readonly email: string;
  readonly role: "institutional_admin";
  readonly institution_id: string;
  readonly created_by: string;
}
