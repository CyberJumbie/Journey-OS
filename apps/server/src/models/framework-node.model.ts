import type {
  BaseFrameworkNode,
  FrameworkId,
  Neo4jFrameworkLabel,
} from "@journey-os/types";
import { FRAMEWORK_IDS } from "@journey-os/types";
import { InvalidFrameworkNodeError } from "../errors/framework.errors";

/**
 * Domain model for Layer 2 framework nodes.
 * [CODE_STANDARDS SS 3.1] — private fields, public getters.
 */
export class FrameworkNodeModel {
  readonly #data: BaseFrameworkNode & Record<string, unknown>;
  readonly #neo4jLabel: Neo4jFrameworkLabel;

  constructor(
    data: BaseFrameworkNode & Record<string, unknown>,
    neo4jLabel: Neo4jFrameworkLabel,
  ) {
    if (!data.id || typeof data.id !== "string" || data.id.trim() === "") {
      throw new InvalidFrameworkNodeError(
        `FrameworkNodeModel requires a non-empty id, got: "${data.id}"`,
      );
    }
    if (
      !data.name ||
      typeof data.name !== "string" ||
      data.name.trim() === ""
    ) {
      throw new InvalidFrameworkNodeError(
        `FrameworkNodeModel requires a non-empty name, got: "${data.name}"`,
      );
    }
    if (!FRAMEWORK_IDS.includes(data.framework as FrameworkId)) {
      throw new InvalidFrameworkNodeError(
        `Invalid framework: "${data.framework}". Must be one of: ${FRAMEWORK_IDS.join(", ")}`,
      );
    }

    this.#data = { ...data };
    this.#neo4jLabel = neo4jLabel;
  }

  get id(): string {
    return this.#data.id;
  }

  get name(): string {
    return this.#data.name;
  }

  get description(): string | undefined {
    return this.#data.description;
  }

  get framework(): FrameworkId {
    return this.#data.framework;
  }

  get neo4jLabel(): Neo4jFrameworkLabel {
    return this.#neo4jLabel;
  }

  /**
   * Returns a plain object matching the source interface.
   */
  toDTO(): BaseFrameworkNode & Record<string, unknown> {
    return { ...this.#data };
  }

  /**
   * Returns a flat property map suitable for Cypher query parameters.
   * Strips undefined values.
   */
  toNeo4jProperties(): Record<string, unknown> {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.#data)) {
      if (value !== undefined) {
        props[key] = value;
      }
    }
    return props;
  }
}
