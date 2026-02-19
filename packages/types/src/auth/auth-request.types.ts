import { AuthTokenPayload } from "./auth.types";

/**
 * Type guard: checks if a request-like object has been authenticated.
 * Works with any object that has an optional `user` property.
 * The Express Request augmentation lives in apps/server/src/types/express.d.ts.
 */
export function isAuthenticated(req: {
  user?: AuthTokenPayload;
}): req is { user: AuthTokenPayload } {
  return req.user !== undefined && req.user !== null;
}
