import { BaseFrameworkNode } from "./framework-node.types";

/**
 * AAMC UME Objectives competency areas (6 competencies).
 * Neo4j label: UME_Competency | Unique constraint on: code
 * (UME_Competency)-[:ALIGNS_WITH]->(ACGME_Domain) -- 6 bridge edges
 * [NODE_REGISTRY v1.0 SS Layer 2: 6 nodes, Tier 0]
 */
export interface UMECompetency extends BaseFrameworkNode {
  readonly framework: "ume";
  readonly code: string;
}

/**
 * UME subcompetency objectives.
 * Neo4j label: UME_Subcompetency | Unique constraint on: code
 * (UME_Competency)-[:HAS_SUBCOMPETENCY]->(UME_Subcompetency)
 * [NODE_REGISTRY v1.0 SS Layer 2: 49 nodes, Tier 0]
 */
export interface UMESubcompetency extends BaseFrameworkNode {
  readonly framework: "ume";
  readonly code: string;
  readonly do_specific?: boolean;
}
