import { SupabaseClient } from "@supabase/supabase-js";
import type {
  InvitationTokenPayload,
  InvitationAcceptRequest,
  InvitationAcceptResult,
} from "@journey-os/types";
import {
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyUsedError,
} from "../../errors/invitation.error";
import { ValidationError } from "../../errors/validation.error";
import { DuplicateEmailError } from "../../errors/registration.error";
import { validatePassword } from "../../utils/password-validation";

/**
 * Handles invitation token validation and acceptance.
 * [STORY-U-9] Public service — user does not have an account yet.
 * Constructor DI with supabaseClient.
 */
export class InvitationAcceptanceService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  /**
   * Validates an invitation token and returns payload for display.
   * Checks: exists, not expired, not already used.
   */
  async validateToken(token: string): Promise<InvitationTokenPayload> {
    const { data: invitation, error } = await this.#supabaseClient
      .from("invitations")
      .select("*, institutions(name)")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      throw new InvitationNotFoundError();
    }

    if (invitation.accepted_at) {
      throw new InvitationAlreadyUsedError();
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new InvitationExpiredError();
    }

    const institutionName =
      (invitation.institutions as { name: string } | null)?.name ?? "Unknown";

    return {
      invitation_id: invitation.id as string,
      email: invitation.email as string,
      role: invitation.role as string,
      institution_id: invitation.institution_id as string,
      institution_name: institutionName,
      expires_at: invitation.expires_at as string,
      is_valid: true,
    };
  }

  /**
   * Accepts an invitation: validates token, creates auth user + profile, marks consumed.
   * The handle_new_user trigger auto-creates a profile, so we update it after user creation.
   */
  async acceptInvitation(
    request: InvitationAcceptRequest,
  ): Promise<InvitationAcceptResult> {
    // 1. Validate password
    const passwordResult = validatePassword(request.password);
    if (!passwordResult.isValid) {
      throw new ValidationError(
        "Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character",
      );
    }

    // 2. Re-validate token (could have expired or been used since validation)
    const payload = await this.validateToken(request.token);

    // 3. Create Supabase auth user with pre-confirmed email and role
    const { data: authData, error: authError } =
      await this.#supabaseClient.auth.admin.createUser({
        email: payload.email,
        password: request.password,
        email_confirm: true,
        app_metadata: {
          role: payload.role,
          institution_id: payload.institution_id,
        },
        user_metadata: {
          full_name: request.full_name,
          role: payload.role,
        },
      });

    if (authError) {
      if (
        authError.message.includes("already been registered") ||
        authError.message.includes("already exists")
      ) {
        throw new DuplicateEmailError();
      }
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const userId = authData.user.id;

    // 4. Update profile created by handle_new_user trigger
    //    Set institution_id and role (trigger sets role from user_metadata)
    const { error: profileError } = await this.#supabaseClient
      .from("profiles")
      .update({
        institution_id: payload.institution_id,
        role: payload.role,
        full_name: request.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      // Best-effort: auth user exists, profile update failed
      console.error(
        `[invitation-acceptance] Profile update failed for ${userId}:`,
        profileError.message,
      );
    }

    // 5. Mark invitation as consumed with optimistic lock
    const now = new Date().toISOString();
    const { error: consumeError } = await this.#supabaseClient
      .from("invitations")
      .update({ accepted_at: now })
      .eq("token", request.token)
      .is("accepted_at", null);

    if (consumeError) {
      console.error(
        `[invitation-acceptance] Failed to mark invitation consumed:`,
        consumeError.message,
      );
    }

    return {
      user_id: userId,
      email: payload.email,
      role: payload.role,
      institution_id: payload.institution_id,
      institution_name: payload.institution_name,
      accepted_at: now,
    };
  }
}
