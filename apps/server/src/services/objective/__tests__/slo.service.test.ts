import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver, Session } from "neo4j-driver";
import type { SLO, CreateSLORequest } from "@journey-os/types";
import { SLOService } from "../slo.service";
import type { SLORepository } from "../../../repositories/slo.repository";
import {
  DuplicateObjectiveCodeError,
  InvalidBloomLevelError,
  ObjectiveNotFoundError,
} from "../../../errors";

const MOCK_SLO: SLO = {
  id: "slo-uuid-1",
  course_id: "course-uuid-1",
  institution_id: "inst-uuid-1",
  code: "SLO-MED101-01",
  title: "Identify major organ systems",
  description:
    "Student can identify and describe the major organ systems of the human body",
  bloom_level: "remember",
  status: "draft",
  created_by: "faculty-uuid-1",
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

const VALID_REQUEST: CreateSLORequest = {
  course_id: "course-uuid-1",
  code: "SLO-MED101-01",
  title: "Identify major organ systems",
  description:
    "Student can identify and describe the major organ systems of the human body",
  bloom_level: "remember",
};

function createMockRepository(): SLORepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_SLO),
    findById: vi.fn().mockResolvedValue(MOCK_SLO),
    findByCourseId: vi.fn().mockResolvedValue({
      objectives: [MOCK_SLO],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    update: vi.fn().mockResolvedValue(MOCK_SLO),
    updateSyncStatus: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
    existsByCode: vi.fn().mockResolvedValue(false),
  } as unknown as SLORepository;
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

describe("SLOService", () => {
  let repo: SLORepository;
  let service: SLOService;

  beforeEach(() => {
    repo = createMockRepository();
    service = new SLOService(repo, null);
  });

  describe("create", () => {
    it("creates SLO in Supabase with scope='session'", async () => {
      const result = await service.create(
        VALID_REQUEST,
        "faculty-uuid-1",
        "inst-uuid-1",
      );

      expect(repo.existsByCode).toHaveBeenCalledWith(
        "SLO-MED101-01",
        "course-uuid-1",
      );
      expect(repo.create).toHaveBeenCalledWith(
        VALID_REQUEST,
        "faculty-uuid-1",
        "inst-uuid-1",
      );
      expect(result.id).toBe("slo-uuid-1");
    });

    it("creates SLO node in Neo4j with HAS_SLO relationship to course", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new SLOService(repo, driver);

      await neo4jService.create(VALID_REQUEST, "faculty-uuid-1", "inst-uuid-1");

      expect(driver.session).toHaveBeenCalled();
      const runCall = (session.run as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as string;
      expect(runCall).toContain("HAS_SLO");
      expect(runCall).toContain(":SLO");
      expect(runCall).toContain(":Course");
      expect(session.close).toHaveBeenCalled();
    });

    it("sets sync_status to 'synced' after successful DualWrite", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new SLOService(repo, driver);

      await neo4jService.create(VALID_REQUEST, "faculty-uuid-1", "inst-uuid-1");

      expect(repo.updateSyncStatus).toHaveBeenCalledWith(
        "slo-uuid-1",
        "synced",
        "neo4j-node-789",
      );
    });

    it("sets sync_status to 'failed' when Neo4j write fails (Supabase record persists)", async () => {
      const session = {
        run: vi.fn().mockRejectedValue(new Error("Neo4j connection failed")),
        close: vi.fn().mockResolvedValue(undefined),
      } as unknown as Session;

      const driver = {
        session: vi.fn().mockReturnValue(session),
      } as unknown as Driver;

      const neo4jService = new SLOService(repo, driver);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await neo4jService.create(
        VALID_REQUEST,
        "faculty-uuid-1",
        "inst-uuid-1",
      );

      // Supabase record still returned
      expect(result.id).toBe("slo-uuid-1");

      // sync_status updated to 'failed'
      expect(repo.updateSyncStatus).toHaveBeenCalledWith(
        "slo-uuid-1",
        "failed",
        null,
      );

      consoleSpy.mockRestore();
    });

    it("throws DuplicateObjectiveCodeError when code exists for same course", async () => {
      (repo.existsByCode as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(
        service.create(VALID_REQUEST, "faculty-uuid-1", "inst-uuid-1"),
      ).rejects.toThrow(DuplicateObjectiveCodeError);
    });

    it("throws InvalidBloomLevelError for invalid bloom level", async () => {
      const badRequest = {
        ...VALID_REQUEST,
        bloom_level: "memorize" as CreateSLORequest["bloom_level"],
      };

      await expect(
        service.create(badRequest, "faculty-uuid-1", "inst-uuid-1"),
      ).rejects.toThrow(InvalidBloomLevelError);
    });
  });

  describe("findById", () => {
    it("returns SLO model from Supabase by id", async () => {
      const result = await service.findById("slo-uuid-1");

      expect(repo.findById).toHaveBeenCalledWith("slo-uuid-1");
      expect(result.id).toBe("slo-uuid-1");
      expect(result.course_id).toBe("course-uuid-1");
    });

    it("throws ObjectiveNotFoundError when id does not exist", async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(
        ObjectiveNotFoundError,
      );
    });
  });

  describe("findByCourseId", () => {
    it("returns paginated SLOs filtered by course_id", async () => {
      const result = await service.findByCourseId({
        course_id: "course-uuid-1",
      });

      expect(repo.findByCourseId).toHaveBeenCalledWith({
        course_id: "course-uuid-1",
      });
      expect(result.objectives).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("filters by status when provided", async () => {
      await service.findByCourseId({
        course_id: "course-uuid-1",
        status: "active",
      });

      expect(repo.findByCourseId).toHaveBeenCalledWith({
        course_id: "course-uuid-1",
        status: "active",
      });
    });

    it("filters by bloom_level when provided", async () => {
      await service.findByCourseId({
        course_id: "course-uuid-1",
        bloom_level: "analyze",
      });

      expect(repo.findByCourseId).toHaveBeenCalledWith({
        course_id: "course-uuid-1",
        bloom_level: "analyze",
      });
    });
  });

  describe("update", () => {
    it("updates allowed fields in Supabase and Neo4j", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new SLOService(repo, driver);

      const result = await neo4jService.update("slo-uuid-1", {
        title: "Updated title",
      });

      expect(repo.update).toHaveBeenCalled();
      expect(result.id).toBe("slo-uuid-1");
    });

    it("throws ObjectiveNotFoundError when id does not exist", async () => {
      (repo.update as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ObjectiveNotFoundError("nonexistent"),
      );

      await expect(
        service.update("nonexistent", { title: "Updated" }),
      ).rejects.toThrow(ObjectiveNotFoundError);
    });
  });

  describe("archive", () => {
    it("sets status to 'archived' in Supabase and Neo4j", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new SLOService(repo, driver);

      await neo4jService.archive("slo-uuid-1");

      expect(repo.archive).toHaveBeenCalledWith("slo-uuid-1");
      const runCall = (session.run as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as string;
      expect(runCall).toContain("archived");
    });

    it("throws ObjectiveNotFoundError when id does not exist", async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.archive("nonexistent")).rejects.toThrow(
        ObjectiveNotFoundError,
      );
    });
  });
});
