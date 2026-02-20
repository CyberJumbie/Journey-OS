/**
 * Socket.io notification errors.
 * [STORY-F-10] Custom error for socket notification failures.
 */

import { JourneyOSError } from "./base.errors";

export class SocketNotificationError extends JourneyOSError {
  constructor(message: string) {
    super(message, "SOCKET_NOTIFICATION_ERROR");
  }
}

export class SocketAuthError extends JourneyOSError {
  constructor(message: string) {
    super(message, "SOCKET_AUTH_ERROR");
  }
}
