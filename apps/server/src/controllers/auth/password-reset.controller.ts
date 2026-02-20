import { Request, Response } from "express";
import type { ApiResponse, ForgotPasswordResponse } from "@journey-os/types";
import { PasswordResetService } from "../../services/auth/password-reset.service";
import { ValidationError } from "../../errors/validation.error";

export class PasswordResetController {
  readonly #passwordResetService: PasswordResetService;

  constructor(passwordResetService: PasswordResetService) {
    this.#passwordResetService = passwordResetService;
  }

  async handleForgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Email is required" },
        };
        res.status(400).json(body);
        return;
      }

      const result =
        await this.#passwordResetService.requestPasswordReset(email);

      const body: ApiResponse<ForgotPasswordResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
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
