import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import {
  EmailVerificationMiddleware,
  createEmailVerificationMiddleware,
} from "../email-verification.middleware";

const VERIFIED_USER = {
  sub: "user-001",
  email: "verified@msm.edu",
  role: "faculty",
  institution_id: "inst-001",
  is_course_director: false,
  email_confirmed_at: "2026-02-19T10:00:00Z",
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

const UNVERIFIED_USER = {
  ...VERIFIED_USER,
  sub: "user-002",
  email: "unverified@msm.edu",
  email_confirmed_at: null,
};

function createMockRequest(
  user?: Record<string, unknown>,
  method = "GET",
): Request {
  const req = { method } as Record<string, unknown>;
  if (user) {
    req.user = user;
  }
  return req as unknown as Request;
}

function createMockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe("EmailVerificationMiddleware", () => {
  let middleware: EmailVerificationMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new EmailVerificationMiddleware();
    next = vi.fn();
  });

  it("allows verified user to pass through", async () => {
    const req = createMockRequest(VERIFIED_USER);
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks unverified user with 403 EMAIL_NOT_VERIFIED", async () => {
    const req = createMockRequest(UNVERIFIED_USER);
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: null,
        error: expect.objectContaining({
          code: "EMAIL_NOT_VERIFIED",
        }),
      }),
    );
  });

  it("blocks user with undefined email_confirmed_at", async () => {
    const userNoField = { ...VERIFIED_USER, email_confirmed_at: undefined };
    const req = createMockRequest(userNoField);
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("passes through OPTIONS requests without checking", async () => {
    const req = createMockRequest(UNVERIFIED_USER, "OPTIONS");
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("passes through when no user is set on request", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns correct ApiResponse envelope shape", async () => {
    const req = createMockRequest(UNVERIFIED_USER);
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    const body = vi.mocked(res.json).mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(body).toHaveProperty("data", null);
    expect(body).toHaveProperty("error");
    const error = body.error as Record<string, unknown>;
    expect(error).toHaveProperty("code", "EMAIL_NOT_VERIFIED");
    expect(error).toHaveProperty("message");
  });
});

describe("createEmailVerificationMiddleware", () => {
  it("returns a function with correct arity (req, res, next)", () => {
    const handler = createEmailVerificationMiddleware();
    expect(typeof handler).toBe("function");
    expect(handler.length).toBe(3);
  });
});
