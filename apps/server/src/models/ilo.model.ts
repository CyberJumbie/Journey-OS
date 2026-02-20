/**
 * ILO domain model.
 * [STORY-IA-4] OOP class with #private fields and public getters.
 */

import type {
  ILO,
  BloomLevel,
  ObjectiveStatus,
  SyncStatus,
} from "@journey-os/types";
import { ObjectiveNotFoundError } from "../errors";

export class ILOModel {
  readonly #id: string;
  readonly #institutionId: string;
  readonly #code: string;
  readonly #title: string;
  readonly #description: string;
  readonly #bloomLevel: BloomLevel;
  readonly #status: ObjectiveStatus;
  readonly #createdBy: string;
  readonly #graphNodeId: string | null;
  readonly #syncStatus: SyncStatus;
  readonly #createdAt: string;
  readonly #updatedAt: string;

  constructor(data: ILO) {
    this.#id = data.id;
    this.#institutionId = data.institution_id;
    this.#code = data.code;
    this.#title = data.title;
    this.#description = data.description;
    this.#bloomLevel = data.bloom_level;
    this.#status = data.status;
    this.#createdBy = data.created_by;
    this.#graphNodeId = data.graph_node_id;
    this.#syncStatus = data.sync_status;
    this.#createdAt = data.created_at;
    this.#updatedAt = data.updated_at;
  }

  get id(): string {
    return this.#id;
  }
  get institutionId(): string {
    return this.#institutionId;
  }
  get code(): string {
    return this.#code;
  }
  get title(): string {
    return this.#title;
  }
  get description(): string {
    return this.#description;
  }
  get bloomLevel(): BloomLevel {
    return this.#bloomLevel;
  }
  get status(): ObjectiveStatus {
    return this.#status;
  }
  get createdBy(): string {
    return this.#createdBy;
  }
  get graphNodeId(): string | null {
    return this.#graphNodeId;
  }
  get syncStatus(): SyncStatus {
    return this.#syncStatus;
  }
  get createdAt(): string {
    return this.#createdAt;
  }
  get updatedAt(): string {
    return this.#updatedAt;
  }

  static fromRow(row: Record<string, unknown>): ILOModel {
    if (!row || !row.id) {
      throw new ObjectiveNotFoundError("unknown");
    }

    return new ILOModel({
      id: row.id as string,
      institution_id: row.institution_id as string,
      code: row.code as string,
      title: row.title as string,
      description: (row.description as string) ?? "",
      bloom_level: row.bloom_level as BloomLevel,
      status: row.status as ObjectiveStatus,
      created_by: row.created_by as string,
      graph_node_id: (row.graph_node_id as string) ?? null,
      sync_status: row.sync_status as SyncStatus,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    });
  }

  toDTO(): ILO {
    return {
      id: this.#id,
      institution_id: this.#institutionId,
      code: this.#code,
      title: this.#title,
      description: this.#description,
      bloom_level: this.#bloomLevel,
      status: this.#status,
      created_by: this.#createdBy,
      graph_node_id: this.#graphNodeId,
      sync_status: this.#syncStatus,
      created_at: this.#createdAt,
      updated_at: this.#updatedAt,
    };
  }

  toNeo4jProperties(): Record<string, unknown> {
    const props: Record<string, unknown> = {
      id: this.#id,
      code: this.#code,
      title: this.#title,
      bloom_level: this.#bloomLevel,
      status: this.#status,
    };
    if (this.#description) {
      props.description = this.#description;
    }
    return props;
  }
}
