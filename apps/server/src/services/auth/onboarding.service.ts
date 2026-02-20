import { SupabaseClient } from "@supabase/supabase-js";
import type {
  OnboardingStatus,
  OnboardingCompleteResult,
} from "@journey-os/types";

/**
 * Handles onboarding status checks and completion.
 * [STORY-U-13] Protected service — user must be authenticated.
 * Constructor DI with supabaseClient.
 */
export class OnboardingService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  /**
   * Returns the onboarding status for a user.
   */
  async getStatus(userId: string): Promise<OnboardingStatus> {
    const { data: profile, error } = await this.#supabaseClient
      .from("profiles")
      .select("onboarding_complete, role")
      .eq("id", userId)
      .single();

    if (error || !profile) {
      throw new Error(
        `Failed to fetch onboarding status: ${error?.message ?? "Profile not found"}`,
      );
    }

    return {
      onboarding_complete: profile.onboarding_complete as boolean,
      role: profile.role as string,
    };
  }

  /**
   * Marks onboarding as complete for a user.
   * Idempotent — calling twice does not error.
   */
  async markComplete(userId: string): Promise<OnboardingCompleteResult> {
    const now = new Date().toISOString();

    const { error } = await this.#supabaseClient
      .from("profiles")
      .update({
        onboarding_complete: true,
        updated_at: now,
      })
      .eq("id", userId);

    if (error) {
      throw new Error(`Failed to mark onboarding complete: ${error.message}`);
    }

    return {
      user_id: userId,
      onboarding_complete: true,
      completed_at: now,
    };
  }
}
