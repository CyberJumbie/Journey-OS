/**
 * CourseOversightService tests.
 * [STORY-IA-8] Pagination, filtering, sorting, institution scoping.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CourseOversightService } from "../course-oversight.service";
import { CourseOverviewValidationError } from "../../../errors";

const MOCK_COURSE_ROW = {
  id: "course-aaaa-bbbb-cccc-000000000001",
  code: "ANAT-101",
  name: "Gross Anatomy",
  course_director_id: "director-1",
  academic_year: "2025-2026",
  status: "active",
  updated_at: "2026-02-15T10:30:00Z",
  program_id: "prog-1",
  director_name: "Dr. Sarah Chen",
  slo_count: 24,
  fulfills_coverage_pct: 87.5,
  upload_count: 12,
  processing_count: 0,
  program_name: "MD Program",
};

const MOCK_COURSE_ROW_2 = {
  id: "course-aaaa-bbbb-cccc-000000000002",
  code: "PHYS-201",
  name: "Medical Physiology",
  course_director_id: "director-2",
  academic_year: "2025-2026",
  status: "active",
  updated_at: "2026-02-10T14:00:00Z",
  program_id: "prog-1",
  director_name: "Dr. James Okoro",
  slo_count: 18,
  fulfills_coverage_pct: 55.0,
  upload_count: 6,
  processing_count: 2,
  program_name: "MD Program",
};

function createMockSupabase(data: unknown[] = [], total = 0): SupabaseClient {
  // Data chain: select() -> eq() -> order() -> range()
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data, error: null }),
  };

  // Count chain: select() -> eq() -> (thenable)
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

function createErrorSupabase(): SupabaseClient {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    }),
  };

  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn(),
  };
  Object.defineProperty(countChain, "then", {
    value: (resolve: (v: unknown) => void) =>
      resolve({ count: 0, error: null }),
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

describe("CourseOversightService", () => {
  let service: CourseOversightService;
  let mockSupabase: SupabaseClient;
  const INSTITUTION_ID = "inst-uuid-1";

  beforeEach(() => {
    mockSupabase = createMockSupabase([MOCK_COURSE_ROW, MOCK_COURSE_ROW_2], 2);
    service = new CourseOversightService(mockSupabase);
  });

  describe("getOverview", () => {
    it("returns paginated course overview items for institution", async () => {
      const result = await service.getOverview({}, INSTITUTION_ID);

      expect(result.courses).toHaveLength(2);
      expect(result.courses[0]!.id).toBe(MOCK_COURSE_ROW.id);
      expect(result.courses[0]!.code).toBe("ANAT-101");
      expect(result.courses[0]!.name).toBe("Gross Anatomy");
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
      expect(result.meta.total).toBe(2);
      expect(result.meta.total_pages).toBe(1);
    });

    it("applies program_id filter when provided", async () => {
      await service.getOverview({ program_id: "prog-1" }, INSTITUTION_ID);

      // Both data and count queries should have eq called with program_id
      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.eq).toHaveBeenCalledWith("program_id", "prog-1");
    });

    it("applies academic_year filter when provided", async () => {
      await service.getOverview({ academic_year: "2025-2026" }, INSTITUTION_ID);

      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.eq).toHaveBeenCalledWith("academic_year", "2025-2026");
    });

    it("applies status filter when provided", async () => {
      await service.getOverview({ status: "active" }, INSTITUTION_ID);

      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.eq).toHaveBeenCalledWith("status", "active");
    });

    it("sorts by name ascending by default", async () => {
      await service.getOverview({}, INSTITUTION_ID);

      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.order).toHaveBeenCalledWith("name", {
        ascending: true,
      });
    });

    it("sorts by fulfills_coverage_pct descending when requested", async () => {
      await service.getOverview(
        { sort_by: "fulfills_coverage_pct", sort_dir: "desc" },
        INSTITUTION_ID,
      );

      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.order).toHaveBeenCalledWith("fulfills_coverage_pct", {
        ascending: false,
      });
    });

    it("sorts by updated_at when requested", async () => {
      await service.getOverview(
        { sort_by: "updated_at", sort_dir: "asc" },
        INSTITUTION_ID,
      );

      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.order).toHaveBeenCalledWith("updated_at", {
        ascending: true,
      });
    });

    it("calculates correct total_pages for pagination", async () => {
      // 25 total items with limit 20 = 2 pages
      mockSupabase = createMockSupabase([MOCK_COURSE_ROW], 25);
      service = new CourseOversightService(mockSupabase);

      const result = await service.getOverview({ limit: 20 }, INSTITUTION_ID);
      expect(result.meta.total_pages).toBe(2);
    });

    it("returns empty courses array when no courses match filters", async () => {
      mockSupabase = createMockSupabase([], 0);
      service = new CourseOversightService(mockSupabase);

      const result = await service.getOverview(
        { status: "archived" },
        INSTITUTION_ID,
      );

      expect(result.courses).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(result.meta.total_pages).toBe(1);
    });

    it("scopes query to the authenticated user's institution_id", async () => {
      await service.getOverview({}, INSTITUTION_ID);

      const fromCalls = (mockSupabase.from as ReturnType<typeof vi.fn>).mock
        .results;
      const dataChain = fromCalls[0]!.value;
      expect(dataChain.eq).toHaveBeenCalledWith(
        "institution_id",
        INSTITUTION_ID,
      );
    });

    it("throws CourseOverviewValidationError for invalid sort_by", async () => {
      await expect(
        service.getOverview({ sort_by: "invalid" as "name" }, INSTITUTION_ID),
      ).rejects.toThrow(CourseOverviewValidationError);
    });

    it("throws CourseOverviewValidationError when Supabase returns an error", async () => {
      const errorSupabase = createErrorSupabase();
      const errorService = new CourseOversightService(errorSupabase);

      await expect(
        errorService.getOverview({}, INSTITUTION_ID),
      ).rejects.toThrow(CourseOverviewValidationError);
    });

    it("clamps page to minimum 1", async () => {
      const result = await service.getOverview({ page: -5 }, INSTITUTION_ID);
      expect(result.meta.page).toBe(1);
    });

    it("clamps limit to max 100", async () => {
      const result = await service.getOverview({ limit: 500 }, INSTITUTION_ID);
      expect(result.meta.limit).toBe(100);
    });
  });
});
