/**
 * Email verification types.
 * [STORY-U-14] Types for email verification gate and resend flow.
 */

/** Response for resend verification endpoint */
export interface ResendVerificationResult {
  readonly email: string;
  readonly sent: boolean;
  readonly message: string;
}

/** Verification status check */
export interface VerificationStatus {
  readonly email: string;
  readonly email_verified: boolean;
  readonly verified_at: string | null;
}
