/**
 * Socket Manager Service — manages Socket.io rooms, presence, and event emission.
 * [STORY-F-10] Handles user rooms (`user:{userId}`), online presence tracking,
 * and typed event emission. No Redis adapter at MVP (single-server).
 */

import type { Server, Socket } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketAuthData,
  SocketNotificationPayload,
} from "@journey-os/types";
import { SocketAuthMiddleware } from "../../middleware/socket-auth.middleware";
import type { AuthService } from "../auth/auth.service";
import type { NotificationService } from "./notification.service";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export class SocketManagerService {
  readonly #io: TypedServer;
  readonly #onlineUsers: Map<string, number> = new Map();
  readonly #authService: AuthService;
  #notificationService: NotificationService | null = null;

  constructor(io: TypedServer, authService: AuthService) {
    this.#io = io;
    this.#authService = authService;
  }

  /**
   * Late-bind the notification service to avoid circular dependency.
   * Called during server initialization after both services are constructed.
   */
  setNotificationService(notificationService: NotificationService): void {
    this.#notificationService = notificationService;
  }

  /**
   * Initialize Socket.io: register auth middleware and connection handler.
   */
  initialize(): void {
    const authMiddleware = new SocketAuthMiddleware(this.#authService);
    this.#io.use(authMiddleware.createMiddleware());

    this.#io.on("connection", (socket: TypedSocket) => {
      const authData = socket.data as SocketAuthData;
      const userId = authData.user_id;
      const room = `user:${userId}`;

      socket.join(room);
      this.#addOnlineUser(userId);

      console.log(
        `[socket] User ${userId} connected (room: ${room}, connections: ${this.#onlineUsers.get(userId) ?? 0})`,
      );

      socket.on("notification:read", (notificationId: string) => {
        this.#handleNotificationRead(notificationId, userId);
      });

      socket.on("disconnect", () => {
        this.#removeOnlineUser(userId);
        console.log(
          `[socket] User ${userId} disconnected (connections: ${this.#onlineUsers.get(userId) ?? 0})`,
        );
      });
    });
  }

  /**
   * Emit a notification payload to a specific user's room.
   */
  emitToUser(userId: string, payload: SocketNotificationPayload): void {
    this.#io.to(`user:${userId}`).emit("notification:new", payload);
  }

  /**
   * Check if a user is currently online (has at least one active connection).
   */
  isOnline(userId: string): boolean {
    return (this.#onlineUsers.get(userId) ?? 0) > 0;
  }

  /**
   * Get the count of currently online users.
   */
  getOnlineCount(): number {
    return this.#onlineUsers.size;
  }

  #addOnlineUser(userId: string): void {
    const current = this.#onlineUsers.get(userId) ?? 0;
    this.#onlineUsers.set(userId, current + 1);
  }

  #removeOnlineUser(userId: string): void {
    const current = this.#onlineUsers.get(userId) ?? 0;
    if (current <= 1) {
      this.#onlineUsers.delete(userId);
    } else {
      this.#onlineUsers.set(userId, current - 1);
    }
  }

  #handleNotificationRead(notificationId: string, userId: string): void {
    if (!this.#notificationService) {
      return;
    }
    this.#notificationService.markAsRead(notificationId, userId).catch(() => {
      // Silently ignore — client can retry or use REST endpoint
    });
  }
}
