/**
 * Dashboard controller.
 * [STORY-IA-5] Handles GET /api/v1/institution/dashboard
 */

import { Request, Response } from "express";
import type { ApiResponse, AdminDashboardData } from "@journey-os/types";
import { AdminDashboardService } from "../../services/admin/admin-dashboard.service";

export class DashboardController {
  readonly #dashboardService: AdminDashboardService;

  constructor(dashboardService: AdminDashboardService) {
    this.#dashboardService = dashboardService;
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const data = await this.#dashboardService.getDashboardData(institutionId);

      const body: ApiResponse<AdminDashboardData> = {
        data,
        error: null,
      };
      res.status(200).json(body);
    } catch {
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
