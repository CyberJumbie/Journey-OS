import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

vi.mock("../../config/env.config", () => ({
  envConfig: {
    SUPABASE_URL: "https://test-project.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    SUPABASE_JWT_SECRET: "super-secret-jwt-token-with-at-least-32-characters",
    NODE_ENV: "test",
    PORT: 3001,
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

import { AuthMiddleware, createAuthMiddleware } from "../auth.middleware";
import { AuthService } from "../../services/auth/auth.service";
import { AuthenticationError } from "../../errors/auth.errors";
import { AuthRole, AuthTokenPayload } from "@journey-os/types";

const VALID_JWT_PAYLOAD: AuthTokenPayload = {
  sub: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "dr.osei@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: "inst-0001-0002-0003-000000000001",
  is_course_director: true,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    headers: {},
    ...overrides,
  } as Request;
}

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("AuthMiddleware", () => {
  let authService: AuthService;
  let middleware: AuthMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    authService = {
      extractBearerToken: vi.fn(),
      verifyToken: vi.fn(),
    } as unknown as AuthService;

    middleware = new AuthMiddleware(authService);
    next = vi.fn();
  });

  it("should pass through OPTIONS requests without authentication", async () => {
    const req = createMockRequest({ method: "OPTIONS" });
    const res = createMockResponse();

    await middleware.handle(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(authService.extractBearerToken).not.toHaveBeenCalled();
  });

  it("should populate req.user and call next on valid token", async () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer valid-token" },
    });
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(authService.verifyToken).mockResolvedValue(VALID_JWT_PAYLOAD);

    await middleware.handle(req, res, next);

    expect(req.user).toEqual(VALID_JWT_PAYLOAD);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should return 401 when Authorization header is missing", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockImplementation(() => {
      throw new AuthenticationError("Missing Authorization header");
    });

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Missing Authorization header",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token verification fails", async () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer bad-token" },
    });
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockReturnValue("bad-token");
    vi.mocked(authService.verifyToken).mockRejectedValue(
      new AuthenticationError("Token verification failed: Invalid token"),
    );

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Token verification failed: Invalid token",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return generic message for non-AuthenticationError errors", async () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer some-token" },
    });
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockReturnValue("some-token");
    vi.mocked(authService.verifyToken).mockRejectedValue(
      new TypeError("Cannot read properties of undefined"),
    );

    await middleware.handle(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication failed",
      },
    });
  });

  it("should extract token from authorization header", async () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer my-jwt-token" },
    });
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockReturnValue("my-jwt-token");
    vi.mocked(authService.verifyToken).mockResolvedValue(VALID_JWT_PAYLOAD);

    await middleware.handle(req, res, next);

    expect(authService.extractBearerToken).toHaveBeenCalledWith(
      "Bearer my-jwt-token",
    );
  });

  it("should call verifyToken with the extracted token", async () => {
    const req = createMockRequest({
      headers: { authorization: "Bearer extracted-token" },
    });
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockReturnValue(
      "extracted-token",
    );
    vi.mocked(authService.verifyToken).mockResolvedValue(VALID_JWT_PAYLOAD);

    await middleware.handle(req, res, next);

    expect(authService.verifyToken).toHaveBeenCalledWith("extracted-token");
  });

  it("should not set req.user when authentication fails", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockImplementation(() => {
      throw new AuthenticationError("Missing Authorization header");
    });

    await middleware.handle(req, res, next);

    expect(req.user).toBeUndefined();
  });

  it("should return correct error response shape with data and error keys", async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockImplementation(() => {
      throw new AuthenticationError("Missing Authorization header");
    });

    await middleware.handle(req, res, next);

    const responseBody = vi.mocked(res.json).mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(responseBody).toHaveProperty("data", null);
    expect(responseBody).toHaveProperty("error");
    expect(responseBody.error).toHaveProperty("code");
    expect(responseBody.error).toHaveProperty("message");
  });

  it("should handle POST requests requiring auth", async () => {
    const req = createMockRequest({
      method: "POST",
      headers: { authorization: "Bearer valid-token" },
    });
    const res = createMockResponse();

    vi.mocked(authService.extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(authService.verifyToken).mockResolvedValue(VALID_JWT_PAYLOAD);

    await middleware.handle(req, res, next);

    expect(req.user).toEqual(VALID_JWT_PAYLOAD);
    expect(next).toHaveBeenCalled();
  });
});

describe("createAuthMiddleware", () => {
  it("should return a function", () => {
    const handler = createAuthMiddleware();
    expect(typeof handler).toBe("function");
  });

  it("should return a function with correct arity (req, res, next)", () => {
    const handler = createAuthMiddleware();
    expect(handler.length).toBe(3);
  });
});
