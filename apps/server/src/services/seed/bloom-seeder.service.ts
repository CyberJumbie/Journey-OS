import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { BLOOM_LEVELS } from "./data/bloom.data";

const EXPECTED_COUNTS = {
  BloomLevel: 6,
  total: 6,
} as const;

const BLOOM_MERGE_QUERY = `
MERGE (n:BloomLevel {level: $level})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.action_verbs = $action_verbs
`;

/**
 * Seeds Bloom's Taxonomy levels into Neo4j.
 * Creates 6 BloomLevel nodes (flat, no hierarchy).
 */
export class BloomSeeder extends BaseSeeder {
  readonly name = "bloom";
  readonly label: Neo4jFrameworkLabel = "BloomLevel";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    const allErrors: SeedNodeError[] = [];

    const result = await this.executeBatch({
      label: "BloomLevel",
      items: BLOOM_LEVELS,
      mergeQuery: BLOOM_MERGE_QUERY,
    });
    allErrors.push(...result.errors);

    return {
      framework: "bloom",
      label: this.label,
      nodesCreated: result.nodesCreated,
      nodesUpdated: result.nodesUpdated,
      relationshipsCreated: 0,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const count = await this.countNodes("BloomLevel");

    return {
      framework: "bloom",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: count,
      passed: count === EXPECTED_COUNTS.total,
      orphanCount: 0,
      details: `Levels: ${count}/${EXPECTED_COUNTS.total}`,
    };
  }
}
