import { Request, Response, NextFunction } from "express";
import { EmailNotVerifiedError } from "../errors/email-not-verified.error";
import type { ApiResponse } from "@journey-os/types";

/**
 * Express middleware that blocks unverified users from accessing protected resources.
 * [STORY-U-14] Checks email_confirmed_at from the JWT payload (set by AuthMiddleware).
 *
 * Exempt routes are handled by position — routes registered BEFORE this middleware
 * in the Express chain are not subject to this check.
 */
export class EmailVerificationMiddleware {
  /**
   * Middleware handler: checks if req.user has a verified email.
   * If email_confirmed_at is null/undefined, returns 403.
   */
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === "OPTIONS") {
      next();
      return;
    }

    const user = (req as unknown as Record<string, unknown>).user as
      | { email_confirmed_at?: string | null }
      | undefined;

    if (!user) {
      next();
      return;
    }

    if (!user.email_confirmed_at) {
      const error = new EmailNotVerifiedError();
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: error.code,
          message: error.message,
        },
      };
      res.status(403).json(body);
      return;
    }

    next();
  }
}

/**
 * Factory function: creates an email verification middleware handler.
 */
export function createEmailVerificationMiddleware(): (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void> {
  const middleware = new EmailVerificationMiddleware();
  return (req: Request, res: Response, next: NextFunction) =>
    middleware.handle(req, res, next);
}
