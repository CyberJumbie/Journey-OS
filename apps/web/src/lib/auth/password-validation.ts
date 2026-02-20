import type {
  PasswordStrength,
  PasswordValidationResult,
} from "@journey-os/types";

/**
 * Validates a password against all requirements and returns
 * the validation result with individual check statuses and overall strength.
 *
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  const passedCount = Object.values(checks).filter(Boolean).length;

  const strength: PasswordStrength =
    passedCount <= 2
      ? "weak"
      : passedCount === 3
        ? "fair"
        : passedCount === 4
          ? "good"
          : "strong";

  const isValid = passedCount === 5;

  return { isValid, strength, checks };
}
