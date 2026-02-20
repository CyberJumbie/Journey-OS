import { describe, it, expect, vi, beforeEach } from "vitest";
import { PasswordResetService } from "../password-reset.service";
import { ValidationError } from "../../../errors/validation.error";
import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabaseClient(overrides?: {
  resetPasswordForEmail?: ReturnType<typeof vi.fn>;
}) {
  return {
    auth: {
      resetPasswordForEmail:
        overrides?.resetPasswordForEmail ??
        vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  } as unknown as SupabaseClient;
}

const SITE_URL = "https://journey.test";

describe("PasswordResetService", () => {
  let service: PasswordResetService;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockClient = createMockSupabaseClient();
    service = new PasswordResetService(mockClient, SITE_URL);
  });

  describe("requestPasswordReset", () => {
    it("calls supabase.auth.resetPasswordForEmail with the provided email", async () => {
      await service.requestPasswordReset("student.kim@msm.edu");

      expect(
        (
          mockClient as unknown as {
            auth: { resetPasswordForEmail: ReturnType<typeof vi.fn> };
          }
        ).auth.resetPasswordForEmail,
      ).toHaveBeenCalledWith("student.kim@msm.edu", {
        redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
      });
    });

    it("passes redirectTo option pointing to the reset-password page", async () => {
      await service.requestPasswordReset("test@example.edu");

      expect(
        (
          mockClient as unknown as {
            auth: { resetPasswordForEmail: ReturnType<typeof vi.fn> };
          }
        ).auth.resetPasswordForEmail,
      ).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
        }),
      );
    });

    it("returns success result even when email does not exist in system", async () => {
      const result = await service.requestPasswordReset(
        "unknown@nonexistent.edu",
      );

      expect(result.message).toBe(
        "If an account with that email exists, a password reset link has been sent.",
      );
    });

    it("returns success even when Supabase client returns an error", async () => {
      const errorClient = createMockSupabaseClient({
        resetPasswordForEmail: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Supabase error", status: 500 },
        }),
      });
      const errorService = new PasswordResetService(errorClient, SITE_URL);

      const result =
        await errorService.requestPasswordReset("test@example.edu");

      expect(result.message).toBe(
        "If an account with that email exists, a password reset link has been sent.",
      );
    });

    it("trims and lowercases the email before calling Supabase", async () => {
      await service.requestPasswordReset("  Test@EXAMPLE.edu  ");

      expect(
        (
          mockClient as unknown as {
            auth: { resetPasswordForEmail: ReturnType<typeof vi.fn> };
          }
        ).auth.resetPasswordForEmail,
      ).toHaveBeenCalledWith("test@example.edu", expect.any(Object));
    });

    it("throws ValidationError for empty email string", async () => {
      await expect(service.requestPasswordReset("")).rejects.toThrow(
        ValidationError,
      );
    });

    it("throws ValidationError for malformed email string", async () => {
      await expect(
        service.requestPasswordReset("not-an-email"),
      ).rejects.toThrow(ValidationError);
    });
  });
});
