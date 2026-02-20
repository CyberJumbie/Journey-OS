import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { ApprovalController } from "../approval.controller";
import { InstitutionService } from "../../../services/institution/institution.service";
import { ApplicationNotFoundError } from "../../../errors/application.error";
import {
  DuplicateApprovalError,
  DuplicateDomainError,
} from "../../../errors/institution.error";

const MOCK_APPROVAL_RESULT = {
  application_id: "app-1",
  institution_id: "inst-new-1",
  institution_name: "Morehouse School of Medicine",
  institution_domain: "msm.edu",
  invitation_id: "inv-1",
  invitation_email: "jsmith@msm.edu",
  invitation_expires_at: "2026-02-26T12:00:00Z",
  approved_at: "2026-02-19T12:00:00Z",
  approved_by: "sa-uuid-1",
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

describe("ApprovalController", () => {
  let controller: ApprovalController;
  let mockService: InstitutionService;

  beforeEach(() => {
    mockService = {
      createFromApplication: vi.fn().mockResolvedValue(MOCK_APPROVAL_RESULT),
    } as unknown as InstitutionService;
    controller = new ApprovalController(mockService);
  });

  describe("handleApprove", () => {
    it("approves pending application and returns result (200)", async () => {
      const req = createMockRequest({ id: "app-1" }, { domain: "msm.edu" });
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: MOCK_APPROVAL_RESULT,
        error: null,
      });
    });

    it("returns institution_id, invitation_id, and invitation_email in result", async () => {
      const req = createMockRequest({ id: "app-1" }, { domain: "msm.edu" });
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const data = body.data as typeof MOCK_APPROVAL_RESULT;
      expect(data.institution_id).toBe("inst-new-1");
      expect(data.invitation_id).toBe("inv-1");
      expect(data.invitation_email).toBe("jsmith@msm.edu");
    });

    it("calls service with correct arguments", async () => {
      const req = createMockRequest({ id: "app-1" }, { domain: "msm.edu" });
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(mockService.createFromApplication).toHaveBeenCalledWith(
        "app-1",
        "msm.edu",
        "sa-uuid-1",
      );
    });

    it("trims domain whitespace", async () => {
      const req = createMockRequest({ id: "app-1" }, { domain: "  msm.edu  " });
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(mockService.createFromApplication).toHaveBeenCalledWith(
        "app-1",
        "msm.edu",
        "sa-uuid-1",
      );
    });

    it("returns 404 for non-existent application", async () => {
      (
        mockService.createFromApplication as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new ApplicationNotFoundError("nonexistent"));

      const req = createMockRequest(
        { id: "nonexistent" },
        { domain: "msm.edu" },
      );
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("NOT_FOUND");
    });

    it("returns 400 for already-approved application (DUPLICATE_APPROVAL)", async () => {
      (
        mockService.createFromApplication as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new DuplicateApprovalError("app-2"));

      const req = createMockRequest({ id: "app-2" }, { domain: "msm.edu" });
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("DUPLICATE_APPROVAL");
    });

    it("returns 400 for missing domain field (VALIDATION_ERROR)", async () => {
      const req = createMockRequest({ id: "app-1" }, {});
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 400 for empty domain string", async () => {
      const req = createMockRequest({ id: "app-1" }, { domain: "   " });
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 for duplicate domain (DUPLICATE_DOMAIN)", async () => {
      (
        mockService.createFromApplication as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(new DuplicateDomainError("existing.edu"));

      const req = createMockRequest(
        { id: "app-1" },
        { domain: "existing.edu" },
      );
      const res = createMockResponse();

      await controller.handleApprove(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      const body = (res.json as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      const error = body.error as { code: string };
      expect(error.code).toBe("DUPLICATE_DOMAIN");
    });
  });
});
