import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Driver } from "neo4j-driver";
import type {
  Seeder,
  SeedResult,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { SeedRunner, FRAMEWORK_CONSTRAINTS } from "../seed-runner.service";
import { SeedError } from "../../../errors/seed.errors";

// --- Mock Neo4j Driver ---

function createMockSession() {
  return {
    run: vi.fn().mockResolvedValue({ records: [] }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDriver() {
  const session = createMockSession();
  return {
    session: vi.fn().mockReturnValue(session),
    close: vi.fn().mockResolvedValue(undefined),
    verifyConnectivity: vi.fn().mockResolvedValue(undefined),
    _mockSession: session,
  };
}

// --- Mock Seeder ---

function createMockSeeder(
  overrides?: Partial<{
    name: string;
    label: Neo4jFrameworkLabel;
    seedResult: SeedResult;
    verifyResult: VerificationResult;
    seedError: Error;
  }>,
): Seeder {
  const name = overrides?.name ?? "MockFramework";
  const label = overrides?.label ?? "BloomLevel";

  const seedResult: SeedResult = overrides?.seedResult ?? {
    framework: "bloom",
    label,
    nodesCreated: 6,
    nodesUpdated: 0,
    relationshipsCreated: 5,
    durationMs: 100,
    errors: [],
  };

  const verifyResult: VerificationResult = overrides?.verifyResult ?? {
    framework: "bloom",
    label,
    expectedCount: 6,
    actualCount: 6,
    passed: true,
    orphanCount: 0,
    details: "6/6 BloomLevel nodes verified",
  };

  return {
    name,
    label,
    seed: overrides?.seedError
      ? vi.fn().mockRejectedValue(overrides.seedError)
      : vi.fn().mockResolvedValue(seedResult),
    verify: vi.fn().mockResolvedValue(verifyResult),
  };
}

describe("SeedRunner", () => {
  let mockDriver: ReturnType<typeof createMockDriver>;
  let runner: SeedRunner;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDriver = createMockDriver();
    runner = new SeedRunner(mockDriver as unknown as Driver);
  });

  describe("run", () => {
    it("should execute all registered seeders in order", async () => {
      const seeder1 = createMockSeeder({
        name: "Seeder1",
        label: "BloomLevel",
      });
      const seeder2 = createMockSeeder({
        name: "Seeder2",
        label: "MillerLevel",
        seedResult: {
          framework: "miller",
          label: "MillerLevel",
          nodesCreated: 4,
          nodesUpdated: 0,
          relationshipsCreated: 3,
          durationMs: 50,
          errors: [],
        },
        verifyResult: {
          framework: "miller",
          label: "MillerLevel",
          expectedCount: 4,
          actualCount: 4,
          passed: true,
          orphanCount: 0,
          details: "4/4 MillerLevel nodes verified",
        },
      });

      runner.registerSeeder(seeder1);
      runner.registerSeeder(seeder2);

      const report = await runner.run();

      expect(seeder1.seed).toHaveBeenCalledTimes(1);
      expect(seeder2.seed).toHaveBeenCalledTimes(1);
      expect(report.results).toHaveLength(2);
    });

    it("should verify constraints before seeding", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      await runner.run();

      const session = mockDriver._mockSession;
      // Constraints should be run before seed
      expect(session.run).toHaveBeenCalled();
      // First calls should be constraint queries
      const firstCall = session.run.mock.calls[0]![0] as string;
      expect(firstCall).toContain("CREATE CONSTRAINT IF NOT EXISTS");
    });

    it("should return SeedRunReport with aggregate results", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      const report = await runner.run();

      expect(report.results).toHaveLength(1);
      expect(report.verifications).toHaveLength(1);
      expect(report.totalNodes).toBe(6);
      expect(report.totalRelationships).toBe(5);
      expect(report.allPassed).toBe(true);
      expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("should continue to next seeder if one fails (partial failure)", async () => {
      const failingSeeder = createMockSeeder({
        name: "FailSeeder",
        label: "BloomLevel",
        seedError: new SeedError("Seed failed"),
      });
      const successSeeder = createMockSeeder({
        name: "SuccessSeeder",
        label: "MillerLevel",
      });

      runner.registerSeeder(failingSeeder);
      runner.registerSeeder(successSeeder);

      const report = await runner.run();

      expect(report.results).toHaveLength(2);
      expect(successSeeder.seed).toHaveBeenCalledTimes(1);
      // First result should have the error
      expect(report.results[0]!.errors).toHaveLength(1);
      // Second result should be successful
      expect(report.results[1]!.nodesCreated).toBe(6);
    });

    it("should log node counts per framework to console", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      await runner.run();

      const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
      expect(
        logCalls.some(
          (msg) => typeof msg === "string" && msg.includes("BloomLevel"),
        ),
      ).toBe(true);
      expect(
        logCalls.some(
          (msg) => typeof msg === "string" && msg.includes("Complete"),
        ),
      ).toBe(true);

      consoleSpy.mockRestore();
    });

    it("should run verification after all seeders complete", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      const report = await runner.run();

      expect(seeder.verify).toHaveBeenCalledTimes(1);
      expect(report.verifications).toHaveLength(1);
      expect(report.verifications[0]!.passed).toBe(true);
    });
  });

  describe("registerSeeder", () => {
    it("should add a seeder to the runner", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      const report = await runner.run();
      expect(report.results).toHaveLength(1);
    });

    it("should prevent duplicate seeder registration", () => {
      const seeder1 = createMockSeeder({ label: "BloomLevel" });
      const seeder2 = createMockSeeder({ label: "BloomLevel" });

      runner.registerSeeder(seeder1);
      expect(() => runner.registerSeeder(seeder2)).toThrow(SeedError);
      expect(() => runner.registerSeeder(seeder2)).toThrow(
        "Seeder for BloomLevel already registered",
      );
    });
  });

  describe("verifyConstraints", () => {
    it("should check all 15 framework constraints exist", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      await runner.run();

      const session = mockDriver._mockSession;
      // Should have run all 15 constraint queries
      const constraintCalls = session.run.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" &&
          (call[0] as string).includes("CREATE CONSTRAINT"),
      );
      expect(constraintCalls).toHaveLength(15);
    });

    it("should create missing constraints if needed", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      await runner.run();

      const session = mockDriver._mockSession;
      // All constraint queries use IF NOT EXISTS
      const constraintCalls = session.run.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === "string" &&
          (call[0] as string).includes("IF NOT EXISTS"),
      );
      expect(constraintCalls).toHaveLength(FRAMEWORK_CONSTRAINTS.length);
    });
  });

  describe("idempotency", () => {
    it("should produce identical results when run twice", async () => {
      const seeder = createMockSeeder();
      runner.registerSeeder(seeder);

      const report1 = await runner.run();
      const report2 = await runner.run();

      expect(report1.totalNodes).toBe(report2.totalNodes);
      expect(report1.totalRelationships).toBe(report2.totalRelationships);
      expect(report1.allPassed).toBe(report2.allPassed);
    });
  });
});
