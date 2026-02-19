import type { Driver } from "neo4j-driver";
import type {
  Seeder,
  SeedRunReport,
  SeedResult,
  VerificationResult,
} from "@journey-os/types";
import { SeedError } from "../../errors/seed.errors";

/**
 * All 15 Layer 2 framework uniqueness constraints.
 * Uses CREATE CONSTRAINT IF NOT EXISTS for idempotency.
 */
const FRAMEWORK_CONSTRAINTS: readonly string[] = [
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_System) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Discipline) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Task) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:USMLE_Topic) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Standard) REQUIRE n.number IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:LCME_Element) REQUIRE n.number IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Domain) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:ACGME_Subdomain) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Domain) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:AAMC_Competency) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:EPA) REQUIRE n.number IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:BloomLevel) REQUIRE n.level IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:MillerLevel) REQUIRE n.level IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Competency) REQUIRE n.code IS UNIQUE",
  "CREATE CONSTRAINT IF NOT EXISTS FOR (n:UME_Subcompetency) REQUIRE n.code IS UNIQUE",
];

export { FRAMEWORK_CONSTRAINTS };

/**
 * Orchestrates seed execution across all registered framework seeders.
 * Ensures constraints exist, runs seeders in order, verifies results.
 *
 * [CODE_STANDARDS SS 3.1] — JS #private fields, constructor DI.
 */
export class SeedRunner {
  readonly #driver: Driver;
  readonly #seeders: Seeder[] = [];

  constructor(driver: Driver) {
    this.#driver = driver;
  }

  /**
   * Register a seeder for execution. Prevents duplicate labels.
   */
  registerSeeder(seeder: Seeder): void {
    const exists = this.#seeders.some((s) => s.label === seeder.label);
    if (exists) {
      throw new SeedError(`Seeder for ${seeder.label} already registered`);
    }
    this.#seeders.push(seeder);
  }

  /**
   * Execute full seed run: constraints -> seed -> verify -> report.
   */
  async run(): Promise<SeedRunReport> {
    const startTime = Date.now();
    const results: SeedResult[] = [];
    const verifications: VerificationResult[] = [];

    // 1. Verify/create constraints
    await this.#ensureConstraints();

    // 2. Run each seeder
    for (const seeder of this.#seeders) {
      try {
        console.log(`[${seeder.name}] Seeding ${seeder.label}...`);
        const result = await seeder.seed();
        results.push(result);
        console.log(
          `[${seeder.name}] ${seeder.label}: ${result.nodesCreated} created, ${result.nodesUpdated} updated (${result.durationMs}ms)`,
        );
      } catch (err) {
        console.error(
          `[${seeder.name}] FAILED: ${err instanceof Error ? err.message : String(err)}`,
        );
        results.push({
          framework: seeder.name,
          label: seeder.label,
          nodesCreated: 0,
          nodesUpdated: 0,
          relationshipsCreated: 0,
          durationMs: 0,
          errors: [
            {
              nodeId: "runner",
              label: seeder.label,
              message: err instanceof Error ? err.message : String(err),
            },
          ],
        });
      }
    }

    // 3. Verify all
    for (const seeder of this.#seeders) {
      try {
        const verification = await seeder.verify();
        verifications.push(verification);
      } catch (err) {
        verifications.push({
          framework: seeder.name,
          label: seeder.label,
          expectedCount: -1,
          actualCount: -1,
          passed: false,
          orphanCount: -1,
          details: `Verification failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    const totalDurationMs = Date.now() - startTime;
    const totalNodes = results.reduce(
      (sum, r) => sum + r.nodesCreated + r.nodesUpdated,
      0,
    );
    const totalRelationships = results.reduce(
      (sum, r) => sum + r.relationshipsCreated,
      0,
    );
    const allPassed = verifications.every((v) => v.passed);

    console.log(
      `\n[SeedRunner] Complete: ${totalNodes} nodes, ${totalRelationships} relationships (${totalDurationMs}ms)`,
    );
    console.log(
      `[SeedRunner] Verifications: ${allPassed ? "ALL PASSED" : "SOME FAILED"}`,
    );

    return {
      results,
      verifications,
      totalNodes,
      totalRelationships,
      totalDurationMs,
      allPassed,
    };
  }

  async #ensureConstraints(): Promise<void> {
    console.log("[SeedRunner] Ensuring constraints...");
    const session = this.#driver.session();
    try {
      for (const constraint of FRAMEWORK_CONSTRAINTS) {
        await session.run(constraint);
      }
      console.log(
        `[SeedRunner] ${FRAMEWORK_CONSTRAINTS.length} constraints verified`,
      );
    } finally {
      await session.close();
    }
  }
}
