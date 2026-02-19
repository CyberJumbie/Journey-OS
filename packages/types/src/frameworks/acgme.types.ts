import { BaseFrameworkNode } from "./framework-node.types";

/**
 * ACGME core competency domains (6 domains).
 * Neo4j label: ACGME_Domain | Unique constraint on: code
 * [NODE_REGISTRY v1.0 SS Layer 2: 6 nodes, Tier 0]
 */
export interface ACGMEDomain extends BaseFrameworkNode {
  readonly framework: "acgme";
  readonly code: string;
}

/**
 * ACGME subdomains within competency domains.
 * Neo4j label: ACGME_Subdomain | Unique constraint on: code
 * (ACGME_Domain)-[:HAS_SUBDOMAIN]->(ACGME_Subdomain)
 * [NODE_REGISTRY v1.0 SS Layer 2: 21 nodes, Tier 0]
 */
export interface ACGMESubdomain extends BaseFrameworkNode {
  readonly framework: "acgme";
  readonly code: string;
  readonly parent_domain: string;
}
