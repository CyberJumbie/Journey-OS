import { JourneyOSError } from "./base.errors";

/**
 * Thrown when an unverified user attempts to access a protected resource.
 * [STORY-U-14] Email verification gate.
 */
export class EmailNotVerifiedError extends JourneyOSError {
  constructor(
    message: string = "Please verify your email address before accessing this resource.",
  ) {
    super(message, "EMAIL_NOT_VERIFIED");
  }
}
