/**
 * Invitation email service (stub for Sprint 3).
 * [STORY-SA-5] Abstracted interface for swappable email providers.
 * Replace with Resend/SendGrid implementation in a later sprint.
 */

export interface InvitationEmailParams {
  readonly email: string;
  readonly institutionName: string;
  readonly role: string;
  readonly inviteLink: string;
  readonly expiresAt: string;
}

export interface EmailService {
  sendInvitation(params: InvitationEmailParams): Promise<void>;
}

export class InvitationEmailService implements EmailService {
  async sendInvitation(params: InvitationEmailParams): Promise<void> {
    // Stub: log to console until email provider is configured
    console.log("[InvitationEmailService] Invitation email dispatched (stub):");
    console.log(`  To: ${params.email}`);
    console.log(`  Institution: ${params.institutionName}`);
    console.log(`  Role: ${params.role}`);
    console.log(`  Link: ${params.inviteLink}`);
    console.log(`  Expires: ${params.expiresAt}`);
  }
}
