import { describe, it, expect } from "vitest";
import { AuthRole, AuthTokenPayload } from "@journey-os/types";
import { RbacService, PERMISSION_MATRIX } from "../rbac.service";

const INSTITUTION_A_ID = "inst-aaaa-bbbb-cccc-000000000001";
const INSTITUTION_B_ID = "inst-aaaa-bbbb-cccc-000000000002";

const SUPERADMIN_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000001",
  email: "admin@journey-os.com",
  role: AuthRole.SUPERADMIN,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

const INST_ADMIN_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000002",
  email: "dean@msm.edu",
  role: AuthRole.INSTITUTIONAL_ADMIN,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

const FACULTY_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000003",
  email: "dr.osei@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

const COURSE_DIRECTOR_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000004",
  email: "dr.williams@msm.edu",
  role: AuthRole.FACULTY,
  institution_id: INSTITUTION_A_ID,
  is_course_director: true,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

const STUDENT_USER: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000006",
  email: "student.kim@msm.edu",
  role: AuthRole.STUDENT,
  institution_id: INSTITUTION_A_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

describe("RbacService", () => {
  const service = new RbacService();

  describe("checkRole", () => {
    it("allows superadmin on any route regardless of required roles", () => {
      const result = service.checkRole(AuthRole.SUPERADMIN, [
        AuthRole.INSTITUTIONAL_ADMIN,
      ]);
      expect(result.allowed).toBe(true);
    });

    it("allows institutional_admin when role is in allowed list", () => {
      const result = service.checkRole(AuthRole.INSTITUTIONAL_ADMIN, [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
      ]);
      expect(result.allowed).toBe(true);
    });

    it("denies student when role is not in allowed list", () => {
      const result = service.checkRole(AuthRole.STUDENT, [
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
      ]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("student");
      expect(result.reason).toContain("superadmin");
    });

    it("denies faculty when only superadmin is required", () => {
      const result = service.checkRole(AuthRole.FACULTY, [AuthRole.SUPERADMIN]);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("faculty");
    });
  });

  describe("checkInstitutionScope", () => {
    it("allows when user institution_id matches resource institution_id", () => {
      const result = service.checkInstitutionScope(
        INST_ADMIN_USER,
        INSTITUTION_A_ID,
      );
      expect(result.allowed).toBe(true);
    });

    it("denies when user institution_id differs from resource institution_id", () => {
      const result = service.checkInstitutionScope(
        INST_ADMIN_USER,
        INSTITUTION_B_ID,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("outside your institution");
    });

    it("allows superadmin regardless of institution mismatch", () => {
      const result = service.checkInstitutionScope(
        SUPERADMIN_USER,
        INSTITUTION_B_ID,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("checkCourseDirector", () => {
    it("allows faculty with is_course_director=true", () => {
      const result = service.checkCourseDirector(COURSE_DIRECTOR_USER);
      expect(result.allowed).toBe(true);
    });

    it("denies faculty with is_course_director=false", () => {
      const result = service.checkCourseDirector(FACULTY_USER);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("course director");
    });

    it("allows superadmin without is_course_director flag", () => {
      const result = service.checkCourseDirector(SUPERADMIN_USER);
      expect(result.allowed).toBe(true);
    });

    it("allows institutional_admin without is_course_director flag", () => {
      const result = service.checkCourseDirector(INST_ADMIN_USER);
      expect(result.allowed).toBe(true);
    });

    it("denies student even with is_course_director=true (defensive)", () => {
      const studentWithFlag: AuthTokenPayload = {
        ...STUDENT_USER,
        is_course_director: true,
      };
      const result = service.checkCourseDirector(studentWithFlag);
      expect(result.allowed).toBe(false);
    });
  });

  describe("getPermission", () => {
    it("returns permission entry for a valid resource+action pair", () => {
      const permission = service.getPermission("waitlist", "list");
      expect(permission).toBeDefined();
      expect(permission!.roles).toContain(AuthRole.SUPERADMIN);
    });

    it("returns undefined for an unknown resource+action pair", () => {
      const permission = service.getPermission("waitlist", "delete");
      expect(permission).toBeUndefined();
    });
  });

  describe("PERMISSION_MATRIX", () => {
    it("is exported for testing and external use", () => {
      expect(PERMISSION_MATRIX).toBeDefined();
      expect(PERMISSION_MATRIX.waitlist).toBeDefined();
    });
  });
});
