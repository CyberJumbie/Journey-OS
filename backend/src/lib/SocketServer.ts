import { Server as IOServer, type Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import SupabaseClientSingleton from './SupabaseClient';

/**
 * Socket.io event payloads emitted to client rooms.
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

/**
 * Union of all server-to-client event names.
 */
export type SocketEventName =
  | 'batch:completed'
  | 'batch:item:completed'
  | 'review:needed'
  | 'sync:failed';

/**
 * SocketServer — Singleton for Socket.io server instance.
 *
 * SOCKET_ROOM_PATTERN: Always emit to room `user:{userId}`.
 * Never emit to a socket id directly.
 *
 * Auth: JWT validated via Supabase auth.getUser() in handshake middleware.
 */
class SocketServer {
  private static instance: IOServer | null = null;

  /**
   * Initialize Socket.io on top of the given HTTP server.
   * Must be called once during server startup.
   */
  static init(httpServer: HttpServer): IOServer {
    if (this.instance) {
      return this.instance;
    }

    this.instance = new IOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
      path: '/socket.io',
    });

    // Auth middleware: validate JWT before allowing connection
    this.instance.use(async (socket: Socket, next) => {
      const token = socket.handshake.auth.token as string | undefined;

      if (!token) {
        next(new Error('Authentication required'));
        return;
      }

      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
          next(new Error('Invalid or expired token'));
          return;
        }

        // Store userId on socket data for room joining
        socket.data.userId = user.id;
        next();
      } catch {
        next(new Error('Authentication failed'));
      }
    });

    // On connection: join user-specific room
    this.instance.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as string;
      const room = `user:${userId}`;

      void socket.join(room);
      console.log(`[SocketServer] user ${userId} connected (room: ${room})`);

      socket.on('disconnect', () => {
        console.log(`[SocketServer] user ${userId} disconnected`);
      });
    });

    console.log('[SocketServer] initialized');
    return this.instance;
  }

  /**
   * Get the Socket.io server instance.
   * Returns null if not yet initialized (graceful degradation).
   */
  static getInstance(): IOServer | null {
    return this.instance;
  }

  /**
   * Emit an event to a specific user's room.
   * No-op if Socket.io is not initialized (graceful degradation).
   */
  static emitToUser(
    userId: string,
    event: SocketEventName,
    payload: BatchCompletedPayload | BatchItemCompletedPayload | ReviewNeededPayload | SyncFailedPayload,
  ): void {
    if (!this.instance) {
      console.warn(`[SocketServer] not initialized — skipping emit ${event} to user ${userId}`);
      return;
    }

    const room = `user:${userId}`;
    this.instance.to(room).emit(event, payload);
  }

  /**
   * Shut down the Socket.io server.
   */
  static async close(): Promise<void> {
    if (this.instance) {
      await new Promise<void>((resolve) => {
        this.instance?.close(() => resolve());
      });
      this.instance = null;
      console.log('[SocketServer] closed');
    }
  }
}

export default SocketServer;
