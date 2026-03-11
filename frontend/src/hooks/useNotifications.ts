'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { createSocketConnection } from '@/lib/socket';
import type {
  BatchCompletedPayload,
  BatchItemCompletedPayload,
  ReviewNeededPayload,
  SyncFailedPayload,
  SocketEventName,
} from '@/lib/socket';

/**
 * Notification item stored in local state.
 * Rule 10: No localStorage/sessionStorage — state only.
 */
export interface Notification {
  id: string;
  event: SocketEventName;
  payload: BatchCompletedPayload | BatchItemCompletedPayload | ReviewNeededPayload | SyncFailedPayload;
  timestamp: number;
  read: boolean;
}

/** Max notifications to keep in memory. */
const MAX_NOTIFICATIONS = 10;

/** Generate a unique ID for each notification. */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build a human-readable message from a notification event.
 */
export function getNotificationMessage(notification: Notification): string {
  switch (notification.event) {
    case 'batch:completed': {
      const p = notification.payload as BatchCompletedPayload;
      return `Batch complete: ${p.completedCount} generated, ${p.failedCount} failed`;
    }
    case 'batch:item:completed': {
      const p = notification.payload as BatchItemCompletedPayload;
      return p.status === 'completed'
        ? 'Assessment item generated successfully'
        : 'Item generation failed';
    }
    case 'review:needed': {
      const p = notification.payload as ReviewNeededPayload;
      return `Review needed: ${p.reason}`;
    }
    case 'sync:failed': {
      const p = notification.payload as SyncFailedPayload;
      return `Sync failed for ${p.entityType}`;
    }
  }
}

/**
 * Get the navigation path for a notification click.
 */
export function getNotificationHref(notification: Notification): string {
  switch (notification.event) {
    case 'batch:completed': {
      const p = notification.payload as BatchCompletedPayload;
      return `/batches/${p.batchId}`;
    }
    case 'batch:item:completed': {
      const p = notification.payload as BatchItemCompletedPayload;
      return `/batches/${p.batchId}`;
    }
    case 'review:needed': {
      const p = notification.payload as ReviewNeededPayload;
      return `/items/${p.itemId}`;
    }
    case 'sync:failed':
      return '/dashboard';
  }
}

interface UseNotificationsReturn {
  /** List of notifications (most recent first, max 10). */
  notifications: Notification[];
  /** Number of unread notifications. */
  unreadCount: number;
  /** Mark a single notification as read. */
  markRead: (id: string) => void;
  /** Mark all notifications as read. */
  markAllRead: () => void;
  /** Whether the socket is connected. */
  connected: boolean;
}

/**
 * useNotifications — connects to Socket.io, accumulates events in React state.
 *
 * REALTIME_CLEANUP: disconnects socket on unmount.
 * Graceful degradation: if Socket.io is unavailable, connected stays false
 * and the UI still works (batch pages use polling via useBatchDetail).
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(true);

  const addNotification = useCallback((event: SocketEventName, payload: Notification['payload']) => {
    if (!mountedRef.current) return;

    const notification: Notification = {
      id: generateId(),
      event,
      payload,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((prev) => [notification, ...prev].slice(0, MAX_NOTIFICATIONS));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let socket: Socket | null = null;

    const connect = async () => {
      try {
        socket = await createSocketConnection();
        if (!socket || !mountedRef.current) return;

        socketRef.current = socket;

        socket.on('connect', () => {
          if (mountedRef.current) setConnected(true);
        });

        socket.on('disconnect', () => {
          if (mountedRef.current) setConnected(false);
        });

        // Register event listeners for all notification types
        socket.on('batch:completed', (payload: BatchCompletedPayload) => {
          addNotification('batch:completed', payload);
        });

        socket.on('batch:item:completed', (payload: BatchItemCompletedPayload) => {
          addNotification('batch:item:completed', payload);
        });

        socket.on('review:needed', (payload: ReviewNeededPayload) => {
          addNotification('review:needed', payload);
        });

        socket.on('sync:failed', (payload: SyncFailedPayload) => {
          addNotification('sync:failed', payload);
        });

        // If already connected by the time listeners are attached
        if (socket.connected && mountedRef.current) {
          setConnected(true);
        }
      } catch (err) {
        console.warn('[useNotifications] Socket connection failed — degrading gracefully', err);
      }
    };

    void connect();

    // REALTIME_CLEANUP: disconnect on unmount
    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [addNotification]);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    connected,
  };
}
