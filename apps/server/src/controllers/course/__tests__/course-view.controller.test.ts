import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";
import { CourseViewController } from "../course-view.controller";
import type { CourseViewService } from "../../../services/course/course-view.service";
import { CourseNotFoundError } from "../../../errors";

const MOCK_LIST_ITEM = {
  id: "course-0001",
  code: "MED-301",
  name: "Cardiovascular Systems",
  department: "Clinical Sciences",
  program_id: "prog-0001",
  program_name: "MD Program",
  course_director_id: "user-001",
  course_director_name: "Dr. Sarah Carter",
  status: "active" as const,
  academic_year: "2025-2026",
  section_count: 4,
  session_count: 24,
  updated_at: "2026-02-10T14:30:00Z",
};

const MOCK_LIST_RESPONSE = {
  courses: [MOCK_LIST_ITEM],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

const MOCK_DETAIL = {
  id: "course-0001",
  code: "MED-301",
  name: "Cardiovascular Systems",
  description: "Comprehensive cardio course",
  department: "Clinical Sciences",
  program_id: "prog-0001",
  program_name: "MD Program",
  course_director: {
    id: "user-001",
    full_name: "Dr. Sarah Carter",
    email: "scarter@msm.edu",
  },
  status: "active" as const,
  academic_year: "2025-2026",
  semester: "Fall",
  credit_hours: 6,
  course_type: "integrated",
  hierarchy: [
    {
      id: "sect-001",
      title: "Anatomy & Embryology",
      description: "",
      position: 1,
      sessions: [
        {
          id: "sess-001",
          section_id: "sect-001",
          title: "Heart Chambers",
          description: "",
          week_number: 1,
          day_of_week: "monday" as const,
          start_time: "09:00",
          end_time: "10:00",
          is_active: true,
          sync_status: "synced" as const,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
    },
  ],
  slo_count: 0,
  neo4j_id: null,
  created_at: "2026-01-05T08:00:00Z",
  updated_at: "2026-02-10T14:30:00Z",
};

function createMockService(): CourseViewService {
  return {
    listView: vi.fn().mockResolvedValue(MOCK_LIST_RESPONSE),
    getDetailView: vi.fn().mockResolvedValue(MOCK_DETAIL),
  } as unknown as CourseViewService;
}

function createMockReqRes(overrides: {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): { req: Request; res: Response } {
  const req = {
    body: {},
    params: overrides.params ?? {},
    query: overrides.query ?? {},
  } as unknown as Request;

  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;

  return { req, res };
}

function getJsonBody(res: Response): { data: unknown; error: unknown } {
  const statusCall = (res.status as ReturnType<typeof vi.fn>).mock.results[0]!
    .value;
  return statusCall.json.mock.calls[0]![0] as {
    data: unknown;
    error: unknown;
  };
}

describe("CourseViewController", () => {
  let svc: CourseViewService;
  let controller: CourseViewController;

  beforeEach(() => {
    svc = createMockService();
    controller = new CourseViewController(svc);
  });

  describe("handleListView", () => {
    it("returns 200 with enriched course list", async () => {
      const { req, res } = createMockReqRes({ query: {} });

      await controller.handleListView(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getJsonBody(res);
      expect(body.error).toBeNull();
      expect(body.data).toEqual(MOCK_LIST_RESPONSE);
    });

    it("passes status filter to service", async () => {
      const { req, res } = createMockReqRes({
        query: { status: "active" },
      });

      await controller.handleListView(req, res);

      expect(svc.listView).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active" }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("passes search filter to service", async () => {
      const { req, res } = createMockReqRes({
        query: { search: "cardio" },
      });

      await controller.handleListView(req, res);

      expect(svc.listView).toHaveBeenCalledWith(
        expect.objectContaining({ search: "cardio" }),
      );
    });

    it("passes pagination params to service", async () => {
      const { req, res } = createMockReqRes({
        query: { page: "2", limit: "10" },
      });

      await controller.handleListView(req, res);

      expect(svc.listView).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it("returns enriched fields in list items", async () => {
      const { req, res } = createMockReqRes({ query: {} });

      await controller.handleListView(req, res);

      const body = getJsonBody(res);
      const data = body.data as typeof MOCK_LIST_RESPONSE;
      const course = data.courses[0]!;
      expect(course.program_name).toBe("MD Program");
      expect(course.course_director_name).toBe("Dr. Sarah Carter");
      expect(course.section_count).toBe(4);
      expect(course.session_count).toBe(24);
    });
  });

  describe("handleGetDetailView", () => {
    it("returns 200 with detail including hierarchy", async () => {
      const { req, res } = createMockReqRes({
        params: { id: "course-0001" },
      });

      await controller.handleGetDetailView(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = getJsonBody(res);
      expect(body.error).toBeNull();
      const data = body.data as typeof MOCK_DETAIL;
      expect(data.hierarchy).toHaveLength(1);
      expect(data.hierarchy[0]!.sessions).toHaveLength(1);
      expect(data.course_director).toEqual({
        id: "user-001",
        full_name: "Dr. Sarah Carter",
        email: "scarter@msm.edu",
      });
      expect(data.slo_count).toBe(0);
    });

    it("returns 404 for non-existent course", async () => {
      vi.mocked(svc.getDetailView).mockRejectedValue(
        new CourseNotFoundError("nonexistent-id"),
      );

      const { req, res } = createMockReqRes({
        params: { id: "nonexistent-id" },
      });

      await controller.handleGetDetailView(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      const body = getJsonBody(res);
      expect(body.data).toBeNull();
      expect(body.error).toEqual(
        expect.objectContaining({ code: "COURSE_NOT_FOUND" }),
      );
    });

    it("returns 500 for unexpected errors", async () => {
      vi.mocked(svc.getDetailView).mockRejectedValue(
        new Error("DB connection lost"),
      );

      const { req, res } = createMockReqRes({
        params: { id: "course-0001" },
      });

      await controller.handleGetDetailView(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const body = getJsonBody(res);
      expect(body.error).toEqual(
        expect.objectContaining({ code: "INTERNAL_ERROR" }),
      );
    });
  });
});
