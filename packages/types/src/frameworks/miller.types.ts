import { BaseFrameworkNode } from "./framework-node.types";

/**
 * Miller's Pyramid clinical competence levels.
 * Neo4j label: MillerLevel | Unique constraint on: level
 * (MillerLevel)-[:NEXT_LEVEL]->(MillerLevel) -- ordering chain
 * [NODE_REGISTRY v1.0 SS Layer 2: 4 nodes, Tier 0]
 */
export interface MillerLevelNode extends BaseFrameworkNode {
  readonly framework: "miller";
  readonly level: 1 | 2 | 3 | 4;
}
