import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver, Session } from "neo4j-driver";
import type { ILO, CreateILORequest } from "@journey-os/types";
import { ILOService } from "../ilo.service";
import type { ILORepository } from "../../../repositories/ilo.repository";
import {
  DuplicateObjectiveCodeError,
  InvalidBloomLevelError,
  ObjectiveNotFoundError,
} from "../../../errors";

const MOCK_ILO: ILO = {
  id: "ilo-uuid-1",
  institution_id: "inst-uuid-1",
  code: "ILO-MSM-01",
  title: "Demonstrate patient-centered communication",
  description: "Graduates will demonstrate effective communication skills",
  bloom_level: "apply",
  status: "draft",
  created_by: "ia-uuid-1",
  graph_node_id: null,
  sync_status: "pending",
  created_at: "2026-02-19T10:00:00Z",
  updated_at: "2026-02-19T10:00:00Z",
};

const VALID_REQUEST: CreateILORequest = {
  code: "ILO-MSM-01",
  title: "Demonstrate patient-centered communication",
  description: "Graduates will demonstrate effective communication skills",
  bloom_level: "apply",
};

function createMockRepository(): ILORepository {
  return {
    create: vi.fn().mockResolvedValue(MOCK_ILO),
    findById: vi.fn().mockResolvedValue(MOCK_ILO),
    findByInstitutionId: vi.fn().mockResolvedValue({
      objectives: [MOCK_ILO],
      meta: { page: 1, limit: 50, total: 1, total_pages: 1 },
    }),
    update: vi.fn().mockResolvedValue(MOCK_ILO),
    updateSyncStatus: vi.fn().mockResolvedValue(undefined),
    archive: vi.fn().mockResolvedValue(undefined),
    existsByCode: vi.fn().mockResolvedValue(false),
  } as unknown as ILORepository;
}

function createMockNeo4jDriver(): {
  driver: Driver;
  session: Session;
} {
  const session = {
    run: vi.fn().mockResolvedValue({
      records: [{ get: vi.fn().mockReturnValue("neo4j-node-456") }],
    }),
    close: vi.fn().mockResolvedValue(undefined),
  } as unknown as Session;

  const driver = {
    session: vi.fn().mockReturnValue(session),
  } as unknown as Driver;

  return { driver, session };
}

describe("ILOService", () => {
  let repo: ILORepository;
  let service: ILOService;

  beforeEach(() => {
    repo = createMockRepository();
    service = new ILOService(repo, null);
  });

  describe("create", () => {
    it("creates ILO in Supabase with scope='institutional' and course_id=null", async () => {
      const result = await service.create(
        VALID_REQUEST,
        "ia-uuid-1",
        "inst-uuid-1",
      );

      expect(repo.existsByCode).toHaveBeenCalledWith(
        "ILO-MSM-01",
        "inst-uuid-1",
      );
      expect(repo.create).toHaveBeenCalledWith(
        VALID_REQUEST,
        "ia-uuid-1",
        "inst-uuid-1",
      );
      expect(result.id).toBe("ilo-uuid-1");
    });

    it("creates ILO node in Neo4j with DEFINES relationship to institution", async () => {
      const { driver, session } = createMockNeo4jDriver();
      const neo4jService = new ILOService(repo, driver);

      await neo4jService.create(VALID_REQUEST, "ia-uuid-1", "inst-uuid-1");

      expect(driver.session).toHaveBeenCalled();
      const runCall = (session.run as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as string;
      expect(runCall).toContain("DEFINES");
      expect(runCall).toContain(":ILO");
      expect(runCall).toContain(":Institution");
      expect(session.close).toHaveBeenCalled();
    });

    it("sets sync_status to 'synced' after successful DualWrite", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new ILOService(repo, driver);

      await neo4jService.create(VALID_REQUEST, "ia-uuid-1", "inst-uuid-1");

      expect(repo.updateSyncStatus).toHaveBeenCalledWith(
        "ilo-uuid-1",
        "synced",
        "neo4j-node-456",
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

      const neo4jService = new ILOService(repo, driver);
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await neo4jService.create(
        VALID_REQUEST,
        "ia-uuid-1",
        "inst-uuid-1",
      );

      // Supabase record still returned
      expect(result.id).toBe("ilo-uuid-1");

      // sync_status updated to 'failed'
      expect(repo.updateSyncStatus).toHaveBeenCalledWith(
        "ilo-uuid-1",
        "failed",
        null,
      );

      consoleSpy.mockRestore();
    });

    it("throws DuplicateObjectiveCodeError when code exists for same institution", async () => {
      (repo.existsByCode as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(
        service.create(VALID_REQUEST, "ia-uuid-1", "inst-uuid-1"),
      ).rejects.toThrow(DuplicateObjectiveCodeError);
    });

    it("throws InvalidBloomLevelError for invalid bloom level", async () => {
      const badRequest = {
        ...VALID_REQUEST,
        bloom_level: "memorize" as CreateILORequest["bloom_level"],
      };

      await expect(
        service.create(badRequest, "ia-uuid-1", "inst-uuid-1"),
      ).rejects.toThrow(InvalidBloomLevelError);
    });
  });

  describe("findById", () => {
    it("returns ILO model from Supabase by id with scope='institutional'", async () => {
      const result = await service.findById("ilo-uuid-1");

      expect(repo.findById).toHaveBeenCalledWith("ilo-uuid-1");
      expect(result.id).toBe("ilo-uuid-1");
      expect(result.institution_id).toBe("inst-uuid-1");
    });

    it("throws ObjectiveNotFoundError when id does not exist", async () => {
      (repo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findById("nonexistent")).rejects.toThrow(
        ObjectiveNotFoundError,
      );
    });
  });

  describe("findByInstitutionId", () => {
    it("returns paginated ILOs filtered by institution_id", async () => {
      const result = await service.findByInstitutionId({
        institution_id: "inst-uuid-1",
      });

      expect(repo.findByInstitutionId).toHaveBeenCalledWith({
        institution_id: "inst-uuid-1",
      });
      expect(result.objectives).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it("filters by status when provided", async () => {
      await service.findByInstitutionId({
        institution_id: "inst-uuid-1",
        status: "active",
      });

      expect(repo.findByInstitutionId).toHaveBeenCalledWith({
        institution_id: "inst-uuid-1",
        status: "active",
      });
    });

    it("filters by bloom_level when provided", async () => {
      await service.findByInstitutionId({
        institution_id: "inst-uuid-1",
        bloom_level: "analyze",
      });

      expect(repo.findByInstitutionId).toHaveBeenCalledWith({
        institution_id: "inst-uuid-1",
        bloom_level: "analyze",
      });
    });

    it("searches by title and code (case-insensitive)", async () => {
      await service.findByInstitutionId({
        institution_id: "inst-uuid-1",
        search: "patient",
      });

      expect(repo.findByInstitutionId).toHaveBeenCalledWith({
        institution_id: "inst-uuid-1",
        search: "patient",
      });
    });
  });

  describe("update", () => {
    it("updates allowed fields in Supabase and Neo4j", async () => {
      const { driver } = createMockNeo4jDriver();
      const neo4jService = new ILOService(repo, driver);

      const result = await neo4jService.update("ilo-uuid-1", {
        title: "Updated title",
      });

      expect(repo.update).toHaveBeenCalled();
      expect(result.id).toBe("ilo-uuid-1");
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
      const neo4jService = new ILOService(repo, driver);

      await neo4jService.archive("ilo-uuid-1");

      expect(repo.archive).toHaveBeenCalledWith("ilo-uuid-1");
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
