/**
 * Request body for POST /api/v1/auth/forgot-password.
 * Only requires email — Supabase handles token generation and email delivery.
 */
export interface ForgotPasswordRequest {
  readonly email: string;
}

/**
 * Response shape for forgot-password endpoint.
 * Always returns success to prevent email enumeration.
 */
export interface ForgotPasswordResponse {
  readonly message: string;
}

/**
 * Rate limiter configuration.
 */
export interface RateLimitConfig {
  /** Max requests per window per key */
  readonly maxRequests: number;
  /** Window duration in milliseconds */
  readonly windowMs: number;
}

/**
 * Password strength levels for the visual indicator.
 */
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * Result of validating a password against all requirements.
 */
export interface PasswordValidationResult {
  readonly isValid: boolean;
  readonly strength: PasswordStrength;
  readonly checks: {
    readonly minLength: boolean;
    readonly hasUppercase: boolean;
    readonly hasLowercase: boolean;
    readonly hasNumber: boolean;
    readonly hasSpecial: boolean;
  };
}
