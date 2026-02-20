import type { Driver, Session } from "neo4j-driver";
import type {
  FrameworkSummary,
  FrameworkListResponse,
} from "@journey-os/types";
import { FrameworkQueryError } from "../../errors/framework.errors";

interface FrameworkRegistryEntry {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly label: string;
  readonly icon: string;
  readonly relationship: string;
}

const FRAMEWORK_REGISTRY: readonly FrameworkRegistryEntry[] = [
  {
    key: "usmle_systems",
    name: "USMLE Systems",
    description:
      "Organ systems tested on USMLE Step exams, organizing medical knowledge by body system.",
    label: "USMLE_System",
    icon: "stethoscope",
    relationship: "HAS_TOPIC",
  },
  {
    key: "usmle_disciplines",
    name: "USMLE Disciplines",
    description:
      "Medical disciplines and specialties assessed across USMLE Step examinations.",
    label: "USMLE_Discipline",
    icon: "book-open",
    relationship: "HAS_TOPIC",
  },
  {
    key: "usmle_tasks",
    name: "USMLE Physician Tasks",
    description:
      "Core physician tasks and competencies evaluated in USMLE assessments.",
    label: "USMLE_Task",
    icon: "clipboard-list",
    relationship: "HAS_TOPIC",
  },
  {
    key: "lcme",
    name: "LCME Standards",
    description:
      "Liaison Committee on Medical Education accreditation standards for medical school programs.",
    label: "LCME_Standard",
    icon: "shield-check",
    relationship: "HAS_TOPIC",
  },
  {
    key: "acgme",
    name: "ACGME Competencies",
    description:
      "Accreditation Council for Graduate Medical Education core competency domains.",
    label: "ACGME_Competency",
    icon: "award",
    relationship: "HAS_TOPIC",
  },
  {
    key: "aamc",
    name: "AAMC Competencies",
    description:
      "Association of American Medical Colleges competency framework for medical education.",
    label: "AAMC_Competency",
    icon: "graduation-cap",
    relationship: "HAS_TOPIC",
  },
  {
    key: "epa_ume",
    name: "EPA/UME Competencies",
    description:
      "Entrustable Professional Activities for Undergraduate Medical Education.",
    label: "EPA_UME_Competency",
    icon: "target",
    relationship: "HAS_TOPIC",
  },
  {
    key: "bloom_miller",
    name: "Bloom/Miller Taxonomy",
    description:
      "Combined Bloom's cognitive taxonomy and Miller's clinical competence pyramid.",
    label: "Bloom_Miller_Level",
    icon: "layers",
    relationship: "HAS_TOPIC",
  },
];

export { FRAMEWORK_REGISTRY };

export class FrameworkService {
  readonly #driver: Driver;

  constructor(driver: Driver) {
    this.#driver = driver;
  }

  async getFrameworkList(): Promise<FrameworkListResponse> {
    let session: Session;
    try {
      session = this.#driver.session();
    } catch (error) {
      throw new FrameworkQueryError(
        "Neo4j driver is unavailable. Cannot query framework data.",
      );
    }

    try {
      const frameworks: FrameworkSummary[] = [];

      for (const entry of FRAMEWORK_REGISTRY) {
        const countResult = await session.run(
          `MATCH (n:${entry.label}) RETURN count(n) AS count`,
        );
        const nodeCount = countResult.records[0]?.get("count")?.toNumber() ?? 0;

        let hierarchyDepth = 1;
        if (nodeCount > 0) {
          const depthResult = await session.run(
            `MATCH path = (root:${entry.label})-[:${entry.relationship}*]->(leaf:${entry.label})
             WHERE NOT ()-[:${entry.relationship}]->(root)
             AND NOT (leaf)-[:${entry.relationship}]->()
             RETURN max(length(path)) + 1 AS depth`,
          );
          const rawDepth = depthResult.records[0]?.get("depth");
          hierarchyDepth = rawDepth ? rawDepth.toNumber() : 1;
        }

        frameworks.push({
          framework_key: entry.key,
          name: entry.name,
          description: entry.description,
          node_count: nodeCount,
          hierarchy_depth: hierarchyDepth,
          icon: entry.icon,
        });
      }

      frameworks.sort((a, b) => b.node_count - a.node_count);

      return { frameworks };
    } finally {
      await session.close();
    }
  }
}
