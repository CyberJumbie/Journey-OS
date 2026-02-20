import { Request, Response } from "express";
import type { ApiResponse, ResendVerificationResult } from "@journey-os/types";
import { ResendVerificationService } from "../../services/auth/resend-verification.service";

/**
 * Controller for resending verification emails.
 * [STORY-U-14] Authenticated endpoint — no RBAC, no email verification required.
 */
export class ResendVerificationController {
  readonly #service: ResendVerificationService;

  constructor(service: ResendVerificationService) {
    this.#service = service;
  }

  /**
   * POST /api/v1/auth/resend-verification
   */
  async handleResend(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { sub: string; email: string; email_confirmed_at?: string | null }
        | undefined;

      if (!user?.sub) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        };
        res.status(401).json(body);
        return;
      }

      const result = await this.#service.resend(
        user.sub,
        user.email,
        user.email_confirmed_at,
      );

      if (!result.sent) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "ALREADY_VERIFIED", message: result.message },
        };
        res.status(400).json(body);
        return;
      }

      const body: ApiResponse<ResendVerificationResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      const err = error as Error & { code?: string };

      if (err.code === "RATE_LIMIT_EXCEEDED") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "RATE_LIMIT_EXCEEDED", message: err.message },
        };
        res.status(429).json(body);
        return;
      }

      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }
}
