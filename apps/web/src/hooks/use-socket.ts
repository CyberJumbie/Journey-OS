/**
 * Socket.io connection hook for real-time notifications.
 * [STORY-F-10] Connects on mount with JWT, listens for notification:new,
 * disconnects on unmount.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketNotificationPayload,
} from "@journey-os/types";
import { createBrowserClient } from "@web/lib/supabase";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export type SocketStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface UseSocketReturn {
  readonly status: SocketStatus;
  readonly markAsRead: (notificationId: string) => void;
}

export function useSocket(
  onNotification?: (payload: SocketNotificationPayload) => void,
): UseSocketReturn {
  const [status, setStatus] = useState<SocketStatus>("disconnected");
  const socketRef = useRef<TypedSocket | null>(null);
  const onNotificationRef = useRef(onNotification);
  onNotificationRef.current = onNotification;

  const markAsRead = useCallback((notificationId: string) => {
    socketRef.current?.emit("notification:read", notificationId);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function connect() {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled || !session?.access_token) {
        return;
      }

      setStatus("connecting");

      const serverUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

      const socket: TypedSocket = io(serverUrl, {
        auth: { token: `Bearer ${session.access_token}` },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (!cancelled) {
          setStatus("connected");
        }
      });

      socket.on("notification:new", (payload) => {
        onNotificationRef.current?.(payload);
      });

      socket.on("disconnect", () => {
        if (!cancelled) {
          setStatus("disconnected");
        }
      });

      socket.io.on("reconnect_attempt", () => {
        if (!cancelled) {
          setStatus("reconnecting");
        }
      });

      socket.on("connect_error", () => {
        if (!cancelled) {
          setStatus("error");
        }
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { status, markAsRead };
}
