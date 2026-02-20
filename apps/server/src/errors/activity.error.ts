/**
 * Activity feed error classes.
 * [STORY-F-6] Custom errors for activity event operations.
 */

import { JourneyOSError } from "./base.errors";

export class ActivityEventNotFoundError extends JourneyOSError {
  constructor(message = "Activity event not found") {
    super(message, "ACTIVITY_EVENT_NOT_FOUND");
  }
}

export class ActivityFeedForbiddenError extends JourneyOSError {
  constructor(message = "Cannot access another user's activity feed") {
    super(message, "FORBIDDEN");
  }
}

export class ActivityFeedValidationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
  }
}
