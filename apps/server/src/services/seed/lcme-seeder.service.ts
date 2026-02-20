import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { LCME_STANDARDS } from "./data/lcme.data";
import { LCME_ELEMENTS } from "./data/lcme.data";

const EXPECTED_COUNTS = {
  LCME_Standard: 12,
  LCME_Element: 93,
  total: 105,
} as const;

const STANDARD_MERGE_QUERY = `
MERGE (n:LCME_Standard {number: $number})
SET n.id = $id, n.name = $name, n.title = $title,
    n.description = $description, n.framework = $framework
`;

const ELEMENT_MERGE_QUERY = `
MERGE (e:LCME_Element {number: $number})
SET e.id = $id, e.name = $name, e.title = $title,
    e.description = $description, e.framework = $framework,
    e.standard_id = $standard_id
WITH e
MATCH (s:LCME_Standard {id: $standard_id})
MERGE (s)-[:HAS_ELEMENT]->(e)
`;

const ORPHAN_QUERY = `
MATCH (e:LCME_Element) WHERE NOT (:LCME_Standard)-[:HAS_ELEMENT]->(e)
RETURN count(e) AS orphan_count
`;

/**
 * Seeds LCME framework data into Neo4j.
 * Creates 105 nodes: 12 standards + 93 elements.
 * Standards must be seeded before elements (HAS_ELEMENT relationship depends on standard nodes).
 */
export class LCMESeeder extends BaseSeeder {
  readonly name = "lcme";
  readonly label: Neo4jFrameworkLabel = "LCME_Standard";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalRelationships = 0;
    const allErrors: SeedNodeError[] = [];

    const standardResult = await this.executeBatch({
      label: "LCME_Standard",
      items: LCME_STANDARDS,
      mergeQuery: STANDARD_MERGE_QUERY,
    });
    totalCreated += standardResult.nodesCreated;
    totalUpdated += standardResult.nodesUpdated;
    allErrors.push(...standardResult.errors);

    const elementResult = await this.executeBatch({
      label: "LCME_Element",
      items: LCME_ELEMENTS,
      mergeQuery: ELEMENT_MERGE_QUERY,
    });
    totalCreated += elementResult.nodesCreated;
    totalUpdated += elementResult.nodesUpdated;
    totalRelationships += elementResult.nodesCreated;
    allErrors.push(...elementResult.errors);

    return {
      framework: "lcme",
      label: this.label,
      nodesCreated: totalCreated,
      nodesUpdated: totalUpdated,
      relationshipsCreated: totalRelationships,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const standardCount = await this.countNodes("LCME_Standard");
    const elementCount = await this.countNodes("LCME_Element");
    const totalCount = standardCount + elementCount;
    const orphanCount = await this.#countOrphans();

    const countsMatch =
      standardCount === EXPECTED_COUNTS.LCME_Standard &&
      elementCount === EXPECTED_COUNTS.LCME_Element;

    const passed = countsMatch && orphanCount === 0;

    return {
      framework: "lcme",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: totalCount,
      passed,
      orphanCount,
      details: [
        `Standards: ${standardCount}/${EXPECTED_COUNTS.LCME_Standard}`,
        `Elements: ${elementCount}/${EXPECTED_COUNTS.LCME_Element}`,
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
