import { JourneyOSError } from "./base.errors";

export class SameInstitutionError extends JourneyOSError {
  constructor() {
    super("Cannot reassign user to the same institution", "SAME_INSTITUTION");
  }
}

export class UserReassignmentError extends JourneyOSError {
  constructor(message: string) {
    super(message, "REASSIGNMENT_ERROR");
  }
}

export class UserNotFoundError extends JourneyOSError {
  constructor(id: string) {
    super(`User not found: ${id}`, "USER_NOT_FOUND");
  }
}

export class ConcurrentModificationError extends JourneyOSError {
  constructor() {
    super(
      "User was modified by another admin. Please refresh and try again.",
      "CONCURRENT_MODIFICATION",
    );
  }
}
