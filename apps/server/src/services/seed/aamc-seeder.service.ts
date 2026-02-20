import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { AAMC_DOMAINS } from "./data/aamc.data";

const EXPECTED_COUNTS = {
  AAMC_Domain: 8,
  total: 8,
} as const;

const DOMAIN_MERGE_QUERY = `
MERGE (n:AAMC_Domain {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework, n.sort_order = $sort_order
`;

/**
 * Seeds AAMC framework data into Neo4j.
 * Creates 8 AAMC_Domain nodes (flat, no hierarchy).
 */
export class AAMCSeeder extends BaseSeeder {
  readonly name = "aamc";
  readonly label: Neo4jFrameworkLabel = "AAMC_Domain";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    const allErrors: SeedNodeError[] = [];

    const result = await this.executeBatch({
      label: "AAMC_Domain",
      items: AAMC_DOMAINS,
      mergeQuery: DOMAIN_MERGE_QUERY,
    });
    allErrors.push(...result.errors);

    return {
      framework: "aamc",
      label: this.label,
      nodesCreated: result.nodesCreated,
      nodesUpdated: result.nodesUpdated,
      relationshipsCreated: 0,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const count = await this.countNodes("AAMC_Domain");

    return {
      framework: "aamc",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: count,
      passed: count === EXPECTED_COUNTS.total,
      orphanCount: 0,
      details: `Domains: ${count}/${EXPECTED_COUNTS.total}`,
    };
  }
}
