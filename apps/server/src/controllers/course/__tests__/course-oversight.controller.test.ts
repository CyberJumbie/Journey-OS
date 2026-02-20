/**
 * CourseOversightController tests.
 * [STORY-IA-8] Query param validation, response shape, error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import type { CourseOverviewResponse } from "@journey-os/types";
import { CourseOversightController } from "../course-oversight.controller";
import type { CourseOversightService } from "../../../services/course/course-oversight.service";
import { CourseOverviewValidationError } from "../../../errors";

const MOCK_OVERVIEW_RESPONSE: CourseOverviewResponse = {
  courses: [
    {
      id: "course-aaaa-bbbb-cccc-000000000001",
      code: "ANAT-101",
      name: "Gross Anatomy",
      director_name: "Dr. Sarah Chen",
      slo_count: 24,
      fulfills_coverage_pct: 87.5,
      upload_count: 12,
      processing_status: "complete",
      program_name: "MD Program",
      academic_year: "2025-2026",
      status: "active",
      updated_at: "2026-02-15T10:30:00Z",
    },
  ],
  meta: {
    page: 1,
    limit: 20,
    total: 1,
    total_pages: 1,
  },
};

const EMPTY_RESPONSE: CourseOverviewResponse = {
  courses: [],
  meta: { page: 1, limit: 20, total: 0, total_pages: 1 },
};

function mockRequest(
  query?: Record<string, string>,
  user?: Record<string, unknown> | null,
): unknown {
  return {
    query: query ?? {},
    user:
      user !== null
        ? (user ?? {
            sub: "user-uuid-1",
            email: "admin@example.edu",
            role: "institutional_admin",
            institution_id: "inst-uuid-1",
            is_course_director: false,
            aud: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
          })
        : undefined,
  };
}

function mockResponse(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
} {
  const res: {
    statusCode: number;
    body: unknown;
    status: (code: number) => unknown;
    json: (data: unknown) => unknown;
  } = {
    statusCode: 200,
    body: null,
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

function createMockService(
  overviewResult?: CourseOverviewResponse,
): CourseOversightService {
  return {
    getOverview: vi
      .fn()
      .mockResolvedValue(overviewResult ?? MOCK_OVERVIEW_RESPONSE),
  } as unknown as CourseOversightService;
}

describe("CourseOversightController", () => {
  let controller: CourseOversightController;
  let mockService: CourseOversightService;

  beforeEach(() => {
    mockService = createMockService();
    controller = new CourseOversightController(mockService);
  });

  describe("handleGetOverview", () => {
    it("returns 200 with CourseOverviewResponse for valid request", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as { data: CourseOverviewResponse; error: null };
      expect(body.data).toEqual(MOCK_OVERVIEW_RESPONSE);
      expect(body.error).toBeNull();
    });

    it("returns 200 with empty courses for no results", async () => {
      mockService = createMockService(EMPTY_RESPONSE);
      controller = new CourseOversightController(mockService);

      const req = mockRequest();
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(200);
      const body = res.body as { data: CourseOverviewResponse };
      expect(body.data.courses).toHaveLength(0);
    });

    it("parses page and limit from query string", async () => {
      const req = mockRequest({ page: "2", limit: "10" });
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockService.getOverview).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
        "inst-uuid-1",
      );
    });

    it("defaults page to 1 and limit to 20 when not provided", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(mockService.getOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          page: undefined,
          limit: undefined,
        }),
        "inst-uuid-1",
      );
    });

    it("returns 400 for invalid sort_by value", async () => {
      const req = mockRequest({ sort_by: "invalid_field" });
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      const body = res.body as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for invalid status value", async () => {
      const req = mockRequest({ status: "draft" });
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      const body = res.body as { error: { code: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for non-numeric page parameter", async () => {
      const req = mockRequest({ page: "abc" });
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      const body = res.body as { error: { message: string } };
      expect(body.error.message).toContain("page must be a number");
    });

    it("clamps limit to max 100 via service", async () => {
      const req = mockRequest({ limit: "500" });
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      // Controller passes 500, service clamps to 100
      expect(mockService.getOverview).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 500 }),
        "inst-uuid-1",
      );
      expect(res.statusCode).toBe(200);
    });

    it("response body matches ApiResponse<CourseOverviewResponse> shape", async () => {
      const req = mockRequest();
      const res = mockResponse();

      await controller.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("error");
      expect(body.error).toBeNull();

      const data = body.data as CourseOverviewResponse;
      expect(data).toHaveProperty("courses");
      expect(data).toHaveProperty("meta");
      expect(data.meta).toHaveProperty("page");
      expect(data.meta).toHaveProperty("limit");
      expect(data.meta).toHaveProperty("total");
      expect(data.meta).toHaveProperty("total_pages");
    });

    it("returns 500 when service throws unexpected error", async () => {
      const failService = {
        getOverview: vi.fn().mockRejectedValue(new Error("unexpected")),
      } as unknown as CourseOversightService;
      const failController = new CourseOversightController(failService);

      const req = mockRequest();
      const res = mockResponse();

      await failController.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(500);
      const body = res.body as { error: { code: string } };
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("returns 400 when service throws CourseOverviewValidationError", async () => {
      const validationService = {
        getOverview: vi
          .fn()
          .mockRejectedValue(new CourseOverviewValidationError("Bad input")),
      } as unknown as CourseOversightService;
      const validationController = new CourseOversightController(
        validationService,
      );

      const req = mockRequest();
      const res = mockResponse();

      await validationController.handleGetOverview(
        req as unknown as Request,
        res as unknown as Response,
      );

      expect(res.statusCode).toBe(400);
      const body = res.body as { error: { code: string; message: string } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Bad input");
    });
  });
});
