import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth/auth.service";
import { getSupabaseClient } from "../config/supabase.config";
import { AuthenticationError } from "../errors/auth.errors";
import { ApiResponse } from "@journey-os/types";

/**
 * Express middleware that verifies Supabase JWT and populates req.user.
 * [CODE_STANDARDS SS 3.1] — JS #private fields, public getters, constructor DI.
 */
export class AuthMiddleware {
  readonly #authService: AuthService;

  constructor(authService: AuthService) {
    this.#authService = authService;
  }

  /**
   * Middleware handler: extracts Bearer token, verifies with Supabase,
   * and attaches the decoded payload to req.user.
   * OPTIONS requests pass through for CORS preflight.
   */
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    try {
      const token = this.#authService.extractBearerToken(
        req.headers.authorization,
      );
      const payload = await this.#authService.verifyToken(token);
      req.user = payload;
      next();
    } catch (error: unknown) {
      const message =
        error instanceof AuthenticationError
          ? error.message
          : "Authentication failed";

      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message,
        },
      };

      res.status(401).json(body);
    }
  }
}

/**
 * Factory function: creates an auth middleware handler bound to a new AuthMiddleware instance.
 * Uses the singleton Supabase client.
 */
export function createAuthMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> {
  const authService = new AuthService(getSupabaseClient());
  const middleware = new AuthMiddleware(authService);
  return (req: Request, res: Response, next: NextFunction) =>
    middleware.handle(req, res, next);
}
