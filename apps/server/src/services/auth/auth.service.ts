import { SupabaseClient } from "@supabase/supabase-js";
import { AuthTokenPayload, AuthRole, isValidRole } from "@journey-os/types";
import { AuthenticationError } from "../../errors/auth.errors";

/**
 * Handles JWT extraction and verification against Supabase Auth.
 * [CODE_STANDARDS SS 3.1] — JS #private fields, public getters, constructor DI.
 */
export class AuthService {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  /**
   * Extracts a Bearer token from the Authorization header.
   * @throws AuthenticationError if header is missing or malformed.
   */
  extractBearerToken(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new AuthenticationError("Missing Authorization header");
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError(
        "Authorization header must use Bearer scheme",
      );
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new AuthenticationError("Bearer token is empty");
    }

    return token;
  }

  /**
   * Verifies a JWT against Supabase Auth and extracts the payload.
   * Role is read from app_metadata (not user_metadata) to prevent self-modification.
   * @throws AuthenticationError if token is invalid or expired.
   */
  async verifyToken(token: string): Promise<AuthTokenPayload> {
    const {
      data: { user },
      error,
    } = await this.#supabaseClient.auth.getUser(token);

    if (error) {
      throw new AuthenticationError(
        `Token verification failed: ${error.message}`,
      );
    }

    if (!user) {
      throw new AuthenticationError("Token verification returned no user");
    }

    const appMetadata = user.app_metadata ?? {};
    const role = appMetadata.role as string | undefined;

    if (!role || !isValidRole(role)) {
      throw new AuthenticationError("User has no valid role in app_metadata");
    }

    const institutionId = appMetadata.institution_id as string | undefined;

    if (!institutionId && role !== AuthRole.SUPERADMIN) {
      throw new AuthenticationError(
        "User has no institution_id in app_metadata",
      );
    }

    const payload: AuthTokenPayload = {
      sub: user.id,
      email: user.email ?? "",
      role: role as AuthRole,
      institution_id: institutionId ?? "",
      is_course_director: Boolean(appMetadata.is_course_director),
      email_confirmed_at: user.email_confirmed_at ?? null,
      aud: "authenticated",
      exp: Math.floor(new Date(user.updated_at ?? Date.now()).getTime() / 1000),
      iat: Math.floor(new Date(user.created_at).getTime() / 1000),
    };

    return payload;
  }
}
