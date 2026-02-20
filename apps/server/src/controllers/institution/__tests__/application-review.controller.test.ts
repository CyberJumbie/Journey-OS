import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { ApplicationReviewController } from "../application-review.controller";
import { ApplicationReviewService } from "../../../services/institution/application-review.service";
import { ValidationError } from "../../../errors/validation.error";
import { ApplicationNotFoundError } from "../../../errors/application.error";

const MOCK_APPLICATIONS = [
  {
    id: "app-1",
    institution_name: "Morehouse School of Medicine",
    institution_type: "md",
    contact_name: "Dr. Jane Smith",
    contact_email: "jsmith@msm.edu",
    status: "pending",
    created_at: "2026-02-19T12:00:00Z",
  },
  {
    id: "app-2",
    institution_name: "Howard University College of Medicine",
    institution_type: "md",
    contact_name: "Dr. Brian Wilson",
    contact_email: "bwilson@howard.edu",
    status: "approved",
    created_at: "2026-02-18T10:00:00Z",
  },
];

const MOCK_LIST_RESPONSE = {
  applications: MOCK_APPLICATIONS,
  meta: { page: 1, limit: 20, total: 2, total_pages: 1 },
};

const MOCK_DETAIL = {
  id: "app-1",
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  accreditation_body: "LCME",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI-powered assessment tools",
  status: "pending",
  submitted_ip: "192.168.1.1",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(
  query: Record<string, string> = {},
  params: Record<string, string> = {},
): Request {
  return {
    query,
    params,
    headers: {},
  } as unknown as Request;
}

describe("ApplicationReviewController", () => {
  let controller: ApplicationReviewController;
  let mockService: ApplicationReviewService;

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue(MOCK_LIST_RESPONSE),
      getById: vi.fn().mockResolvedValue(MOCK_DETAIL),
    } as unknown as ApplicationReviewService;

    controller = new ApplicationReviewController(mockService);
  });

  describe("handleList", () => {
    it("returns 200 with paginated application list", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applications: expect.arrayContaining([
              expect.objectContaining({ id: "app-1" }),
            ]),
            meta: expect.objectContaining({ total: 2 }),
          }),
          error: null,
        }),
      );
    });

    it("returns correct pagination meta", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.handleList(req, res);

      const meta = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0].data
        .meta;
      expect(meta).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
      });
    });

    it("passes page and limit as numbers to service", async () => {
      const req = createMockRequest({ page: "2", limit: "10" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it("passes status filter to service", async () => {
      const req = createMockRequest({ status: "pending" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "pending" }),
      );
    });

    it("passes sort_by and sort_dir to service", async () => {
      const req = createMockRequest({
        sort_by: "institution_name",
        sort_dir: "asc",
      });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: "institution_name",
          sort_dir: "asc",
        }),
      );
    });

    it("returns 400 for invalid status filter", async () => {
      const req = createMockRequest({ status: "invalid" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("returns 400 when service throws ValidationError", async () => {
      (mockService.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ValidationError('Invalid sort field: "bogus"'),
      );

      const req = createMockRequest({ sort_by: "bogus" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("returns 500 on unexpected error", async () => {
      (mockService.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection lost"),
      );

      const req = createMockRequest();
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });

    it("returns empty list when no applications match filter", async () => {
      (mockService.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        applications: [],
        meta: { page: 1, limit: 20, total: 0, total_pages: 0 },
      });

      const req = createMockRequest({ status: "rejected" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0]
        .data;
      expect(data.applications).toEqual([]);
      expect(data.meta.total).toBe(0);
    });

    it("ignores invalid sort_dir values", async () => {
      const req = createMockRequest({ sort_dir: "sideways" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ sort_dir: undefined }),
      );
    });

    it("passes status=all to service when explicitly set", async () => {
      const req = createMockRequest({ status: "all" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: "all" }),
      );
    });
  });

  describe("handleGetById", () => {
    it("returns 200 with full application detail", async () => {
      const req = createMockRequest({}, { id: "app-1" });
      const res = createMockResponse();

      await controller.handleGetById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "app-1",
            institution_name: "Morehouse School of Medicine",
            accreditation_body: "LCME",
          }),
          error: null,
        }),
      );
    });

    it("returns 404 for non-existent application ID", async () => {
      (mockService.getById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApplicationNotFoundError("nonexistent"),
      );

      const req = createMockRequest({}, { id: "nonexistent" });
      const res = createMockResponse();

      await controller.handleGetById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "NOT_FOUND" }),
        }),
      );
    });

    it("returns 500 on unexpected error in getById", async () => {
      (mockService.getById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error"),
      );

      const req = createMockRequest({}, { id: "app-1" });
      const res = createMockResponse();

      await controller.handleGetById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });
  });
});
