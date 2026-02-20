import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionMonitoringService } from "../institution-monitoring.service";
import { InstitutionNotFoundError } from "../../../errors/registration.error";
import type { SupabaseClient } from "@supabase/supabase-js";

const MOCK_INSTITUTION = {
  id: "inst-1",
  name: "Morehouse School of Medicine",
  domain: "msm.edu",
  institution_type: "md",
  accreditation_body: "LCME",
  status: "approved",
  created_at: "2026-01-15T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

interface RpcCallRecord {
  name: string;
  params: Record<string, unknown>;
}

/**
 * Creates a mock Supabase client for institution detail tests.
 * Supports `.from().select().eq().single()` for the institution query
 * and `.rpc()` for all aggregation queries, plus `.from().select().eq().gte()`
 * for active users count.
 */
function createMockSupabase(overrides?: {
  institution?: { data: unknown; error: unknown };
  rpcResults?: Record<string, { data: unknown; error: unknown }>;
  activeUsersCount?: number;
}): SupabaseClient {
  const rpcCalls: RpcCallRecord[] = [];

  const rpcFn = vi.fn((name: string, params: Record<string, unknown> = {}) => {
    rpcCalls.push({ name, params });
    const result = overrides?.rpcResults?.[name];
    if (result) return Promise.resolve(result);
    return Promise.resolve({ data: [], error: null });
  });

  // Institution single-record chain
  const singleFn = vi
    .fn()
    .mockResolvedValue(
      overrides?.institution ?? { data: MOCK_INSTITUTION, error: null },
    );
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  // Active users count chain: .select("id", { count, head }).eq().gte()
  const gteFn = vi.fn().mockResolvedValue({
    count: overrides?.activeUsersCount ?? 0,
    error: null,
  });
  const countEqFn = vi.fn().mockReturnValue({ gte: gteFn });
  const countSelectFn = vi.fn().mockReturnValue({ eq: countEqFn });

  let fromCallCount = 0;

  return {
    from: vi.fn((table: string) => {
      if (table === "institutions") {
        return { select: selectFn };
      }
      if (table === "profiles") {
        fromCallCount++;
        // The active users query uses count select
        return { select: countSelectFn };
      }
      return { select: selectFn };
    }),
    rpc: rpcFn,
  } as unknown as SupabaseClient;
}

describe("InstitutionMonitoringService", () => {
  describe("getDetail", () => {
    it("returns institution record with all fields", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.id).toBe("inst-1");
      expect(result.name).toBe("Morehouse School of Medicine");
      expect(result.domain).toBe("msm.edu");
      expect(result.status).toBe("approved");
    });

    it("throws InstitutionNotFoundError for non-existent ID", async () => {
      const supabase = createMockSupabase({
        institution: { data: null, error: { message: "Not found" } },
      });
      const service = new InstitutionMonitoringService(supabase);

      await expect(service.getDetail("nonexistent")).rejects.toThrow(
        InstitutionNotFoundError,
      );
    });

    it("aggregates total_users from user breakdown", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_user_breakdown_by_institution: {
            data: [
              { role: "faculty", count: 10 },
              { role: "student", count: 100 },
            ],
            error: null,
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.metrics.total_users).toBe(110);
    });

    it("returns user_breakdown grouped by role", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_user_breakdown_by_institution: {
            data: [
              { role: "faculty", count: 47 },
              { role: "student", count: 390 },
            ],
            error: null,
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.user_breakdown).toHaveLength(2);
      expect(result.user_breakdown[0]).toEqual({
        role: "faculty",
        count: 47,
      });
    });

    it("returns active_users_30d count", async () => {
      const supabase = createMockSupabase({ activeUsersCount: 42 });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.metrics.active_users_30d).toBe(42);
    });

    it("returns 0 for total_courses when RPC fails", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_course_count_by_institution: {
            data: null,
            error: { message: "relation does not exist" },
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.metrics.total_courses).toBe(0);
    });

    it("returns 0 for questions when RPC fails", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_question_metrics_by_institution: {
            data: null,
            error: { message: "relation does not exist" },
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.metrics.total_questions_generated).toBe(0);
      expect(result.metrics.total_questions_approved).toBe(0);
    });

    it("returns empty array for activity_timeline when no events", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_activity_timeline_by_institution: {
            data: [],
            error: null,
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.activity_timeline).toEqual([]);
    });

    it("returns filled monthly trends when no data exists", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_monthly_active_users_by_institution: {
            data: [],
            error: null,
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      // Should have 12 months filled with 0s
      expect(result.monthly_active_users).toHaveLength(12);
      expect(result.monthly_active_users.every((m) => m.value === 0)).toBe(
        true,
      );
    });

    it("returns storage with document_count=0 when RPC fails", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_storage_usage_by_institution: {
            data: null,
            error: { message: "relation does not exist" },
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      expect(result.storage).toEqual({
        document_count: 0,
        total_size_bytes: 0,
      });
    });

    it("fills missing months with value 0 for monthly trends", async () => {
      const supabase = createMockSupabase({
        rpcResults: {
          get_monthly_active_users_by_institution: {
            data: [{ month: "2026-01", value: 50 }],
            error: null,
          },
        },
      });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.getDetail("inst-1");

      // Should have 12 entries
      expect(result.monthly_active_users).toHaveLength(12);
      // The month with data should have value 50
      const jan = result.monthly_active_users.find(
        (m) => m.month === "2026-01",
      );
      expect(jan?.value).toBe(50);
      // Other months should be 0
      const nonJanMonths = result.monthly_active_users.filter(
        (m) => m.month !== "2026-01",
      );
      expect(nonJanMonths.every((m) => m.value === 0)).toBe(true);
    });
  });
});
