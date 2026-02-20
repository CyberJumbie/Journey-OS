import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { RateLimiterMiddleware } from "../rate-limiter.middleware";

function mockRequest(body?: Record<string, unknown>): Partial<Request> {
  return {
    body: body ?? {},
    ip: "127.0.0.1",
  };
}

function mockResponse(): Partial<Response> & {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
} {
  const res: Partial<Response> & {
    statusCode: number;
    body: unknown;
    headers: Record<string, string>;
  } = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
      return res as Response;
    },
  };
  return res;
}

function mockNext(): NextFunction & { called: boolean } {
  const fn = (() => {
    fn.called = true;
  }) as NextFunction & { called: boolean };
  fn.called = false;
  return fn;
}

describe("RateLimiterMiddleware", () => {
  let limiter: RateLimiterMiddleware;

  beforeEach(() => {
    limiter = new RateLimiterMiddleware(
      { maxRequests: 3, windowMs: 60 * 60 * 1000 },
      (req: Request) => (req.body?.email ?? "unknown").toLowerCase(),
    );
  });

  it("calls next() when under rate limit", () => {
    const req = mockRequest({ email: "test@example.edu" });
    const res = mockResponse();
    const next = mockNext();

    limiter.handle(req as Request, res as Response, next);

    expect(next.called).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it("returns 429 RATE_LIMITED when limit exceeded", () => {
    const email = "spam@example.edu";

    for (let i = 0; i < 3; i++) {
      const req = mockRequest({ email });
      const res = mockResponse();
      const next = mockNext();
      limiter.handle(req as Request, res as Response, next);
      expect(next.called).toBe(true);
    }

    // 4th request should be rate limited
    const req = mockRequest({ email });
    const res = mockResponse();
    const next = mockNext();
    limiter.handle(req as Request, res as Response, next);

    expect(next.called).toBe(false);
    expect(res.statusCode).toBe(429);
  });

  it("resets count after window expires", () => {
    const email = "test@example.edu";
    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);

    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      const req = mockRequest({ email });
      const res = mockResponse();
      const next = mockNext();
      limiter.handle(req as Request, res as Response, next);
    }

    // Advance time past the window
    vi.spyOn(Date, "now").mockReturnValue(now + 60 * 60 * 1000 + 1);

    const req = mockRequest({ email });
    const res = mockResponse();
    const next = mockNext();
    limiter.handle(req as Request, res as Response, next);

    expect(next.called).toBe(true);
    expect(res.statusCode).toBe(200);

    vi.restoreAllMocks();
  });

  it("tracks limits per key (different emails have separate counters)", () => {
    // Exhaust limit for email A
    for (let i = 0; i < 3; i++) {
      const req = mockRequest({ email: "a@example.edu" });
      const res = mockResponse();
      const next = mockNext();
      limiter.handle(req as Request, res as Response, next);
    }

    // Email B should still work
    const req = mockRequest({ email: "b@example.edu" });
    const res = mockResponse();
    const next = mockNext();
    limiter.handle(req as Request, res as Response, next);

    expect(next.called).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it("response body matches ApiResponse<null> shape with RATE_LIMITED code", () => {
    const email = "limited@example.edu";

    for (let i = 0; i < 3; i++) {
      limiter.handle(
        mockRequest({ email }) as Request,
        mockResponse() as Response,
        mockNext(),
      );
    }

    const req = mockRequest({ email });
    const res = mockResponse();
    const next = mockNext();
    limiter.handle(req as Request, res as Response, next);

    expect(res.body).toEqual({
      data: null,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
      },
    });
  });

  it("includes Retry-After header in 429 response", () => {
    const email = "header@example.edu";

    for (let i = 0; i < 3; i++) {
      limiter.handle(
        mockRequest({ email }) as Request,
        mockResponse() as Response,
        mockNext(),
      );
    }

    const req = mockRequest({ email });
    const res = mockResponse();
    const next = mockNext();
    limiter.handle(req as Request, res as Response, next);

    expect(res.statusCode).toBe(429);
    expect(res.headers["Retry-After"]).toBeDefined();
    expect(Number(res.headers["Retry-After"])).toBeGreaterThan(0);
  });
});
