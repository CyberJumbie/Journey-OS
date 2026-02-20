/**
 * Socket.io server factory.
 * [STORY-F-10] Creates typed Socket.io server instance attached to HTTP server.
 */

import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@journey-os/types";

export type TypedSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents
>;

export function createSocketServer(httpServer: HttpServer): TypedSocketServer {
  const io: TypedSocketServer = new Server(httpServer, {
    cors: {
      origin: process.env.SITE_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  return io;
}
