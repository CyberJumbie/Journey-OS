import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { CourseController } from "../course.controller";
import type { CourseService } from "../../../services/course/course.service";
import {
  CourseNotFoundError,
  DuplicateCourseCodeError,
  InvalidCourseTypeError,
} from "../../../errors";

const MOCK_COURSE_DTO = {
  id: "course-uuid-1",
  code: "MED-101",
  name: "Introduction to Anatomy",
  description: "Fundamental anatomy course",
  department: "Basic Sciences",
  course_director_id: "faculty-uuid-1",
  academic_year: "2026-2027",
  semester: "Fall",
  credit_hours: 4,
  course_type: "lecture",
  neo4j_id: null,
  status: "draft",
  created_at: "2026-02-20T10:00:00Z",
  updated_at: "2026-02-20T10:00:00Z",
};

function createMockService(): CourseService {
  return {
    create: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    findById: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    findByCode: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    list: vi.fn().mockResolvedValue({
      courses: [MOCK_COURSE_DTO],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    update: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    archive: vi.fn().mockResolvedValue(undefined),
  } as unknown as CourseService;
}

function createMockReqRes(overrides: {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): { req: Request; res: Response } {
  const req = {
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

describe("CourseController", () => {
  let svc: CourseService;
  let controller: CourseController;

  beforeEach(() => {
    svc = createMockService();
    controller = new CourseController(svc);
  });

  describe("handleCreate", () => {
    it("returns 201 with course data on success", async () => {
      const { req, res } = createMockReqRes({
        body: { code: "MED-101", name: "Introduction to Anatomy" },
      });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const jsonCall = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!
        .value.json.mock.calls[0]![0] as {
        data: unknown;
        error: unknown;
      };
      expect(jsonCall.data).toEqual(MOCK_COURSE_DTO);
      expect(jsonCall.error).toBeNull();
    });

    it("returns 400 when required fields are missing", async () => {
      const { req, res } = createMockReqRes({ body: { code: "MED-101" } });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 409 on duplicate course code", async () => {
      (svc.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new DuplicateCourseCodeError("MED-101"),
      );

      const { req, res } = createMockReqRes({
        body: { code: "MED-101", name: "Test" },
      });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe("handleGetById", () => {
    it("returns 200 with course data", async () => {
      const { req, res } = createMockReqRes({
        params: { id: "course-uuid-1" },
      });

      await controller.handleGetById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("returns 404 when course not found", async () => {
      (svc.findById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new CourseNotFoundError("nonexistent"),
      );

      const { req, res } = createMockReqRes({
        params: { id: "nonexistent" },
      });

      await controller.handleGetById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe("handleList", () => {
    it("returns 200 with paginated course list", async () => {
      const { req, res } = createMockReqRes({
        query: { status: "active", page: "1", limit: "10" },
      });

      await controller.handleList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.list).toHaveBeenCalled();
    });
  });

  describe("handleUpdate", () => {
    it("returns 400 for invalid course type", async () => {
      (svc.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new InvalidCourseTypeError("workshop"),
      );

      const { req, res } = createMockReqRes({
        params: { id: "course-uuid-1" },
        body: { course_type: "workshop" },
      });

      await controller.handleUpdate(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("handleArchive", () => {
    it("returns 200 on successful archive", async () => {
      const { req, res } = createMockReqRes({
        params: { id: "course-uuid-1" },
      });

      await controller.handleArchive(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(svc.archive).toHaveBeenCalledWith("course-uuid-1");
    });
  });
});
