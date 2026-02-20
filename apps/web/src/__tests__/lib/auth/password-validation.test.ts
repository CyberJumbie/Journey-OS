import { describe, it, expect } from "vitest";
import { validatePassword } from "@web/lib/auth/password-validation";

describe("validatePassword", () => {
  describe("individual checks", () => {
    it("fails minLength for short passwords", () => {
      const result = validatePassword("Ab1!");
      expect(result.checks.minLength).toBe(false);
    });

    it("passes minLength for 8+ characters", () => {
      const result = validatePassword("abcdefgh");
      expect(result.checks.minLength).toBe(true);
    });

    it("detects uppercase letters", () => {
      expect(validatePassword("abc").checks.hasUppercase).toBe(false);
      expect(validatePassword("Abc").checks.hasUppercase).toBe(true);
    });

    it("detects lowercase letters", () => {
      expect(validatePassword("ABC").checks.hasLowercase).toBe(false);
      expect(validatePassword("ABc").checks.hasLowercase).toBe(true);
    });

    it("detects numbers", () => {
      expect(validatePassword("abc").checks.hasNumber).toBe(false);
      expect(validatePassword("abc1").checks.hasNumber).toBe(true);
    });

    it("detects special characters", () => {
      expect(validatePassword("abc123").checks.hasSpecial).toBe(false);
      expect(validatePassword("abc!").checks.hasSpecial).toBe(true);
      expect(validatePassword("abc@").checks.hasSpecial).toBe(true);
      expect(validatePassword("abc#").checks.hasSpecial).toBe(true);
      expect(validatePassword("abc$").checks.hasSpecial).toBe(true);
      expect(validatePassword("abc%").checks.hasSpecial).toBe(true);
      expect(validatePassword("abc ").checks.hasSpecial).toBe(true);
    });
  });

  describe("strength levels", () => {
    it("returns weak for 0-2 checks passed", () => {
      expect(validatePassword("").strength).toBe("weak");
      expect(validatePassword("a").strength).toBe("weak");
      expect(validatePassword("ab").strength).toBe("weak");
    });

    it("returns fair for 3 checks passed", () => {
      // lowercase + uppercase + number = 3
      expect(validatePassword("Abc1").strength).toBe("fair");
    });

    it("returns good for 4 checks passed", () => {
      // lowercase + uppercase + number + special = 4 (but short)
      expect(validatePassword("Ab1!").strength).toBe("good");
    });

    it("returns strong for all 5 checks passed", () => {
      expect(validatePassword("Abcdef1!").strength).toBe("strong");
    });
  });

  describe("isValid", () => {
    it("returns false when not all checks pass", () => {
      expect(validatePassword("abcdefgh").isValid).toBe(false);
      expect(validatePassword("Abcdefgh").isValid).toBe(false);
      expect(validatePassword("Abcdefg1").isValid).toBe(false);
    });

    it("returns true when all checks pass", () => {
      expect(validatePassword("Abcdef1!").isValid).toBe(true);
    });

    it("returns true for complex passwords", () => {
      expect(validatePassword("MyP@ssw0rd!123").isValid).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = validatePassword("");
      expect(result.isValid).toBe(false);
      expect(result.strength).toBe("weak");
      expect(result.checks.minLength).toBe(false);
      expect(result.checks.hasUppercase).toBe(false);
      expect(result.checks.hasLowercase).toBe(false);
      expect(result.checks.hasNumber).toBe(false);
      expect(result.checks.hasSpecial).toBe(false);
    });

    it("handles unicode special characters", () => {
      const result = validatePassword("Abcdef1\u00e9");
      // é is not A-Za-z0-9, so counts as special
      expect(result.checks.hasSpecial).toBe(true);
    });

    it("handles exactly 8 characters meeting all requirements", () => {
      const result = validatePassword("Abcde1!x");
      expect(result.isValid).toBe(true);
      expect(result.strength).toBe("strong");
    });
  });
});
