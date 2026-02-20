import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SLORepository } from "../slo.repository";

const MOCK_SLO_ROW = {
  id: "slo-uuid-1",
  course_id: "course-uuid-1",
  institution_id: "inst-uuid-1",
  code: "SLO-MED101-01",
  title: "Identify major organ systems",
  description:
    "Student can identify and describe the major organ systems of the human body",
  bloom_level: "remember",
  scope: "session",
  status: "draft",
  created_by: "faculty-uuid-1",
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

describe("SLORepository", () => {
  describe("create", () => {
    it("inserts row with scope='session' and course_id from request", async () => {
      const singleFn = vi
        .fn()
        .mockResolvedValue({ data: MOCK_SLO_ROW, error: null });
      const selectFn = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn });

      const supabase = {
        from: vi.fn().mockReturnValue({ insert: insertFn }),
      } as unknown as SupabaseClient;

      const repo = new SLORepository(supabase);
      const result = await repo.create(
        {
          course_id: "course-uuid-1",
          code: "SLO-MED101-01",
          title: "Identify major organ systems",
          description:
            "Student can identify and describe the major organ systems of the human body",
          bloom_level: "remember",
        },
        "faculty-uuid-1",
        "inst-uuid-1",
      );

      expect(supabase.from).toHaveBeenCalledWith("student_learning_objectives");
      const insertArg = insertFn.mock.calls[0]![0] as Record<string, unknown>;
      expect(insertArg.scope).toBe("session");
      expect(insertArg.course_id).toBe("course-uuid-1");
      expect(insertArg.institution_id).toBe("inst-uuid-1");
      expect(result.id).toBe("slo-uuid-1");
    });
  });

  describe("findByCourseId", () => {
    it("filters by course_id and scope='session'", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [MOCK_SLO_ROW], error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      Object.defineProperty(countChain, "then", {
        value: (resolve: (v: unknown) => void) =>
          resolve({ count: 1, error: null }),
      });

      let callCount = 0;
      const supabase = {
        from: vi.fn(() => (++callCount % 2 === 1 ? chain : countChain)),
      } as unknown as SupabaseClient;

      const repo = new SLORepository(supabase);
      const result = await repo.findByCourseId({
        course_id: "course-uuid-1",
      });

      expect(result.objectives).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.objectives[0]!.course_id).toBe("course-uuid-1");

      // Verify scope filter was applied on data chain
      const eqCalls = chain.eq.mock.calls as [string, string][];
      const scopeCall = eqCalls.find(([col]) => col === "scope");
      expect(scopeCall).toBeDefined();
      expect(scopeCall![1]).toBe("session");
    });

    it("applies pagination correctly", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      Object.defineProperty(countChain, "then", {
        value: (resolve: (v: unknown) => void) =>
          resolve({ count: 100, error: null }),
      });

      let callCount = 0;
      const supabase = {
        from: vi.fn(() => (++callCount % 2 === 1 ? chain : countChain)),
      } as unknown as SupabaseClient;

      const repo = new SLORepository(supabase);
      const result = await repo.findByCourseId({
        course_id: "course-uuid-1",
        page: 3,
        limit: 10,
      });

      // Page 3, limit 10 → offset 20, range(20, 29)
      expect(chain.range).toHaveBeenCalledWith(20, 29);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(100);
      expect(result.meta.total_pages).toBe(10);
    });
  });

  describe("existsByCode", () => {
    it("returns true when code exists for course_id with scope='session'", async () => {
      const maybeSingleFn = vi
        .fn()
        .mockResolvedValue({ data: { id: "slo-uuid-1" }, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleFn,
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const repo = new SLORepository(supabase);
      const result = await repo.existsByCode("SLO-MED101-01", "course-uuid-1");

      expect(result).toBe(true);
      const eqCalls = chain.eq.mock.calls as [string, string][];
      expect(eqCalls.find(([col]) => col === "scope")).toBeDefined();
    });

    it("returns false when code does not exist", async () => {
      const maybeSingleFn = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleFn,
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const repo = new SLORepository(supabase);
      const result = await repo.existsByCode("SLO-MED101-99", "course-uuid-1");

      expect(result).toBe(false);
    });

    it("returns false when same code exists but in different course", async () => {
      const maybeSingleFn = vi
        .fn()
        .mockResolvedValue({ data: null, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleFn,
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const repo = new SLORepository(supabase);
      const result = await repo.existsByCode(
        "SLO-MED101-01",
        "course-uuid-OTHER",
      );

      expect(result).toBe(false);
      const eqCalls = chain.eq.mock.calls as [string, string][];
      expect(
        eqCalls.find(([, val]) => val === "course-uuid-OTHER"),
      ).toBeDefined();
    });
  });
});
