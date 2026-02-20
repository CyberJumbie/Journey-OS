/**
 * KpiController — REST handler for faculty dashboard KPI endpoint.
 * [STORY-F-7] GET /api/v1/dashboard/kpis
 */

import { Request, Response } from "express";
import type { ApiResponse, KpiPeriod, KpiResponse } from "@journey-os/types";
import type { KpiService } from "../../services/dashboard/kpi.service";

const VALID_PERIODS = new Set<string>(["7d", "30d", "semester"]);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class KpiController {
  readonly #service: KpiService;

  constructor(service: KpiService) {
    this.#service = service;
  }

  async handleGetKpis(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | {
            sub?: string;
            role?: string;
            is_course_director?: boolean;
            institution_id?: string;
          }
        | undefined;

      if (!user?.sub) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        };
        res.status(401).json(body);
        return;
      }

      // Extract and validate user_id from query
      const rawUserId = req.query.user_id;
      const userId = typeof rawUserId === "string" ? rawUserId : user.sub;

      if (!UUID_REGEX.test(userId)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid user_id format. Must be a valid UUID.",
          },
        };
        res.status(400).json(body);
        return;
      }

      // Authorization: users can only request their own KPIs unless admin
      const isAdmin =
        user.role === "superadmin" || user.role === "institutional_admin";
      if (userId !== user.sub && !isAdmin) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "FORBIDDEN",
            message: "You can only view your own KPIs",
          },
        };
        res.status(403).json(body);
        return;
      }

      // Validate period
      const rawPeriod = req.query.period;
      const periodStr = typeof rawPeriod === "string" ? rawPeriod : "7d";

      if (!VALID_PERIODS.has(periodStr)) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid period value. Must be one of: 7d, 30d, semester",
          },
        };
        res.status(400).json(body);
        return;
      }

      const period = periodStr as KpiPeriod;
      const userRole = user.role ?? "faculty";
      const isCourseDirector = user.is_course_director ?? false;
      const institutionId = user.institution_id ?? "";

      const data = await this.#service.calculateMetrics(
        userId,
        period,
        userRole,
        isCourseDirector,
        institutionId,
      );

      const body: ApiResponse<KpiResponse> = {
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
