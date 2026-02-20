import "dotenv/config";
import { Neo4jClientConfig } from "../src/config/neo4j.config";
import { SeedRunner } from "../src/services/seed/seed-runner.service";
import { USMLESeeder } from "../src/services/seed/usmle-seeder.service";
import { LCMESeeder } from "../src/services/seed/lcme-seeder.service";
import { ACGMESeeder } from "../src/services/seed/acgme-seeder.service";
import { AAMCSeeder } from "../src/services/seed/aamc-seeder.service";
import { UMESeeder } from "../src/services/seed/ume-seeder.service";
import { EPASeeder } from "../src/services/seed/epa-seeder.service";
import { BloomSeeder } from "../src/services/seed/bloom-seeder.service";
import { MillerSeeder } from "../src/services/seed/miller-seeder.service";

async function main(): Promise<void> {
  const neo4j = Neo4jClientConfig.getInstance();

  try {
    await neo4j.verifyConnectivity();
    console.log("[seed] Connected to Neo4j");

    const runner = new SeedRunner(neo4j.driver);

    // Order matters: ACGME before UME (ALIGNS_WITH cross-framework bridge)
    runner.registerSeeder(new USMLESeeder(neo4j.driver));
    runner.registerSeeder(new LCMESeeder(neo4j.driver));
    runner.registerSeeder(new ACGMESeeder(neo4j.driver));
    runner.registerSeeder(new AAMCSeeder(neo4j.driver));
    runner.registerSeeder(new UMESeeder(neo4j.driver));
    runner.registerSeeder(new EPASeeder(neo4j.driver));
    runner.registerSeeder(new BloomSeeder(neo4j.driver));
    runner.registerSeeder(new MillerSeeder(neo4j.driver));

    const report = await runner.run();

    if (!report.allPassed) {
      process.exit(1);
    }
  } catch (err) {
    console.error("[seed] Fatal error:", err);
    process.exit(1);
  } finally {
    await neo4j.close();
  }
}

main();
