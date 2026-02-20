import "dotenv/config";
import { Neo4jClientConfig } from "../src/config/neo4j.config";
import { SeedRunner } from "../src/services/seed/seed-runner.service";
import { USMLESeeder } from "../src/services/seed/usmle-seeder.service";

async function main(): Promise<void> {
  const neo4j = Neo4jClientConfig.getInstance();

  try {
    await neo4j.verifyConnectivity();
    console.log("[seed] Connected to Neo4j");

    const runner = new SeedRunner(neo4j.driver);

    runner.registerSeeder(new USMLESeeder(neo4j.driver));
    // Future stories (U-12) will register additional seeders here:
    // runner.registerSeeder(new LCMESeeder(neo4j.driver));
    // ...

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
