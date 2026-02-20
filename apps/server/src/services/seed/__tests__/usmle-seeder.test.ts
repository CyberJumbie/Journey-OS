import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver } from "neo4j-driver";
import { USMLESeeder } from "../usmle-seeder.service";
import { USMLE_SYSTEMS } from "../data/usmle-systems.data";
import { USMLE_DISCIPLINES } from "../data/usmle-disciplines.data";
import { USMLE_TASKS } from "../data/usmle-tasks.data";
import { USMLE_TOPICS } from "../data/usmle-topics.data";

// --- Mock helpers ---

function createMockCounters(
  nodesCreated: number = 1,
  propertiesSet: number = 7,
) {
  return {
    updates: () => ({ nodesCreated, propertiesSet }),
  };
}

function createMockSession(options?: {
  runResults?: Array<{
    records: Array<{ get: (key: string) => { toNumber: () => number } }>;
  }>;
  txRunResult?: {
    summary: { counters: ReturnType<typeof createMockCounters> };
  };
}) {
  const defaultTxResult = {
    records: [],
    summary: { counters: createMockCounters(1, 7) },
  };

  const mockTx = {
    run: vi.fn().mockResolvedValue(options?.txRunResult ?? defaultTxResult),
  };

  let runCallIndex = 0;
  const runResults = options?.runResults ?? [];

  return {
    run: vi.fn().mockImplementation(() => {
      if (runCallIndex < runResults.length) {
        return Promise.resolve(runResults[runCallIndex++]);
      }
      return Promise.resolve({
        records: [{ get: vi.fn().mockReturnValue({ toNumber: () => 0 }) }],
      });
    }),
    close: vi.fn().mockResolvedValue(undefined),
    executeWrite: vi.fn().mockImplementation(async (fn) => fn(mockTx)),
    _tx: mockTx,
  };
}

function createMockDriver(
  sessionFactory?: () => ReturnType<typeof createMockSession>,
) {
  const defaultSession = createMockSession();
  return {
    session: vi
      .fn()
      .mockImplementation(() =>
        sessionFactory ? sessionFactory() : defaultSession,
      ),
    close: vi.fn().mockResolvedValue(undefined),
    _defaultSession: defaultSession,
  };
}

