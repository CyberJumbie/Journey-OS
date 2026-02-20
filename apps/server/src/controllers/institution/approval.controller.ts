/**
 * Approval controller.
 * [STORY-SA-5] Handles PATCH /api/v1/admin/applications/:id/approve
 */

import { Request, Response } from "express";
import type { ApiResponse, InstitutionApprovalResult } from "@journey-os/types";
import { InstitutionService } from "../../services/institution/institution.service";
import { ApplicationNotFoundError } from "../../errors/application.error";
import {
  DuplicateApprovalError,
  DuplicateDomainError,
} from "../../errors/institution.error";
import { ValidationError } from "../../errors/validation.error";

export class ApprovalController {
  readonly #institutionService: InstitutionService;

  constructor(institutionService: InstitutionService) {
    this.#institutionService = institutionService;
  }

  async handleApprove(req: Request, res: Response): Promise<void> {
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

      const { domain } = req.body as { domain?: string };
      if (!domain || typeof domain !== "string" || domain.trim().length === 0) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Domain is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const approverUserId = (req as Request & { user?: { sub: string } }).user
        ?.sub;
      if (!approverUserId) {
        throw new ValidationError("User ID not found in token");
      }

      const result = await this.#institutionService.createFromApplication(
        id,
        domain.trim(),
        approverUserId,
      );

      const body: ApiResponse<InstitutionApprovalResult> = {
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

      if (error instanceof DuplicateApprovalError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
        return;
      }

      if (error instanceof DuplicateDomainError) {
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
}
