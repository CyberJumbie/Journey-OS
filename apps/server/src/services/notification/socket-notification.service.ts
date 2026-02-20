/**
 * Socket Notification Service — real-time push notifications.
 * [STORY-F-10] Creates notification in Supabase via existing NotificationService,
 * then emits to user's socket room via SocketManagerService.
 * Notifications persist regardless of connection status.
 */

import type {
  Notification,
  CreateNotificationRequest,
  SocketNotificationPayload,
} from "@journey-os/types";
import { SocketNotificationError } from "../../errors/socket.errors";
import type { NotificationService } from "./notification.service";
import type { SocketManagerService } from "./socket-manager.service";

export class SocketNotificationService {
  readonly #notificationService: NotificationService;
  readonly #socketManager: SocketManagerService;

  constructor(
    notificationService: NotificationService,
    socketManager: SocketManagerService,
  ) {
    this.#notificationService = notificationService;
    this.#socketManager = socketManager;
  }

  /**
   * Create a notification record in Supabase and emit to the user's socket room
   * if they are online. Persists regardless of connection status.
   */
  async push(request: CreateNotificationRequest): Promise<Notification> {
    let notification: Notification;

    try {
      notification = await this.#notificationService.create(request);
    } catch (error) {
      throw new SocketNotificationError(
        `Failed to create notification: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (this.#socketManager.isOnline(request.user_id)) {
      const payload: SocketNotificationPayload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        metadata: notification.metadata,
        created_at: notification.created_at,
      };

      this.#socketManager.emitToUser(request.user_id, payload);
    }

    return notification;
  }

  /**
   * Delegate to existing NotificationService — ownership check included.
   */
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<Notification> {
    return this.#notificationService.markAsRead(notificationId, userId);
  }

  /**
   * Get unread notifications for a user (paginated via existing service).
   */
  async getUnread(userId: string): Promise<Notification[]> {
    const result = await this.#notificationService.findByUserId(userId, {
      unread_only: true,
      limit: 50,
    });
    return [...result.notifications];
  }
}
