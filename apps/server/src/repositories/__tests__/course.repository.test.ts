import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CourseRepository } from "../course.repository";
import { CourseNotFoundError } from "../../errors";

const MOCK_COURSE_ROW = {
  id: "course-uuid-1",
  code: "MED-101",
  name: "Introduction to Anatomy",
  description: "Fundamental anatomy course",
  department: "Basic Sciences",
  course_director_id: "faculty-uuid-1",
  academic_year: "2026-2027",
  semester: "Fall",
  credit_hours: 4,
  course_type: "lecture",
  neo4j_id: null,
  status: "active",
  created_at: "2026-02-20T10:00:00Z",
  updated_at: "2026-02-20T10:00:00Z",
};

describe("CourseRepository", () => {
  describe("create", () => {
    it("inserts row and returns CourseDTO", async () => {
      const singleFn = vi
        .fn()
        .mockResolvedValue({ data: MOCK_COURSE_ROW, error: null });
      const selectFn = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn });

      const supabase = {
        from: vi.fn().mockReturnValue({ insert: insertFn }),
      } as unknown as SupabaseClient;

      const repo = new CourseRepository(supabase);
      const result = await repo.create({
        code: "MED-101",
        name: "Introduction to Anatomy",
        description: "Fundamental anatomy course",
        department: "Basic Sciences",
        course_type: "lecture",
      });

      expect(supabase.from).toHaveBeenCalledWith("courses");
      const insertArg = insertFn.mock.calls[0]![0] as Record<string, unknown>;
      expect(insertArg.code).toBe("MED-101");
      expect(insertArg.name).toBe("Introduction to Anatomy");
      expect(result.id).toBe("course-uuid-1");
      expect(result.course_type).toBe("lecture");
    });

    it("throws CourseNotFoundError when insert fails", async () => {
      const singleFn = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "duplicate key" } });
      const selectFn = vi.fn().mockReturnValue({ single: singleFn });
      const insertFn = vi.fn().mockReturnValue({ select: selectFn });

      const supabase = {
        from: vi.fn().mockReturnValue({ insert: insertFn }),
      } as unknown as SupabaseClient;

      const repo = new CourseRepository(supabase);
      await expect(
        repo.create({ code: "MED-101", name: "Test" }),
      ).rejects.toThrow(CourseNotFoundError);
    });
  });

  describe("findById", () => {
    it("returns CourseDTO when found", async () => {
      const maybeSingleFn = vi
        .fn()
        .mockResolvedValue({ data: MOCK_COURSE_ROW, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleFn,
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const repo = new CourseRepository(supabase);
      const result = await repo.findById("course-uuid-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("course-uuid-1");
    });

    it("returns null when not found", async () => {
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

      const repo = new CourseRepository(supabase);
      const result = await repo.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("list", () => {
    it("returns paginated courses with filters", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi
          .fn()
          .mockResolvedValue({ data: [MOCK_COURSE_ROW], error: null }),
      };

      const countChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };
      Object.defineProperty(countChain, "then", {
        value: (resolve: (v: unknown) => void) =>
          resolve({ count: 1, error: null }),
      });

      let callCount = 0;
      const supabase = {
        from: vi.fn(() => (++callCount % 2 === 1 ? chain : countChain)),
      } as unknown as SupabaseClient;

      const repo = new CourseRepository(supabase);
      const result = await repo.list({ status: "active" });

      expect(result.courses).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.courses[0]!.id).toBe("course-uuid-1");
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

      const repo = new CourseRepository(supabase);
      const result = await repo.list({ page: 3, limit: 10 });

      expect(chain.range).toHaveBeenCalledWith(20, 29);
      expect(result.meta.page).toBe(3);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(100);
      expect(result.meta.total_pages).toBe(10);
    });
  });

  describe("existsByCode", () => {
    it("returns true when code exists", async () => {
      const maybeSingleFn = vi
        .fn()
        .mockResolvedValue({ data: { id: "course-uuid-1" }, error: null });
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: maybeSingleFn,
      };

      const supabase = {
        from: vi.fn().mockReturnValue(chain),
      } as unknown as SupabaseClient;

      const repo = new CourseRepository(supabase);
      const result = await repo.existsByCode("MED-101");

      expect(result).toBe(true);
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

      const repo = new CourseRepository(supabase);
      const result = await repo.existsByCode("MED-999");

      expect(result).toBe(false);
    });
  });
});
