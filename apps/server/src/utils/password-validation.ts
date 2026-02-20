/**
 * Server-side password validation.
 * [STORY-U-9] Ported from apps/web/src/lib/auth/password-validation.ts.
 * Must stay in sync with frontend rules.
 */

export interface PasswordChecks {
  readonly minLength: boolean;
  readonly hasUppercase: boolean;
  readonly hasLowercase: boolean;
  readonly hasNumber: boolean;
  readonly hasSpecial: boolean;
}

export interface ServerPasswordValidationResult {
  readonly isValid: boolean;
  readonly checks: PasswordChecks;
}

export function validatePassword(
  password: string,
): ServerPasswordValidationResult {
  const checks: PasswordChecks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const isValid = Object.values(checks).every(Boolean);

  return { isValid, checks };
}
