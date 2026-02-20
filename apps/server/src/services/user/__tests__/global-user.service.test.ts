import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlobalUserService } from "../global-user.service";
import { ValidationError } from "../../../errors/validation.error";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(data: unknown[] = [], total = 0): SupabaseClient {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error: null }),
  };

  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };

  // Make countChain thenable for Promise.all
  Object.defineProperty(countChain, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ count: total, error: null }),
  });

  let callCount = 0;
  return {
    from: vi.fn(() => {
      callCount++;
      // First call is data query, second is count query
      if (callCount % 2 === 1) return chain;
      return countChain;
    }),
  } as unknown as SupabaseClient;
}

describe("GlobalUserService", () => {
  describe("list", () => {
    it("returns users with correct meta", async () => {
      const mockData = [
        {
          id: "user-1",
          email: "test@test.edu",
          full_name: "Test User",
          role: "faculty",
          is_course_director: false,
          is_active: true,
          institution_id: "inst-1",
          institutions: { name: "Test School" },
          last_login_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];

      const supabase = createMockSupabase(mockData, 1);
      const service = new GlobalUserService(supabase);

      const result = await service.list({});

      expect(result.users).toHaveLength(1);
      expect(result.users[0]!.institution_name).toBe("Test School");
      expect(result.meta).toEqual({
        page: 1,
        limit: 25,
        total: 1,
        total_pages: 1,
      });
    });

    it("calculates total_pages correctly", async () => {
      const supabase = createMockSupabase([], 73);
      const service = new GlobalUserService(supabase);

      const result = await service.list({ limit: 25 });

      expect(result.meta.total_pages).toBe(3);
    });

    it("caps limit at 100", async () => {
      const supabase = createMockSupabase([], 0);
      const service = new GlobalUserService(supabase);

      const result = await service.list({ limit: 200 });

      expect(result.meta.limit).toBe(100);
    });

    it("defaults page to 1 and limit to 25", async () => {
      const supabase = createMockSupabase([], 0);
      const service = new GlobalUserService(supabase);

      const result = await service.list({});

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(25);
    });

    it("throws ValidationError for invalid sort field", async () => {
      const supabase = createMockSupabase();
      const service = new GlobalUserService(supabase);

      await expect(
        service.list({ sort_by: "bogus" as "email" }),
      ).rejects.toThrow(ValidationError);
    });

    it("handles null institution join gracefully", async () => {
      const mockData = [
        {
          id: "user-1",
          email: "admin@journeyos.com",
          full_name: "Super Admin",
          role: "superadmin",
          is_course_director: false,
          is_active: true,
          institution_id: null,
          institutions: null,
          last_login_at: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];

      const supabase = createMockSupabase(mockData, 1);
      const service = new GlobalUserService(supabase);

      const result = await service.list({});

      expect(result.users[0]!.institution_name).toBeNull();
    });

    it("enforces minimum page of 1", async () => {
      const supabase = createMockSupabase([], 0);
      const service = new GlobalUserService(supabase);

      const result = await service.list({ page: -1 });

      expect(result.meta.page).toBe(1);
    });
  });
});
