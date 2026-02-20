import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { UserReassignmentController } from "../user-reassignment.controller";
import { UserReassignmentService } from "../../../services/user/user-reassignment.service";
import {
  SameInstitutionError,
  UserNotFoundError,
  InstitutionNotFoundError,
  ConcurrentModificationError,
} from "../../../errors";

const MOCK_REASSIGNMENT_RESULT = {
  user_id: "user-1",
  from_institution_id: "inst-1",
  from_institution_name: "Morehouse School of Medicine",
  to_institution_id: "inst-2",
  to_institution_name: "Howard University College of Medicine",
  courses_archived: 3,
  course_director_reset: true,
  audit_log_id: "audit-1",
  reassigned_at: "2026-02-19T14:00:00Z",
};

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function createMockRequest(
  params: Record<string, string> = {},
  body: Record<string, unknown> = {},
  user: { sub: string } | undefined = { sub: "sa-uuid-1" },
): Request {
  return {
    params,
    body,
    user,
    headers: {},
  } as unknown as Request;
}

describe("UserReassignmentController", () => {
  let controller: UserReassignmentController;
  let mockService: UserReassignmentService;

  beforeEach(() => {
    mockService = {
      reassign: vi.fn().mockResolvedValue(MOCK_REASSIGNMENT_RESULT),
    } as unknown as UserReassignmentService;
    controller = new UserReassignmentController(mockService);
  });

  describe("handleReassign", () => {
    it("reassigns user to target institution (200)", async () => {
      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "inst-2", reason: "Transfer" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: MOCK_REASSIGNMENT_RESULT,
        error: null,
      });
    });

    it("returns result with from/to institution names and archived count", async () => {
      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "inst-2" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const data = body.data as typeof MOCK_REASSIGNMENT_RESULT;
      expect(data.from_institution_name).toBe("Morehouse School of Medicine");
      expect(data.to_institution_name).toBe(
        "Howard University College of Medicine",
      );
      expect(data.courses_archived).toBe(3);
      expect(data.course_director_reset).toBe(true);
    });

    it("calls service with correct arguments including trimmed reason", async () => {
      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "  inst-2  ", reason: "  Transfer  " },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(mockService.reassign).toHaveBeenCalledWith(
        "user-1",
        "inst-2",
        "Transfer",
        "sa-uuid-1",
      );
    });

    it("passes null reason when reason is not provided", async () => {
      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "inst-2" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(mockService.reassign).toHaveBeenCalledWith(
        "user-1",
        "inst-2",
        null,
        "sa-uuid-1",
      );
    });

    it("rejects same institution reassignment (400 SAME_INSTITUTION)", async () => {
      (mockService.reassign as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new SameInstitutionError(),
      );

      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "inst-1" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("SAME_INSTITUTION");
    });

    it("rejects missing target_institution_id (400 VALIDATION_ERROR)", async () => {
      const req = createMockRequest({ userId: "user-1" }, {});
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 for non-existent user ID", async () => {
      (mockService.reassign as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new UserNotFoundError("nonexistent"),
      );

      const req = createMockRequest(
        { userId: "nonexistent" },
        { target_institution_id: "inst-2" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("USER_NOT_FOUND");
    });

    it("returns 404 for non-existent target institution", async () => {
      (mockService.reassign as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new InstitutionNotFoundError("inst-bad"),
      );

      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "inst-bad" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("INSTITUTION_NOT_FOUND");
    });

    it("returns 409 for concurrent modification", async () => {
      (mockService.reassign as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new ConcurrentModificationError(),
      );

      const req = createMockRequest(
        { userId: "user-1" },
        { target_institution_id: "inst-2" },
      );
      const res = createMockResponse();

      await controller.handleReassign(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("CONCURRENT_MODIFICATION");
    });
  });
});
