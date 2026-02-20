import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionMonitoringController } from "../institution-monitoring.controller";
import { InstitutionMonitoringService } from "../../../services/admin/institution-monitoring.service";
import { ValidationError } from "../../../errors/validation.error";
import type { Request, Response } from "express";
import type { InstitutionListResponse } from "@journey-os/types";

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

function createMockReq(query: Record<string, string> = {}): unknown {
  return { query } as unknown;
}

const MOCK_LIST_RESULT: InstitutionListResponse = {
  institutions: [
    {
      id: "inst-1",
      name: "Test School",
      status: "active",
      user_count: 10,
      course_count: 3,
      last_activity: null,
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

describe("InstitutionMonitoringController", () => {
  let mockService: { list: ReturnType<typeof vi.fn> };
  let controller: InstitutionMonitoringController;

  beforeEach(() => {
    mockService = { list: vi.fn().mockResolvedValue(MOCK_LIST_RESULT) };
    controller = new InstitutionMonitoringController(
      mockService as unknown as InstitutionMonitoringService,
    );
  });

  it("returns 200 with institution list on success", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.handleList(req as Request, res as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect((res.body as { data: InstitutionListResponse }).data).toEqual(
      MOCK_LIST_RESULT,
    );
  });

  it("passes query params to service", async () => {
    const req = createMockReq({
      page: "2",
      limit: "10",
      sort_by: "name",
      sort_dir: "asc",
      search: "medical",
      status: "active",
    });
    const res = createMockRes();

    await controller.handleList(req as Request, res as unknown as Response);

    expect(mockService.list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      sort_by: "name",
      sort_dir: "asc",
      search: "medical",
      status: "active",
    });
  });

  it("returns 400 for invalid status filter", async () => {
    const req = createMockReq({ status: "invalid_status" });
    const res = createMockRes();

    await controller.handleList(req as Request, res as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("returns 400 when service throws ValidationError", async () => {
    mockService.list.mockRejectedValue(
      new ValidationError('Invalid sort field: "bogus"'),
    );
    const req = createMockReq({ sort_by: "bogus" });
    const res = createMockRes();

    await controller.handleList(req as Request, res as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("returns 500 for unexpected errors", async () => {
    mockService.list.mockRejectedValue(new Error("DB connection failed"));
    const req = createMockReq();
    const res = createMockRes();

    await controller.handleList(req as Request, res as unknown as Response);

    expect(res.statusCode).toBe(500);
    expect((res.body as { error: { code: string } }).error.code).toBe(
      "INTERNAL_ERROR",
    );
  });

  it("passes status filter correctly for valid statuses", async () => {
    const req = createMockReq({ status: "suspended" });
    const res = createMockRes();

    await controller.handleList(req as Request, res as unknown as Response);

    expect(mockService.list).toHaveBeenCalledWith(
      expect.objectContaining({ status: "suspended" }),
    );
    expect(res.statusCode).toBe(200);
  });
});
