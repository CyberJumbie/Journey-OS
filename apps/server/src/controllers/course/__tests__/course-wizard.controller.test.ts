import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { CourseWizardController } from "../course-wizard.controller";
import type { CourseService } from "../../../services/course/course.service";
import type { HierarchyService } from "../../../services/course/hierarchy.service";
import type { ProfileRepository } from "../../../repositories/profile.repository";
import {
  DuplicateCourseCodeError,
  DirectorNotFoundError,
  ProfileNotFoundError,
  CourseValidationError,
} from "../../../errors";
import type { CourseCreateInput } from "@journey-os/types";

// --- Fixtures ---

const MOCK_COURSE_DTO = {
  id: "course-uuid-001",
  code: "CVPATH-301",
  name: "Cardiovascular Pathophysiology",
  description: "Advanced study",
  department: null,
  course_director_id: "user-uuid-director",
  academic_year: "2026",
  semester: "fall",
  credit_hours: 4,
  course_type: null,
  neo4j_id: null,
  status: "draft",
  created_at: "2026-02-20T12:00:00Z",
  updated_at: "2026-02-20T12:00:00Z",
};

const MOCK_SECTION = {
  id: "section-uuid-001",
  course_id: "course-uuid-001",
  title: "Cardiac Anatomy",
  description: "",
  position: 1,
  is_active: true,
  sync_status: "pending",
  created_at: "2026-02-20T12:00:00Z",
  updated_at: "2026-02-20T12:00:00Z",
};

const MOCK_SESSION = {
  id: "session-uuid-001",
  section_id: "section-uuid-001",
  title: "Heart Structure",
  description: "",
  week_number: 1,
  day_of_week: "monday",
  start_time: "09:00",
  end_time: "10:30",
  is_active: true,
  sync_status: "pending",
  created_at: "2026-02-20T12:00:00Z",
  updated_at: "2026-02-20T12:00:00Z",
};

const MOCK_PROFILE = {
  id: "user-uuid-director",
  email: "dr.carter@msm.edu",
  display_name: "Dr. Sarah Carter",
  role: "faculty",
  institution_id: "inst-uuid-001",
  institution_name: "MSM",
  department: null,
  title: null,
  avatar_url: null,
  bio: null,
};

const VALID_INPUT: CourseCreateInput = {
  basic_info: {
    name: "Cardiovascular Pathophysiology",
    code: "CVPATH-301",
    description: "Advanced study",
    academic_year: "2026",
    semester: "fall",
    program_id: null,
  },
  configuration: {
    credit_hours: 4,
    max_enrollment: 120,
    is_required: true,
    prerequisites: ["PHYSIO-201"],
    learning_objectives: ["Explain pathophysiology"],
    tags: ["cardiovascular"],
  },
  structure: {
    sections: [
      {
        title: "Cardiac Anatomy",
        position: 1,
        sessions: [
          {
            title: "Heart Structure",
            week_number: 1,
            day_of_week: "monday",
            start_time: "09:00",
            end_time: "10:30",
            session_type: "lecture",
          },
          {
            title: "Cardiac Lab",
            week_number: 1,
            day_of_week: "wednesday",
            start_time: "14:00",
            end_time: "16:00",
            session_type: "lab",
          },
        ],
      },
    ],
  },
  director: { course_director_id: "user-uuid-director" },
};

// --- Mock Factories ---

function createMockServices() {
  const courseService = {
    create: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    findById: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    findByCode: vi.fn().mockResolvedValue(MOCK_COURSE_DTO),
    list: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  } as unknown as CourseService;

  const hierarchyService = {
    createSection: vi.fn().mockResolvedValue(MOCK_SECTION),
    createSession: vi.fn().mockResolvedValue(MOCK_SESSION),
    createProgram: vi.fn(),
    getCourseHierarchy: vi.fn(),
    reorderSections: vi.fn(),
  } as unknown as HierarchyService;

  const profileRepo = {
    findByUserId: vi.fn().mockResolvedValue(MOCK_PROFILE),
    update: vi.fn(),
  } as unknown as ProfileRepository;

  return { courseService, hierarchyService, profileRepo };
}

