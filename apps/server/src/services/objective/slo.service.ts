/**
 * SLO Service — business logic + DualWrite orchestration.
 * [STORY-IA-2] Supabase first, Neo4j second, sync_status tracked.
 */

import type { Driver } from "neo4j-driver";
import type {
  SLO,
  CreateSLORequest,
  UpdateSLORequest,
  SLOListQuery,
  SLOListResponse,
} from "@journey-os/types";
import { VALID_BLOOM_LEVELS } from "@journey-os/types";
import {
  DuplicateObjectiveCodeError,
  InvalidBloomLevelError,
  ObjectiveNotFoundError,
} from "../../errors";
import type { SLORepository } from "../../repositories/slo.repository";
import { SLOModel } from "../../models/slo.model";

export class SLOService {
  readonly #repository: SLORepository;
  readonly #neo4jDriver: Driver | null;

  constructor(repository: SLORepository, neo4jDriver: Driver | null = null) {
    this.#repository = repository;
    this.#neo4jDriver = neo4jDriver;
  }

  async create(
    request: CreateSLORequest,
    createdBy: string,
    institutionId: string,
  ): Promise<SLO> {
    // Validate bloom level
    if (!VALID_BLOOM_LEVELS.includes(request.bloom_level)) {
      throw new InvalidBloomLevelError(request.bloom_level);
    }

    // Check code uniqueness within course
    const exists = await this.#repository.existsByCode(
      request.code,
      request.course_id,
    );
    if (exists) {
      throw new DuplicateObjectiveCodeError(request.code, request.course_id);
    }

    // Supabase write (primary)
    const slo = await this.#repository.create(
      request,
      createdBy,
      institutionId,
    );

    // Neo4j DualWrite (secondary, best-effort)
    await this.#tryNeo4jCreate(slo);

    return slo;
  }

  async findById(id: string): Promise<SLO> {
    const row = await this.#repository.findById(id);
    if (!row) {
      throw new ObjectiveNotFoundError(id);
    }
    const model = SLOModel.fromRow(row as unknown as Record<string, unknown>);
    return model.toDTO();
  }

  async findByCourseId(query: SLOListQuery): Promise<SLOListResponse> {
    return this.#repository.findByCourseId(query);
  }

  async update(id: string, request: UpdateSLORequest): Promise<SLO> {
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

  async #tryNeo4jCreate(slo: SLO): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      const result = await session.run(
        `MATCH (c:Course {id: $courseId})
         CREATE (c)-[:HAS_SLO]->(s:SLO {
           id: $id,
           code: $code,
           title: $title,
           description: $description,
           bloom_level: $bloom_level,
           status: $status
         })
         RETURN elementId(s) AS nodeId`,
        {
          courseId: slo.course_id,
          id: slo.id,
          code: slo.code,
          title: slo.title,
          description: slo.description,
          bloom_level: slo.bloom_level,
          status: slo.status,
        },
      );

      const nodeId = result.records[0]?.get("nodeId") as string | undefined;
      await this.#updateSyncStatus(slo.id, "synced", nodeId ?? null);
    } catch (error: unknown) {
      console.warn(
        `[SLOService] Neo4j DualWrite failed for SLO ${slo.id}:`,
        error,
      );
      await this.#updateSyncStatus(slo.id, "failed", null);
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jUpdate(slo: SLO): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `MATCH (s:SLO {id: $id})
         SET s.title = $title, s.description = $description,
             s.bloom_level = $bloom_level, s.status = $status`,
        {
          id: slo.id,
          title: slo.title,
          description: slo.description,
          bloom_level: slo.bloom_level,
          status: slo.status,
        },
      );
      await this.#updateSyncStatus(slo.id, "synced", slo.graph_node_id);
    } catch (error: unknown) {
      console.warn(
        `[SLOService] Neo4j DualWrite update failed for SLO ${slo.id}:`,
        error,
      );
      await this.#updateSyncStatus(slo.id, "failed", slo.graph_node_id);
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jArchive(id: string): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(`MATCH (s:SLO {id: $id}) SET s.status = 'archived'`, {
        id,
      });
      await this.#updateSyncStatus(id, "synced", null);
    } catch (error: unknown) {
      console.warn(
        `[SLOService] Neo4j DualWrite archive failed for SLO ${id}:`,
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
      console.warn(`[SLOService] Failed to update sync_status for SLO ${id}`);
    }
  }
}
