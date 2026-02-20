import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthTokenPayload } from "@journey-os/types";
import { AuthRole } from "@journey-os/types";
import { SocketManagerService } from "../../services/notification/socket-manager.service";
import type { AuthService } from "../../services/auth/auth.service";
import { SocketAuthError } from "../../errors/socket.errors";

// --- Mock helpers ---

const FACULTY_TOKEN_PAYLOAD: AuthTokenPayload = {
  sub: "faculty-uuid-1",
  email: "drjones@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: "inst-uuid-1",
  is_course_director: false,
  aud: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

function createMockAuthService(): AuthService {
  return {
    verifyToken: vi.fn().mockResolvedValue(FACULTY_TOKEN_PAYLOAD),
    extractBearerToken: vi.fn().mockReturnValue("valid-token"),
  } as unknown as AuthService;
}

interface MockSocket {
  id: string;
  handshake: { auth: Record<string, unknown> };
  data: Record<string, unknown>;
  join: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  rooms: Set<string>;
}

function createMockSocket(
  auth: Record<string, unknown> = { token: "Bearer valid-jwt-token" },
): MockSocket {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    id: `socket-${Math.random().toString(36).slice(2)}`,
    handshake: { auth },
    data: {},
    join: vi.fn(),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
    }),
    disconnect: vi.fn(),
    rooms: new Set<string>(),
    // expose for test access
    _handlers: handlers,
  } as unknown as MockSocket;
}

interface MockIO {
  use: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  to: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  _connectionHandler: ((socket: MockSocket) => void) | null;
  _middleware:
    | ((socket: MockSocket, next: (err?: Error) => void) => Promise<void>)
    | null;
}

function createMockIO(): MockIO {
  const mockIO: MockIO = {
    use: vi.fn(),
    on: vi.fn(),
    to: vi.fn(),
    emit: vi.fn(),
    _connectionHandler: null,
    _middleware: null,
  };

  mockIO.use.mockImplementation(
    (
      fn: (socket: MockSocket, next: (err?: Error) => void) => Promise<void>,
    ) => {
      mockIO._middleware = fn;
    },
  );

  mockIO.on.mockImplementation(
    (event: string, handler: (socket: MockSocket) => void) => {
      if (event === "connection") {
        mockIO._connectionHandler = handler;
      }
    },
  );

  const emitFn = vi.fn();
  mockIO.to.mockReturnValue({ emit: emitFn });
  mockIO.emit = emitFn;

  return mockIO;
}

async function simulateConnection(
  mockIO: MockIO,
  socket: MockSocket,
): Promise<void> {
  // Run auth middleware
  if (mockIO._middleware) {
    await mockIO._middleware(socket as unknown as MockSocket, (err?: Error) => {
      if (err) throw err;
    });
  }
  // Run connection handler
  if (mockIO._connectionHandler) {
    mockIO._connectionHandler(socket as unknown as MockSocket);
  }
}

function getSocketHandler(
  socket: MockSocket,
  event: string,
): ((...args: unknown[]) => void) | undefined {
  const onCalls = (socket.on as ReturnType<typeof vi.fn>).mock.calls;
  const match = onCalls.find((call: unknown[]) => call[0] === event);
  return match ? (match[1] as (...args: unknown[]) => void) : undefined;
}

// --- Tests ---

