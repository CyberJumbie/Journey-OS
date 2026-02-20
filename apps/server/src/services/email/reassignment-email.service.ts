/**
 * Reassignment email service (stub for Sprint 3).
 * [STORY-SA-4] Abstracted interface for swappable email providers.
 * Replace with Resend/SendGrid implementation in a later sprint.
 */

export interface ReassignmentEmailParams {
  readonly userEmail: string;
  readonly userName: string;
  readonly fromInstitutionName: string;
  readonly toInstitutionName: string;
  readonly reason: string | null;
}

export interface ReassignmentEmailProvider {
  sendNotification(params: ReassignmentEmailParams): Promise<void>;
}

export class ReassignmentEmailService implements ReassignmentEmailProvider {
  async sendNotification(params: ReassignmentEmailParams): Promise<void> {
    // Stub: log to console until email provider is configured
    console.log(
      "[ReassignmentEmailService] Reassignment notification dispatched (stub):",
    );
    console.log(`  To: ${params.userEmail}`);
    console.log(`  User: ${params.userName}`);
    console.log(`  From: ${params.fromInstitutionName}`);
    console.log(`  To: ${params.toInstitutionName}`);
    if (params.reason) {
      console.log(`  Reason: ${params.reason}`);
    }
  }
}
