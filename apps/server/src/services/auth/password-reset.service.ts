import { SupabaseClient } from "@supabase/supabase-js";
import type { ForgotPasswordResponse } from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class PasswordResetService {
  readonly #supabaseClient: SupabaseClient;
  readonly #siteUrl: string;

  constructor(supabaseClient: SupabaseClient, siteUrl: string) {
    this.#supabaseClient = supabaseClient;
    this.#siteUrl = siteUrl;
  }

  /**
   * Request a password reset email. Always returns success to prevent enumeration.
   * @throws ValidationError if email format is invalid.
   */
  async requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      throw new ValidationError("Invalid email format");
    }

    const { error } = await this.#supabaseClient.auth.resetPasswordForEmail(
      trimmedEmail,
      {
        redirectTo: `${this.#siteUrl}/auth/callback?next=/reset-password`,
      },
    );

    // Log error for monitoring but do NOT expose to client (prevents enumeration)
    if (error) {
      console.error("[PasswordResetService] Supabase error:", error.message);
    }

    // Always return success
    return {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };
  }
}