function createMockReqRes(overrides: {
  body?: unknown;
  query?: Record<string, unknown>;
  user?: { sub: string; institution_id: string; role: string };
}): { req: Request; res: Response } {
  const req = {
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    user: overrides.user ?? {
      sub: "user-uuid-001",
      institution_id: "inst-uuid-001",
      role: "faculty",
    },
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

function getResponseBody(res: Response): { data: unknown; error: unknown } {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!;
  return statusCall.value.json.mock.calls[0]![0] as {
    data: unknown;
    error: unknown;
  };
}

// --- Tests ---

describe("CourseWizardController", () => {
  let courseService: CourseService;
  let hierarchyService: HierarchyService;
  let profileRepo: ProfileRepository;
  let controller: CourseWizardController;

  beforeEach(() => {
    ({ courseService, hierarchyService, profileRepo } = createMockServices());
    controller = new CourseWizardController(
      courseService,
      hierarchyService,
      profileRepo,
    );
  });

  describe("POST /api/v1/courses/wizard (handleCreate)", () => {
    it("creates course with sections, sessions, and CD (201)", async () => {
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const body = getResponseBody(res);
      const data = body.data as Record<string, unknown>;
      expect(data.id).toBe("course-uuid-001");
      expect(data.section_count).toBe(1);
      expect(data.session_count).toBe(2);
      expect(data.course_director_id).toBe("user-uuid-director");
      expect(data.status).toBe("draft");
    });

    it("creates course without Course Director (201)", async () => {
      const input: CourseCreateInput = {
        ...VALID_INPUT,
        director: { course_director_id: null },
      };
      const { req, res } = createMockReqRes({ body: input });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(profileRepo.findByUserId).not.toHaveBeenCalled();
      const data = getResponseBody(res).data as Record<string, unknown>;
      expect(data.course_director_id).toBeNull();
    });

    it("rejects duplicate course code (409 DUPLICATE_COURSE_CODE)", async () => {
      (courseService.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new DuplicateCourseCodeError("CVPATH-301"),
      );
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      const body = getResponseBody(res);
      expect((body.error as { code: string }).code).toBe(
        "DUPLICATE_COURSE_CODE",
      );
    });

    it("rejects non-existent Course Director (404 DIRECTOR_NOT_FOUND)", async () => {
      (profileRepo.findByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ProfileNotFoundError("non-existent-uuid"),
      );
      const input: CourseCreateInput = {
        ...VALID_INPUT,
        director: { course_director_id: "non-existent-uuid" },
      };
      const { req, res } = createMockReqRes({ body: input });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = getResponseBody(res);
      expect((body.error as { code: string }).code).toBe("DIRECTOR_NOT_FOUND");
    });

    it("sets course status to draft on creation", async () => {
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      const createCall = (courseService.create as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      expect(createCall.status).toBe("draft");
    });

    it("creates correct number of sections and sessions", async () => {
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      expect(hierarchyService.createSection).toHaveBeenCalledTimes(1);
      expect(hierarchyService.createSession).toHaveBeenCalledTimes(2);
    });

    it("maps section title correctly to hierarchy service", async () => {
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      expect(hierarchyService.createSection).toHaveBeenCalledWith(
        "course-uuid-001",
        { title: "Cardiac Anatomy", position: 1 },
      );
    });

    it("maps session fields correctly to hierarchy service", async () => {
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      const firstSessionCall = (
        hierarchyService.createSession as ReturnType<typeof vi.fn>
      ).mock.calls[0]![1] as Record<string, unknown>;
      expect(firstSessionCall.title).toBe("Heart Structure");
      expect(firstSessionCall.day_of_week).toBe("monday");
      expect(firstSessionCall.start_time).toBe("09:00");
      expect(firstSessionCall.end_time).toBe("10:30");
    });

    it("passes wizard fields to course service create", async () => {
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      const createCall = (courseService.create as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as Record<string, unknown>;
      expect(createCall.credit_hours).toBe(4);
      expect(createCall.max_enrollment).toBe(120);
      expect(createCall.is_required).toBe(true);
      expect(createCall.semester).toBe("fall");
    });

    it("returns 500 on unexpected error", async () => {
      (courseService.create as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("DB connection failed"),
      );
      const { req, res } = createMockReqRes({ body: VALID_INPUT });

      await controller.handleCreate(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = getResponseBody(res);
      expect((body.error as { code: string }).code).toBe("INTERNAL_ERROR");
    });

    it("validates director before creating course", async () => {
      (profileRepo.findByUserId as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ProfileNotFoundError("bad-id"),
      );
      const input: CourseCreateInput = {
        ...VALID_INPUT,
        director: { course_director_id: "bad-id" },
      };
      const { req, res } = createMockReqRes({ body: input });

      await controller.handleCreate(req, res);

      // Course should NOT have been created
      expect(courseService.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/v1/courses/check-code (handleCheckCode)", () => {
    it("returns available: true for unused code (200)", async () => {
      (courseService.findByCode as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Not found"),
      );
      const { req, res } = createMockReqRes({
        query: { code: "NEW-CODE" },
      });

      await controller.handleCheckCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getResponseBody(res);
      const data = body.data as { available: boolean; code: string };
      expect(data.available).toBe(true);
      expect(data.code).toBe("NEW-CODE");
    });

    it("returns available: false for existing code (200)", async () => {
      // findByCode succeeds = code exists
      const { req, res } = createMockReqRes({
        query: { code: "CVPATH-301" },
      });

      await controller.handleCheckCode(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getResponseBody(res);
      const data = body.data as { available: boolean };
      expect(data.available).toBe(false);
    });

    it("rejects missing code parameter (400)", async () => {
      const { req, res } = createMockReqRes({ query: {} });

      await controller.handleCheckCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const body = getResponseBody(res);
      expect((body.error as { code: string }).code).toBe("VALIDATION_ERROR");
    });

    it("rejects short code parameter (400)", async () => {
      const { req, res } = createMockReqRes({ query: { code: "AB" } });

      await controller.handleCheckCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