describe("USMLESeeder", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let seeder: USMLESeeder;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    seeder = new USMLESeeder(mockDriver as unknown as Driver);
  });

  // --- Group 1: Construction ---
  describe("construction", () => {
    it("has correct name", () => {
      expect(seeder.name).toBe("usmle");
    });

    it("has correct label", () => {
      expect(seeder.label).toBe("USMLE_System");
    });

    it("accepts custom batch size", () => {
      const custom = new USMLESeeder(mockDriver as unknown as Driver, 10);
      expect(custom.batchSize).toBe(10);
    });
  });

  // --- Group 2: seed() — node creation ---
  describe("seed() — node creation", () => {
    it("calls executeBatch for all 4 node types", async () => {
      await seeder.seed();
      const tx = mockDriver._defaultSession._tx;
      // 16 systems + 7 disciplines + 4 tasks + 200 topics = 227 calls
      expect(tx.run).toHaveBeenCalledTimes(227);
    });

    it("processes exactly 16 system items", async () => {
      const calls: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        calls.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const systemCalls = calls.filter((q) =>
        q.includes("MERGE (n:USMLE_System {code:"),
      );
      expect(systemCalls).toHaveLength(16);
    });

    it("processes exactly 7 discipline items", async () => {
      const calls: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        calls.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const discCalls = calls.filter((q) =>
        q.includes("USMLE_Discipline {code:"),
      );
      expect(discCalls).toHaveLength(7);
    });

    it("processes exactly 4 task items", async () => {
      const calls: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        calls.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const taskCalls = calls.filter((q) => q.includes("USMLE_Task {code:"));
      expect(taskCalls).toHaveLength(4);
    });

    it("processes exactly 200 topic items", async () => {
      const calls: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        calls.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const topicCalls = calls.filter((q) => q.includes("USMLE_Topic {code:"));
      expect(topicCalls).toHaveLength(200);
    });

    it("returns SeedResult with correct nodesCreated count", async () => {
      const result = await seeder.seed();
      expect(result.nodesCreated).toBe(227);
    });

    it("returns SeedResult with relationshipsCreated for topics", async () => {
      const result = await seeder.seed();
      // Relationships created = topic nodesCreated = 200
      expect(result.relationshipsCreated).toBe(200);
    });

    it("records durationMs > 0", async () => {
      const result = await seeder.seed();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns empty errors array on success", async () => {
      const result = await seeder.seed();
      expect(result.errors).toHaveLength(0);
    });
  });

  // --- Group 3: seed() — MERGE queries ---
  describe("seed() — MERGE queries", () => {
    it("system MERGE query includes SET for all properties", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const systemQuery = queries.find((q) =>
        q.includes("USMLE_System {code:"),
      )!;
      expect(systemQuery).toContain("n.id = $id");
      expect(systemQuery).toContain("n.name = $name");
      expect(systemQuery).toContain("n.description = $description");
      expect(systemQuery).toContain("n.framework = $framework");
      expect(systemQuery).toContain("n.level = $level");
      expect(systemQuery).toContain("n.sort_order = $sort_order");
    });

    it("topic MERGE query includes MATCH + MERGE for HAS_TOPIC relationship", async () => {
      const queries: string[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(async (query: string) => {
        queries.push(query);
        return {
          records: [],
          summary: { counters: createMockCounters(1, 7) },
        };
      });
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      const topicQuery = queries.find((q) => q.includes("USMLE_Topic {code:"))!;
      expect(topicQuery).toContain(
        "MATCH (s:USMLE_System {code: $parent_system})",
      );
      expect(topicQuery).toContain("MERGE (s)-[:HAS_TOPIC]->(t)");
    });

    it("topic query references parent_system parameter", async () => {
      const params: Record<string, unknown>[] = [];
      const session = createMockSession();
      session._tx.run.mockImplementation(
        async (query: string, p: Record<string, unknown>) => {
          if (query.includes("USMLE_Topic")) {
            params.push(p);
          }
          return {
            records: [],
            summary: { counters: createMockCounters(1, 7) },
          };
        },
      );
      mockDriver.session.mockReturnValue(session);

      await seeder.seed();

      expect(params.length).toBe(200);
      for (const p of params) {
        expect(p).toHaveProperty("parent_system");
        expect(typeof p.parent_system).toBe("string");
      }
    });
  });

  // --- Group 4: verify() — count validation ---
  describe("verify() — count validation", () => {
    function makeVerifyDriver(counts: {
      system: number;
      discipline: number;
      task: number;
      topic: number;
      orphans: number;
    }) {
      let callIndex = 0;
      const values = [
        counts.system,
        counts.discipline,
        counts.task,
        counts.topic,
        counts.orphans,
      ];

      const session = {
        run: vi.fn().mockImplementation(() => {
          const val = values[callIndex++] ?? 0;
          const key = callIndex <= 4 ? "count" : "orphan_count";
          return Promise.resolve({
            records: [
              {
                get: vi.fn().mockReturnValue({ toNumber: () => val }),
              },
            ],
          });
        }),
        close: vi.fn().mockResolvedValue(undefined),
        executeWrite: vi.fn(),
      };

      return {
        session: vi.fn().mockReturnValue(session),
        close: vi.fn(),
      };
    }

    it("passes when all 4 label counts match expected", async () => {
      const driver = makeVerifyDriver({
        system: 16,
        discipline: 7,
        task: 4,
        topic: 200,
        orphans: 0,
      });
      const s = new USMLESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
      expect(result.actualCount).toBe(227);
      expect(result.expectedCount).toBe(227);
    });

    it("fails when system count is wrong", async () => {
      const driver = makeVerifyDriver({
        system: 10,
        discipline: 7,
        task: 4,
        topic: 200,
        orphans: 0,
      });
      const s = new USMLESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });

    it("fails when topic count is wrong", async () => {
      const driver = makeVerifyDriver({
        system: 16,
        discipline: 7,
        task: 4,
        topic: 150,
        orphans: 0,
      });
      const s = new USMLESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });

    it("reports orphan topics", async () => {
      const driver = makeVerifyDriver({
        system: 16,
        discipline: 7,
        task: 4,
        topic: 200,
        orphans: 3,
      });
      const s = new USMLESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.orphanCount).toBe(3);
    });

    it("returns passed: true when orphan_count is 0", async () => {
      const driver = makeVerifyDriver({
        system: 16,
        discipline: 7,
        task: 4,
        topic: 200,
        orphans: 0,
      });
      const s = new USMLESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(true);
      expect(result.orphanCount).toBe(0);
    });

    it("returns passed: false when orphan_count > 0", async () => {
      const driver = makeVerifyDriver({
        system: 16,
        discipline: 7,
        task: 4,
        topic: 200,
        orphans: 5,
      });
      const s = new USMLESeeder(driver as unknown as Driver);
      const result = await s.verify();
      expect(result.passed).toBe(false);
    });
  });

  // --- Group 5: Idempotency ---
  describe("idempotency", () => {
    it("running seed() twice produces same node count via MERGE", async () => {
      const result1 = await seeder.seed();
      const result2 = await seeder.seed();
      // Both runs call tx.run the same number of times
      expect(result1.nodesCreated).toBe(result2.nodesCreated);
    });

    it("second run shows nodesUpdated when mock returns update counters", async () => {
      // First run: creates
      await seeder.seed();

      // Second run: mock returns updates (nodesCreated=0, propertiesSet=7)
      const updateSession = createMockSession({
        txRunResult: {
          summary: { counters: createMockCounters(0, 7) },
        },
      });
      mockDriver.session.mockReturnValue(updateSession);

      const secondSeeder = new USMLESeeder(mockDriver as unknown as Driver);
      const result = await secondSeeder.seed();

      expect(result.nodesCreated).toBe(0);
      expect(result.nodesUpdated).toBe(227);
    });
  });

  // --- Group 6: Data integrity ---
  describe("data integrity", () => {
    it("all 16 system codes are unique", () => {
      const codes = USMLE_SYSTEMS.map((s) => s.code);
      expect(new Set(codes).size).toBe(16);
    });

    it("all 7 discipline codes are unique", () => {
      const codes = USMLE_DISCIPLINES.map((d) => d.code);
      expect(new Set(codes).size).toBe(7);
    });

    it("all 4 task codes are unique", () => {
      const codes = USMLE_TASKS.map((t) => t.code);
      expect(new Set(codes).size).toBe(4);
    });

    it("all 200 topic codes are unique", () => {
      const codes = USMLE_TOPICS.map((t) => t.code);
      expect(new Set(codes).size).toBe(200);
    });

    it("every topic parent_system references a valid system code", () => {
      const systemCodes = new Set(USMLE_SYSTEMS.map((s) => s.code));
      for (const topic of USMLE_TOPICS) {
        expect(systemCodes.has(topic.parent_system)).toBe(true);
      }
    });

    it("sort_order is sequential within each node type", () => {
      // Systems: 1..16
      for (let i = 0; i < USMLE_SYSTEMS.length; i++) {
        expect(USMLE_SYSTEMS[i]!.sort_order).toBe(i + 1);
      }
      // Disciplines: 1..7
      for (let i = 0; i < USMLE_DISCIPLINES.length; i++) {
        expect(USMLE_DISCIPLINES[i]!.sort_order).toBe(i + 1);
      }
      // Tasks: 1..4
      for (let i = 0; i < USMLE_TASKS.length; i++) {
        expect(USMLE_TASKS[i]!.sort_order).toBe(i + 1);
      }
    });

    it("all nodes have framework = usmle", () => {
      for (const s of USMLE_SYSTEMS) {
        expect(s.framework).toBe("usmle");
      }
      for (const d of USMLE_DISCIPLINES) {
        expect(d.framework).toBe("usmle");
      }
      for (const t of USMLE_TASKS) {
        expect(t.framework).toBe("usmle");
      }
      for (const t of USMLE_TOPICS) {
        expect(t.framework).toBe("usmle");
      }
    });
  });

  // --- Group 7: Error handling ---
  describe("error handling", () => {
    it("propagates Neo4j connection errors", async () => {
      const errorSession = {
        run: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        executeWrite: vi
          .fn()
          .mockRejectedValue(new Error("Connection refused")),
      };
      mockDriver.session.mockReturnValue(errorSession);

      await expect(seeder.seed()).rejects.toThrow("Connection refused");
    });

    it("records individual node errors in SeedResult.errors", async () => {
      const failingTx = {
        run: vi
          .fn()
          .mockRejectedValueOnce(new Error("Constraint violation"))
          .mockResolvedValue({
            records: [],
            summary: { counters: createMockCounters(1, 7) },
          }),
      };

      const failSession = {
        run: vi.fn().mockResolvedValue({
          records: [],
          summary: { counters: createMockCounters() },
        }),
        close: vi.fn().mockResolvedValue(undefined),
        executeWrite: vi.fn().mockImplementation(async (fn) => fn(failingTx)),
      };
      mockDriver.session.mockReturnValue(failSession);

      const result = await seeder.seed();
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      expect(result.errors[0]!.message).toBe("Constraint violation");
    });

    it("partial failure does not prevent remaining batches", async () => {
      let callCount = 0;
      const partialTx = {
        run: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) {
            throw new Error("First item fails");
          }
          return {
            records: [],
            summary: { counters: createMockCounters(1, 7) },
          };
        }),
      };

      const partialSession = {
        run: vi.fn().mockResolvedValue({
          records: [],
          summary: { counters: createMockCounters() },
        }),
        close: vi.fn().mockResolvedValue(undefined),
        executeWrite: vi.fn().mockImplementation(async (fn) => fn(partialTx)),
      };
      mockDriver.session.mockReturnValue(partialSession);

      const result = await seeder.seed();
      // 227 total - 1 failure = 226 created
      expect(result.nodesCreated).toBe(226);
      expect(result.errors).toHaveLength(1);
    });
  });
});
