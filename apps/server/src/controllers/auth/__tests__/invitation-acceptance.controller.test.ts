import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { InvitationAcceptanceController } from "../invitation-acceptance.controller";
import { InvitationAcceptanceService } from "../../../services/auth/invitation-acceptance.service";
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
} from "../../../errors/invitation.error";
import { ValidationError } from "../../../errors/validation.error";
import { DuplicateEmailError } from "../../../errors/registration.error";

const VALID_PAYLOAD = {
  invitation_id: "inv-001",
  email: "faculty@msm.edu",
  role: "faculty",
  institution_id: "inst-001",
  institution_name: "Morehouse School of Medicine",
  expires_at: "2026-12-31T00:00:00Z",
  is_valid: true,
};

const VALID_ACCEPT_RESULT = {
  user_id: "user-001",
  email: "faculty@msm.edu",
  role: "faculty",
  institution_id: "inst-001",
  institution_name: "Morehouse School of Medicine",
  accepted_at: "2026-02-20T00:00:00Z",
};

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createMockRequest(
  opts: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  } = {},
): Request {
  return {
    query: opts.query ?? {},
    body: opts.body ?? {},
  } as unknown as Request;
}

describe("InvitationAcceptanceController", () => {
  let controller: InvitationAcceptanceController;
  let mockService: InvitationAcceptanceService;

  beforeEach(() => {
    mockService = {
      validateToken: vi.fn().mockResolvedValue(VALID_PAYLOAD),
      acceptInvitation: vi.fn().mockResolvedValue(VALID_ACCEPT_RESULT),
    } as unknown as InvitationAcceptanceService;

    controller = new InvitationAcceptanceController(mockService);
  });

  describe("handleValidate", () => {
    it("returns 200 with payload for valid token", async () => {
      const req = createMockRequest({ query: { token: "valid-token" } });
      const res = createMockResponse();

      await controller.handleValidate(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ invitation_id: "inv-001" }),
          error: null,
        }),
      );
    });

    it("returns 400 when token query param is missing", async () => {
      const req = createMockRequest({ query: {} });
      const res = createMockResponse();

      await controller.handleValidate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("returns 404 when token not found", async () => {
      (mockService.validateToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new InvitationNotFoundError(),
      );
      const req = createMockRequest({ query: { token: "bad-token" } });
      const res = createMockResponse();

      await controller.handleValidate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INVITATION_NOT_FOUND" }),
        }),
      );
    });

    it("returns 410 when token is expired", async () => {
      (mockService.validateToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new InvitationExpiredError(),
      );
      const req = createMockRequest({ query: { token: "expired-token" } });
      const res = createMockResponse();

      await controller.handleValidate(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INVITATION_EXPIRED" }),
        }),
      );
    });

    it("returns 410 when token is already used", async () => {
      (mockService.validateToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new InvitationAlreadyUsedError(),
      );
      const req = createMockRequest({ query: { token: "used-token" } });
      const res = createMockResponse();

      await controller.handleValidate(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INVITATION_ALREADY_USED" }),
        }),
      );
    });

    it("returns 500 on unexpected error", async () => {
      (mockService.validateToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Unexpected"),
      );
      const req = createMockRequest({ query: { token: "token" } });
      const res = createMockResponse();

      await controller.handleValidate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });
  });

  describe("handleAccept", () => {
    it("returns 200 on successful acceptance", async () => {
      const req = createMockRequest({
        body: {
          token: "valid-token",
          password: "StrongP@ss1",
          full_name: "Dr. Jane Faculty",
        },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ user_id: "user-001" }),
          error: null,
        }),
      );
    });

    it("returns 400 when token is missing from body", async () => {
      const req = createMockRequest({
        body: { password: "StrongP@ss1", full_name: "Name" },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "Token is required" }),
        }),
      );
    });

    it("returns 400 when password is missing from body", async () => {
      const req = createMockRequest({
        body: { token: "valid-token", full_name: "Name" },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "Password is required" }),
        }),
      );
    });

    it("returns 400 when full_name is missing from body", async () => {
      const req = createMockRequest({
        body: { token: "valid-token", password: "StrongP@ss1" },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "Full name is required" }),
        }),
      );
    });

    it("returns 400 on ValidationError from service", async () => {
      (
        mockService.acceptInvitation as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new ValidationError("Password too weak"));
      const req = createMockRequest({
        body: {
          token: "valid-token",
          password: "weak",
          full_name: "Name",
        },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
        }),
      );
    });

    it("returns 409 on DuplicateEmailError", async () => {
      (
        mockService.acceptInvitation as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new DuplicateEmailError());
      const req = createMockRequest({
        body: {
          token: "valid-token",
          password: "StrongP@ss1",
          full_name: "Name",
        },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "DUPLICATE_EMAIL" }),
        }),
      );
    });

    it("returns 500 on unexpected error", async () => {
      (
        mockService.acceptInvitation as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Unexpected"));
      const req = createMockRequest({
        body: {
          token: "valid-token",
          password: "StrongP@ss1",
          full_name: "Name",
        },
      });
      const res = createMockResponse();

      await controller.handleAccept(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });
  });
});
