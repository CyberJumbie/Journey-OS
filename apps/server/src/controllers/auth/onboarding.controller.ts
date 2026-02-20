import { Request, Response } from "express";
import type {
  ApiResponse,
  OnboardingStatus,
  OnboardingCompleteResult,
} from "@journey-os/types";
import { OnboardingService } from "../../services/auth/onboarding.service";

/**
 * Controller for onboarding status and completion.
 * [STORY-U-13] Protected endpoints — auth required, no RBAC.
 */
export class OnboardingController {
  readonly #service: OnboardingService;

  constructor(service: OnboardingService) {
    this.#service = service;
  }

  /**
   * GET /api/v1/onboarding/status
   */
  async handleGetStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { sub: string }
        | undefined;

      if (!user?.sub) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        };
        res.status(401).json(body);
        return;
      }

      const status = await this.#service.getStatus(user.sub);

      const body: ApiResponse<OnboardingStatus> = {
        data: status,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
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

  /**
   * POST /api/v1/onboarding/complete
   */
  async handleComplete(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { sub: string }
        | undefined;

      if (!user?.sub) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "User not authenticated" },
        };
        res.status(401).json(body);
        return;
      }

      const result = await this.#service.markComplete(user.sub);

      const body: ApiResponse<OnboardingCompleteResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
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
