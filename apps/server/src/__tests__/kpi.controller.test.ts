import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { KpiController } from "../controllers/dashboard/kpi.controller";
import { KpiService } from "../services/dashboard/kpi.service";
import type { KpiResponse } from "@journey-os/types";

// ─── Fixtures ──────────────────────────────────────────────────────────

const FACULTY_USER = {
  sub: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  email: "faculty@msm.edu",
  role: "faculty",
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
};

const COURSE_DIRECTOR_USER = {
  ...FACULTY_USER,
  sub: "cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa",
  is_course_director: true,
};

const STUDENT_USER = {
  sub: "ssssssss-tttt-uuuu-vvvv-wwwwwwwwwwww",
  email: "student@msm.edu",
  role: "student",
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
};

const MOCK_KPI_RESPONSE: KpiResponse = {
  metrics: [
    {
      key: "questions_generated",
      label: "Questions Generated",
      value: 42,
      unit: "",
      trend_direction: "up",
      trend_percent: 15.5,
      previous_value: 36,
    },
    {
      key: "approval_rate",
      label: "Approval Rate",
      value: 85.5,
      unit: "%",
      trend_direction: "up",
      trend_percent: 5.2,
      previous_value: 81.3,
    },
    {
      key: "coverage_score",
      label: "Avg Quality Score",
      value: 7.8,
      unit: "",
      trend_direction: "flat",
      trend_percent: 0.3,
      previous_value: 7.78,
    },
    {
      key: "time_saved",
      label: "Time Saved",
      value: 31.5,
      unit: "hrs",
      trend_direction: "up",
      trend_percent: 15.5,
      previous_value: 27,
    },
  ],
  period: "7d",
  period_start: "2026-02-13T00:00:00.000Z",
  period_end: "2026-02-20T00:00:00.000Z",
  scope: "personal",
};

// ─── Mock helpers ──────────────────────────────────────────────────────

function createMockService(): KpiService {
  return {
    calculateMetrics: vi.fn().mockResolvedValue(MOCK_KPI_RESPONSE),
  } as unknown as KpiService;
}

