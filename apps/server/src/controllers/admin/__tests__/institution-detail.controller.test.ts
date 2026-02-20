import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionMonitoringController } from "../institution-monitoring.controller";
import { InstitutionMonitoringService } from "../../../services/admin/institution-monitoring.service";
import { InstitutionNotFoundError } from "../../../errors/registration.error";
import type { Request, Response } from "express";
import type { InstitutionDetail } from "@journey-os/types";

function createMockRes(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res;
}

function createMockReq(params: Record<string, string> = {}): unknown {
  return { params } as unknown;
}

const MOCK_DETAIL: InstitutionDetail = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
  institution_type: "md",
  accreditation_body: "LCME",
  status: "approved",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
  metrics: {
    total_users: 450,
    active_users_30d: 320,
    total_courses: 12,
    total_questions_generated: 1500,
    total_questions_approved: 1200,
  },
  user_breakdown: [
    { role: "institutional_admin", count: 3 },
    { role: "faculty", count: 47 },
    { role: "student", count: 390 },
    { role: "advisor", count: 10 },
  ],
  activity_timeline: [
    {
      id: "event-1",
      action: "course_created",
      actor_name: "Dr. Jane Smith",
      actor_email: "jsmith@msm.edu",
      description: "Created course: Clinical Medicine II",
      created_at: "2026-02-19T14:30:00Z",
    },
  ],
  monthly_active_users: [{ month: "2026-01", value: 300 }],
  monthly_questions: [{ month: "2026-01", value: 400 }],
  storage: { document_count: 85, total_size_bytes: 524288000 },
};

describe("InstitutionMonitoringController", () => {
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    getDetail: ReturnType<typeof vi.fn>;
  };
  let controller: InstitutionMonitoringController;

  beforeEach(() => {
    mockService = {
      list: vi.fn(),
      getDetail: vi.fn().mockResolvedValue(MOCK_DETAIL),
    };
    controller = new InstitutionMonitoringController(
      mockService as unknown as InstitutionMonitoringService,
    );
  });

  describe("handleGetDetail", () => {
    it("returns 200 with full institution detail for valid ID", async () => {
      const req = createMockReq({ id: "inst-1" });
      const res = createMockRes();

      await controller.handleGetDetail(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as { data: InstitutionDetail; error: null };
      expect(body.data.id).toBe("inst-1");
      expect(body.data.name).toBe("Morehouse School of Medicine");
      expect(body.error).toBeNull();
    });

    it("includes metrics, user_breakdown, activity_timeline, charts, storage", async () => {
      const req = createMockReq({ id: "inst-1" });
      const res = createMockRes();

      await controller.handleGetDetail(
        req as Request,
        res as unknown as Response,
      );

      const body = res.body as { data: InstitutionDetail };
      expect(body.data.metrics.total_users).toBe(450);
      expect(body.data.user_breakdown).toHaveLength(4);
      expect(body.data.activity_timeline).toHaveLength(1);
      expect(body.data.monthly_active_users).toHaveLength(1);
      expect(body.data.monthly_questions).toHaveLength(1);
      expect(body.data.storage.document_count).toBe(85);
    });

    it("returns 404 for non-existent institution ID", async () => {
      mockService.getDetail.mockRejectedValue(
        new InstitutionNotFoundError("Institution not found"),
      );
      const req = createMockReq({ id: "nonexistent" });
      const res = createMockRes();

      await controller.handleGetDetail(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(404);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "INSTITUTION_NOT_FOUND",
      );
    });

    it("returns 500 for unexpected errors", async () => {
      mockService.getDetail.mockRejectedValue(new Error("DB crash"));
      const req = createMockReq({ id: "inst-1" });
      const res = createMockRes();

      await controller.handleGetDetail(
        req as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(500);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "INTERNAL_ERROR",
      );
    });

    it("calls service.getDetail with the id param", async () => {
      const req = createMockReq({ id: "inst-42" });
      const res = createMockRes();

      await controller.handleGetDetail(
        req as Request,
        res as unknown as Response,
      );

      expect(mockService.getDetail).toHaveBeenCalledWith("inst-42");
    });
  });
});
