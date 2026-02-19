import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { AuthRole, AuthTokenPayload } from "@journey-os/types";
import { RbacMiddleware, createRbacMiddleware } from "../rbac.middleware";
import { RbacService } from "../../services/auth/rbac.service";

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

const INST_ADMIN_OTHER_INSTITUTION: AuthTokenPayload = {
  sub: "user-0000-0000-0000-000000000007",
  email: "dean@howard.edu",
  role: AuthRole.INSTITUTIONAL_ADMIN,
  institution_id: INSTITUTION_B_ID,
  is_course_director: false,
  aud: "authenticated",
  exp: 1999999999,
  iat: 1739996400,
};

function mockRequest(
  user?: AuthTokenPayload,
  params?: Record<string, string>,
): Partial<Request> {
  return {
    user,
    params: (params ?? {}) as Request["params"],
    method: "GET",
    headers: {},
  };
}

function mockResponse(): Partial<Response> & {
  statusCode: number;
  body: unknown;
} {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}

function mockNext(): NextFunction & { called: boolean } {
  const fn = (() => {
    fn.called = true;
  }) as NextFunction & { called: boolean };
  fn.called = false;
  return fn;
}

describe("RbacMiddleware", () => {
  let rbacService: RbacService;
  let rbac: RbacMiddleware;

  beforeEach(() => {
    rbacService = new RbacService();
    rbac = new RbacMiddleware(rbacService);
  });

  describe("require()", () => {
    it("calls next() when user role is in allowed list", () => {
      const req = mockRequest(INST_ADMIN_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
      );
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("returns 403 when user role is not in allowed list", () => {
      const req = mockRequest(STUDENT_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(AuthRole.SUPERADMIN);
      middleware(req as Request, res as Response, next);

      expect(res.statusCode).toBe(403);
      expect(next.called).toBe(false);
    });

    it("returns 401 when req.user is undefined (unauthenticated)", () => {
      const req = mockRequest(undefined);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(AuthRole.SUPERADMIN);
      middleware(req as Request, res as Response, next);

      expect(res.statusCode).toBe(401);
      expect((res.body as { error: { code: string } }).error.code).toBe(
        "UNAUTHORIZED",
      );
      expect(next.called).toBe(false);
    });

    it("superadmin always passes regardless of required roles", () => {
      const req = mockRequest(SUPERADMIN_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(AuthRole.INSTITUTIONAL_ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("multi-role route allows any listed role", () => {
      const req = mockRequest(FACULTY_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(
        AuthRole.INSTITUTIONAL_ADMIN,
        AuthRole.FACULTY,
      );
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("error response body matches ApiResponse<null> shape with FORBIDDEN code", () => {
      const req = mockRequest(STUDENT_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(AuthRole.SUPERADMIN);
      middleware(req as Request, res as Response, next);

      const body = res.body as {
        data: null;
        error: { code: string; message: string };
      };
      expect(body.data).toBeNull();
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toBeDefined();
    });

    it("error message includes user role and required roles for debugging", () => {
      const req = mockRequest(STUDENT_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.require(
        AuthRole.SUPERADMIN,
        AuthRole.INSTITUTIONAL_ADMIN,
      );
      middleware(req as Request, res as Response, next);

      const body = res.body as { error: { message: string } };
      expect(body.error.message).toContain("student");
      expect(body.error.message).toContain("superadmin");
      expect(body.error.message).toContain("institutional_admin");
    });
  });

  describe("requireScoped()", () => {
    it("calls next() when role matches AND institution_id matches params", () => {
      const req = mockRequest(INST_ADMIN_USER, {
        institutionId: INSTITUTION_A_ID,
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("returns 403 with INSTITUTION_SCOPE_VIOLATION when institution_id mismatches", () => {
      const req = mockRequest(INST_ADMIN_OTHER_INSTITUTION, {
        institutionId: INSTITUTION_A_ID,
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN);
      middleware(req as Request, res as Response, next);

      expect(res.statusCode).toBe(403);
      const body = res.body as { error: { code: string } };
      expect(body.error.code).toBe("INSTITUTION_SCOPE_VIOLATION");
    });

    it("superadmin bypasses institution scope check", () => {
      const req = mockRequest(SUPERADMIN_USER, {
        institutionId: INSTITUTION_B_ID,
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("returns 401 when req.user is undefined", () => {
      const req = mockRequest(undefined, { institutionId: INSTITUTION_A_ID });
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireScoped(AuthRole.INSTITUTIONAL_ADMIN);
      middleware(req as Request, res as Response, next);

      expect(res.statusCode).toBe(401);
      expect(next.called).toBe(false);
    });
  });

  describe("requireCourseDirector()", () => {
    it("allows faculty with is_course_director=true", () => {
      const req = mockRequest(COURSE_DIRECTOR_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireCourseDirector();
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("denies faculty with is_course_director=false", () => {
      const req = mockRequest(FACULTY_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireCourseDirector();
      middleware(req as Request, res as Response, next);

      expect(res.statusCode).toBe(403);
      expect(next.called).toBe(false);
    });

    it("allows superadmin without course director flag", () => {
      const req = mockRequest(SUPERADMIN_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireCourseDirector();
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("allows institutional_admin without course director flag", () => {
      const req = mockRequest(INST_ADMIN_USER);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireCourseDirector();
      middleware(req as Request, res as Response, next);

      expect(next.called).toBe(true);
    });

    it("denies student even with is_course_director=true (impossible but defensive)", () => {
      const studentWithFlag: AuthTokenPayload = {
        ...STUDENT_USER,
        is_course_director: true,
      };
      const req = mockRequest(studentWithFlag);
      const res = mockResponse();
      const next = mockNext();

      const middleware = rbac.requireCourseDirector();
      middleware(req as Request, res as Response, next);

      expect(res.statusCode).toBe(403);
      expect(next.called).toBe(false);
    });
  });
});

describe("createRbacMiddleware", () => {
  it("returns an RbacMiddleware instance", () => {
    const rbac = createRbacMiddleware();
    expect(rbac).toBeInstanceOf(RbacMiddleware);
  });
});
