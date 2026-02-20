import { describe, it, expect } from "vitest";
import { AuthRole } from "@journey-os/types";
import {
  DASHBOARD_ROUTES,
  getDashboardPath,
  isPublicRoute,
  isAuthRoute,
  getPathRole,
  isRoleAllowedOnPath,
  isDashboardRoute,
} from "@web/lib/auth/dashboard-routes";

describe("DASHBOARD_ROUTES", () => {
  it("maps all five roles to paths", () => {
    expect(Object.keys(DASHBOARD_ROUTES)).toHaveLength(5);
  });

  it("maps superadmin to /admin", () => {
    expect(DASHBOARD_ROUTES[AuthRole.SUPERADMIN]).toBe("/admin");
  });

  it("maps institutional_admin to /institution", () => {
    expect(DASHBOARD_ROUTES[AuthRole.INSTITUTIONAL_ADMIN]).toBe("/institution");
  });

  it("maps faculty to /faculty", () => {
    expect(DASHBOARD_ROUTES[AuthRole.FACULTY]).toBe("/faculty");
  });

  it("maps advisor to /advisor", () => {
    expect(DASHBOARD_ROUTES[AuthRole.ADVISOR]).toBe("/advisor");
  });

  it("maps student to /student", () => {
    expect(DASHBOARD_ROUTES[AuthRole.STUDENT]).toBe("/student");
  });
});

describe("getDashboardPath", () => {
  it("returns correct path for valid role", () => {
    expect(getDashboardPath("superadmin")).toBe("/admin");
    expect(getDashboardPath("student")).toBe("/student");
  });

  it("returns null for unknown role", () => {
    expect(getDashboardPath("unknown")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getDashboardPath("")).toBeNull();
  });
});

describe("isPublicRoute", () => {
  it("returns true for /login", () => {
    expect(isPublicRoute("/login")).toBe(true);
  });

  it("returns true for /register", () => {
    expect(isPublicRoute("/register")).toBe(true);
  });

  it("returns true for /forgot-password", () => {
    expect(isPublicRoute("/forgot-password")).toBe(true);
  });

  it("returns true for /reset-password", () => {
    expect(isPublicRoute("/reset-password")).toBe(true);
  });

  it("returns true for /unauthorized", () => {
    expect(isPublicRoute("/unauthorized")).toBe(true);
  });

  it("returns true for /apply", () => {
    expect(isPublicRoute("/apply")).toBe(true);
  });

  it("returns false for /admin", () => {
    expect(isPublicRoute("/admin")).toBe(false);
  });

  it("returns false for /student", () => {
    expect(isPublicRoute("/student")).toBe(false);
  });

  it("matches sub-paths", () => {
    expect(isPublicRoute("/login/callback")).toBe(true);
  });
});

describe("isAuthRoute", () => {
  it("returns true for /login", () => {
    expect(isAuthRoute("/login")).toBe(true);
  });

  it("returns true for /register", () => {
    expect(isAuthRoute("/register")).toBe(true);
  });

  it("returns true for /forgot-password", () => {
    expect(isAuthRoute("/forgot-password")).toBe(true);
  });

  it("returns false for /reset-password (not an auth redirect route)", () => {
    expect(isAuthRoute("/reset-password")).toBe(false);
  });

  it("returns false for /admin", () => {
    expect(isAuthRoute("/admin")).toBe(false);
  });
});

describe("getPathRole", () => {
  it("returns SUPERADMIN for /admin", () => {
    expect(getPathRole("/admin")).toBe(AuthRole.SUPERADMIN);
  });

  it("returns SUPERADMIN for /admin/users", () => {
    expect(getPathRole("/admin/users")).toBe(AuthRole.SUPERADMIN);
  });

  it("returns INSTITUTIONAL_ADMIN for /institution", () => {
    expect(getPathRole("/institution")).toBe(AuthRole.INSTITUTIONAL_ADMIN);
  });

  it("returns FACULTY for /faculty/courses", () => {
    expect(getPathRole("/faculty/courses")).toBe(AuthRole.FACULTY);
  });

  it("returns STUDENT for /student", () => {
    expect(getPathRole("/student")).toBe(AuthRole.STUDENT);
  });

  it("returns ADVISOR for /advisor", () => {
    expect(getPathRole("/advisor")).toBe(AuthRole.ADVISOR);
  });

  it("returns null for /login", () => {
    expect(getPathRole("/login")).toBeNull();
  });

  it("returns null for /", () => {
    expect(getPathRole("/")).toBeNull();
  });
});

describe("isRoleAllowedOnPath", () => {
  it("allows superadmin on any dashboard path", () => {
    expect(isRoleAllowedOnPath(AuthRole.SUPERADMIN, "/admin")).toBe(true);
    expect(isRoleAllowedOnPath(AuthRole.SUPERADMIN, "/student")).toBe(true);
    expect(isRoleAllowedOnPath(AuthRole.SUPERADMIN, "/faculty")).toBe(true);
    expect(isRoleAllowedOnPath(AuthRole.SUPERADMIN, "/institution")).toBe(true);
  });

  it("allows faculty on /faculty", () => {
    expect(isRoleAllowedOnPath(AuthRole.FACULTY, "/faculty")).toBe(true);
    expect(isRoleAllowedOnPath(AuthRole.FACULTY, "/faculty/courses")).toBe(
      true,
    );
  });

  it("denies faculty on /admin", () => {
    expect(isRoleAllowedOnPath(AuthRole.FACULTY, "/admin")).toBe(false);
  });

  it("denies student on /institution", () => {
    expect(isRoleAllowedOnPath(AuthRole.STUDENT, "/institution")).toBe(false);
  });

  it("allows any role on non-dashboard paths", () => {
    expect(isRoleAllowedOnPath(AuthRole.STUDENT, "/settings")).toBe(true);
  });
});

describe("isDashboardRoute", () => {
  it("returns true for dashboard paths", () => {
    expect(isDashboardRoute("/admin")).toBe(true);
    expect(isDashboardRoute("/student")).toBe(true);
    expect(isDashboardRoute("/faculty/courses")).toBe(true);
  });

  it("returns false for non-dashboard paths", () => {
    expect(isDashboardRoute("/login")).toBe(false);
    expect(isDashboardRoute("/")).toBe(false);
    expect(isDashboardRoute("/settings")).toBe(false);
  });
});
