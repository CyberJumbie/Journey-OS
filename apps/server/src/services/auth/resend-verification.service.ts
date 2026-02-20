import { SupabaseClient } from "@supabase/supabase-js";
import type { ResendVerificationResult } from "@journey-os/types";

/**
 * Handles resending verification emails with in-memory rate limiting.
 * [STORY-U-14] Rate limit: 3 requests per 10 minutes per user ID.
 * Production upgrade: move rate state to Redis.
 */
export class ResendVerificationService {
  readonly #supabaseClient: SupabaseClient;
  readonly #rateLimitMap: Map<string, { count: number; resetAt: number }>;
  readonly #maxRequests: number;
  readonly #windowMs: number;

  constructor(
    supabaseClient: SupabaseClient,
    maxRequests = 3,
    windowMs = 10 * 60 * 1000,
  ) {
    this.#supabaseClient = supabaseClient;
    this.#rateLimitMap = new Map();
    this.#maxRequests = maxRequests;
    this.#windowMs = windowMs;
  }

  /**
   * Resends a verification email for the given user.
   * @returns result with sent status and message
   * @throws Error if already verified or rate limited
   */
  async resend(
    userId: string,
    email: string,
    emailConfirmedAt: string | null | undefined,
  ): Promise<ResendVerificationResult> {
    if (emailConfirmedAt) {
      return {
        email,
        sent: false,
        message: "Email is already verified.",
      };
    }

    this.#checkRateLimit(userId);

    const { error } = await this.#supabaseClient.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      throw new Error(`Failed to resend verification email: ${error.message}`);
    }

    return {
      email,
      sent: true,
      message: "Verification email sent. Please check your inbox.",
    };
  }

  /**
   * Checks and increments the rate limit counter for a user.
   * @throws Error with code RATE_LIMIT_EXCEEDED if limit is hit
   */
  #checkRateLimit(userId: string): void {
    const now = Date.now();
    const entry = this.#rateLimitMap.get(userId);

    if (!entry || now > entry.resetAt) {
      this.#rateLimitMap.set(userId, {
        count: 1,
        resetAt: now + this.#windowMs,
      });
      return;
    }

    if (entry.count >= this.#maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      const err = new Error(
        `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`,
      );
      (err as Error & { code: string }).code = "RATE_LIMIT_EXCEEDED";
      throw err;
    }

    entry.count++;
  }
}
