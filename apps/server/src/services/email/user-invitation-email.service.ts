/**
 * Email service for institution user invitations.
 * [STORY-IA-1] Logs invitation payload at MVP; replace with real provider later.
 */

export class UserInvitationEmailService {
  #logger: Console;

  constructor(logger: Console = console) {
    this.#logger = logger;
  }

  async sendInvitation(
    email: string,
    role: string,
    inviterName: string,
    institutionName: string,
    token: string,
  ): Promise<void> {
    this.#logger.log(
      "[UserInvitationEmailService] Invitation dispatched (stub):",
    );
    this.#logger.log(`  To: ${email}`);
    this.#logger.log(`  Role: ${role}`);
    this.#logger.log(`  Invited by: ${inviterName}`);
    this.#logger.log(`  Institution: ${institutionName}`);
    this.#logger.log(`  Token: ${token}`);
  }
}
