import { BaseFrameworkNode } from "./framework-node.types";

/**
 * Revised Bloom's Taxonomy cognitive levels.
 * Neo4j label: BloomLevel | Unique constraint on: level
 * (BloomLevel)-[:NEXT_LEVEL]->(BloomLevel) -- ordering chain
 * [NODE_REGISTRY v1.0 SS Layer 2: 6 nodes, Tier 0]
 */
export interface BloomLevelNode extends BaseFrameworkNode {
  readonly framework: "bloom";
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly action_verbs: readonly string[];
}
