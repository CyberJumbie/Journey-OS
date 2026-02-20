/**
 * Socket.io authentication middleware.
 * [STORY-F-10] Validates JWT on handshake, attaches decoded payload to socket.data.
 */

import type { Socket } from "socket.io";
import type { SocketAuthData } from "@journey-os/types";
import type { AuthService } from "../services/auth/auth.service";
import { SocketAuthError } from "../errors/socket.errors";

export class SocketAuthMiddleware {
  readonly #authService: AuthService;

  constructor(authService: AuthService) {
    this.#authService = authService;
  }

  /**
   * Returns a Socket.io middleware function that validates the JWT
   * from socket.handshake.auth.token and attaches user data to socket.data.
   */
  createMiddleware(): (
    socket: Socket,
    next: (err?: Error) => void,
  ) => Promise<void> {
    return async (socket: Socket, next: (err?: Error) => void) => {
      try {
        const authToken = socket.handshake.auth?.token as string | undefined;

        if (!authToken) {
          next(
            new SocketAuthError("Authentication failed: Missing auth token"),
          );
          return;
        }

        const rawToken = authToken.startsWith("Bearer ")
          ? authToken.slice(7).trim()
          : authToken;

        if (!rawToken) {
          next(new SocketAuthError("Authentication failed: Empty auth token"));
          return;
        }

        const payload = await this.#authService.verifyToken(rawToken);

        const authData: SocketAuthData = {
          user_id: payload.sub,
          email: payload.email,
          role: payload.role,
          institution_id: payload.institution_id,
        };

        socket.data = authData;
        next();
      } catch {
        next(
          new SocketAuthError(
            "Authentication failed: Invalid or expired token",
          ),
        );
      }
    };
  }
}
