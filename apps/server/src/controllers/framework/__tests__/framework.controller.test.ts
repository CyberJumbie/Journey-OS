import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { FrameworkController } from "../framework.controller";
import type { FrameworkService } from "../../../services/framework/framework.service";
import type { FrameworkListResponse } from "@journey-os/types";

const MOCK_RESPONSE: FrameworkListResponse = {
  frameworks: [
    {
      framework_key: "usmle_systems",
      name: "USMLE Systems",
      description: "Organ systems tested on USMLE Step exams.",
      node_count: 200,
      hierarchy_depth: 4,
      icon: "stethoscope",
    },
    {
      framework_key: "lcme",
      name: "LCME Standards",
      description: "LCME accreditation standards.",
      node_count: 93,
      hierarchy_depth: 3,
      icon: "shield-check",
    },
    {
      framework_key: "epa_ume",
      name: "EPA/UME Competencies",
      description: "Entrustable Professional Activities for UME.",
      node_count: 58,
      hierarchy_depth: 2,
      icon: "target",
    },
  ],
};

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockRequest(): Request {
  return {
    method: "GET",
    headers: { authorization: "Bearer mock-jwt" },
  } as unknown as Request;
}

describe("FrameworkController", () => {
  let controller: FrameworkController;
  let mockService: FrameworkService;

  beforeEach(() => {
    mockService = {
      getFrameworkList: vi.fn().mockResolvedValue(MOCK_RESPONSE),
    } as unknown as FrameworkService;

    controller = new FrameworkController(mockService);
  });

  describe("listFrameworks", () => {
    it("returns 200 with FrameworkListResponse", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listFrameworks(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            frameworks: expect.arrayContaining([
              expect.objectContaining({
                framework_key: "usmle_systems",
                node_count: 200,
              }),
            ]),
          }),
          error: null,
        }),
      );
    });

    it("response body matches ApiResponse envelope shape", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listFrameworks(req, res);

      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("error");
      expect(body.error).toBeNull();
      expect(body.data).toHaveProperty("frameworks");
    });

    it("frameworks array is sorted by node_count descending", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listFrameworks(req, res);

      const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      const nodeCounts = body.data.frameworks.map(
        (f: { node_count: number }) => f.node_count,
      );
      expect(nodeCounts).toEqual([200, 93, 58]);
    });

    it("returns 500 INTERNAL_ERROR when service throws", async () => {
      (
        mockService.getFrameworkList as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Neo4j down"));

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listFrameworks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null,
          error: expect.objectContaining({
            code: "INTERNAL_ERROR",
          }),
        }),
      );
    });

    it("calls service.getFrameworkList()", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.listFrameworks(req, res);

      expect(mockService.getFrameworkList).toHaveBeenCalledOnce();
    });
  });
});
