import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { MILLER_LEVELS } from "./data/miller.data";

const EXPECTED_COUNTS = {
  MillerLevel: 4,
  total: 4,
} as const;

const MILLER_MERGE_QUERY = `
MERGE (n:MillerLevel {level: $level})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.assessment_methods = $assessment_methods
`;

/**
 * Seeds Miller's Pyramid levels into Neo4j.
 * Creates 4 MillerLevel nodes (flat, no hierarchy).
 */
export class MillerSeeder extends BaseSeeder {
  readonly name = "miller";
  readonly label: Neo4jFrameworkLabel = "MillerLevel";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    const allErrors: SeedNodeError[] = [];

    const result = await this.executeBatch({
      label: "MillerLevel",
      items: MILLER_LEVELS,
      mergeQuery: MILLER_MERGE_QUERY,
    });
    allErrors.push(...result.errors);

    return {
      framework: "miller",
      label: this.label,
      nodesCreated: result.nodesCreated,
      nodesUpdated: result.nodesUpdated,
      relationshipsCreated: 0,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const count = await this.countNodes("MillerLevel");

    return {
      framework: "miller",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: count,
      passed: count === EXPECTED_COUNTS.total,
      orphanCount: 0,
      details: `Levels: ${count}/${EXPECTED_COUNTS.total}`,
    };
  }
}
