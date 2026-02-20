import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  CourseListQuery,
  CourseListViewResponse,
  CourseHierarchy,
  SectionWithSessions,
} from "@journey-os/types";
import { CourseViewService } from "../course-view.service";
import type { CourseRepository } from "../../../repositories/course.repository";
import type { HierarchyService } from "../hierarchy.service";
import { CourseNotFoundError } from "../../../errors";

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

const MOCK_LIST_RESPONSE: CourseListViewResponse = {
  courses: [
    {
      id: "course-0001",
      code: "MED-301",
      name: "Cardiovascular Systems",
      department: "Clinical Sciences",
      program_id: "prog-0001",
      program_name: "MD Program",
      course_director_id: "user-001",
      course_director_name: "Dr. Sarah Carter",
      status: "active",
      academic_year: "2025-2026",
      section_count: 4,
      session_count: 24,
      updated_at: "2026-02-10T14:30:00Z",
    },
  ],
  meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
};

const MOCK_ENRICHED_COURSE = {
  course: {
    id: "course-0001",
    code: "MED-301",
    name: "Cardiovascular Systems",
    description: "Comprehensive cardio course",
    department: "Clinical Sciences",
    program_id: "prog-0001",
    status: "active",
    academic_year: "2025-2026",
    semester: "Fall",
    credit_hours: 6,
    course_type: "integrated",
    neo4j_id: null,
    created_at: "2026-01-05T08:00:00Z",
    updated_at: "2026-02-10T14:30:00Z",
  },
  program_name: "MD Program",
  director: {
    id: "user-001",
    full_name: "Dr. Sarah Carter",
    email: "scarter@msm.edu",
  },
};

const MOCK_SECTION: SectionWithSessions = {
  id: "sect-001",
  title: "Anatomy & Embryology",
  description: "",
  position: 1,
  sessions: [],
};

const MOCK_HIERARCHY: CourseHierarchy = {
  course_id: "course-0001",
  course_name: "Cardiovascular Systems",
  course_code: "MED-301",
  sections: [MOCK_SECTION],
};

/* ------------------------------------------------------------------ */
/*  Mock factories                                                    */
/* ------------------------------------------------------------------ */

function createMockRepository() {
  return {
    listEnriched: vi.fn().mockResolvedValue(MOCK_LIST_RESPONSE),
    findByIdEnriched: vi.fn().mockResolvedValue(MOCK_ENRICHED_COURSE),
  } as unknown as CourseRepository;
}

function createMockHierarchyService() {
  return {
    getCourseHierarchy: vi.fn().mockResolvedValue(MOCK_HIERARCHY),
  } as unknown as HierarchyService;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("CourseViewService", () => {
  let service: CourseViewService;
  let mockRepo: CourseRepository;
  let mockHierarchy: HierarchyService;

  beforeEach(() => {
    mockRepo = createMockRepository();
    mockHierarchy = createMockHierarchyService();
    service = new CourseViewService(mockRepo, mockHierarchy);
  });

  /* ---- listView -------------------------------------------------- */

  describe("listView", () => {
    it("delegates to repository.listEnriched and returns result unchanged", async () => {
      const query: CourseListQuery = {};
      const result = await service.listView(query);

      expect(mockRepo.listEnriched).toHaveBeenCalledWith(query);
      expect(result).toBe(MOCK_LIST_RESPONSE);
    });

    it("passes filter params through to repository", async () => {
      const query: CourseListQuery = {
        status: "active",
        search: "cardio",
        department: "Clinical Sciences",
      };
      await service.listView(query);

      expect(mockRepo.listEnriched).toHaveBeenCalledWith(query);
    });

    it("passes pagination params through to repository", async () => {
      const query: CourseListQuery = { page: 2, limit: 10 };
      await service.listView(query);

      expect(mockRepo.listEnriched).toHaveBeenCalledWith(query);
    });

    it("propagates repository errors", async () => {
      const dbError = new Error("connection failed");
      vi.mocked(mockRepo.listEnriched).mockRejectedValueOnce(dbError);

      await expect(service.listView({})).rejects.toThrow("connection failed");
    });
  });

  /* ---- getDetailView --------------------------------------------- */

  describe("getDetailView", () => {
    it("returns CourseDetailView with hierarchy and director info", async () => {
      const result = await service.getDetailView("course-0001");

      expect(result).toEqual({
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
        status: "active",
        academic_year: "2025-2026",
        semester: "Fall",
        credit_hours: 6,
        course_type: "integrated",
        hierarchy: [MOCK_SECTION],
        slo_count: 0,
        neo4j_id: null,
        created_at: "2026-01-05T08:00:00Z",
        updated_at: "2026-02-10T14:30:00Z",
      });
    });

    it("calls findByIdEnriched and getCourseHierarchy in parallel", async () => {
      await service.getDetailView("course-0001");

      expect(mockRepo.findByIdEnriched).toHaveBeenCalledOnce();
      expect(mockRepo.findByIdEnriched).toHaveBeenCalledWith("course-0001");
      expect(mockHierarchy.getCourseHierarchy).toHaveBeenCalledOnce();
      expect(mockHierarchy.getCourseHierarchy).toHaveBeenCalledWith(
        "course-0001",
      );
    });

    it("throws CourseNotFoundError when findByIdEnriched returns null", async () => {
      vi.mocked(mockRepo.findByIdEnriched).mockResolvedValueOnce(null);

      await expect(service.getDetailView("nonexistent")).rejects.toThrow(
        CourseNotFoundError,
      );
    });

    it("handles null program_name", async () => {
      vi.mocked(mockRepo.findByIdEnriched).mockResolvedValueOnce({
        ...MOCK_ENRICHED_COURSE,
        program_name: null,
      });

      const result = await service.getDetailView("course-0001");

      expect(result.program_name).toBeNull();
    });

    it("handles null director", async () => {
      vi.mocked(mockRepo.findByIdEnriched).mockResolvedValueOnce({
        ...MOCK_ENRICHED_COURSE,
        director: null,
      });

      const result = await service.getDetailView("course-0001");

      expect(result.course_director).toBeNull();
    });

    it("always returns slo_count as 0 (placeholder)", async () => {
      const result = await service.getDetailView("course-0001");

      expect(result.slo_count).toBe(0);
    });

    it("maps hierarchy.sections to detail.hierarchy", async () => {
      const result = await service.getDetailView("course-0001");

      expect(result.hierarchy).toEqual(MOCK_HIERARCHY.sections);
    });

    it("propagates getCourseHierarchy errors", async () => {
      const hierarchyError = new Error("hierarchy fetch failed");
      vi.mocked(mockHierarchy.getCourseHierarchy).mockRejectedValueOnce(
        hierarchyError,
      );

      await expect(service.getDetailView("course-0001")).rejects.toThrow(
        "hierarchy fetch failed",
      );
    });
  });
});
