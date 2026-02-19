import { describe, it, expect } from "vitest";
import { AuthRole, ROLE_HIERARCHY, isValidRole } from "../index";

describe("AuthRole", () => {
  it("should have exactly 5 roles", () => {
    const values = Object.values(AuthRole);
    expect(values).toHaveLength(5);
  });

  it("should include superadmin, institutional_admin, faculty, advisor, student", () => {
    expect(AuthRole.SUPERADMIN).toBe("superadmin");
    expect(AuthRole.INSTITUTIONAL_ADMIN).toBe("institutional_admin");
    expect(AuthRole.FACULTY).toBe("faculty");
    expect(AuthRole.ADVISOR).toBe("advisor");
    expect(AuthRole.STUDENT).toBe("student");
  });

  it("should use lowercase string values matching DB CHECK constraint", () => {
    const dbValues = [
      "superadmin",
      "institutional_admin",
      "faculty",
      "advisor",
      "student",
    ];
    const enumValues = Object.values(AuthRole);
    expect(enumValues.sort()).toEqual(dbValues.sort());
  });
});

describe("isValidRole", () => {
  it("should return true for all valid role strings", () => {
    for (const role of Object.values(AuthRole)) {
      expect(isValidRole(role)).toBe(true);
    }
  });

  it("should return false for invalid role strings", () => {
    expect(isValidRole("not_a_real_role")).toBe(false);
    expect(isValidRole("admin")).toBe(false);
    expect(isValidRole("SUPERADMIN")).toBe(false);
  });

  it("should return false for empty string", () => {
    expect(isValidRole("")).toBe(false);
  });
});

describe("ROLE_HIERARCHY", () => {
  it("should assign superadmin the highest level (100)", () => {
    expect(ROLE_HIERARCHY[AuthRole.SUPERADMIN]).toBe(100);
  });

  it("should assign student the lowest level (20)", () => {
    expect(ROLE_HIERARCHY[AuthRole.STUDENT]).toBe(20);
  });

  it("should have strictly decreasing levels: superadmin > ia > faculty > advisor > student", () => {
    expect(ROLE_HIERARCHY[AuthRole.SUPERADMIN]).toBeGreaterThan(
      ROLE_HIERARCHY[AuthRole.INSTITUTIONAL_ADMIN],
    );
    expect(ROLE_HIERARCHY[AuthRole.INSTITUTIONAL_ADMIN]).toBeGreaterThan(
      ROLE_HIERARCHY[AuthRole.FACULTY],
    );
    expect(ROLE_HIERARCHY[AuthRole.FACULTY]).toBeGreaterThan(
      ROLE_HIERARCHY[AuthRole.ADVISOR],
    );
    expect(ROLE_HIERARCHY[AuthRole.ADVISOR]).toBeGreaterThan(
      ROLE_HIERARCHY[AuthRole.STUDENT],
    );
  });

  it("should have an entry for every AuthRole enum value", () => {
    for (const role of Object.values(AuthRole)) {
      expect(ROLE_HIERARCHY[role]).toBeDefined();
      expect(typeof ROLE_HIERARCHY[role]).toBe("number");
    }
  });
});
