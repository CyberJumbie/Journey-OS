import { describe, it, expect, vi, beforeEach } from "vitest";
import { InstitutionMonitoringService } from "../institution-monitoring.service";
import { ValidationError } from "../../../errors/validation.error";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(
  rpcResult: { rows: unknown[]; total: number } = { rows: [], total: 0 },
  rpcError: { message: string } | null = null,
): SupabaseClient {
  return {
    rpc: vi.fn().mockResolvedValue({
      data: rpcResult,
      error: rpcError,
    }),
  } as unknown as SupabaseClient;
}

describe("InstitutionMonitoringService", () => {
  describe("list", () => {
    it("returns institutions with correct meta using defaults", async () => {
      const mockRows = [
        {
          id: "inst-1",
          name: "Test Medical School",
          status: "approved",
          user_count: 42,
          course_count: 5,
          last_activity: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      const supabase = createMockSupabase({ rows: mockRows, total: 1 });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.list({});

      expect(result.institutions).toHaveLength(1);
      expect(result.institutions[0]!.name).toBe("Test Medical School");
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        total_pages: 1,
      });
      expect(supabase.rpc).toHaveBeenCalledWith(
        "list_institutions_with_counts",
        expect.objectContaining({
          p_status: null,
          p_search: null,
          p_sort_by: "created_at",
          p_sort_dir: "desc",
          p_limit: 20,
          p_offset: 0,
        }),
      );
    });

    it("maps approved status to active", async () => {
      const mockRows = [
        {
          id: "inst-1",
          name: "Active School",
          status: "approved",
          user_count: 10,
          course_count: 2,
          last_activity: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      const supabase = createMockSupabase({ rows: mockRows, total: 1 });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.list({});

      expect(result.institutions[0]!.status).toBe("active");
    });

    it("maps waitlisted status to pending", async () => {
      const mockRows = [
        {
          id: "inst-2",
          name: "Pending School",
          status: "waitlisted",
          user_count: 0,
          course_count: 0,
          last_activity: null,
          created_at: "2026-01-01T00:00:00Z",
        },
      ];
      const supabase = createMockSupabase({ rows: mockRows, total: 1 });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.list({});

      expect(result.institutions[0]!.status).toBe("pending");
    });

    it("passes status filter mapped to DB value", async () => {
      const supabase = createMockSupabase({ rows: [], total: 0 });
      const service = new InstitutionMonitoringService(supabase);

      await service.list({ status: "active" });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "list_institutions_with_counts",
        expect.objectContaining({ p_status: "approved" }),
      );
    });

    it("passes search parameter", async () => {
      const supabase = createMockSupabase({ rows: [], total: 0 });
      const service = new InstitutionMonitoringService(supabase);

      await service.list({ search: "Morehouse" });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "list_institutions_with_counts",
        expect.objectContaining({ p_search: "Morehouse" }),
      );
    });

    it("throws ValidationError for invalid sort field", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionMonitoringService(supabase);

      await expect(
        service.list({ sort_by: "bogus" as "name" }),
      ).rejects.toThrow(ValidationError);
    });

    it("caps limit at 100", async () => {
      const supabase = createMockSupabase({ rows: [], total: 0 });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.list({ limit: 200 });

      expect(result.meta.limit).toBe(100);
      expect(supabase.rpc).toHaveBeenCalledWith(
        "list_institutions_with_counts",
        expect.objectContaining({ p_limit: 100 }),
      );
    });

    it("returns empty result for archived status filter", async () => {
      const supabase = createMockSupabase();
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.list({ status: "archived" });

      expect(result.institutions).toHaveLength(0);
      expect(result.meta.total).toBe(0);
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("calculates pagination offset correctly", async () => {
      const supabase = createMockSupabase({ rows: [], total: 50 });
      const service = new InstitutionMonitoringService(supabase);

      const result = await service.list({ page: 3, limit: 10 });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "list_institutions_with_counts",
        expect.objectContaining({ p_offset: 20, p_limit: 10 }),
      );
      expect(result.meta.total_pages).toBe(5);
    });
  });
});
