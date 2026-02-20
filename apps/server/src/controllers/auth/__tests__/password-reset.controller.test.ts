import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import { PasswordResetController } from "../password-reset.controller";
import { PasswordResetService } from "../../../services/auth/password-reset.service";
import { ValidationError } from "../../../errors/validation.error";

function mockRequest(body?: Record<string, unknown>): Partial<Request> {
  return {
    body: body ?? {},
    method: "POST",
    headers: { "content-type": "application/json" },
  };
}

function mockResponse(): Partial<Response> & {
  statusCode: number;
  body: unknown;
} {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}

const SUCCESS_MESSAGE =
  "If an account with that email exists, a password reset link has been sent.";

describe("PasswordResetController", () => {
  let controller: PasswordResetController;
  let mockService: { requestPasswordReset: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockService = {
      requestPasswordReset: vi.fn().mockResolvedValue({
        message: SUCCESS_MESSAGE,
      }),
    };
    controller = new PasswordResetController(
      mockService as unknown as PasswordResetService,
    );
  });

  describe("handleForgotPassword", () => {
    it("returns 200 with success message for valid email", async () => {
      const req = mockRequest({ email: "student.kim@msm.edu" });
      const res = mockResponse();

      await controller.handleForgotPassword(req as Request, res as Response);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: { message: SUCCESS_MESSAGE },
        error: null,
      });
    });

    it("returns 200 with same success message for non-existent email (no enumeration)", async () => {
      const req = mockRequest({ email: "unknown@nonexistent.edu" });
      const res = mockResponse();

      await controller.handleForgotPassword(req as Request, res as Response);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        data: { message: SUCCESS_MESSAGE },
        error: null,
      });
    });

    it("returns 400 VALIDATION_ERROR for invalid email format", async () => {
      mockService.requestPasswordReset.mockRejectedValue(
        new ValidationError("Invalid email format"),
      );
      const req = mockRequest({ email: "not-an-email" });
      const res = mockResponse();

      await controller.handleForgotPassword(req as Request, res as Response);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Invalid email format" },
      });
    });

    it("returns 400 VALIDATION_ERROR for missing email field", async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await controller.handleForgotPassword(req as Request, res as Response);

      expect(res.statusCode).toBe(400);
      expect(res.body).toEqual({
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Email is required" },
      });
    });

    it("returns 500 INTERNAL_ERROR when service throws unexpected error", async () => {
      mockService.requestPasswordReset.mockRejectedValue(
        new Error("Unexpected"),
      );
      const req = mockRequest({ email: "test@example.edu" });
      const res = mockResponse();

      await controller.handleForgotPassword(req as Request, res as Response);

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      });
    });

    it("response body matches ApiResponse<ForgotPasswordResponse> shape", async () => {
      const req = mockRequest({ email: "test@example.edu" });
      const res = mockResponse();

      await controller.handleForgotPassword(req as Request, res as Response);

      const body = res.body as Record<string, unknown>;
      expect(body).toHaveProperty("data");
      expect(body).toHaveProperty("error");
      expect((body.data as Record<string, unknown>).message).toBeTypeOf(
        "string",
      );
      expect(body.error).toBeNull();
    });
  });
});
