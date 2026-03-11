import { io, type Socket } from 'socket.io-client';
import { createClient } from '@/lib/supabase';

/**
 * Socket.io event payloads received from the server.
 * Mirrors backend SocketServer payload types.
 */
export interface BatchCompletedPayload {
  batchId: string;
  completedCount: number;
  failedCount: number;
}

export interface BatchItemCompletedPayload {
  batchId: string;
  itemId: string;
  status: 'completed' | 'failed';
}

export interface ReviewNeededPayload {
  itemId: string;
  reason: string;
}

export interface SyncFailedPayload {
  entityId: string;
  entityType: string;
}

export type SocketEventName =
  | 'batch:completed'
  | 'batch:item:completed'
  | 'review:needed'
  | 'sync:failed';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Create a Socket.io client connection authenticated with the current
 * Supabase session JWT. Returns null if no session is available.
 *
 * REALTIME_CLEANUP: Callers must call socket.disconnect() on unmount.
 */
export async function createSocketConnection(): Promise<Socket | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    console.warn('[socket] No active session — cannot connect');
    return null;
  }

  const socket = io(SOCKET_URL, {
    path: '/socket.io',
    auth: {
      token: session.access_token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected');
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  return socket;
}
