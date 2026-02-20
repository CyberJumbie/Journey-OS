import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { InstitutionUserController } from "../institution-user.controller";
import { InstitutionUserService } from "../../../services/user/institution-user.service";
import { ValidationError } from "../../../errors/validation.error";
import { DuplicateInvitationError } from "../../../errors/invitation.error";

const MOCK_USERS = [
  {
    id: "user-1",
    email: "faculty@school.edu",
    full_name: "Dr. Faculty",
    role: "faculty",
    is_course_director: true,
    is_active: true,
    status: "active",
    last_login_at: "2026-02-18T10:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "inv-1",
    email: "pending@school.edu",
    full_name: null,
    role: "advisor",
    is_course_director: false,
    is_active: false,
    status: "pending",
    last_login_at: null,
    created_at: "2026-02-10T00:00:00Z",
  },
];

const MOCK_LIST_RESPONSE = {
  users: MOCK_USERS,
  meta: { page: 1, limit: 25, total: 2, total_pages: 1 },
};

const MOCK_INVITE_RESPONSE = {
  invitation_id: "inv-new",
  email: "new@school.edu",
  role: "faculty",
  expires_at: "2026-03-06T00:00:00Z",
};

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockRequest(
  query: Record<string, string> = {},
  body: Record<string, unknown> = {},
): Request {
  return {
    query,
    body,
    headers: {},
    user: {
      id: "admin-1",
      institution_id: "inst-1",
      full_name: "Admin User",
      institution_name: "Test School",
    },
  } as unknown as Request;
}

describe("InstitutionUserController", () => {
  let controller: InstitutionUserController;
  let mockService: InstitutionUserService;

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockResolvedValue(MOCK_LIST_RESPONSE),
      invite: vi.fn().mockResolvedValue(MOCK_INVITE_RESPONSE),
    } as unknown as InstitutionUserService;

    controller = new InstitutionUserController(mockService);
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

    it("passes query params to service", async () => {
      const req = createMockRequest({
        page: "2",
        limit: "10",
        sort_by: "email",
        sort_dir: "asc",
        search: "faculty",
        role: "faculty",
        status: "active",
      });
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(mockService.list).toHaveBeenCalledWith("inst-1", {
        page: 2,
        limit: 10,
        sort_by: "email",
        sort_dir: "asc",
        search: "faculty",
        role: "faculty",
        status: "active",
      });
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

    it("returns 400 when user has no institution_id", async () => {
      const req = {
        query: {},
        body: {},
        headers: {},
        user: { id: "admin-1" },
      } as unknown as Request;
      const res = createMockResponse();

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
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
  });

  describe("handleInvite", () => {
    it("returns 201 on successful invitation", async () => {
      const req = createMockRequest(
        {},
        { email: "new@school.edu", role: "faculty" },
      );
      const res = createMockResponse();

      await controller.handleInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ invitation_id: "inv-new" }),
          error: null,
        }),
      );
    });

    it("returns 400 for missing email", async () => {
      const req = createMockRequest({}, { role: "faculty" });
      const res = createMockResponse();

      await controller.handleInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for invalid role", async () => {
      const req = createMockRequest(
        {},
        { email: "new@school.edu", role: "superadmin" },
      );
      const res = createMockResponse();

      await controller.handleInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 for CD flag on non-faculty role", async () => {
      const req = createMockRequest(
        {},
        {
          email: "new@school.edu",
          role: "student",
          is_course_director: true,
        },
      );
      const res = createMockResponse();

      await controller.handleInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 for duplicate invitation", async () => {
      (mockService.invite as ReturnType<typeof vi.fn>).mockRejectedValue(
        new DuplicateInvitationError(),
      );

      const req = createMockRequest(
        {},
        { email: "existing@school.edu", role: "faculty" },
      );
      const res = createMockResponse();

      await controller.handleInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "DUPLICATE_INVITATION" }),
        }),
      );
    });

    it("returns 500 on unexpected error", async () => {
      (mockService.invite as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Unexpected"),
      );

      const req = createMockRequest(
        {},
        { email: "new@school.edu", role: "faculty" },
      );
      const res = createMockResponse();

      await controller.handleInvite(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
