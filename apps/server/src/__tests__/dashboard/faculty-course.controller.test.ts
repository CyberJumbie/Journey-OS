import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { FacultyCourseController } from "../../controllers/dashboard/faculty-course.controller";
import { FacultyCourseService } from "../../services/dashboard/faculty-course.service";
import type { FacultyCourseListResponse } from "@journey-os/types";

// ─── Fixtures ──────────────────────────────────────────────────────────

const FACULTY_USER = {
  sub: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  email: "faculty@msm.edu",
  role: "faculty",
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
};

const COURSE_DIRECTOR_USER = {
  ...FACULTY_USER,
  sub: "cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa",
  is_course_director: true,
};

const STUDENT_USER = {
  sub: "ssssssss-tttt-uuuu-vvvv-wwwwwwwwwwww",
  email: "student@msm.edu",
  role: "student",
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
};

const SUPERADMIN_USER = {
  sub: "11111111-2222-3333-4444-555555555555",
  email: "admin@journey.ai",
  role: "superadmin",
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
};

const INST_ADMIN_USER = {
  sub: "66666666-7777-8888-9999-aaaaaaaaaaaa",
  email: "ia@msm.edu",
  role: "institutional_admin",
  institution_id: "inst-0001-0001-0001-000000000001",
  is_course_director: false,
};

const MOCK_COURSES: FacultyCourseListResponse = {
  courses: [
    {
      id: "course-uuid-1",
      name: "Medical Sciences I",
      code: "MS-101",
      term: "Fall 2026",
      status: "active",
      question_count: 142,
      coverage_percent: 67.5,
      last_activity_at: "2026-02-18T16:30:00Z",
      program_id: "prog-uuid-1",
      program_name: "Doctor of Medicine",
    },
    {
      id: "course-uuid-2",
      name: "Pharmacology Fundamentals",
      code: "PHARM-201",
      term: "Spring 2026",
      status: "draft",
      question_count: 0,
      coverage_percent: 0,
      last_activity_at: null,
      program_id: "prog-uuid-1",
      program_name: "Doctor of Medicine",
    },
  ],
};

const EMPTY_COURSES: FacultyCourseListResponse = { courses: [] };

// ─── Mock helpers ──────────────────────────────────────────────────────

function createMockService(): FacultyCourseService {
  return {
    listForFaculty: vi.fn().mockResolvedValue(MOCK_COURSES),
  } as unknown as FacultyCourseService;
}

