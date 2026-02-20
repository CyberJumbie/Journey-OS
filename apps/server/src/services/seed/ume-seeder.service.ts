import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { UME_COMPETENCIES, UME_SUBCOMPETENCIES } from "./data/ume.data";

const EXPECTED_COUNTS = {
  UME_Competency: 6,
  UME_Subcompetency: 49,
  total: 55,
} as const;

const COMPETENCY_MERGE_QUERY = `
MERGE (n:UME_Competency {code: $code})
SET n.id = $id, n.name = $name, n.description = $description,
    n.framework = $framework
WITH n
MATCH (d:ACGME_Domain {code: $aligns_with})
MERGE (n)-[:ALIGNS_WITH]->(d)
`;

const SUBCOMPETENCY_MERGE_QUERY = `
MERGE (s:UME_Subcompetency {code: $code})
SET s.id = $id, s.name = $name, s.framework = $framework
WITH s
MATCH (c:UME_Competency {code: $parent_code})
MERGE (c)-[:HAS_SUBCOMPETENCY]->(s)
`;

const ORPHAN_QUERY = `
MATCH (s:UME_Subcompetency) WHERE NOT (:UME_Competency)-[:HAS_SUBCOMPETENCY]->(s)
RETURN count(s) AS orphan_count
`;

/**
 * Seeds UME framework data into Neo4j.
 * Creates 55 nodes: 6 competencies + 49 subcompetencies.
 * Also creates 6 ALIGNS_WITH bridges to ACGME_Domain nodes.
 * Competencies must be seeded before subcompetencies.
 * ACGME must be seeded before UME (ALIGNS_WITH depends on ACGME_Domain nodes).
 */
export class UMESeeder extends BaseSeeder {
  readonly name = "ume";
  readonly label: Neo4jFrameworkLabel = "UME_Competency";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalRelationships = 0;
    const allErrors: SeedNodeError[] = [];

    const compResult = await this.executeBatch({
      label: "UME_Competency",
      items: UME_COMPETENCIES,
      mergeQuery: COMPETENCY_MERGE_QUERY,
    });
    totalCreated += compResult.nodesCreated;
    totalUpdated += compResult.nodesUpdated;
    totalRelationships += compResult.nodesCreated;
    allErrors.push(...compResult.errors);

    const subResult = await this.executeBatch({
      label: "UME_Subcompetency",
      items: UME_SUBCOMPETENCIES,
      mergeQuery: SUBCOMPETENCY_MERGE_QUERY,
    });
    totalCreated += subResult.nodesCreated;
    totalUpdated += subResult.nodesUpdated;
    totalRelationships += subResult.nodesCreated;
    allErrors.push(...subResult.errors);

    return {
      framework: "ume",
      label: this.label,
      nodesCreated: totalCreated,
      nodesUpdated: totalUpdated,
      relationshipsCreated: totalRelationships,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const compCount = await this.countNodes("UME_Competency");
    const subCount = await this.countNodes("UME_Subcompetency");
    const totalCount = compCount + subCount;
    const orphanCount = await this.#countOrphans();

    const countsMatch =
      compCount === EXPECTED_COUNTS.UME_Competency &&
      subCount === EXPECTED_COUNTS.UME_Subcompetency;

    const passed = countsMatch && orphanCount === 0;

    return {
      framework: "ume",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: totalCount,
      passed,
      orphanCount,
      details: [
        `Competencies: ${compCount}/${EXPECTED_COUNTS.UME_Competency}`,
        `Subcompetencies: ${subCount}/${EXPECTED_COUNTS.UME_Subcompetency}`,
        `Orphans: ${orphanCount}`,
        `Total: ${totalCount}/${EXPECTED_COUNTS.total}`,
      ].join(", "),
    };
  }

  async #countOrphans(): Promise<number> {
    const session = this.driver.session();
    try {
      const result = await session.run(ORPHAN_QUERY);
      const record = result.records[0];
      if (!record) {
        return 0;
      }
      return record.get("orphan_count").toNumber();
    } finally {
      await session.close();
    }
  }
}
