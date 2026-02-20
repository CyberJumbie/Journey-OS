/**
 * Rejection controller.
 * [STORY-SA-6] Handles PATCH /api/v1/admin/applications/:id/reject
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  ApplicationRejectionResult,
} from "@journey-os/types";
import { RejectionService } from "../../services/institution/rejection.service";
import { ApplicationNotFoundError } from "../../errors/application.error";
import {
  ApplicationAlreadyProcessedError,
  RejectionReasonRequiredError,
} from "../../errors/rejection.error";

export class RejectionController {
  readonly #rejectionService: RejectionService;

  constructor(rejectionService: RejectionService) {
    this.#rejectionService = rejectionService;
  }

  async handleReject(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (typeof id !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Application ID is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { reason } = req.body as { reason?: string };
      if (!reason || typeof reason !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Rejection reason is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const rejectorUserId = (req as Request & { user?: { sub: string } }).user
        ?.sub;
      if (!rejectorUserId) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User ID not found in token",
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#rejectionService.reject(
        id,
        reason,
        rejectorUserId,
      );

      const body: ApiResponse<ApplicationRejectionResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      if (error instanceof ApplicationNotFoundError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(404).json(body);
        return;
      }

      if (error instanceof ApplicationAlreadyProcessedError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
        return;
      }

      if (error instanceof RejectionReasonRequiredError) {
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
