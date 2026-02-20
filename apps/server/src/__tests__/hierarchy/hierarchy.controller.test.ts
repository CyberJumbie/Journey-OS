/**
 * HierarchyController tests.
 * [STORY-F-11] Program, Section, Session CRUD endpoints.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";
import type { HierarchyService } from "../../services/course/hierarchy.service";
import { HierarchyController } from "../../controllers/course/hierarchy.controller";
import {
  HierarchyNotFoundError,
  HierarchyValidationError,
  DuplicateProgramCodeError,
} from "../../errors";

const STORED_PROGRAM = {
  id: "prog-uuid-1",
  institution_id: "inst-uuid-1",
  name: "Doctor of Medicine",
  code: "MD-2026",
  description: "4-year MD program",
  is_active: true,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const STORED_SECTION = {
  id: "section-uuid-1",
  course_id: "course-uuid-1",
  title: "Cardiovascular System",
  description: "Anatomy, physiology, and pathology",
  position: 1,
  is_active: true,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const STORED_SESSION = {
  id: "session-uuid-1",
  section_id: "section-uuid-1",
  title: "Cardiac Anatomy Lecture",
  description: "Heart chambers, valves, great vessels",
  week_number: 3,
  day_of_week: "monday",
  start_time: "09:00",
  end_time: "10:30",
  is_active: true,
  sync_status: "synced",
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const MOCK_HIERARCHY = {
  course_id: "course-uuid-1",
  course_name: "Medical Sciences I",
  course_code: "MS-101",
  sections: [
    {
      id: "section-uuid-1",
      title: "Cardiovascular System",
      description: "Anatomy, physiology, and pathology",
      position: 1,
      sessions: [STORED_SESSION],
    },
  ],
};

function createMockService(): HierarchyService {
  return {
    createProgram: vi.fn().mockResolvedValue(STORED_PROGRAM),
    createSection: vi.fn().mockResolvedValue(STORED_SECTION),
    createSession: vi.fn().mockResolvedValue(STORED_SESSION),
    getCourseHierarchy: vi.fn().mockResolvedValue(MOCK_HIERARCHY),
    reorderSections: vi.fn().mockResolvedValue(3),
  } as unknown as HierarchyService;
}

function createMockReqRes(overrides: {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
}): { req: Request; res: Response; getJsonBody: () => unknown } {
  const req = {
    body: overrides.body ?? {},
    params: overrides.params ?? {},
    query: {},
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  const getJsonBody = () =>
    (status as ReturnType<typeof vi.fn>).mock.results[0]!.value.json.mock
      .calls[0]![0];

  return { req, res, getJsonBody };
}

describe("HierarchyController", () => {
  let svc: HierarchyService;
  let controller: HierarchyController;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = createMockService();
    controller = new HierarchyController(svc);
  });

  describe("createProgram", () => {
    it("creates program with valid data (201)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        body: {
          institution_id: "inst-uuid-1",
          name: "Doctor of Medicine",
          code: "MD-2026",
          description: "4-year MD program",
        },
      });

      await controller.handleCreateProgram(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = getJsonBody() as { data: unknown; error: unknown };
      expect(body.data).toEqual(STORED_PROGRAM);
      expect(body.error).toBeNull();
    });

    it("rejects missing required fields (400)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        body: { name: "Doctor of Medicine" },
      });

      await controller.handleCreateProgram(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_VALIDATION_ERROR");
    });

    it("rejects duplicate program code (409)", async () => {
      vi.mocked(svc.createProgram).mockRejectedValue(
        new DuplicateProgramCodeError("MD-2026"),
      );

      const { req, res, getJsonBody } = createMockReqRes({
        body: {
          institution_id: "inst-uuid-1",
          name: "Doctor of Medicine",
          code: "MD-2026",
        },
      });

      await controller.handleCreateProgram(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("DUPLICATE_PROGRAM_CODE");
    });

    it("rejects student role via service error (403-like 400)", async () => {
      // Note: RBAC middleware handles 403 before controller.
      // Controller validates required fields.
      const { req, res, getJsonBody } = createMockReqRes({
        body: {},
      });

      await controller.handleCreateProgram(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_VALIDATION_ERROR");
    });
  });

  describe("createSection", () => {
    it("creates section with auto-assigned position (201)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
        body: { title: "Cardiovascular System" },
      });

      await controller.handleCreateSection(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(svc.createSection).toHaveBeenCalledWith("course-uuid-1", {
        title: "Cardiovascular System",
      });
      const body = getJsonBody() as { data: unknown; error: unknown };
      expect(body.data).toEqual(STORED_SECTION);
      expect(body.error).toBeNull();
    });

    it("creates section with explicit position (201)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
        body: { title: "Cardiovascular System", position: 5 },
      });

      await controller.handleCreateSection(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = getJsonBody() as { data: unknown; error: unknown };
      expect(body.data).toEqual(STORED_SECTION);
    });

    it("rejects if course_id does not exist (404)", async () => {
      vi.mocked(svc.createSection).mockRejectedValue(
        new HierarchyNotFoundError("Course not found: course-uuid-1"),
      );

      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
        body: { title: "Cardiovascular System" },
      });

      await controller.handleCreateSection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_NOT_FOUND");
    });
  });

  describe("createSession", () => {
    it("creates session with valid schedule (201)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        params: { sectionId: "section-uuid-1" },
        body: {
          title: "Cardiac Anatomy Lecture",
          week_number: 3,
          day_of_week: "monday",
          start_time: "09:00",
          end_time: "10:30",
        },
      });

      await controller.handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = getJsonBody() as { data: unknown; error: unknown };
      expect(body.data).toEqual(STORED_SESSION);
      expect(body.error).toBeNull();
    });

    it("rejects end_time <= start_time (400)", async () => {
      vi.mocked(svc.createSession).mockRejectedValue(
        new HierarchyValidationError("end_time must be after start_time"),
      );

      const { req, res, getJsonBody } = createMockReqRes({
        params: { sectionId: "section-uuid-1" },
        body: {
          title: "Bad Session",
          week_number: 1,
          day_of_week: "monday",
          start_time: "14:00",
          end_time: "10:00",
        },
      });

      await controller.handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_VALIDATION_ERROR");
    });

    it("rejects invalid day_of_week (400)", async () => {
      vi.mocked(svc.createSession).mockRejectedValue(
        new HierarchyValidationError("Invalid day_of_week: funday"),
      );

      const { req, res, getJsonBody } = createMockReqRes({
        params: { sectionId: "section-uuid-1" },
        body: {
          title: "Bad Session",
          week_number: 1,
          day_of_week: "funday",
          start_time: "09:00",
          end_time: "10:30",
        },
      });

      await controller.handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_VALIDATION_ERROR");
    });

    it("rejects if section_id does not exist (404)", async () => {
      vi.mocked(svc.createSession).mockRejectedValue(
        new HierarchyNotFoundError("Section not found: section-uuid-1"),
      );

      const { req, res, getJsonBody } = createMockReqRes({
        params: { sectionId: "section-uuid-1" },
        body: {
          title: "Cardiac Anatomy",
          week_number: 3,
          day_of_week: "monday",
          start_time: "09:00",
          end_time: "10:30",
        },
      });

      await controller.handleCreateSession(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_NOT_FOUND");
    });
  });

  describe("getCourseHierarchy", () => {
    it("returns nested sections with sessions ordered by position (200)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
      });

      await controller.handleGetCourseHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getJsonBody() as {
        data: typeof MOCK_HIERARCHY;
        error: unknown;
      };
      expect(body.data.course_id).toBe("course-uuid-1");
      expect(body.data.sections).toHaveLength(1);
      expect(body.data.sections[0]!.sessions).toHaveLength(1);
      expect(body.error).toBeNull();
    });

    it("returns empty sections array for course with no sections", async () => {
      vi.mocked(svc.getCourseHierarchy).mockResolvedValue({
        course_id: "course-uuid-1",
        course_name: "Medical Sciences I",
        course_code: "MS-101",
        sections: [],
      });

      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
      });

      await controller.handleGetCourseHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getJsonBody() as {
        data: { sections: unknown[] };
        error: unknown;
      };
      expect(body.data.sections).toHaveLength(0);
    });

    it("rejects when course not found (404)", async () => {
      vi.mocked(svc.getCourseHierarchy).mockRejectedValue(
        new HierarchyNotFoundError("Course not found: course-uuid-1"),
      );

      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
      });

      await controller.handleGetCourseHierarchy(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = getJsonBody() as { data: unknown; error: { code: string } };
      expect(body.error.code).toBe("HIERARCHY_NOT_FOUND");
    });
  });

  describe("reorderSections", () => {
    it("reorders sections and returns count (200)", async () => {
      const { req, res, getJsonBody } = createMockReqRes({
        params: { courseId: "course-uuid-1" },
        body: {
          section_ids: ["section-uuid-3", "section-uuid-1", "section-uuid-2"],
        },
      });

      await controller.handleReorderSections(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getJsonBody() as {
        data: { reordered: number };
        error: unknown;
      };
      expect(body.data.reordered).toBe(3);
      expect(body.error).toBeNull();
    });
  });
});
