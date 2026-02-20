import type {
  SeedResult,
  SeedNodeError,
  VerificationResult,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { BaseSeeder } from "./base-seeder";
import { ACGME_DOMAINS, ACGME_SUBDOMAINS } from "./data/acgme.data";

const EXPECTED_COUNTS = {
  ACGME_Domain: 6,
  ACGME_Subdomain: 30,
  total: 36,
} as const;

const DOMAIN_MERGE_QUERY = `
MERGE (n:ACGME_Domain {code: $code})
SET n.id = $id, n.name = $name, n.framework = $framework, n.level = $level
`;

const SUBDOMAIN_MERGE_QUERY = `
MERGE (s:ACGME_Subdomain {code: $code})
SET s.id = $id, s.name = $name, s.framework = $framework,
    s.parent_domain = $parent_domain, s.sort_order = $sort_order
WITH s
MATCH (d:ACGME_Domain {code: $parent_domain})
MERGE (d)-[:HAS_SUBDOMAIN]->(s)
`;

const ORPHAN_QUERY = `
MATCH (s:ACGME_Subdomain) WHERE NOT (:ACGME_Domain)-[:HAS_SUBDOMAIN]->(s)
RETURN count(s) AS orphan_count
`;

/**
 * Seeds ACGME framework data into Neo4j.
 * Creates 36 nodes: 6 domains + 30 subdomains.
 * Domains must be seeded before subdomains (HAS_SUBDOMAIN relationship depends on domain nodes).
 */
export class ACGMESeeder extends BaseSeeder {
  readonly name = "acgme";
  readonly label: Neo4jFrameworkLabel = "ACGME_Domain";

  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalRelationships = 0;
    const allErrors: SeedNodeError[] = [];

    const domainResult = await this.executeBatch({
      label: "ACGME_Domain",
      items: ACGME_DOMAINS,
      mergeQuery: DOMAIN_MERGE_QUERY,
    });
    totalCreated += domainResult.nodesCreated;
    totalUpdated += domainResult.nodesUpdated;
    allErrors.push(...domainResult.errors);

    const subdomainResult = await this.executeBatch({
      label: "ACGME_Subdomain",
      items: ACGME_SUBDOMAINS,
      mergeQuery: SUBDOMAIN_MERGE_QUERY,
    });
    totalCreated += subdomainResult.nodesCreated;
    totalUpdated += subdomainResult.nodesUpdated;
    totalRelationships += subdomainResult.nodesCreated;
    allErrors.push(...subdomainResult.errors);

    return {
      framework: "acgme",
      label: this.label,
      nodesCreated: totalCreated,
      nodesUpdated: totalUpdated,
      relationshipsCreated: totalRelationships,
      durationMs: Date.now() - startTime,
      errors: allErrors,
    };
  }

  async verify(): Promise<VerificationResult> {
    const domainCount = await this.countNodes("ACGME_Domain");
    const subdomainCount = await this.countNodes("ACGME_Subdomain");
    const totalCount = domainCount + subdomainCount;
    const orphanCount = await this.#countOrphans();

    const countsMatch =
      domainCount === EXPECTED_COUNTS.ACGME_Domain &&
      subdomainCount === EXPECTED_COUNTS.ACGME_Subdomain;

    const passed = countsMatch && orphanCount === 0;

    return {
      framework: "acgme",
      label: this.label,
      expectedCount: EXPECTED_COUNTS.total,
      actualCount: totalCount,
      passed,
      orphanCount,
      details: [
        `Domains: ${domainCount}/${EXPECTED_COUNTS.ACGME_Domain}`,
        `Subdomains: ${subdomainCount}/${EXPECTED_COUNTS.ACGME_Subdomain}`,
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
