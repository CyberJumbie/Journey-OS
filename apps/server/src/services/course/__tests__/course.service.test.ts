import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver, Session } from "neo4j-driver";
import type { CourseDTO, CreateCourseRequest } from "@journey-os/types";
import { CourseService } from "../course.service";
import type { CourseRepository } from "../../../repositories/course.repository";
import {
  CourseNotFoundError,
  DuplicateCourseCodeError,
  InvalidCourseTypeError,
  InvalidCourseStatusError,
} from "../../../errors";

const MOCK_COURSE: CourseDTO = {
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

const VALID_REQUEST: CreateCourseRequest = {
  code: "MED-101",
  name: "Introduction to Anatomy",
  description: "Fundamental anatomy course",
  department: "Basic Sciences",
  course_type: "lecture",
};

function createMockRepository(): CourseRepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_COURSE),
    findById: vi.fn().mockResolvedValue(MOCK_COURSE),
    findByCode: vi.fn().mockResolvedValue(MOCK_COURSE),
    list: vi.fn().mockResolvedValue({
      courses: [MOCK_COURSE],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    update: vi.fn().mockResolvedValue(MOCK_COURSE),
    archive: vi.fn().mockResolvedValue(undefined),
    updateNeo4jId: vi.fn().mockResolvedValue(undefined),
    existsByCode: vi.fn().mockResolvedValue(false),
  } as unknown as CourseRepository;
}

function createMockNeo4jDriver(): {
  driver: Driver;
  session: Session;
} {
  const session = {
    run: vi.fn().mockResolvedValue({
      records: [{ get: vi.fn().mockReturnValue("neo4j-node-789") }],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Session;

  const driver = {
    session: vi.fn().mockReturnValue(session),
  } as unknown as Driver;

  return { driver, session };
}

describe("CourseService", () => {
  let repo: CourseRepository;
  let service: CourseService;

  beforeEach(() => {
    repo = createMockRepository();
    service = new CourseService(repo, null);
  });

  describe("create", () => {
    it("creates course in Supabase and returns CourseDTO", async () => {
      const result = await service.create(VALID_REQUEST);

      expect(repo.existsByCode).toHaveBeenCalledWith("MED-101");
      expect(repo.create).toHaveBeenCalledWith(VALID_REQUEST);
      expect(result.id).toBe("course-uuid-1");
    });

    it("creates Course node in Neo4j via DualWrite", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new CourseService(repo, driver);

      await neo4jService.create(VALID_REQUEST);

      expect(driver.session).toHaveBeenCalled();
      const runCall = (session.run as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as string;
      expect(runCall).toContain(":Course");
      expect(session.close).toHaveBeenCalled();
    });

    it("updates neo4j_id after successful DualWrite", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new CourseService(repo, driver);

      await neo4jService.create(VALID_REQUEST);

      expect(repo.updateNeo4jId).toHaveBeenCalledWith(
        "course-uuid-1",
        "neo4j-node-789",
      );
    });

    it("still returns Supabase record when Neo4j write fails", async () => {
      const session = {
        run: vi.fn().mockRejectedValue(new Error("Neo4j connection failed")),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Session;

      const driver = {
        session: vi.fn().mockReturnValue(session),
      } as unknown as Driver;

      const neo4jService = new CourseService(repo, driver);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await neo4jService.create(VALID_REQUEST);

      expect(result.id).toBe("course-uuid-1");
      expect(repo.updateNeo4jId).toHaveBeenCalledWith("course-uuid-1", null);

      consoleSpy.mockRestore();
    });

    it("throws DuplicateCourseCodeError when code already exists", async () => {
      (repo.existsByCode as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(service.create(VALID_REQUEST)).rejects.toThrow(
        DuplicateCourseCodeError,
      );
    });

    it("throws InvalidCourseTypeError for invalid course_type", async () => {
      const badRequest = {
        ...VALID_REQUEST,
        course_type: "workshop" as CreateCourseRequest["course_type"],
      };

      await expect(service.create(badRequest)).rejects.toThrow(
        InvalidCourseTypeError,
      );
    });
  });

  describe("findById", () => {
    it("returns CourseDTO by id", async () => {
      const result = await service.findById("course-uuid-1");

      expect(repo.findById).toHaveBeenCalledWith("course-uuid-1");
      expect(result.id).toBe("course-uuid-1");
    });

    it("throws CourseNotFoundError when id does not exist", async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(
        CourseNotFoundError,
      );
    });
  });

  describe("findByCode", () => {
    it("returns CourseDTO by code", async () => {
      const result = await service.findByCode("MED-101");

      expect(repo.findByCode).toHaveBeenCalledWith("MED-101");
      expect(result.code).toBe("MED-101");
    });

    it("throws CourseNotFoundError when code does not exist", async () => {
      (repo.findByCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findByCode("MED-999")).rejects.toThrow(
        CourseNotFoundError,
      );
    });
  });

  describe("list", () => {
    it("returns paginated courses", async () => {
      const result = await service.list({ status: "active" });

      expect(repo.list).toHaveBeenCalledWith({ status: "active" });
      expect(result.courses).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe("update", () => {
    it("updates course and triggers Neo4j DualWrite", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new CourseService(repo, driver);

      const result = await neo4jService.update("course-uuid-1", {
        name: "Updated Anatomy",
      });

      expect(repo.update).toHaveBeenCalled();
      expect(result.id).toBe("course-uuid-1");
    });

    it("throws InvalidCourseStatusError for invalid status", async () => {
      await expect(
        service.update("course-uuid-1", {
          status: "invalid" as "draft",
        }),
      ).rejects.toThrow(InvalidCourseStatusError);
    });
  });

  describe("archive", () => {
    it("sets status to 'archived' and triggers Neo4j DualWrite", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new CourseService(repo, driver);

      await neo4jService.archive("course-uuid-1");

      expect(repo.archive).toHaveBeenCalledWith("course-uuid-1");
      const runCall = (session.run as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as string;
      expect(runCall).toContain("archived");
    });

    it("throws CourseNotFoundError when id does not exist", async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.archive("nonexistent")).rejects.toThrow(
        CourseNotFoundError,
      );
    });
  });
});
