---
name: socketio-service-layer-pattern
tags: [socket.io, real-time, notifications, presence, websocket]
story: STORY-F-10
date: 2026-02-20
---
# Socket.io Service Layer Pattern

## Problem
Real-time features (notifications, presence) need Socket.io integrated into the Express server
without coupling socket logic to existing REST services or breaking the MVC architecture.

## Solution
Three-layer architecture: Config → Middleware → Service.

### Layer 1: Socket Config Factory
Creates a typed Socket.io server attached to the HTTP server.

```typescript
// apps/server/src/config/socket.config.ts
import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "@journey-os/types";

export type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function createSocketServer(httpServer: HttpServer): TypedSocketServer {
  return new Server(httpServer, {
    cors: { origin: process.env.SITE_URL ?? "http://localhost:3000", credentials: true },
    transports: ["websocket", "polling"],
  });
}
```

### Layer 2: Socket Auth Middleware
Validates JWT on handshake using existing `AuthService`. Attaches decoded payload to `socket.data`.

```typescript
// apps/server/src/middleware/socket-auth.middleware.ts
export class SocketAuthMiddleware {
  readonly #authService: AuthService;
  constructor(authService: AuthService) { this.#authService = authService; }

  createMiddleware() {
    return async (socket: Socket, next: (err?: Error) => void) => {
      const token = socket.handshake.auth?.token;
      // Extract Bearer, verify via AuthService, attach to socket.data
    };
  }
}
```

### Layer 3: Socket Manager Service (rooms + presence)
Manages room joins, disconnect handling, and presence tracking with `Map<string, number>` for multi-tab support.

```typescript
export class SocketManagerService {
  readonly #io: TypedServer;
  readonly #onlineUsers: Map<string, number> = new Map(); // userId -> connection count
  // emitToUser(userId, payload), isOnline(userId), getOnlineCount()
}
```

### Layer 4: Domain Socket Service (wraps existing service)
Composes the existing REST service + socket manager. Does NOT replace the REST service.

```typescript
export class SocketNotificationService {
  readonly #notificationService: NotificationService; // existing REST service
  readonly #socketManager: SocketManagerService;

  async push(request: CreateNotificationRequest): Promise<Notification> {
    const notification = await this.#notificationService.create(request); // DB first
    if (this.#socketManager.isOnline(request.user_id)) {
      this.#socketManager.emitToUser(request.user_id, toSocketPayload(notification));
    }
    return notification; // persists regardless of connection status
  }
}
```

### Wiring in index.ts
```typescript
const httpServer = createServer(app); // wrap Express app
const io = createSocketServer(httpServer);
const socketManager = new SocketManagerService(io, authService);
socketManager.initialize();
httpServer.listen(PORT); // NOT app.listen()
```

## Key Design Decisions
- **`Map<string, number>`** not `Set<string>` for presence — tracks connection count per user for multi-tab support.
- **Late binding** via `setNotificationService()` to avoid circular dependency between socket manager and notification service.
- **Wrapper, not replacement** — `SocketNotificationService` wraps existing `NotificationService`, keeping REST and socket concerns separate.
- **Persist first, emit second** — DB write always happens; socket emit only if user is online.

## When to Use
- Any real-time feature that needs Socket.io (notifications, presence, room management).
- Follow this pattern for STORY-F-19 (Room Management) which builds on this infrastructure.

## When NOT to Use
- Streaming generation pipeline events — use SSE instead (architecture rule).
- One-off REST endpoints — no socket needed.

## Source Reference
[ARCHITECTURE v10 SS 6.3] — "SSE for streaming generation pipeline events. Socket.io for presence only."
