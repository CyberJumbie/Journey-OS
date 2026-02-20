import { SupabaseClient } from "@supabase/supabase-js";
import type {
  RegistrationRequest,
  RegistrationResponse,
} from "@journey-os/types";
import { ValidationError } from "../../errors/validation.error";
import {
  DuplicateEmailError,
  InvalidRegistrationError,
  InstitutionNotFoundError,
} from "../../errors/registration.error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

/** Roles users can self-select during registration */
const SELF_REGISTERABLE_ROLES = new Set(["faculty", "student", "advisor"]);

export class RegistrationService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async register(
    data: RegistrationRequest,
    ipAddress: string,
  ): Promise<RegistrationResponse> {
    this.#validateRole(data.role);
    this.#validateEmail(data.email);
    this.#validatePassword(data.password);
    this.#validateDisplayName(data.display_name);
    this.#validateConsent(data.consented);

    await this.#validateInstitution(data.institution_id);

    const { data: signUpData, error: signUpError } =
      await this.#supabaseClient.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: {
          data: {
            role: data.role,
            institution_id: data.institution_id,
            is_course_director: false,
          },
        },
      });

    if (signUpError) {
      throw new InvalidRegistrationError(signUpError.message);
    }

    // Supabase returns a fake user (with empty identities) for existing emails
    // to prevent email enumeration
    if (
      signUpData.user &&
      signUpData.user.identities &&
      signUpData.user.identities.length === 0
    ) {
      throw new DuplicateEmailError();
    }

    if (!signUpData.user) {
      throw new InvalidRegistrationError("Failed to create user account");
    }

    const userId = signUpData.user.id;

    // Upsert profile row
    const { error: profileError } = await this.#supabaseClient
      .from("profiles")
      .upsert({
        id: userId,
        email: data.email.trim().toLowerCase(),
        full_name: data.display_name.trim(),
        role: data.role,
        institution_id: data.institution_id,
        is_course_director: false,
        onboarding_complete: false,
        ferpa_consent_at: new Date().toISOString(),
        ferpa_consent_version: data.consent_version,
        ferpa_consent_ip: ipAddress,
      });

    if (profileError) {
      console.error(
        "[RegistrationService] Profile upsert error:",
        profileError.message,
      );
      throw new InvalidRegistrationError("Failed to create user profile");
    }

    return {
      user_id: userId,
      email: signUpData.user.email ?? data.email.trim().toLowerCase(),
      requires_verification: true,
    };
  }

  #validateRole(role: string): void {
    if (!SELF_REGISTERABLE_ROLES.has(role)) {
      throw new InvalidRegistrationError(
        `Role "${role}" is not available for self-registration`,
      );
    }
  }

  #validateEmail(email: string): void {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      throw new ValidationError("Invalid email format");
    }
  }

  #validatePassword(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      );
    }
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError(
        "Password must contain at least one uppercase letter",
      );
    }
    if (!/\d/.test(password)) {
      throw new ValidationError("Password must contain at least one number");
    }
  }

  #validateDisplayName(displayName: string): void {
    if (!displayName || !displayName.trim()) {
      throw new ValidationError("Display name is required");
    }
  }

  #validateConsent(consented: boolean): void {
    if (!consented) {
      throw new InvalidRegistrationError("FERPA consent is required");
    }
  }

  async #validateInstitution(institutionId: string): Promise<void> {
    const { data: institution, error } = await this.#supabaseClient
      .from("institutions")
      .select("id, status")
      .eq("id", institutionId)
      .single();

    if (error || !institution) {
      throw new InstitutionNotFoundError();
    }

    if (institution.status !== "approved") {
      throw new InstitutionNotFoundError(
        "Institution is not approved for registration",
      );
    }
  }
}
