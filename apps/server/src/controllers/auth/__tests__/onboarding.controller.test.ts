import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { OnboardingController } from "../onboarding.controller";
import { OnboardingService } from "../../../services/auth/onboarding.service";

const MOCK_STATUS = {
  onboarding_complete: false,
  role: "faculty",
};

const MOCK_COMPLETE_RESULT = {
  user_id: "user-001",
  onboarding_complete: true,
  completed_at: "2026-02-20T00:00:00.000Z",
};

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function createAuthenticatedRequest(): Request {
  const req = {} as Record<string, unknown>;
  req.user = { sub: "user-001" };
  return req as unknown as Request;
}

function createUnauthenticatedRequest(): Request {
  return {} as unknown as Request;
}

describe("OnboardingController", () => {
  let controller: OnboardingController;
  let mockService: OnboardingService;

  beforeEach(() => {
    mockService = {
      getStatus: vi.fn().mockResolvedValue({ ...MOCK_STATUS }),
      markComplete: vi.fn().mockResolvedValue({ ...MOCK_COMPLETE_RESULT }),
    } as unknown as OnboardingService;

    controller = new OnboardingController(mockService);
  });

  describe("handleGetStatus", () => {
    it("returns 200 with onboarding status for authenticated user", async () => {
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleGetStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          onboarding_complete: false,
          role: "faculty",
        },
        error: null,
      });
    });

    it("returns 401 when user is not authenticated", async () => {
      const req = createUnauthenticatedRequest();
      const res = createMockResponse();

      await controller.handleGetStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "UNAUTHORIZED" }),
        }),
      );
    });

    it("returns 500 when service throws", async () => {
      (mockService.getStatus as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("DB error"),
      );
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleGetStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });

    it("returns correct ApiResponse envelope shape", async () => {
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleGetStatus(req, res);

      const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(jsonCall).toHaveProperty("data");
      expect(jsonCall).toHaveProperty("error");
      expect(jsonCall.error).toBeNull();
    });
  });

  describe("handleComplete", () => {
    it("returns 200 with completion result for authenticated user", async () => {
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleComplete(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: {
          user_id: "user-001",
          onboarding_complete: true,
          completed_at: "2026-02-20T00:00:00.000Z",
        },
        error: null,
      });
    });

    it("returns 401 when user is not authenticated", async () => {
      const req = createUnauthenticatedRequest();
      const res = createMockResponse();

      await controller.handleComplete(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "UNAUTHORIZED" }),
        }),
      );
    });

    it("returns 500 when service throws", async () => {
      (mockService.markComplete as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("DB error"),
      );
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleComplete(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: "INTERNAL_ERROR" }),
        }),
      );
    });

    it("calls service.markComplete with the correct userId", async () => {
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleComplete(req, res);

      expect(mockService.markComplete).toHaveBeenCalledWith("user-001");
    });

    it("returns correct ApiResponse envelope shape", async () => {
      const req = createAuthenticatedRequest();
      const res = createMockResponse();

      await controller.handleComplete(req, res);

      const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(jsonCall).toHaveProperty("data");
      expect(jsonCall).toHaveProperty("error");
      expect(jsonCall.error).toBeNull();
      expect(jsonCall.data.user_id).toBe("user-001");
    });
  });
});
