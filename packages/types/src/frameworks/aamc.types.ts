import { BaseFrameworkNode } from "./framework-node.types";

/**
 * AAMC Framework for UME domains (6 domains).
 * Neo4j label: AAMC_Domain | Unique constraint on: code
 * [NODE_REGISTRY v1.0 SS Layer 2: 6 nodes, Tier 0]
 */
export interface AAMCDomain extends BaseFrameworkNode {
  readonly framework: "aamc";
  readonly code: string;
}

/**
 * AAMC competencies within domains.
 * Neo4j label: AAMC_Competency | Unique constraint on: code
 * (AAMC_Domain)-[:HAS_COMPETENCY]->(AAMC_Competency)
 * [NODE_REGISTRY v1.0 SS Layer 2: 49 nodes, Tier 0]
 */
export interface AAMCCompetency extends BaseFrameworkNode {
  readonly framework: "aamc";
  readonly code: string;
  readonly parent_domain: string;
}
