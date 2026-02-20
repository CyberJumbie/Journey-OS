import { JourneyOSError } from "./base.errors";

export class InvitationError extends JourneyOSError {
  constructor(message: string = "Invitation error") {
    super(message, "INVITATION_ERROR");
  }
}

export class DuplicateInvitationError extends JourneyOSError {
  constructor() {
    super(
      "An active invitation already exists for this email at this institution",
      "DUPLICATE_INVITATION",
    );
  }
}

export class InvitationExpiredError extends JourneyOSError {
  constructor() {
    super("This invitation has expired", "INVITATION_EXPIRED");
  }
}

export class InvitationLimitError extends JourneyOSError {
  constructor() {
    super("Invitation limit reached for this institution", "INVITATION_LIMIT");
  }
}

export class InvitationNotFoundError extends JourneyOSError {
  constructor() {
    super("Invitation not found", "INVITATION_NOT_FOUND");
  }
}

export class InvitationAlreadyUsedError extends JourneyOSError {
  constructor() {
    super("This invitation has already been used", "INVITATION_ALREADY_USED");
  }
}

export class InvitationInvalidError extends JourneyOSError {
  constructor(message: string = "Invalid invitation") {
    super(message, "INVITATION_INVALID");
  }
}
