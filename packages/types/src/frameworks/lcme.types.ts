import { BaseFrameworkNode } from "./framework-node.types";

/**
 * LCME accreditation standards (12 functional areas).
 * Neo4j label: LCME_Standard | Unique constraint on: number
 * [NODE_REGISTRY v1.0 SS Layer 2: 12 nodes, Tier 0]
 */
export interface LCMEStandard extends BaseFrameworkNode {
  readonly framework: "lcme";
  readonly number: string;
  readonly title: string;
}

/**
 * LCME sub-elements within standards.
 * Neo4j label: LCME_Element | Unique constraint on: number
 * (LCME_Standard)-[:HAS_ELEMENT]->(LCME_Element)
 * [NODE_REGISTRY v1.0 SS Layer 2: 93 nodes, Tier 0]
 */
export interface LCMEElement extends BaseFrameworkNode {
  readonly framework: "lcme";
  readonly number: string;
  readonly title: string;
}
