import { describe, it, expect, vi, beforeEach } from "vitest";
import { FrameworkService, FRAMEWORK_REGISTRY } from "../framework.service";
import { FrameworkQueryError } from "../../../errors/framework.errors";

function createMockRecord(values: Record<string, unknown>) {
  return {
    get(key: string) {
      const val = values[key];
      if (val === null || val === undefined) return null;
      return { toNumber: () => val as number };
    },
  };
}

function createMockSession() {
  return {
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDriver(session: ReturnType<typeof createMockSession>) {
  return {
    session: vi.fn().mockReturnValue(session),
  };
}

describe("FrameworkService", () => {
  let mockSession: ReturnType<typeof createMockSession>;
  let mockDriver: ReturnType<typeof createMockDriver>;
  let service: FrameworkService;

  beforeEach(() => {
    mockSession = createMockSession();
    mockDriver = createMockDriver(mockSession);
    service = new FrameworkService(mockDriver as never);
  });

  describe("getFrameworkList", () => {
    it("returns array of FrameworkSummary for all 8 frameworks", async () => {
      mockSession.run.mockResolvedValue({
        records: [createMockRecord({ count: 10 })],
      });

      const result = await service.getFrameworkList();

      expect(result.frameworks).toHaveLength(8);
      for (const fw of result.frameworks) {
        expect(fw).toHaveProperty("framework_key");
        expect(fw).toHaveProperty("name");
        expect(fw).toHaveProperty("description");
        expect(fw).toHaveProperty("node_count");
        expect(fw).toHaveProperty("hierarchy_depth");
        expect(fw).toHaveProperty("icon");
      }
    });

    it("queries Neo4j for node count per framework label", async () => {
      mockSession.run.mockResolvedValue({
        records: [createMockRecord({ count: 0 })],
      });

      await service.getFrameworkList();

      for (const entry of FRAMEWORK_REGISTRY) {
        expect(mockSession.run).toHaveBeenCalledWith(
          expect.stringContaining(`MATCH (n:${entry.label})`),
        );
      }
    });

    it("queries Neo4j for hierarchy depth when node_count > 0", async () => {
      mockSession.run.mockImplementation(async (query: string) => {
        if (query.includes("count(n)")) {
          return { records: [createMockRecord({ count: 50 })] };
        }
        return { records: [createMockRecord({ depth: 3 })] };
      });

      const result = await service.getFrameworkList();

      const fw = result.frameworks.find(
        (f) => f.framework_key === "usmle_systems",
      );
      expect(fw?.hierarchy_depth).toBe(3);
    });

    it("sorts frameworks by node_count descending", async () => {
      let callIndex = 0;
      const counts = [10, 50, 30, 5, 100, 20, 40, 15];
      mockSession.run.mockImplementation(async (query: string) => {
        if (query.includes("count(n)")) {
          const count = counts[callIndex++]!;
          return { records: [createMockRecord({ count })] };
        }
        return { records: [createMockRecord({ depth: 2 })] };
      });

      const result = await service.getFrameworkList();
      const nodeCounts = result.frameworks.map((f) => f.node_count);

      for (let i = 1; i < nodeCounts.length; i++) {
        expect(nodeCounts[i - 1]!).toBeGreaterThanOrEqual(nodeCounts[i]!);
      }
    });

    it("returns hierarchy_depth 1 for frameworks with no relationships", async () => {
      mockSession.run.mockImplementation(async (query: string) => {
        if (query.includes("count(n)")) {
          return { records: [createMockRecord({ count: 10 })] };
        }
        return { records: [createMockRecord({ depth: null })] };
      });

      const result = await service.getFrameworkList();

      for (const fw of result.frameworks) {
        expect(fw.hierarchy_depth).toBe(1);
      }
    });

    it("returns node_count 0 for frameworks with no nodes seeded", async () => {
      mockSession.run.mockResolvedValue({
        records: [createMockRecord({ count: 0 })],
      });

      const result = await service.getFrameworkList();

      for (const fw of result.frameworks) {
        expect(fw.node_count).toBe(0);
      }
    });

    it("includes name, description, and icon from registry", async () => {
      mockSession.run.mockResolvedValue({
        records: [createMockRecord({ count: 0 })],
      });

      const result = await service.getFrameworkList();

      const usmle = result.frameworks.find(
        (f) => f.framework_key === "usmle_systems",
      );
      expect(usmle?.name).toBe("USMLE Systems");
      expect(usmle?.description).toContain("USMLE Step exams");
      expect(usmle?.icon).toBe("stethoscope");
    });

    it("closes Neo4j session after query completes", async () => {
      mockSession.run.mockResolvedValue({
        records: [createMockRecord({ count: 0 })],
      });

      await service.getFrameworkList();

      expect(mockSession.close).toHaveBeenCalledOnce();
    });

    it("closes Neo4j session even when query fails", async () => {
      mockSession.run.mockRejectedValue(new Error("Neo4j connection lost"));

      await expect(service.getFrameworkList()).rejects.toThrow();
      expect(mockSession.close).toHaveBeenCalledOnce();
    });

    it("throws FrameworkQueryError when Neo4j driver is unavailable", async () => {
      const brokenDriver = {
        session: () => {
          throw new Error("Driver not available");
        },
      };
      const brokenService = new FrameworkService(brokenDriver as never);

      await expect(() => brokenService.getFrameworkList()).rejects.toThrow(
        FrameworkQueryError,
      );
    });
  });
});
