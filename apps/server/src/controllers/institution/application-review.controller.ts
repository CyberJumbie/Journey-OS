import { Request, Response } from "express";
import type {
  ApiResponse,
  ApplicationReviewResponse,
  ApplicationReviewSortField,
  ApplicationDetail,
  ApplicationStatus,
} from "@journey-os/types";
import { ApplicationReviewService } from "../../services/institution/application-review.service";
import { ValidationError } from "../../errors/validation.error";
import { ApplicationNotFoundError } from "../../errors/application.error";

const VALID_STATUSES = new Set(["pending", "approved", "rejected", "all"]);

export class ApplicationReviewController {
  readonly #reviewService: ApplicationReviewService;

  constructor(reviewService: ApplicationReviewService) {
    this.#reviewService = reviewService;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sort_by, sort_dir, status } = req.query;

      if (status && typeof status === "string" && !VALID_STATUSES.has(status)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid status filter: "${status}". Allowed: pending, approved, rejected, all`,
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#reviewService.list({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sort_by:
          typeof sort_by === "string"
            ? (sort_by as ApplicationReviewSortField)
            : undefined,
        sort_dir:
          sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined,
        status:
          typeof status === "string"
            ? (status as ApplicationStatus | "all")
            : undefined,
      });

      const body: ApiResponse<ApplicationReviewResponse> = {
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

  async handleGetById(req: Request, res: Response): Promise<void> {
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

      const result = await this.#reviewService.getById(id);

      const body: ApiResponse<ApplicationDetail> = {
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
