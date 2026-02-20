import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionStatusMiddleware } from "../institution-status.middleware";
import type { Request, Response, NextFunction } from "express";

// Mock the supabase config module
vi.mock("../../config/supabase.config", () => {
  const mockFrom = vi.fn();
  return {
    getSupabaseClient: () => ({ from: mockFrom }),
    __mockFrom: mockFrom,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockFrom: mockFrom } =
  (await import("../../config/supabase.config")) as unknown as {
    __mockFrom: ReturnType<typeof vi.fn>;
  };

function createMockRes(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
} {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe("InstitutionStatusMiddleware", () => {
  let middleware: InstitutionStatusMiddleware;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    middleware = new InstitutionStatusMiddleware();
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("allows user from active institution to pass through", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: "approved" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(selectChain);

    const req = {
      method: "GET",
      user: { sub: "user-1", institution_id: "inst-1", role: "faculty" },
    } as unknown as Request;
    const res = createMockRes();

    await middleware.handle(
      req,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  it("blocks user from suspended institution with 403", async () => {
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { status: "suspended" },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(selectChain);

    const req = {
      method: "GET",
      user: { sub: "user-1", institution_id: "inst-2", role: "faculty" },
    } as unknown as Request;
    const res = createMockRes();

    await middleware.handle(
      req,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect((res.body as { error: { code: string } }).error.code).toBe(
      "INSTITUTION_SUSPENDED",
    );
  });

  it("skips check for users without institution_id (superadmin)", async () => {
    const req = {
      method: "GET",
      user: { sub: "sa-1", institution_id: "", role: "superadmin" },
    } as unknown as Request;
    const res = createMockRes();

    await middleware.handle(
      req,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(next).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
