import { Request, Response } from "express";
import type {
  ApiResponse,
  InvitationTokenPayload,
  InvitationAcceptResult,
} from "@journey-os/types";
import { InvitationAcceptanceService } from "../../services/auth/invitation-acceptance.service";
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
} from "../../errors/invitation.error";
import { ValidationError } from "../../errors/validation.error";
import { DuplicateEmailError } from "../../errors/registration.error";

/**
 * Controller for invitation token validation and acceptance.
 * [STORY-U-9] Public endpoints — no auth required.
 */
export class InvitationAcceptanceController {
  readonly #service: InvitationAcceptanceService;

  constructor(service: InvitationAcceptanceService) {
    this.#service = service;
  }

  /**
   * GET /api/v1/invitations/validate?token=xxx
   */
  async handleValidate(req: Request, res: Response): Promise<void> {
    try {
      const token = req.query.token;

      if (!token || typeof token !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Token query parameter is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const payload = await this.#service.validateToken(token);

      const body: ApiResponse<InvitationTokenPayload> = {
        data: payload,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(res, error);
    }
  }

  /**
   * POST /api/v1/invitations/accept
   */
  async handleAccept(req: Request, res: Response): Promise<void> {
    try {
      const { token, password, full_name } = req.body;

      if (!token || typeof token !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Token is required" },
        };
        res.status(400).json(body);
        return;
      }

      if (!password || typeof password !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Password is required" },
        };
        res.status(400).json(body);
        return;
      }

      if (!full_name || typeof full_name !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Full name is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#service.acceptInvitation({
        token,
        password,
        full_name,
      });

      const body: ApiResponse<InvitationAcceptResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(res, error);
    }
  }

  #handleError(res: Response, error: unknown): void {
    if (error instanceof InvitationNotFoundError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(404).json(body);
      return;
    }

    if (error instanceof InvitationExpiredError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(410).json(body);
      return;
    }

    if (error instanceof InvitationAlreadyUsedError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(410).json(body);
      return;
    }

    if (error instanceof ValidationError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(400).json(body);
      return;
    }

    if (error instanceof DuplicateEmailError) {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: error.code, message: error.message },
      };
      res.status(409).json(body);
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
