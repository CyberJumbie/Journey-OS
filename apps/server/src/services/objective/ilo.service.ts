/**
 * ILO Service — business logic + DualWrite orchestration.
 * [STORY-IA-4] Supabase first, Neo4j second, sync_status tracked.
 */

import type { Driver } from "neo4j-driver";
import type {
  ILO,
  CreateILORequest,
  UpdateILORequest,
  ILOListQuery,
  ILOListResponse,
} from "@journey-os/types";
import { VALID_BLOOM_LEVELS } from "@journey-os/types";
import {
  DuplicateObjectiveCodeError,
  InvalidBloomLevelError,
  ObjectiveNotFoundError,
} from "../../errors";
import type { ILORepository } from "../../repositories/ilo.repository";
import { ILOModel } from "../../models/ilo.model";

export class ILOService {
  readonly #repository: ILORepository;
  readonly #neo4jDriver: Driver | null;

  constructor(repository: ILORepository, neo4jDriver: Driver | null = null) {
    this.#repository = repository;
    this.#neo4jDriver = neo4jDriver;
  }

  async create(
    request: CreateILORequest,
    createdBy: string,
    institutionId: string,
  ): Promise<ILO> {
    // Validate bloom level
    if (!VALID_BLOOM_LEVELS.includes(request.bloom_level)) {
      throw new InvalidBloomLevelError(request.bloom_level);
    }

    // Check code uniqueness within institution
    const exists = await this.#repository.existsByCode(
      request.code,
      institutionId,
    );
    if (exists) {
      throw new DuplicateObjectiveCodeError(request.code, institutionId);
    }

    // Supabase write (primary)
    const ilo = await this.#repository.create(
      request,
      createdBy,
      institutionId,
    );

    // Neo4j DualWrite (secondary, best-effort)
    await this.#tryNeo4jCreate(ilo, institutionId);

    return ilo;
  }

  async findById(id: string): Promise<ILO> {
    const row = await this.#repository.findById(id);
    if (!row) {
      throw new ObjectiveNotFoundError(id);
    }
    const model = ILOModel.fromRow(row as unknown as Record<string, unknown>);
    return model.toDTO();
  }

  async findByInstitutionId(query: ILOListQuery): Promise<ILOListResponse> {
    return this.#repository.findByInstitutionId(query);
  }

  async update(id: string, request: UpdateILORequest): Promise<ILO> {
    if (
      request.bloom_level &&
      !VALID_BLOOM_LEVELS.includes(request.bloom_level)
    ) {
      throw new InvalidBloomLevelError(request.bloom_level);
    }

    const updated = await this.#repository.update(id, request);

    // Neo4j DualWrite update
    await this.#tryNeo4jUpdate(updated);

    return updated;
  }

  async archive(id: string): Promise<void> {
    // Verify exists
    const existing = await this.#repository.findById(id);
    if (!existing) {
      throw new ObjectiveNotFoundError(id);
    }

    await this.#repository.archive(id);

    // Neo4j DualWrite archive
    await this.#tryNeo4jArchive(id);
  }

  async #tryNeo4jCreate(ilo: ILO, institutionId: string): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      const result = await session.run(
        `MATCH (inst:Institution {id: $institutionId})
         CREATE (inst)-[:DEFINES]->(i:ILO {
           id: $id,
           code: $code,
           title: $title,
           description: $description,
           bloom_level: $bloom_level,
           status: $status
         })
         RETURN elementId(i) AS nodeId`,
        {
          institutionId,
          id: ilo.id,
          code: ilo.code,
          title: ilo.title,
          description: ilo.description,
          bloom_level: ilo.bloom_level,
          status: ilo.status,
        },
      );

      const nodeId = result.records[0]?.get("nodeId") as string | undefined;
      await this.#updateSyncStatus(ilo.id, "synced", nodeId ?? null);
    } catch (error: unknown) {
      console.warn(
        `[ILOService] Neo4j DualWrite failed for ILO ${ilo.id}:`,
        error,
      );
      await this.#updateSyncStatus(ilo.id, "failed", null);
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jUpdate(ilo: ILO): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `MATCH (i:ILO {id: $id})
         SET i.title = $title, i.description = $description,
             i.bloom_level = $bloom_level, i.status = $status`,
        {
          id: ilo.id,
          title: ilo.title,
          description: ilo.description,
          bloom_level: ilo.bloom_level,
          status: ilo.status,
        },
      );
      await this.#updateSyncStatus(ilo.id, "synced", ilo.graph_node_id);
    } catch (error: unknown) {
      console.warn(
        `[ILOService] Neo4j DualWrite update failed for ILO ${ilo.id}:`,
        error,
      );
      await this.#updateSyncStatus(ilo.id, "failed", ilo.graph_node_id);
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jArchive(id: string): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(`MATCH (i:ILO {id: $id}) SET i.status = 'archived'`, {
        id,
      });
      await this.#updateSyncStatus(id, "synced", null);
    } catch (error: unknown) {
      console.warn(
        `[ILOService] Neo4j DualWrite archive failed for ILO ${id}:`,
        error,
      );
      await this.#updateSyncStatus(id, "failed", null);
    } finally {
      await session.close();
    }
  }

  async #updateSyncStatus(
    id: string,
    syncStatus: "synced" | "failed",
    graphNodeId: string | null,
  ): Promise<void> {
    try {
      await this.#repository.updateSyncStatus(id, syncStatus, graphNodeId);
    } catch {
      console.warn(`[ILOService] Failed to update sync_status for ILO ${id}`);
    }
  }
}
