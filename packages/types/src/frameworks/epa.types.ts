import { BaseFrameworkNode } from "./framework-node.types";

/**
 * AAMC Core Entrustable Professional Activities.
 * Neo4j label: EPA | Unique constraint on: number
 * [NODE_REGISTRY v1.0 SS Layer 2: 13 nodes, Tier 0]
 */
export interface EPAActivity extends BaseFrameworkNode {
  readonly framework: "epa";
  readonly number: number;
  readonly title: string;
}
