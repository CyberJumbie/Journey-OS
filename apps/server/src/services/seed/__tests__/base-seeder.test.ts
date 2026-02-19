import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver } from "neo4j-driver";
import type {
  SeedResult,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "../base-seeder";

// --- Mock Neo4j ---

function createMockCounters(
  nodesCreated: number = 0,
  propertiesSet: number = 0,
) {
  return {
    updates: () => ({ nodesCreated, propertiesSet }),
  };
}

function createMockSession(options?: {
  runResult?: unknown;
  executeWriteImpl?: (fn: (tx: unknown) => Promise<void>) => Promise<void>;
}) {
  const defaultRunResult = {
    records: [],
    summary: { counters: createMockCounters(1, 3) },
  };

  const mockTx = {
    run: vi.fn().mockResolvedValue(options?.runResult ?? defaultRunResult),
  };

  return {
    run: vi.fn().mockResolvedValue(
      options?.runResult ?? {
        records: [{ get: vi.fn().mockReturnValue({ toNumber: () => 6 }) }],
        summary: { counters: createMockCounters() },
      },
    ),
    close: vi.fn().mockResolvedValue(undefined),
    executeWrite:
      options?.executeWriteImpl ??
      vi.fn().mockImplementation(async (fn) => fn(mockTx)),
    _tx: mockTx,
  };
}

function createMockDriver(mockSession?: ReturnType<typeof createMockSession>) {
  const session = mockSession ?? createMockSession();
  return {
    session: vi.fn().mockReturnValue(session),
    close: vi.fn().mockResolvedValue(undefined),
    verifyConnectivity: vi.fn().mockResolvedValue(undefined),
    _mockSession: session,
  };
}

// --- Concrete test subclass ---

class TestSeeder extends BaseSeeder {
  readonly name = "TestFramework";
  readonly label: Neo4jFrameworkLabel = "BloomLevel";

  async seed(): Promise<SeedResult> {
    const batch = {
      label: this.label,
      items: [
        { id: "bloom-1", level: 1, name: "Remember" },
        { id: "bloom-2", level: 2, name: "Understand" },
      ],
      mergeQuery:
        "MERGE (n:BloomLevel {level: $level}) ON CREATE SET n.id = $id, n.name = $name",
    };

    const startTime = Date.now();
    const { nodesCreated, nodesUpdated, errors } =
      await this.executeBatch(batch);

    return {
      framework: "bloom",
      label: this.label,
      nodesCreated,
      nodesUpdated,
      relationshipsCreated: 0,
      durationMs: Date.now() - startTime,
      errors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const count = await this.countNodes(this.label);
    return {
      framework: "bloom",
      label: this.label,
      expectedCount: 6,
      actualCount: count,
      passed: count === 6,
      orphanCount: 0,
      details: `${count}/6 BloomLevel nodes verified`,
    };
  }

  /** Expose protected method for testing */
  testExecuteBatch<T>(
    ...args: Parameters<BaseSeeder["executeBatch"]>
  ): ReturnType<BaseSeeder["executeBatch"]> {
    return this.executeBatch(...args);
  }

  /** Expose protected countNodes for testing */
  testCountNodes(
    label: Neo4jFrameworkLabel,
  ): ReturnType<BaseSeeder["countNodes"]> {
    return this.countNodes(label);
  }
}

describe("BaseSeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: TestSeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new TestSeeder(mockDriver as unknown as Driver);
  });

  describe("executeBatch", () => {
    it("should execute MERGE queries in batches of 50", async () => {
      // Create 75 items — should produce 2 batches (50 + 25)
      const items = Array.from({ length: 75 }, (_, i) => ({
        id: `item-${i}`,
        level: i,
        name: `Item ${i}`,
      }));

      const batch = {
        label: "BloomLevel" as Neo4jFrameworkLabel,
        items,
        mergeQuery: "MERGE (n:BloomLevel {level: $level})",
      };

      await seeder.testExecuteBatch(batch);

      // Should create 2 sessions (one per chunk)
      expect(mockDriver.session).toHaveBeenCalledTimes(2);
    });

    it("should handle batch with fewer than 50 items", async () => {
      const batch = {
        label: "BloomLevel" as Neo4jFrameworkLabel,
        items: [
          { id: "b1", level: 1, name: "Remember" },
          { id: "b2", level: 2, name: "Understand" },
        ],
        mergeQuery: "MERGE (n:BloomLevel {level: $level})",
      };

      await seeder.testExecuteBatch(batch);

      // Should create only 1 session
      expect(mockDriver.session).toHaveBeenCalledTimes(1);
    });

    it("should return aggregate SeedResult with node counts", async () => {
      const batch = {
        label: "BloomLevel" as Neo4jFrameworkLabel,
        items: [
          { id: "b1", level: 1, name: "Remember" },
          { id: "b2", level: 2, name: "Understand" },
        ],
        mergeQuery: "MERGE (n:BloomLevel {level: $level})",
      };

      const result = await seeder.testExecuteBatch(batch);

      expect(result).toHaveProperty("nodesCreated");
      expect(result).toHaveProperty("nodesUpdated");
      expect(result).toHaveProperty("errors");
      expect(result.nodesCreated).toBeGreaterThanOrEqual(0);
    });

    it("should collect errors without stopping the batch", async () => {
      const failingTx = {
        run: vi
          .fn()
          .mockRejectedValueOnce(new Error("Node constraint violation"))
          .mockResolvedValue({
            records: [],
            summary: { counters: createMockCounters(1, 3) },
          }),
      };

      const failSession = {
        run: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        executeWrite: vi.fn().mockImplementation(async (fn) => fn(failingTx)),
      };

      const failDriver = createMockDriver();
      failDriver.session.mockReturnValue(failSession);

      const failSeeder = new TestSeeder(failDriver as unknown as Driver);

      const batch = {
        label: "BloomLevel" as Neo4jFrameworkLabel,
        items: [
          { id: "b1", level: 1, name: "Fail" },
          { id: "b2", level: 2, name: "Succeed" },
        ],
        mergeQuery: "MERGE (n:BloomLevel {level: $level})",
      };

      const result = await failSeeder.testExecuteBatch(batch);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.message).toBe("Node constraint violation");
      expect(result.nodesCreated).toBe(1);
    });

    it("should use executeWrite for transactional safety", async () => {
      const batch = {
        label: "BloomLevel" as Neo4jFrameworkLabel,
        items: [{ id: "b1", level: 1, name: "Remember" }],
        mergeQuery: "MERGE (n:BloomLevel {level: $level})",
      };

      await seeder.testExecuteBatch(batch);

      const session = mockDriver._mockSession;
      expect(session.executeWrite).toHaveBeenCalledTimes(1);
    });

    it("should close the session after batch completes", async () => {
      const batch = {
        label: "BloomLevel" as Neo4jFrameworkLabel,
        items: [{ id: "b1", level: 1, name: "Remember" }],
        mergeQuery: "MERGE (n:BloomLevel {level: $level})",
      };

      await seeder.testExecuteBatch(batch);

      const session = mockDriver._mockSession;
      expect(session.close).toHaveBeenCalledTimes(1);
    });
  });

  describe("countNodes", () => {
    it("should count nodes of a specific label", async () => {
      const count = await seeder.testCountNodes("BloomLevel");
      expect(count).toBe(6);
    });
  });

  describe("abstract methods", () => {
    it("should enforce implementation by subclass via seed()", async () => {
      const result = await seeder.seed();
      expect(result.framework).toBe("bloom");
      expect(result.label).toBe("BloomLevel");
    });
  });
});
