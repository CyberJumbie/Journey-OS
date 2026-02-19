import { BaseFrameworkNode } from "./framework-node.types";

/**
 * USMLE organ systems (e.g., Cardiovascular, Respiratory).
 * Neo4j label: USMLE_System | Unique constraint on: code
 * [NODE_REGISTRY v1.0 SS Layer 2: 16 nodes, Tier 0]
 */
export interface USMLESystem extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;
}

/**
 * USMLE scientific disciplines (e.g., Anatomy, Pathology).
 * Neo4j label: USMLE_Discipline | Unique constraint on: code
 * [NODE_REGISTRY v1.0 SS Layer 2: 7 nodes, Tier 0]
 */
export interface USMLEDiscipline extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;
}

/**
 * USMLE physician tasks (e.g., Diagnosis, Management).
 * Neo4j label: USMLE_Task | Unique constraint on: code
 * [NODE_REGISTRY v1.0 SS Layer 2: 4 nodes, Tier 0]
 */
export interface USMLETask extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;
}

/**
 * USMLE detailed topic from Step 1 outline.
 * Neo4j label: USMLE_Topic | Unique constraint on: code
 * (USMLE_System)-[:HAS_TOPIC]->(USMLE_Topic)
 * [NODE_REGISTRY v1.0 SS Layer 2: ~200 nodes, Tier 0]
 */
export interface USMLETopic extends BaseFrameworkNode {
  readonly framework: "usmle";
  readonly code: string;
  readonly parent_system: string;
}
