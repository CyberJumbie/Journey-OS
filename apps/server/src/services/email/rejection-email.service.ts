/**
 * Rejection email service (stub for Sprint 3).
 * [STORY-SA-6] Abstracted interface for swappable email providers.
 * Replace with Resend/SendGrid implementation in a later sprint.
 */

export interface RejectionEmailParams {
  readonly contactEmail: string;
  readonly contactName: string;
  readonly institutionName: string;
  readonly rejectionReason: string;
}

export interface RejectionEmailProvider {
  sendNotification(params: RejectionEmailParams): Promise<void>;
}

export class RejectionEmailService implements RejectionEmailProvider {
  async sendNotification(params: RejectionEmailParams): Promise<void> {
    // Stub: log to console until email provider is configured
    console.log(
      "[RejectionEmailService] Rejection notification dispatched (stub):",
    );
    console.log(`  To: ${params.contactEmail}`);
    console.log(`  Contact: ${params.contactName}`);
    console.log(`  Institution: ${params.institutionName}`);
    console.log(`  Reason: ${params.rejectionReason}`);
  }
}
