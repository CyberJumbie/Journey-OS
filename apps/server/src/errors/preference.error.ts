import { JourneyOSError } from "./base.errors";

export class PreferenceNotFoundError extends JourneyOSError {
  constructor(userId: string) {
    super(`Preferences not found for user "${userId}"`, "PREFERENCE_NOT_FOUND");
  }
}

export class PreferenceValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}
