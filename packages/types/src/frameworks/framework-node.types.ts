/**
 * Union of all 8 framework identifiers used as discriminators.
 * [NODE_REGISTRY v1.0 SS Layer 2]
 */
export type FrameworkId =
  | "usmle"
  | "lcme"
  | "acgme"
  | "aamc"
  | "ume"
  | "epa"
  | "bloom"
  | "miller";

/**
 * All 15 canonical Neo4j labels for Layer 2 framework nodes.
 * SCREAMING_SNAKE for acronym-prefixed, PascalCase for single-concept.
 * [NODE_REGISTRY v1.0 SS Naming Conventions]
 */
export type Neo4jFrameworkLabel =
  | "USMLE_System"
  | "USMLE_Discipline"
  | "USMLE_Task"
  | "USMLE_Topic"
  | "LCME_Standard"
  | "LCME_Element"
  | "ACGME_Domain"
  | "ACGME_Subdomain"
  | "AAMC_Domain"
  | "AAMC_Competency"
  | "EPA"
  | "BloomLevel"
  | "MillerLevel"
  | "UME_Competency"
  | "UME_Subcompetency";

/**
 * Layer 2 intra-framework and cross-framework relationships.
 * [NODE_REGISTRY v1.0 SS Layer 2 Relationships]
 */
export type FrameworkRelationshipType =
  | "HAS_TOPIC"
  | "HAS_ELEMENT"
  | "HAS_SUBDOMAIN"
  | "HAS_COMPETENCY"
  | "HAS_SUBCOMPETENCY"
  | "ALIGNS_WITH"
  | "NEXT_LEVEL";

/**
 * Base properties shared by ALL Layer 2 framework nodes.
 * [NODE_REGISTRY v1.0 SS Layer 2 — all node types carry id + name]
 */
export interface BaseFrameworkNode {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly framework: FrameworkId;
  readonly level?: number;
}

/**
 * All valid framework ID strings for runtime validation.
 */
export const FRAMEWORK_IDS: readonly FrameworkId[] = [
  "usmle",
  "lcme",
  "acgme",
  "aamc",
  "ume",
  "epa",
  "bloom",
  "miller",
] as const;
