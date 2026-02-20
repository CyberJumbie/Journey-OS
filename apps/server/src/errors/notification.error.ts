/**
 * Notification error classes.
 * [STORY-F-2] Custom errors for notification operations.
 */

import { JourneyOSError } from "./base.errors";

export class NotificationNotFoundError extends JourneyOSError {
  constructor(id: string) {
    super(`Notification not found: ${id}`, "NOTIFICATION_NOT_FOUND");
  }
}

export class NotificationForbiddenError extends JourneyOSError {
  constructor(id: string) {
    super(
      `Not authorized to access notification: ${id}`,
      "NOTIFICATION_FORBIDDEN",
    );
  }
}

export class InvalidNotificationTypeError extends JourneyOSError {
  constructor(type: string) {
    super(`Invalid notification type: ${type}`, "INVALID_NOTIFICATION_TYPE");
  }
}
