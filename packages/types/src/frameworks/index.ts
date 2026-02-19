export type {
  FrameworkId,
  Neo4jFrameworkLabel,
  FrameworkRelationshipType,
  BaseFrameworkNode,
} from "./framework-node.types";
export { FRAMEWORK_IDS } from "./framework-node.types";
export type {
  USMLESystem,
  USMLEDiscipline,
  USMLETask,
  USMLETopic,
} from "./usmle.types";
export type { LCMEStandard, LCMEElement } from "./lcme.types";
export type { ACGMEDomain, ACGMESubdomain } from "./acgme.types";
export type { AAMCDomain, AAMCCompetency } from "./aamc.types";
export type { UMECompetency, UMESubcompetency } from "./ume.types";
export type { EPAActivity } from "./epa.types";
export type { BloomLevelNode } from "./bloom.types";
export type { MillerLevelNode } from "./miller.types";

import type {
  USMLESystem,
  USMLEDiscipline,
  USMLETask,
  USMLETopic,
} from "./usmle.types";
import type { LCMEStandard, LCMEElement } from "./lcme.types";
import type { ACGMEDomain, ACGMESubdomain } from "./acgme.types";
import type { AAMCDomain, AAMCCompetency } from "./aamc.types";
import type { UMECompetency, UMESubcompetency } from "./ume.types";
import type { EPAActivity } from "./epa.types";
import type { BloomLevelNode } from "./bloom.types";
import type { MillerLevelNode } from "./miller.types";

/**
 * Union of all framework node types.
 * Use the `framework` discriminator to narrow.
 */
export type FrameworkNode =
  | USMLESystem
  | USMLEDiscipline
  | USMLETask
  | USMLETopic
  | LCMEStandard
  | LCMEElement
  | ACGMEDomain
  | ACGMESubdomain
  | AAMCDomain
  | AAMCCompetency
  | UMECompetency
  | UMESubcompetency
  | EPAActivity
  | BloomLevelNode
  | MillerLevelNode;

/**
 * Maps Neo4j labels to their TypeScript interfaces.
 * Used by repositories and seed scripts for type-safe node creation.
 */
export interface FrameworkLabelMap {
  USMLE_System: USMLESystem;
  USMLE_Discipline: USMLEDiscipline;
  USMLE_Task: USMLETask;
  USMLE_Topic: USMLETopic;
  LCME_Standard: LCMEStandard;
  LCME_Element: LCMEElement;
  ACGME_Domain: ACGMEDomain;
  ACGME_Subdomain: ACGMESubdomain;
  AAMC_Domain: AAMCDomain;
  AAMC_Competency: AAMCCompetency;
  EPA: EPAActivity;
  BloomLevel: BloomLevelNode;
  MillerLevel: MillerLevelNode;
  UME_Competency: UMECompetency;
  UME_Subcompetency: UMESubcompetency;
}
