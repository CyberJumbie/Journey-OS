/**
 * User reassignment controller.
 * [STORY-SA-4] Handles POST /api/v1/admin/users/:userId/reassign
 */

import { Request, Response } from "express";
import type { ApiResponse, UserReassignmentResult } from "@journey-os/types";
import { UserReassignmentService } from "../../services/user/user-reassignment.service";
import {
  SameInstitutionError,
  UserNotFoundError,
  InstitutionNotFoundError,
  ConcurrentModificationError,
} from "../../errors";
import { ValidationError } from "../../errors/validation.error";

export class UserReassignmentController {
  readonly #reassignmentService: UserReassignmentService;

  constructor(reassignmentService: UserReassignmentService) {
    this.#reassignmentService = reassignmentService;
  }

  async handleReassign(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      if (typeof userId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "User ID is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { target_institution_id, reason } = req.body as {
        target_institution_id?: string;
        reason?: string;
      };

      if (
        !target_institution_id ||
        typeof target_institution_id !== "string" ||
        target_institution_id.trim().length === 0
      ) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "target_institution_id is required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const adminUserId = (req as Request & { user?: { sub: string } }).user
        ?.sub;
      if (!adminUserId) {
        throw new ValidationError("User ID not found in token");
      }

      const result = await this.#reassignmentService.reassign(
        userId,
        target_institution_id.trim(),
        reason?.trim() ?? null,
        adminUserId,
      );

      const body: ApiResponse<UserReassignmentResult> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      if (error instanceof UserNotFoundError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(404).json(body);
        return;
      }

      if (error instanceof InstitutionNotFoundError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(404).json(body);
        return;
      }

      if (error instanceof SameInstitutionError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: error.code, message: error.message },
        };
        res.status(400).json(body);
        return;
      }

      if (error instanceof ConcurrentModificationError) {
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
