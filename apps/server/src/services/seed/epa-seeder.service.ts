import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { EPA_ACTIVITIES } from "./data/epa.data";

const EXPECTED_COUNTS = {
  EPA: 13,
  total: 13,
} as const;

const EPA_MERGE_QUERY = `
MERGE (n:EPA {number: $number})
SET n.id = $id, n.name = $name, n.title = $title, n.framework = $framework
`;

/**
 * Seeds EPA (Entrustable Professional Activities) data into Neo4j.
 * Creates 13 EPA nodes (flat, no hierarchy).
 */
export class EPASeeder extends BaseSeeder {
  readonly name = "epa";
  readonly label: Neo4jFrameworkLabel = "EPA";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    const allErrors: SeedNodeError[] = [];

    const result = await this.executeBatch({
      label: "EPA",
      items: EPA_ACTIVITIES,
      mergeQuery: EPA_MERGE_QUERY,
    });
    allErrors.push(...result.errors);

    return {
      framework: "epa",
      label: this.label,
      nodesCreated: result.nodesCreated,
      nodesUpdated: result.nodesUpdated,
      relationshipsCreated: 0,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const count = await this.countNodes("EPA");

    return {
      framework: "epa",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: count,
      passed: count === EXPECTED_COUNTS.total,
      orphanCount: 0,
      details: `EPAs: ${count}/${EXPECTED_COUNTS.total}`,
    };
  }
}
