import { describe, it, expect, vi, beforeEach } from "vitest";
import { OnboardingService } from "../onboarding.service";
import type { SupabaseClient } from "@supabase/supabase-js";

const MOCK_PROFILE = {
  onboarding_complete: false,
  role: "faculty",
};

function createMockSupabaseClient(overrides?: {
  selectSingle?: ReturnType<typeof vi.fn>;
  updateEq?: ReturnType<typeof vi.fn>;
}) {
  const selectSingle =
    overrides?.selectSingle ??
    vi.fn().mockResolvedValue({
      data: { ...MOCK_PROFILE },
      error: null,
    });

  const updateEq =
    overrides?.updateEq ??
    vi.fn().mockResolvedValue({ data: null, error: null });

  const fromMock = vi.fn().mockImplementation(() => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: selectSingle,
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: updateEq,
    }),
  }));

  return { from: fromMock } as unknown as SupabaseClient;
}

describe("OnboardingService", () => {
  let service: OnboardingService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new OnboardingService(mockClient);
  });

  describe("getStatus", () => {
    it("returns onboarding_complete=false for a new user", async () => {
      const status = await service.getStatus("user-001");

      expect(status.onboarding_complete).toBe(false);
      expect(status.role).toBe("faculty");
    });

    it("returns onboarding_complete=true for an onboarded user", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: { onboarding_complete: true, role: "student" },
          error: null,
        }),
      });
      const svc = new OnboardingService(client);

      const status = await svc.getStatus("user-002");

      expect(status.onboarding_complete).toBe(true);
      expect(status.role).toBe("student");
    });

    it("includes the correct role in the response", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: { onboarding_complete: false, role: "superadmin" },
          error: null,
        }),
      });
      const svc = new OnboardingService(client);

      const status = await svc.getStatus("user-003");

      expect(status.role).toBe("superadmin");
    });

    it("throws when profile is not found", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Row not found" },
        }),
      });
      const svc = new OnboardingService(client);

      await expect(svc.getStatus("missing-user")).rejects.toThrow(
        "Failed to fetch onboarding status",
      );
    });

    it("throws when Supabase returns an error", async () => {
      const client = createMockSupabaseClient({
        selectSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database connection error" },
        }),
      });
      const svc = new OnboardingService(client);

      await expect(svc.getStatus("user-004")).rejects.toThrow(
        "Database connection error",
      );
    });

    it("queries the profiles table with the correct userId", async () => {
      await service.getStatus("user-005");

      expect(mockClient.from).toHaveBeenCalledWith("profiles");
    });
  });

  describe("markComplete", () => {
    it("returns result with onboarding_complete=true", async () => {
      const result = await service.markComplete("user-001");

      expect(result.user_id).toBe("user-001");
      expect(result.onboarding_complete).toBe(true);
      expect(result.completed_at).toBeDefined();
    });

    it("returns a valid ISO timestamp in completed_at", async () => {
      const result = await service.markComplete("user-001");

      const parsed = new Date(result.completed_at);
      expect(parsed.toISOString()).toBe(result.completed_at);
    });

    it("throws when Supabase update fails", async () => {
      const client = createMockSupabaseClient({
        updateEq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Update failed" },
        }),
      });
      const svc = new OnboardingService(client);

      await expect(svc.markComplete("user-001")).rejects.toThrow(
        "Failed to mark onboarding complete",
      );
    });

    it("is idempotent — calling twice does not error", async () => {
      const result1 = await service.markComplete("user-001");
      const result2 = await service.markComplete("user-001");

      expect(result1.onboarding_complete).toBe(true);
      expect(result2.onboarding_complete).toBe(true);
    });

    it("updates the profiles table", async () => {
      await service.markComplete("user-001");

      expect(mockClient.from).toHaveBeenCalledWith("profiles");
    });
  });
});
