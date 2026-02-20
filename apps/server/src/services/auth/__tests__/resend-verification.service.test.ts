import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResendVerificationService } from "../resend-verification.service";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabaseClient(overrides?: {
  resendResult?:
    | { data: unknown; error: null }
    | { data: null; error: { message: string } };
}): SupabaseClient {
  const resendFn = vi
    .fn()
    .mockResolvedValue(overrides?.resendResult ?? { data: {}, error: null });

  return {
    auth: { resend: resendFn },
  } as unknown as SupabaseClient;
}

describe("ResendVerificationService", () => {
  let service: ResendVerificationService;
  let mockClient: SupabaseClient;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    // Short window for testing: 3 requests per 1 second
    service = new ResendVerificationService(mockClient, 3, 1000);
  });

  it("calls supabase.auth.resend for unverified user", async () => {
    const result = await service.resend("user-001", "test@msm.edu", null);

    expect(result.sent).toBe(true);
    expect(result.email).toBe("test@msm.edu");
    expect(result.message).toContain("Verification email sent");
    expect(
      (mockClient.auth as unknown as { resend: ReturnType<typeof vi.fn> })
        .resend,
    ).toHaveBeenCalledWith({ type: "signup", email: "test@msm.edu" });
  });

  it("returns ALREADY_VERIFIED for verified user (not an error)", async () => {
    const result = await service.resend(
      "user-001",
      "test@msm.edu",
      "2026-02-19T10:00:00Z",
    );

    expect(result.sent).toBe(false);
    expect(result.message).toContain("already verified");
  });

  it("rate limits to max requests per window", async () => {
    await service.resend("user-001", "test@msm.edu", null);
    await service.resend("user-001", "test@msm.edu", null);
    await service.resend("user-001", "test@msm.edu", null);

    await expect(
      service.resend("user-001", "test@msm.edu", null),
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("throws error with RATE_LIMIT_EXCEEDED code", async () => {
    await service.resend("user-001", "test@msm.edu", null);
    await service.resend("user-001", "test@msm.edu", null);
    await service.resend("user-001", "test@msm.edu", null);

    try {
      await service.resend("user-001", "test@msm.edu", null);
      expect.fail("Should have thrown");
    } catch (error: unknown) {
      expect((error as Error & { code: string }).code).toBe(
        "RATE_LIMIT_EXCEEDED",
      );
    }
  });

  it("resets rate limit counter after window expires", async () => {
    // Use a very short window (50ms) for this test
    const shortWindowService = new ResendVerificationService(mockClient, 1, 50);

    await shortWindowService.resend("user-001", "test@msm.edu", null);

    // Should be rate limited
    await expect(
      shortWindowService.resend("user-001", "test@msm.edu", null),
    ).rejects.toThrow("Rate limit exceeded");

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Should succeed after reset
    const result = await shortWindowService.resend(
      "user-001",
      "test@msm.edu",
      null,
    );
    expect(result.sent).toBe(true);
  });

  it("tracks rate limits per user independently", async () => {
    await service.resend("user-001", "a@msm.edu", null);
    await service.resend("user-001", "a@msm.edu", null);
    await service.resend("user-001", "a@msm.edu", null);

    // user-001 is rate limited
    await expect(service.resend("user-001", "a@msm.edu", null)).rejects.toThrow(
      "Rate limit exceeded",
    );

    // user-002 should still be allowed
    const result = await service.resend("user-002", "b@msm.edu", null);
    expect(result.sent).toBe(true);
  });

  it("throws when supabase.auth.resend fails", async () => {
    const client = createMockSupabaseClient({
      resendResult: { data: null, error: { message: "SMTP error" } },
    });
    const svc = new ResendVerificationService(client, 3, 1000);

    await expect(svc.resend("user-001", "test@msm.edu", null)).rejects.toThrow(
      "Failed to resend verification email",
    );
  });
});
