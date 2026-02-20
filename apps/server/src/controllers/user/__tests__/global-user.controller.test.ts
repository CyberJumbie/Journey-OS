import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { GlobalUserController } from "../global-user.controller";
import { GlobalUserService } from "../../../services/user/global-user.service";
import { ValidationError } from "../../../errors/validation.error";

const MOCK_USERS = [
  {
    id: "user-1",
    email: "jsmith@msm.edu",
    full_name: "Dr. Jane Smith",
    role: "institutional_admin",
    is_course_director: false,
    is_active: true,
    institution_id: "inst-1",
    institution_name: "Morehouse School of Medicine",
    last_login_at: "2026-02-18T14:30:00Z",
    created_at: "2026-01-15T09:00:00Z",
  },
  {
    id: "user-2",
    email: "bwilson@howard.edu",
    full_name: "Dr. Brian Wilson",
    role: "faculty",
    is_course_director: true,
    is_active: true,
    institution_id: "inst-2",
    institution_name: "Howard University",
    last_login_at: "2026-02-17T10:00:00Z",
    created_at: "2026-01-20T08:00:00Z",
  },
];

const MOCK_RESPONSE = {
  users: MOCK_USERS,
  meta: { page: 1, limit: 25, total: 2, total_pages: 1 },
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(query: Record<string, string> = {}): Request {
  return {
    query,
    headers: {},
  } as unknown as Request;
}

describe("GlobalUserController", () => {
  let controller: GlobalUserController;
  let mockService: GlobalUserService;

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue(MOCK_RESPONSE),
    } as unknown as GlobalUserService;

    controller = new GlobalUserController(mockService);
  });

  describe("handleList", () => {
    it("returns 200 with paginated user list", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            users: expect.arrayContaining([
              expect.objectContaining({ id: "user-1" }),
            ]),
            meta: expect.objectContaining({ total: 2 }),
          }),
          error: null,
        }),
      );
    });

    it("returns users with institution_name from joined data", async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      await controller.handleList(req, res);

      const responseData = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0].data;
      expect(responseData.users[0]).toHaveProperty(
        "institution_name",
        "Morehouse School of Medicine",
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
        limit: 25,
        total: 2,
        total_pages: 1,
      });
    });

    it("passes page and limit as numbers to service", async () => {
      const req = createMockRequest({ page: "3", limit: "10" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, limit: 10 }),
      );
    });

    it("passes role filter to service", async () => {
      const req = createMockRequest({ role: "faculty" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ role: "faculty" }),
      );
    });

    it("passes institution_id filter to service", async () => {
      const req = createMockRequest({ institution_id: "inst-1" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ institution_id: "inst-1" }),
      );
    });

    it("passes is_active=true filter to service", async () => {
      const req = createMockRequest({ is_active: "true" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: true }),
      );
    });

    it("passes is_active=false filter to service", async () => {
      const req = createMockRequest({ is_active: "false" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false }),
      );
    });

    it("passes search term to service", async () => {
      const req = createMockRequest({ search: "jane" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: "jane" }),
      );
    });

    it("passes sort_by and sort_dir to service", async () => {
      const req = createMockRequest({
        sort_by: "full_name",
        sort_dir: "asc",
      });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: "full_name",
          sort_dir: "asc",
        }),
      );
    });

    it("returns 400 for invalid role filter", async () => {
      const req = createMockRequest({ role: "invalid_role" });
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

    it("returns empty list when no users match", async () => {
      (mockService.list as ReturnType<typeof vi.fn>).mockResolvedValue({
        users: [],
        meta: { page: 1, limit: 25, total: 0, total_pages: 0 },
      });

      const req = createMockRequest({ search: "nonexistent" });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const data = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0]
        .data;
      expect(data.users).toEqual([]);
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
  });
});
