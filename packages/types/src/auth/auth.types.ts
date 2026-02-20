import { AuthRole } from "./roles.types";

/**
 * JWT token payload extracted from Supabase Auth JWT.
 * Role is in app_metadata, NOT user_metadata (prevents self-modification).
 * [ARCHITECTURE v10 SS 4.2]
 */
export interface AuthTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: AuthRole;
  readonly institution_id: string;
  readonly is_course_director: boolean;
  readonly email_confirmed_at?: string | null;
  readonly aud: string;
  readonly exp: number;
  readonly iat: number;
}

/**
 * Authenticated user object available after JWT verification.
 * Maps to POST /api/v1/auth/me response shape.
 * [API_CONTRACT v1 SS Auth & Users]
 */
export interface AuthUser {
  readonly id: string;
  readonly email: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly institution_id: string;
  readonly institution_name: string;
  readonly display_name: string;
  readonly onboarding_complete: boolean;
}

/**
 * Session object wrapping Supabase session data.
 */
export interface AuthSession {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_at: number;
  readonly expires_in: number;
  readonly token_type: "bearer";
  readonly user: AuthUser;
}

/**
 * User profile stored in user_profiles table.
 * PK references auth.users(id).
 * [SUPABASE_DDL v1 SS Auth & Institutional Tables]
 */
export interface UserProfile {
  readonly id: string;
  readonly institution_id: string;
  readonly role: AuthRole;
  readonly is_course_director: boolean;
  readonly display_name: string | null;
  readonly title: string | null;
  readonly department: string | null;
  readonly avatar_url: string | null;
  readonly onboarding_complete: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * Auth-related request DTOs.
 */
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly display_name: string;
  readonly institution_domain: string;
}

export interface RefreshTokenRequest {
  readonly refresh_token: string;
}

export interface ResetPasswordRequest {
  readonly email: string;
}

export interface UpdatePasswordRequest {
  readonly password: string;
}

/**
 * Standard API response envelope.
 * [API_CONTRACT v1 SS Conventions]
 */
export interface ApiResponse<T> {
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly meta?: PaginationMeta;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
}

export interface PaginationMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly total_pages: number;
}

/**
 * Auth response (login/register/refresh).
 */
export interface AuthResponse {
  readonly session: AuthSession;
  readonly user: AuthUser;
}
