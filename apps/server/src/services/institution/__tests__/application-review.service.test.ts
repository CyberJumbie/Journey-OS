import { describe, it, expect, vi } from "vitest";
import { ApplicationReviewService } from "../application-review.service";
import { ValidationError } from "../../../errors/validation.error";
import { ApplicationNotFoundError } from "../../../errors/application.error";
import type { SupabaseClient } from "@supabase/supabase-js";

const MOCK_APP_ROW = {
  id: "app-1",
  institution_name: "Morehouse School of Medicine",
  institution_type: "md",
  contact_name: "Dr. Jane Smith",
  contact_email: "jsmith@msm.edu",
  status: "pending",
  created_at: "2026-02-19T12:00:00Z",
};

const MOCK_DETAIL_ROW = {
  ...MOCK_APP_ROW,
  accreditation_body: "LCME",
  contact_phone: "+1-404-555-0100",
  student_count: 450,
  website_url: "https://www.msm.edu",
  reason: "Interested in AI-powered assessment tools",
  submitted_ip: "192.168.1.1",
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  updated_at: "2026-02-19T12:00:00Z",
};

function createMockSupabase(data: unknown[] = [], total = 0): SupabaseClient {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error: null }),
  };

  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };

  Object.defineProperty(countChain, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ count: total, error: null }),
  });

  let callCount = 0;
  return {
    from: vi.fn(() => {
      callCount++;
      if (callCount % 2 === 1) return chain;
      return countChain;
    }),
  } as unknown as SupabaseClient;
}

function createMockSupabaseForDetail(
  data: unknown | null,
  error: { message: string } | null = null,
): SupabaseClient {
  const singleFn = vi.fn().mockResolvedValue({ data, error });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

  return {
    from: vi.fn().mockReturnValue({ select: selectFn }),
  } as unknown as SupabaseClient;
}

describe("ApplicationReviewService", () => {
  describe("list", () => {
    it("returns applications with correct meta", async () => {
      const supabase = createMockSupabase([MOCK_APP_ROW], 1);
      const service = new ApplicationReviewService(supabase);

      const result = await service.list({});

      expect(result.applications).toHaveLength(1);
      expect(result.applications[0]!.institution_name).toBe(
        "Morehouse School of Medicine",
      );
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        total_pages: 1,
      });
    });

    it("calculates total_pages correctly", async () => {
      const supabase = createMockSupabase([], 45);
      const service = new ApplicationReviewService(supabase);

      const result = await service.list({ limit: 20 });

      expect(result.meta.total_pages).toBe(3);
    });

    it("throws ValidationError for invalid sort field", async () => {
      const supabase = createMockSupabase();
      const service = new ApplicationReviewService(supabase);

      await expect(
        service.list({ sort_by: "bogus" as "created_at" }),
      ).rejects.toThrow(ValidationError);
    });

    it("caps limit at 100", async () => {
      const supabase = createMockSupabase([], 0);
      const service = new ApplicationReviewService(supabase);

      const result = await service.list({ limit: 200 });

      expect(result.meta.limit).toBe(100);
    });
  });

  describe("getById", () => {
    it("returns full application detail by ID", async () => {
      const supabase = createMockSupabaseForDetail(MOCK_DETAIL_ROW);
      const service = new ApplicationReviewService(supabase);

      const result = await service.getById("app-1");

      expect(result.id).toBe("app-1");
      expect(result.institution_name).toBe("Morehouse School of Medicine");
      expect(result.accreditation_body).toBe("LCME");
      expect(result.student_count).toBe(450);
    });

    it("throws ApplicationNotFoundError when ID not found", async () => {
      const supabase = createMockSupabaseForDetail(null, {
        message: "Row not found",
      });
      const service = new ApplicationReviewService(supabase);

      await expect(service.getById("nonexistent")).rejects.toThrow(
        ApplicationNotFoundError,
      );
    });
  });
});