describe("SocketManagerService", () => {
  let mockIO: MockIO;
  let mockAuthService: AuthService;
  let service: SocketManagerService;

  beforeEach(() => {
    mockIO = createMockIO();
    mockAuthService = createMockAuthService();
    service = new SocketManagerService(mockIO as never, mockAuthService);
    service.initialize();
  });

  describe("connection auth", () => {
    it("rejects connection with missing auth token", async () => {
      const socket = createMockSocket({});

      (
        mockAuthService.verifyToken as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Token verification failed"));

      let capturedError: Error | undefined;
      if (mockIO._middleware) {
        await mockIO._middleware(
          socket as unknown as MockSocket,
          (err?: Error) => {
            capturedError = err;
          },
        );
      }

      expect(capturedError).toBeInstanceOf(SocketAuthError);
      expect(capturedError!.message).toContain("Missing auth token");
    });

    it("rejects connection with invalid/expired JWT", async () => {
      const socket = createMockSocket({ token: "Bearer expired-token" });

      (
        mockAuthService.verifyToken as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Token verification failed: jwt expired"));

      let capturedError: Error | undefined;
      if (mockIO._middleware) {
        await mockIO._middleware(
          socket as unknown as MockSocket,
          (err?: Error) => {
            capturedError = err;
          },
        );
      }

      expect(capturedError).toBeInstanceOf(SocketAuthError);
      expect(capturedError!.message).toContain("Invalid or expired token");
    });

    it("accepts connection with valid JWT and joins user room", async () => {
      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket);

      expect(socket.data).toEqual({
        user_id: "faculty-uuid-1",
        email: "drjones@msm.edu",
        role: AuthRole.FACULTY,
        institution_id: "inst-uuid-1",
      });
      expect(socket.join).toHaveBeenCalledWith("user:faculty-uuid-1");
    });

    it("extracts user_id from decoded token for room assignment", async () => {
      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket);

      expect(socket.join).toHaveBeenCalledWith("user:faculty-uuid-1");
    });
  });

  describe("room management", () => {
    it("joins user to room user:{userId} on authenticated connect", async () => {
      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket);

      expect(socket.join).toHaveBeenCalledWith("user:faculty-uuid-1");
    });

    it("removes user from presence on disconnect", async () => {
      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket);
      expect(service.isOnline("faculty-uuid-1")).toBe(true);

      const disconnectHandler = getSocketHandler(socket, "disconnect");
      expect(disconnectHandler).toBeDefined();
      disconnectHandler!();

      expect(service.isOnline("faculty-uuid-1")).toBe(false);
    });

    it("handles multiple connections from same user (multiple tabs)", async () => {
      const socket1 = createMockSocket({ token: "Bearer valid-jwt-token" });
      const socket2 = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket1);
      await simulateConnection(mockIO, socket2);

      expect(service.isOnline("faculty-uuid-1")).toBe(true);

      // Disconnect first tab
      const disconnect1 = getSocketHandler(socket1, "disconnect");
      disconnect1!();

      // Still online (second tab)
      expect(service.isOnline("faculty-uuid-1")).toBe(true);

      // Disconnect second tab
      const disconnect2 = getSocketHandler(socket2, "disconnect");
      disconnect2!();

      expect(service.isOnline("faculty-uuid-1")).toBe(false);
    });
  });

  describe("presence tracking", () => {
    it("adds user_id to online set on connect", async () => {
      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });

      expect(service.isOnline("faculty-uuid-1")).toBe(false);

      await simulateConnection(mockIO, socket);

      expect(service.isOnline("faculty-uuid-1")).toBe(true);
    });

    it("removes user_id from online set on disconnect (last connection)", async () => {
      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket);
      expect(service.isOnline("faculty-uuid-1")).toBe(true);

      const disconnectHandler = getSocketHandler(socket, "disconnect");
      disconnectHandler!();

      expect(service.isOnline("faculty-uuid-1")).toBe(false);
    });

    it("keeps user_id in online set when one of multiple connections drops", async () => {
      const socket1 = createMockSocket({ token: "Bearer valid-jwt-token" });
      const socket2 = createMockSocket({ token: "Bearer valid-jwt-token" });

      await simulateConnection(mockIO, socket1);
      await simulateConnection(mockIO, socket2);

      const disconnect1 = getSocketHandler(socket1, "disconnect");
      disconnect1!();

      expect(service.isOnline("faculty-uuid-1")).toBe(true);
    });

    it("returns correct online/offline status via isOnline()", async () => {
      expect(service.isOnline("faculty-uuid-1")).toBe(false);
      expect(service.isOnline("unknown-user")).toBe(false);

      const socket = createMockSocket({ token: "Bearer valid-jwt-token" });
      await simulateConnection(mockIO, socket);

      expect(service.isOnline("faculty-uuid-1")).toBe(true);
      expect(service.isOnline("unknown-user")).toBe(false);
      expect(service.getOnlineCount()).toBe(1);
    });
  });

  describe("emitToUser", () => {
    it("emits notification:new to user room", () => {
      const payload = {
        id: "notif-uuid-1",
        type: "system" as const,
        title: "Test",
        body: "Test body",
        metadata: null,
        created_at: "2026-02-20T10:00:00Z",
      };

      service.emitToUser("faculty-uuid-1", payload);

      expect(mockIO.to).toHaveBeenCalledWith("user:faculty-uuid-1");
      expect(mockIO.emit).toHaveBeenCalledWith("notification:new", payload);
    });
  });
});
