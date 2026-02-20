/**
 * CourseOversightController — REST handler for course overview endpoint.
 * [STORY-IA-8] Parses query params, delegates to CourseOversightService.
 */

import { Request, Response } from "express";
import type {
  ApiResponse,
  CourseOverviewResponse,
  CourseOverviewSortField,
  CourseOverviewStatusFilter,
} from "@journey-os/types";
import type { CourseOversightService } from "../../services/course/course-oversight.service";
import { CourseOverviewValidationError } from "../../errors";

const VALID_SORT_FIELDS = new Set([
  "name",
  "fulfills_coverage_pct",
  "updated_at",
]);
const VALID_STATUSES = new Set(["active", "archived"]);

export class CourseOversightController {
  readonly #service: CourseOversightService;

  constructor(service: CourseOversightService) {
    this.#service = service;
  }

  async handleGetOverview(req: Request, res: Response): Promise<void> {
    try {
      const {
        page,
        limit,
        sort_by,
        sort_dir,
        program_id,
        academic_year,
        status,
      } = req.query;

      // Validate sort_by
      if (typeof sort_by === "string" && !VALID_SORT_FIELDS.has(sort_by)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid sort_by value. Must be one of: name, fulfills_coverage_pct, updated_at",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Validate status
      if (typeof status === "string" && !VALID_STATUSES.has(status)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status value. Must be one of: active, archived",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Validate page is numeric
      if (typeof page === "string" && isNaN(parseInt(page, 10))) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "page must be a number",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Validate limit is numeric
      if (typeof limit === "string" && isNaN(parseInt(limit, 10))) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "limit must be a number",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Extract institution_id from JWT user
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;
      const institutionId = user?.institution_id;

      if (!institutionId) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing institution_id from authenticated user",
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#service.getOverview(
        {
          page: typeof page === "string" ? parseInt(page, 10) : undefined,
          limit: typeof limit === "string" ? parseInt(limit, 10) : undefined,
          sort_by:
            typeof sort_by === "string"
              ? (sort_by as CourseOverviewSortField)
              : undefined,
          sort_dir:
            sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined,
          program_id: typeof program_id === "string" ? program_id : undefined,
          academic_year:
            typeof academic_year === "string" ? academic_year : undefined,
          status:
            typeof status === "string"
              ? (status as CourseOverviewStatusFilter)
              : undefined,
        },
        institutionId,
      );

      const body: ApiResponse<CourseOverviewResponse> = {
        data: result,
        error: null,
      };
      res.status(200).json(body);
    } catch (error: unknown) {
      this.#handleError(error, res);
    }
  }

  #handleError(error: unknown, res: Response): void {
    if (error instanceof CourseOverviewValidationError) {
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