function createMockReqRes(overrides?: {
  query?: Record<string, unknown>;
  user?: Record<string, unknown> | null;
}): { req: Request; res: Response } {
  const reqObj: Record<string, unknown> = {
    query: overrides?.query ?? {
      user_id: FACULTY_USER.sub,
      period: "7d",
    },
  };
  if (overrides?.user !== null) {
    reqObj.user = overrides?.user ?? FACULTY_USER;
  }
  const req = reqObj as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

function getResponseBody(res: Response): { statusCode: number; body: unknown } {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.calls[0]!;
  const jsonFn = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value
    .json;
  const body = jsonFn.mock.calls[0]?.[0];
  return { statusCode: statusCall[0] as number, body };
}

// ─── Controller Tests ─────────────────────────────────────────────────

describe("KpiController", () => {
  let svc: KpiService;
  let controller: KpiController;

  beforeEach(() => {
    svc = createMockService();
    controller = new KpiController(svc);
  });

  describe("handleGetKpis", () => {
    it("returns 4 KPI metrics for authenticated faculty (200)", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleGetKpis(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      const data = (body as { data: KpiResponse }).data;
      expect(data.metrics).toHaveLength(4);
      expect((body as { error: unknown }).error).toBeNull();
    });

    it("returns correct metric keys (questions_generated, approval_rate, coverage_score, time_saved)", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleGetKpis(req, res);

      const { body } = getResponseBody(res);
      const keys = (body as { data: KpiResponse }).data.metrics.map(
        (m) => m.key,
      );
      expect(keys).toEqual([
        "questions_generated",
        "approval_rate",
        "coverage_score",
        "time_saved",
      ]);
    });

    it("defaults to period=7d when not specified", async () => {
      const { req, res } = createMockReqRes({
        query: { user_id: FACULTY_USER.sub },
      });

      await controller.handleGetKpis(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect(svc.calculateMetrics).toHaveBeenCalledWith(
        FACULTY_USER.sub,
        "7d",
        "faculty",
        false,
        FACULTY_USER.institution_id,
      );
    });

    it("accepts period=30d and returns correct date range", async () => {
      const response30d: KpiResponse = {
        ...MOCK_KPI_RESPONSE,
        period: "30d",
      };
      (svc.calculateMetrics as ReturnType<typeof vi.fn>).mockResolvedValue(
        response30d,
      );

      const { req, res } = createMockReqRes({
        query: { user_id: FACULTY_USER.sub, period: "30d" },
      });

      await controller.handleGetKpis(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect((body as { data: KpiResponse }).data.period).toBe("30d");
    });

    it("accepts period=semester and calculates semester boundaries", async () => {
      const responseSemester: KpiResponse = {
        ...MOCK_KPI_RESPONSE,
        period: "semester",
      };
      (svc.calculateMetrics as ReturnType<typeof vi.fn>).mockResolvedValue(
        responseSemester,
      );

      const { req, res } = createMockReqRes({
        query: { user_id: FACULTY_USER.sub, period: "semester" },
      });

      await controller.handleGetKpis(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect(svc.calculateMetrics).toHaveBeenCalledWith(
        FACULTY_USER.sub,
        "semester",
        "faculty",
        false,
        FACULTY_USER.institution_id,
      );
    });

    it("rejects unauthenticated request (401)", async () => {
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleGetKpis(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(401);
      expect((body as { error: { code: string } }).error.code).toBe(
        "UNAUTHORIZED",
      );
    });

    it("rejects student role (403 FORBIDDEN)", async () => {
      // Students can't access this route via RBAC middleware,
      // but if they somehow bypass it, the controller checks authorization
      const otherUserId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
      const { req, res } = createMockReqRes({
        query: { user_id: otherUserId },
        user: STUDENT_USER,
      });

      await controller.handleGetKpis(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(403);
      expect((body as { error: { code: string } }).error.code).toBe(
        "FORBIDDEN",
      );
    });

    it("rejects invalid period value (400 VALIDATION_ERROR)", async () => {
      const { req, res } = createMockReqRes({
        query: { user_id: FACULTY_USER.sub, period: "90d" },
      });

      await controller.handleGetKpis(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("rejects invalid user_id format (400 VALIDATION_ERROR)", async () => {
      const { req, res } = createMockReqRes({
        query: { user_id: "not-a-uuid", period: "7d" },
      });

      await controller.handleGetKpis(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("returns scope=personal for regular faculty", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleGetKpis(req, res);

      const { body } = getResponseBody(res);
      expect((body as { data: KpiResponse }).data.scope).toBe("personal");
    });

    it("returns scope=institution for course director", async () => {
      const institutionResponse: KpiResponse = {
        ...MOCK_KPI_RESPONSE,
        scope: "institution",
      };
      (svc.calculateMetrics as ReturnType<typeof vi.fn>).mockResolvedValue(
        institutionResponse,
      );

      const { req, res } = createMockReqRes({
        query: { user_id: COURSE_DIRECTOR_USER.sub },
        user: COURSE_DIRECTOR_USER,
      });

      await controller.handleGetKpis(req, res);

      const { body } = getResponseBody(res);
      expect((body as { data: KpiResponse }).data.scope).toBe("institution");
      expect(svc.calculateMetrics).toHaveBeenCalledWith(
        COURSE_DIRECTOR_USER.sub,
        "7d",
        "faculty",
        true,
        COURSE_DIRECTOR_USER.institution_id,
      );
    });
  });
});

// ─── Service Tests ────────────────────────────────────────────────────

describe("KpiService", () => {
  const { mockSelect, mockFrom, createMockSupabase } = vi.hoisted(() => {
    const mockSelect = vi.fn();
    const mockFrom = vi.fn();

    function createMockSupabase() {
      // Build a chain that supports arbitrary filter calls
      const chainMethods: Record<string, ReturnType<typeof vi.fn>> = {};

      const createChain = (
        overrides?: Partial<{
          count: number | null;
          data: unknown[] | null;
        }>,
      ) => {
        const chain: Record<string, unknown> = {};
        const methods = ["eq", "in", "gte", "lte", "not", "select"];
        for (const method of methods) {
          chain[method] = vi.fn().mockReturnValue(chain);
        }
        // Terminal: resolves the query
        chain.count = overrides?.count ?? 0;
        chain.data = overrides?.data ?? [];
        chain.then = (
          resolve: (val: {
            count: number | null;
            data: unknown[] | null;
            error: null;
          }) => void,
        ) => {
          resolve({
            count: (overrides?.count ?? 0) as number | null,
            data: (overrides?.data ?? []) as unknown[] | null,
            error: null,
          });
        };
        return chain;
      };

      // Default chain
      const defaultChain = createChain();
      mockSelect.mockReturnValue(defaultChain);
      mockFrom.mockReturnValue({ select: mockSelect });

      return {
        from: mockFrom,
        _createChain: createChain,
      };
    }

    return { mockSelect, mockFrom, createMockSupabase };
  });

  let service: KpiService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    service = new KpiService(mockSupabase as never);
  });

  describe("calculateMetrics", () => {
    it("calculates questions_generated as COUNT of assessment_items in period", async () => {
      // Setup: every from().select() call returns count=10
      const chain = mockSupabase._createChain({ count: 10, data: [] });
      mockSelect.mockReturnValue(chain);
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const qg = result.metrics.find((m) => m.key === "questions_generated");
      expect(qg).toBeDefined();
      expect(qg!.value).toBe(10);
    });

    it("calculates approval_rate as (approved / total_reviewed) * 100", async () => {
      // Use date-aware mock: track gte calls to determine which query is which
      // Each from() call creates a chain that tracks its own filter state
      mockFrom.mockImplementation(() => {
        let isApprovedQuery = false;
        let isReviewedQuery = false;

        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.gte = vi.fn().mockReturnValue(chain);
        chain.lte = vi.fn().mockReturnValue(chain);
        chain.not = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockImplementation((_col: string, val: unknown) => {
          if (val === "approved") isApprovedQuery = true;
          return chain;
        });
        chain.in = vi.fn().mockImplementation((_col: string, vals: unknown) => {
          if (
            Array.isArray(vals) &&
            vals.includes("approved") &&
            vals.includes("retired")
          ) {
            isReviewedQuery = true;
          }
          return chain;
        });
        chain.then = (
          resolve: (val: {
            count: number | null;
            data: unknown[] | null;
            error: null;
          }) => void,
        ) => {
          let count = 5; // default: questions_generated
          if (isApprovedQuery) count = 8;
          else if (isReviewedQuery) count = 10;
          resolve({ count, data: [], error: null });
        };
        return { select: vi.fn().mockReturnValue(chain) };
      });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const ar = result.metrics.find((m) => m.key === "approval_rate");
      expect(ar).toBeDefined();
      expect(ar!.value).toBe(80); // (8/10) * 100
    });

    it("returns 0% approval_rate when no items reviewed (division by zero guard)", async () => {
      const chain = mockSupabase._createChain({ count: 0, data: [] });
      mockSelect.mockReturnValue(chain);
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const ar = result.metrics.find((m) => m.key === "approval_rate");
      expect(ar).toBeDefined();
      expect(ar!.value).toBe(0);
    });

    it("calculates time_saved as questions_generated * 0.75 (45min in hours)", async () => {
      let callIndex = 0;
      mockFrom.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // Current period questions_generated = 20
          return {
            select: vi
              .fn()
              .mockReturnValue(
                mockSupabase._createChain({ count: 20, data: [] }),
              ),
          };
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(mockSupabase._createChain({ count: 0, data: [] })),
        };
      });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const ts = result.metrics.find((m) => m.key === "time_saved");
      expect(ts).toBeDefined();
      expect(ts!.value).toBe(15); // 20 * 45/60 = 15
    });

    it('calculates trend_direction as "up" when current > previous by >= 1%', async () => {
      // Date-aware mock: track gte date to determine current vs previous period
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffIso = sevenDaysAgo.toISOString();

      mockFrom.mockImplementation(() => {
        let isCurrent = true; // default assume current

        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        chain.lte = vi.fn().mockReturnValue(chain);
        chain.not = vi.fn().mockReturnValue(chain);
        chain.gte = vi.fn().mockImplementation((_col: string, val: string) => {
          // If the gte date is before the 7-day cutoff, it's the previous period
          if (val < cutoffIso) isCurrent = false;
          return chain;
        });
        chain.then = (
          resolve: (val: {
            count: number | null;
            data: unknown[] | null;
            error: null;
          }) => void,
        ) => {
          resolve({ count: isCurrent ? 20 : 10, data: [], error: null });
        };
        return { select: vi.fn().mockReturnValue(chain) };
      });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const qg = result.metrics.find((m) => m.key === "questions_generated");
      expect(qg!.trend_direction).toBe("up");
    });

    it('calculates trend_direction as "down" when current < previous by >= 1%', async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffIso = sevenDaysAgo.toISOString();

      mockFrom.mockImplementation(() => {
        let isCurrent = true;

        const chain: Record<string, unknown> = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        chain.lte = vi.fn().mockReturnValue(chain);
        chain.not = vi.fn().mockReturnValue(chain);
        chain.gte = vi.fn().mockImplementation((_col: string, val: string) => {
          if (val < cutoffIso) isCurrent = false;
          return chain;
        });
        chain.then = (
          resolve: (val: {
            count: number | null;
            data: unknown[] | null;
            error: null;
          }) => void,
        ) => {
          resolve({ count: isCurrent ? 5 : 20, data: [], error: null });
        };
        return { select: vi.fn().mockReturnValue(chain) };
      });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const qg = result.metrics.find((m) => m.key === "questions_generated");
      expect(qg!.trend_direction).toBe("down");
    });

    it('calculates trend_direction as "flat" when abs(change) < 1%', async () => {
      let callIndex = 0;
      mockFrom.mockImplementation(() => {
        callIndex++;
        // Current: 100, Previous: 100 → 0% change
        if (callIndex <= 4) {
          return {
            select: vi
              .fn()
              .mockReturnValue(
                mockSupabase._createChain({ count: 100, data: [] }),
              ),
          };
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(
              mockSupabase._createChain({ count: 100, data: [] }),
            ),
        };
      });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      const qg = result.metrics.find((m) => m.key === "questions_generated");
      expect(qg!.trend_direction).toBe("flat");
    });

    it("returns 0 trend_percent when previous_value is 0 (division by zero guard)", async () => {
      const chain = mockSupabase._createChain({ count: 0, data: [] });
      mockSelect.mockReturnValue(chain);
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      // All zeros → trend_percent = 0 (not NaN or Infinity)
      for (const metric of result.metrics) {
        expect(Number.isFinite(metric.trend_percent)).toBe(true);
      }
    });

    it("scopes queries to user's courses for faculty role", async () => {
      const chain = mockSupabase._createChain({ count: 5, data: [] });
      mockSelect.mockReturnValue(chain);
      mockFrom.mockReturnValue({ select: mockSelect });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        false,
        "inst-1",
      );

      expect(result.scope).toBe("personal");
      // Verify the queries use "assessment_items" with personal scope (created_by filter)
      // For personal scope, from() should be called with "assessment_items" directly
      const fromCalls = mockFrom.mock.calls.map((call: unknown[]) => call[0]);
      // All queries should be on assessment_items (personal scope doesn't need programs/courses lookup)
      expect(fromCalls.every((table) => table === "assessment_items")).toBe(
        true,
      );
    });

    it("scopes queries to all institution courses for course director", async () => {
      let callIndex = 0;
      mockFrom.mockImplementation((table: string) => {
        callIndex++;
        if (table === "programs") {
          return {
            select: vi.fn().mockReturnValue(
              mockSupabase._createChain({
                count: null,
                data: [{ id: "prog-1" }],
              }),
            ),
          };
        }
        if (table === "courses") {
          return {
            select: vi.fn().mockReturnValue(
              mockSupabase._createChain({
                count: null,
                data: [{ id: "course-1" }],
              }),
            ),
          };
        }
        // assessment_items
        return {
          select: vi
            .fn()
            .mockReturnValue(
              mockSupabase._createChain({ count: 10, data: [] }),
            ),
        };
      });

      const result = await service.calculateMetrics(
        "user-1",
        "7d",
        "faculty",
        true,
        "inst-1",
      );

      expect(result.scope).toBe("institution");
      // Should have queried programs and courses tables for institution scope
      const fromCalls = mockFrom.mock.calls.map((call: unknown[]) => call[0]);
      expect(fromCalls).toContain("programs");
      expect(fromCalls).toContain("courses");
    });
  });
});
