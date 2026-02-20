/**
 * Template Service — business logic + DualWrite orchestration.
 * [STORY-F-4] Ownership, sharing, versioning, duplicate logic.
 */

import type { Driver } from "neo4j-driver";
import type {
  TemplateDTO,
  TemplateVersionDTO,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateListQuery,
  TemplateListResponse,
} from "@journey-os/types";
import {
  TemplateNotFoundError,
  TemplatePermissionError,
  ValidationError,
} from "../../errors";
import type { TemplateRepository } from "../../repositories/template.repository";
import { TemplateModel } from "../../models/template.model";

export class TemplateService {
  readonly #repository: TemplateRepository;
  readonly #neo4jDriver: Driver | null;

  constructor(
    repository: TemplateRepository,
    neo4jDriver: Driver | null = null,
  ) {
    this.#repository = repository;
    this.#neo4jDriver = neo4jDriver;
  }

  async create(
    request: CreateTemplateRequest,
    userId: string,
    institutionId: string,
  ): Promise<TemplateDTO> {
    this.#validateDifficultyDistribution(request.difficulty_distribution);

    const template = await this.#repository.create({
      institution_id: institutionId,
      owner_id: userId,
      name: request.name,
      description: request.description ?? "",
      question_type: request.question_type,
      difficulty_distribution: { ...request.difficulty_distribution },
      bloom_levels: [...request.bloom_levels],
      scope_config: request.scope_config ? { ...request.scope_config } : {},
      prompt_overrides: request.prompt_overrides
        ? { ...request.prompt_overrides }
        : {},
      metadata: request.metadata ? { ...request.metadata } : {},
      sharing_level: request.sharing_level ?? "private",
    });

    await this.#tryNeo4jCreate(template, userId);

    return template;
  }

  async getById(
    id: string,
    userId: string,
    userInstitutionId: string,
  ): Promise<TemplateDTO> {
    const dto = await this.#repository.findById(id);
    if (!dto) {
      throw new TemplateNotFoundError(id);
    }

    const model = new TemplateModel(dto);
    if (!model.canBeAccessedBy(userId, userInstitutionId)) {
      throw new TemplatePermissionError("read", id);
    }

    return dto;
  }

  async list(
    query: TemplateListQuery,
    userId: string,
    userInstitutionId: string,
  ): Promise<TemplateListResponse> {
    return this.#repository.list(query, userId, userInstitutionId);
  }

  async update(
    id: string,
    request: UpdateTemplateRequest,
    userId: string,
  ): Promise<TemplateDTO> {
    const dto = await this.#repository.findById(id);
    if (!dto) {
      throw new TemplateNotFoundError(id);
    }

    const model = new TemplateModel(dto);
    model.assertOwnership(userId, "update");

    if (request.difficulty_distribution) {
      this.#validateDifficultyDistribution(request.difficulty_distribution);
    }

    // Snapshot current state before applying changes
    const snapshot = model.createVersionSnapshot(userId);
    await this.#repository.createVersion(snapshot);

    // Build update fields
    const updateFields: Record<string, unknown> = {
      current_version: dto.current_version + 1,
    };
    if (request.name !== undefined) updateFields.name = request.name;
    if (request.description !== undefined)
      updateFields.description = request.description;
    if (request.question_type !== undefined)
      updateFields.question_type = request.question_type;
    if (request.difficulty_distribution !== undefined)
      updateFields.difficulty_distribution = request.difficulty_distribution;
    if (request.bloom_levels !== undefined)
      updateFields.bloom_levels = request.bloom_levels;
    if (request.scope_config !== undefined)
      updateFields.scope_config = request.scope_config;
    if (request.prompt_overrides !== undefined)
      updateFields.prompt_overrides = request.prompt_overrides;
    if (request.metadata !== undefined)
      updateFields.metadata = request.metadata;
    if (request.sharing_level !== undefined)
      updateFields.sharing_level = request.sharing_level;

    const updated = await this.#repository.update(id, updateFields);

    await this.#tryNeo4jUpdate(updated);

    return updated;
  }

  async delete(id: string, userId: string): Promise<void> {
    const dto = await this.#repository.findById(id);
    if (!dto) {
      throw new TemplateNotFoundError(id);
    }

    const model = new TemplateModel(dto);
    model.assertOwnership(userId, "delete");

    await this.#tryNeo4jDelete(id);
    await this.#repository.delete(id);
  }

  async duplicate(
    id: string,
    newName: string | undefined,
    userId: string,
    userInstitutionId: string,
  ): Promise<TemplateDTO> {
    const dto = await this.#repository.findById(id);
    if (!dto) {
      throw new TemplateNotFoundError(id);
    }

    const model = new TemplateModel(dto);
    if (!model.canBeAccessedBy(userId, userInstitutionId)) {
      throw new TemplatePermissionError("duplicate", id);
    }

    const duplicated = await this.#repository.create({
      institution_id: userInstitutionId,
      owner_id: userId,
      name: newName ?? `${dto.name} (Copy)`,
      description: dto.description,
      question_type: dto.question_type,
      difficulty_distribution: { ...dto.difficulty_distribution },
      bloom_levels: [...dto.bloom_levels],
      scope_config: { ...dto.scope_config },
      prompt_overrides: { ...dto.prompt_overrides },
      metadata: { ...dto.metadata },
      sharing_level: "private",
    });

    await this.#tryNeo4jCreate(duplicated, userId);

    return duplicated;
  }

  async getVersions(
    templateId: string,
    userId: string,
    userInstitutionId: string,
  ): Promise<TemplateVersionDTO[]> {
    const dto = await this.#repository.findById(templateId);
    if (!dto) {
      throw new TemplateNotFoundError(templateId);
    }

    const model = new TemplateModel(dto);
    if (!model.canBeAccessedBy(userId, userInstitutionId)) {
      throw new TemplatePermissionError("read versions of", templateId);
    }

    return this.#repository.findVersions(templateId);
  }

  #validateDifficultyDistribution(dist: {
    easy: number;
    medium: number;
    hard: number;
  }): void {
    const sum = dist.easy + dist.medium + dist.hard;
    if (Math.abs(sum - 1.0) >= 0.001) {
      throw new ValidationError("Difficulty distribution must sum to 1.0");
    }
  }

  async #tryNeo4jCreate(template: TemplateDTO, ownerId: string): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      const result = await session.run(
        `CREATE (t:Template {
           id: $id,
           name: $name,
           sharing_level: $sharing_level,
           question_type: $question_type
         })
         WITH t
         OPTIONAL MATCH (u:User {id: $owner_id})
         FOREACH (_ IN CASE WHEN u IS NOT NULL THEN [1] ELSE [] END |
           CREATE (u)-[:OWNS]->(t)
         )
         RETURN elementId(t) AS nodeId`,
        {
          id: template.id,
          name: template.name,
          sharing_level: template.sharing_level,
          question_type: template.question_type,
          owner_id: ownerId,
        },
      );

      const nodeId = result.records[0]?.get("nodeId") as string | undefined;
      await this.#repository.updateSyncStatus(
        template.id,
        nodeId ?? null,
        "synced",
      );
    } catch (error: unknown) {
      console.warn(
        `[TemplateService] Neo4j DualWrite failed for Template ${template.id}:`,
        error,
      );
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jUpdate(template: TemplateDTO): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `MATCH (t:Template {id: $id})
         SET t.name = $name, t.sharing_level = $sharing_level,
             t.question_type = $question_type`,
        {
          id: template.id,
          name: template.name,
          sharing_level: template.sharing_level,
          question_type: template.question_type,
        },
      );
    } catch (error: unknown) {
      console.warn(
        `[TemplateService] Neo4j DualWrite update failed for Template ${template.id}:`,
        error,
      );
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jDelete(id: string): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(`MATCH (t:Template {id: $id}) DETACH DELETE t`, { id });
    } catch (error: unknown) {
      console.warn(
        `[TemplateService] Neo4j DualWrite delete failed for Template ${id}:`,
        error,
      );
    } finally {
      await session.close();
    }
  }
}
