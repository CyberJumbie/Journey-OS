/**
 * HierarchyService tests.
 * [STORY-F-11] DualWrite, reorder, session validation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver, Session as Neo4jSession } from "neo4j-driver";
import type { ProgramRepository } from "../../repositories/program.repository";
import type { SectionRepository } from "../../repositories/section.repository";
import type { SessionRepository } from "../../repositories/session.repository";
import type { CourseRepository } from "../../repositories/course.repository";
import { HierarchyService } from "../../services/course/hierarchy.service";
import { HierarchyValidationError } from "../../errors";

const MOCK_COURSE = {
  id: "course-uuid-1",
  code: "MS-101",
  name: "Medical Sciences I",
  description: null,
  department: null,
  course_director_id: null,
  academic_year: null,
  semester: null,
  credit_hours: null,
  course_type: null,
  neo4j_id: null,
  status: "active" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const MOCK_SECTION_A = {
  id: "section-uuid-1",
  course_id: "course-uuid-1",
  title: "Cardiovascular System",
  description: "",
  position: 0,
  is_active: true,
  sync_status: "synced" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const MOCK_SECTION_B = {
  id: "section-uuid-2",
  course_id: "course-uuid-1",
  title: "Respiratory System",
  description: "",
  position: 1,
  is_active: true,
  sync_status: "synced" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const MOCK_PROGRAM = {
  id: "prog-uuid-1",
  institution_id: "inst-uuid-1",
  name: "Doctor of Medicine",
  code: "MD-2026",
  description: "4-year MD program",
  is_active: true,
  sync_status: "pending" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

const MOCK_SESSION = {
  id: "session-uuid-1",
  section_id: "section-uuid-1",
  title: "Cardiac Anatomy Lecture",
  description: "",
  week_number: 3,
  day_of_week: "monday" as const,
  start_time: "09:00",
  end_time: "10:30",
  is_active: true,
  sync_status: "pending" as const,
  created_at: "2026-02-19T12:00:00Z",
  updated_at: "2026-02-19T12:00:00Z",
};

function createMockProgramRepo(): ProgramRepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_PROGRAM),
    findById: vi.fn().mockResolvedValue(MOCK_PROGRAM),
    findByInstitutionId: vi.fn().mockResolvedValue([MOCK_PROGRAM]),
    update: vi.fn().mockResolvedValue(MOCK_PROGRAM),
    existsByCode: vi.fn().mockResolvedValue(false),
    updateSyncStatus: vi.fn().mockResolvedValue(undefined),
  } as unknown as ProgramRepository;
}

function createMockSectionRepo(): SectionRepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_SECTION_A),
    findById: vi.fn().mockResolvedValue(MOCK_SECTION_A),
    findByCourseId: vi.fn().mockResolvedValue([MOCK_SECTION_A, MOCK_SECTION_B]),
    update: vi.fn().mockResolvedValue(MOCK_SECTION_A),
    getMaxPosition: vi.fn().mockResolvedValue(1),
    reorderSections: vi.fn().mockResolvedValue(2),
    updateSyncStatus: vi.fn().mockResolvedValue(undefined),
  } as unknown as SectionRepository;
}

function createMockSessionRepo(): SessionRepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_SESSION),
    findById: vi.fn().mockResolvedValue(MOCK_SESSION),
    findBySectionId: vi.fn().mockResolvedValue([MOCK_SESSION]),
    update: vi.fn().mockResolvedValue(MOCK_SESSION),
    updateSyncStatus: vi.fn().mockResolvedValue(undefined),
  } as unknown as SessionRepository;
}

function createMockCourseRepo(): CourseRepository {
  return {
    findById: vi.fn().mockResolvedValue(MOCK_COURSE),
    findByCode: vi.fn().mockResolvedValue(MOCK_COURSE),
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    updateNeo4jId: vi.fn(),
    existsByCode: vi.fn(),
  } as unknown as CourseRepository;
}

function createMockNeo4jDriver(): {
  driver: Driver;
  neo4jSession: Neo4jSession;
} {
  const neo4jSession = {
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Neo4jSession;

  const driver = {
    session: vi.fn().mockReturnValue(neo4jSession),
  } as unknown as Driver;

  return { driver, neo4jSession };
}

describe("HierarchyService", () => {
  let programRepo: ProgramRepository;
  let sectionRepo: SectionRepository;
  let sessionRepo: SessionRepository;
  let courseRepo: CourseRepository;
  let service: HierarchyService;

  beforeEach(() => {
    vi.clearAllMocks();
    programRepo = createMockProgramRepo();
    sectionRepo = createMockSectionRepo();
    sessionRepo = createMockSessionRepo();
    courseRepo = createMockCourseRepo();
    service = new HierarchyService(
      programRepo,
      sectionRepo,
      sessionRepo,
      courseRepo,
      null,
    );
  });

  describe("reorderSections", () => {
    it("updates position for each section in provided order", async () => {
      const result = await service.reorderSections("course-uuid-1", [
        "section-uuid-2",
        "section-uuid-1",
      ]);

      expect(courseRepo.findById).toHaveBeenCalledWith("course-uuid-1");
      expect(sectionRepo.findByCourseId).toHaveBeenCalledWith("course-uuid-1");
      expect(sectionRepo.reorderSections).toHaveBeenCalledWith(
        "course-uuid-1",
        ["section-uuid-2", "section-uuid-1"],
      );
      expect(result).toBe(2);
    });

    it("throws HierarchyValidationError if section_ids contain invalid IDs", async () => {
      await expect(
        service.reorderSections("course-uuid-1", [
          "section-uuid-1",
          "invalid-uuid",
        ]),
      ).rejects.toThrow(HierarchyValidationError);
    });
  });

  describe("createSession", () => {
    it("validates end_time > start_time", async () => {
      await expect(
        service.createSession("section-uuid-1", {
          title: "Bad Session",
          week_number: 1,
          day_of_week: "monday",
          start_time: "14:00",
          end_time: "10:00",
        }),
      ).rejects.toThrow(HierarchyValidationError);
    });
  });

  describe("DualWrite", () => {
    it("sets sync_status to 'synced' when both Supabase and Neo4j succeed", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new HierarchyService(
        programRepo,
        sectionRepo,
        sessionRepo,
        courseRepo,
        driver,
      );

      await neo4jService.createProgram({
        institution_id: "inst-uuid-1",
        name: "Doctor of Medicine",
        code: "MD-2026",
      });

      expect(programRepo.create).toHaveBeenCalled();
      expect(driver.session).toHaveBeenCalled();
      expect(programRepo.updateSyncStatus).toHaveBeenCalledWith(
        "prog-uuid-1",
        "synced",
      );
    });

    it("sets sync_status to 'failed' when Neo4j write fails", async () => {
      const { driver, neo4jSession } = createMockNeo4jDriver();
      vi.mocked(neo4jSession.run).mockRejectedValue(
        new Error("Neo4j connection failed"),
      );

      const neo4jService = new HierarchyService(
        programRepo,
        sectionRepo,
        sessionRepo,
        courseRepo,
        driver,
      );

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await neo4jService.createProgram({
        institution_id: "inst-uuid-1",
        name: "Doctor of Medicine",
        code: "MD-2026",
      });

      expect(programRepo.create).toHaveBeenCalled();
      expect(programRepo.updateSyncStatus).toHaveBeenCalledWith(
        "prog-uuid-1",
        "failed",
      );

      consoleSpy.mockRestore();
    });
  });
});
