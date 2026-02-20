/**
 * Socket.io notification types — real-time push events and presence.
 * [STORY-F-10] Socket.io for notifications/presence only. SSE for streaming generation.
 */

import type { AuthRole } from "../auth/roles.types";
import type { NotificationType } from "./notification.types";

/** Payload emitted via Socket.io `notification:new` event */
export interface SocketNotificationPayload {
  readonly id: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

/** Socket.io event map (server -> client) */
export interface ServerToClientEvents {
  "notification:new": (payload: SocketNotificationPayload) => void;
  /** Forward-declared for STORY-F-19 (Room Management). Not emitted in F-10. */
  "presence:update": (payload: PresenceUpdate) => void;
}

/** Socket.io event map (client -> server) */
export interface ClientToServerEvents {
  "notification:read": (notificationId: string) => void;
}

/** Presence update broadcast */
export interface PresenceUpdate {
  readonly user_id: string;
  readonly status: "online" | "offline";
}

/** Socket handshake auth data stored on socket.data after verification */
export interface SocketAuthData {
  readonly user_id: string;
  readonly email: string;
  readonly role: AuthRole;
  readonly institution_id: string;
}
