import { describe, it, expect, vi, beforeEach } from "vitest";
import { DashboardController } from "../dashboard.controller";
import { AdminDashboardService } from "../../../services/admin/admin-dashboard.service";
import type { Request, Response } from "express";
import type { AdminDashboardData, ApiResponse } from "@journey-os/types";

const MOCK_DASHBOARD_DATA: AdminDashboardData = {
  kpis: {
    total_users: {
      label: "Total Users",
      value: 142,
      previous_value: 128,
      trend: "up",
      sparkline: [98, 105, 112, 118, 125, 128, 142],
    },
    active_courses: {
      label: "Active Courses",
      value: 12,
      previous_value: 12,
      trend: "flat",
      sparkline: [10, 10, 11, 11, 12, 12, 12],
    },
    questions_generated: {
      label: "Questions Generated",
      value: 1847,
      previous_value: 1623,
      trend: "up",
      sparkline: [1200, 1350, 1420, 1510, 1580, 1623, 1847],
    },
    sync_health: {
      label: "Sync Health",
      value: 98.5,
      previous_value: 97.2,
      trend: "up",
      sparkline: [95.0, 96.1, 96.8, 97.0, 97.2, 97.5, 98.5],
    },
  },
  system_health: {
    api_response_p95_ms: 245,
    error_rate_24h: 0.02,
    storage_used_mb: 1240,
    storage_limit_mb: 8192,
  },
};

function mockRequest(overrides?: Record<string, unknown>): Partial<Request> {
  return {
    method: "GET",
    headers: { authorization: "Bearer mock-jwt" } as Record<string, string>,
    user: {
      id: "user-1",
      role: "institutional_admin",
      institution_id: "inst-1",
    },
    ...overrides,
  } as unknown as Partial<Request>;
}

function mockResponse(): Partial<Response> & {
  statusCode: number;
  body: unknown;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res as unknown as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as unknown as Response;
    },
  };
  return res;
}

describe("DashboardController", () => {
  let controller: DashboardController;
  let mockService: AdminDashboardService;

  beforeEach(() => {
    mockService = {
      getDashboardData: vi.fn().mockResolvedValue(MOCK_DASHBOARD_DATA),
    } as unknown as AdminDashboardService;
    controller = new DashboardController(mockService);
  });

  describe("getDashboard", () => {
    it("returns 200 with AdminDashboardData for institutional_admin user", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.getDashboard(req as Request, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      expect((res.body as ApiResponse<AdminDashboardData>).data).toEqual(
        MOCK_DASHBOARD_DATA,
      );
    });

    it("returns 200 with AdminDashboardData for superadmin user", async () => {
      const req = mockRequest({
        user: {
          id: "admin-1",
          role: "superadmin",
          institution_id: "inst-1",
        },
      });
      const res = mockResponse();

      await controller.getDashboard(req as Request, res as unknown as Response);

      expect(res.statusCode).toBe(200);
      expect((res.body as ApiResponse<AdminDashboardData>).data).toEqual(
        MOCK_DASHBOARD_DATA,
      );
    });

    it("response body matches ApiResponse<AdminDashboardData> shape", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.getDashboard(req as Request, res as unknown as Response);

      const body = res.body as ApiResponse<AdminDashboardData>;
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("error");
      expect(body.error).toBeNull();
      expect(body.data).not.toBeNull();
    });

    it("returns 500 INTERNAL_ERROR when service throws", async () => {
      (
        mockService.getDashboardData as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("DB connection failed"));

      const req = mockRequest();
      const res = mockResponse();

      await controller.getDashboard(req as Request, res as unknown as Response);

      expect(res.statusCode).toBe(500);
      const body = res.body as ApiResponse<null>;
      expect(body.error!.code).toBe("INTERNAL_ERROR");
    });

    it("passes institution_id from req.user to service", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.getDashboard(req as Request, res as unknown as Response);

      expect(mockService.getDashboardData).toHaveBeenCalledWith("inst-1");
    });

    it("returns 400 VALIDATION_ERROR when institution_id is missing", async () => {
      const req = mockRequest({
        user: { id: "user-1", role: "institutional_admin" },
      });
      const res = mockResponse();

      await controller.getDashboard(req as Request, res as unknown as Response);

      expect(res.statusCode).toBe(400);
      const body = res.body as ApiResponse<null>;
      expect(body.error!.code).toBe("VALIDATION_ERROR");
    });
  });
});
