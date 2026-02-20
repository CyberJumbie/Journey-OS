import { JourneyOSError } from "./base.errors";

export class ProfileNotFoundError extends JourneyOSError {
  constructor(userId: string) {
    super(`Profile not found for user: ${userId}`, "PROFILE_NOT_FOUND");
  }
}

export class ProfileValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}

export class InvalidAvatarError extends JourneyOSError {
  constructor(message: string) {
    super(message, "INVALID_AVATAR");
  }
}

export class ProfileSyncError extends JourneyOSError {
  constructor(userId: string) {
    super(`Profile sync to Neo4j failed for user: ${userId}`, "SYNC_FAILED");
  }
}
