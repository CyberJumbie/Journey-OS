import { Request, Response } from "express";
import type {
  ApiResponse,
  InstitutionListResponse,
  InstitutionListSortField,
  InstitutionMonitoringStatus,
} from "@journey-os/types";
import { InstitutionMonitoringService } from "../../services/admin/institution-monitoring.service";
import { ValidationError } from "../../errors/validation.error";

const VALID_STATUSES = new Set<InstitutionMonitoringStatus>([
  "active",
  "pending",
  "suspended",
  "archived",
]);

export class InstitutionMonitoringController {
  readonly #service: InstitutionMonitoringService;

  constructor(service: InstitutionMonitoringService) {
    this.#service = service;
  }

  async handleList(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, sort_by, sort_dir, search, status } = req.query;

      // Validate status if provided
      if (
        status &&
        typeof status === "string" &&
        !VALID_STATUSES.has(status as InstitutionMonitoringStatus)
      ) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid status filter: "${status}". Allowed: ${[...VALID_STATUSES].join(", ")}`,
          },
        };
        res.status(400).json(body);
        return;
      }

      const result = await this.#service.list({
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        sort_by:
          typeof sort_by === "string"
            ? (sort_by as InstitutionListSortField)
            : undefined,
        sort_dir:
          sort_dir === "asc" || sort_dir === "desc" ? sort_dir : undefined,
        search: typeof search === "string" ? search : undefined,
        status:
          typeof status === "string" &&
          VALID_STATUSES.has(status as InstitutionMonitoringStatus)
            ? (status as InstitutionMonitoringStatus)
            : undefined,
      });

      const body: ApiResponse<InstitutionListResponse> = {
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