function createMockReqRes(overrides?: {
  query?: Record<string, unknown>;
  user?: Record<string, unknown> | null;
}): { req: Request; res: Response } {
  const reqObj: Record<string, unknown> = {
    query: overrides?.query ?? { faculty_id: FACULTY_USER.sub },
  };
  if (overrides?.user !== null) {
    reqObj.user = overrides?.user ?? FACULTY_USER;
  }
  const req = reqObj as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

function getResponseBody(res: Response): { statusCode: number; body: unknown } {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.calls[0]!;
  const jsonFn = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!.value
    .json;
  const body = jsonFn.mock.calls[0]?.[0];
  return { statusCode: statusCall[0] as number, body };
}

// ─── Controller Tests ─────────────────────────────────────────────────

describe("FacultyCourseController", () => {
  let svc: FacultyCourseService;
  let controller: FacultyCourseController;

  beforeEach(() => {
    svc = createMockService();
    controller = new FacultyCourseController(svc);
  });

  describe("handleList", () => {
    it("returns courses assigned to faculty (200)", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      const data = (body as { data: FacultyCourseListResponse }).data;
      expect(data.courses).toHaveLength(2);
      expect((body as { error: unknown }).error).toBeNull();
    });

    it("returns all program courses for course director (200)", async () => {
      const { req, res } = createMockReqRes({
        query: { faculty_id: COURSE_DIRECTOR_USER.sub },
        user: COURSE_DIRECTOR_USER,
      });

      await controller.handleList(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
      expect(svc.listForFaculty).toHaveBeenCalledWith(
        COURSE_DIRECTOR_USER.sub,
        true,
      );
    });

    it("returns course card fields (id, name, code, term, status, question_count, coverage_percent)", async () => {
      const { req, res } = createMockReqRes();

      await controller.handleList(req, res);

      const { body } = getResponseBody(res);
      const course = (body as { data: FacultyCourseListResponse }).data
        .courses[0]!;
      expect(course).toHaveProperty("id");
      expect(course).toHaveProperty("name");
      expect(course).toHaveProperty("code");
      expect(course).toHaveProperty("term");
      expect(course).toHaveProperty("status");
      expect(course).toHaveProperty("question_count");
      expect(course).toHaveProperty("coverage_percent");
    });

    it("returns empty courses array when faculty has no assignments (200)", async () => {
      (svc.listForFaculty as ReturnType<typeof vi.fn>).mockResolvedValue(
        EMPTY_COURSES,
      );
      const { req, res } = createMockReqRes();

      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(200);
      const data = (body as { data: FacultyCourseListResponse }).data;
      expect(data.courses).toHaveLength(0);
    });

    it("rejects unauthenticated request (401)", async () => {
      const { req, res } = createMockReqRes({ user: null });

      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(401);
      expect((body as { error: { code: string } }).error.code).toBe(
        "UNAUTHORIZED",
      );
    });

    it("rejects student role requesting another faculty's courses (403 FORBIDDEN)", async () => {
      const { req, res } = createMockReqRes({
        query: { faculty_id: FACULTY_USER.sub },
        user: STUDENT_USER,
      });

      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(403);
      expect((body as { error: { code: string } }).error.code).toBe(
        "FORBIDDEN",
      );
    });

    it("rejects missing faculty_id query param (400 VALIDATION_ERROR)", async () => {
      const { req, res } = createMockReqRes({ query: {} });

      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(400);
      expect((body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_ERROR",
      );
    });

    it("rejects faculty requesting another faculty member's courses (403 FORBIDDEN)", async () => {
      const otherFacultyId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
      const { req, res } = createMockReqRes({
        query: { faculty_id: otherFacultyId },
      });

      await controller.handleList(req, res);

      const { statusCode, body } = getResponseBody(res);
      expect(statusCode).toBe(403);
      expect((body as { error: { code: string } }).error.code).toBe(
        "FORBIDDEN",
      );
    });

    it("allows superadmin to request any faculty member's courses (200)", async () => {
      const { req, res } = createMockReqRes({
        query: { faculty_id: FACULTY_USER.sub },
        user: SUPERADMIN_USER,
      });

      await controller.handleList(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
    });

    it("allows institutional_admin to request faculty in their institution (200)", async () => {
      const { req, res } = createMockReqRes({
        query: { faculty_id: FACULTY_USER.sub },
        user: INST_ADMIN_USER,
      });

      await controller.handleList(req, res);

      const { statusCode } = getResponseBody(res);
      expect(statusCode).toBe(200);
    });
  });
});

// ─── Service Tests ────────────────────────────────────────────────────

describe("FacultyCourseService", () => {
  const { createMockSupabase } = vi.hoisted(() => {
    function createMockSupabase(
      rpcData: unknown[] = [],
      rpcError: unknown = null,
    ) {
      return {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: rpcError }),
      };
    }
    return { createMockSupabase };
  });

  describe("listForFaculty", () => {
    it("calls get_faculty_courses RPC for regular faculty", async () => {
      const mockSupabase = createMockSupabase([
        {
          id: "c1",
          name: "Test Course",
          code: "TC-101",
          term: "Fall 2026",
          status: "active",
          question_count: 10,
          coverage_percent: 0,
          last_activity_at: null,
          program_id: "p1",
          program_name: "Test Program",
        },
      ]);
      const service = new FacultyCourseService(mockSupabase as never);

      const result = await service.listForFaculty("faculty-1", false);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_faculty_courses", {
        p_faculty_id: "faculty-1",
      });
      expect(result.courses).toHaveLength(1);
      expect(result.courses[0]!.name).toBe("Test Course");
    });

    it("calls get_director_courses RPC for course director", async () => {
      const mockSupabase = createMockSupabase([]);
      const service = new FacultyCourseService(mockSupabase as never);

      await service.listForFaculty("director-1", true);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_director_courses", {
        p_director_id: "director-1",
      });
    });
  });
});
