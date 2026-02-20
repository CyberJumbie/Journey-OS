/**
 * Template domain model.
 * [STORY-F-4] OOP class with #private fields, access control, and versioning.
 */

import type {
  TemplateDTO,
  TemplateVersionDTO,
  TemplateSharingLevel,
  TemplateQuestionType,
  DifficultyDistribution,
  TemplateScopeConfig,
  TemplatePromptOverrides,
  TemplateMetadata,
} from "@journey-os/types";
import { TemplatePermissionError } from "../errors";

export class TemplateModel {
  readonly #id: string;
  readonly #institutionId: string;
  readonly #ownerId: string;
  #name: string;
  #description: string;
  #questionType: TemplateQuestionType;
  #difficultyDistribution: DifficultyDistribution;
  #bloomLevels: readonly number[];
  #scopeConfig: TemplateScopeConfig;
  #promptOverrides: TemplatePromptOverrides;
  #metadata: TemplateMetadata;
  #sharingLevel: TemplateSharingLevel;
  #currentVersion: number;
  readonly #graphNodeId: string | null;
  readonly #syncStatus: "pending" | "synced" | "failed";
  readonly #createdAt: string;
  #updatedAt: string;

  constructor(data: TemplateDTO) {
    this.#id = data.id;
    this.#institutionId = data.institution_id;
    this.#ownerId = data.owner_id;
    this.#name = data.name;
    this.#description = data.description;
    this.#questionType = data.question_type;
    this.#difficultyDistribution = { ...data.difficulty_distribution };
    this.#bloomLevels = [...data.bloom_levels];
    this.#scopeConfig = { ...data.scope_config };
    this.#promptOverrides = { ...data.prompt_overrides };
    this.#metadata = { ...data.metadata };
    this.#sharingLevel = data.sharing_level;
    this.#currentVersion = data.current_version;
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
  get ownerId(): string {
    return this.#ownerId;
  }
  get name(): string {
    return this.#name;
  }
  get description(): string {
    return this.#description;
  }
  get questionType(): TemplateQuestionType {
    return this.#questionType;
  }
  get difficultyDistribution(): DifficultyDistribution {
    return { ...this.#difficultyDistribution };
  }
  get bloomLevels(): readonly number[] {
    return [...this.#bloomLevels];
  }
  get scopeConfig(): TemplateScopeConfig {
    return { ...this.#scopeConfig };
  }
  get promptOverrides(): TemplatePromptOverrides {
    return { ...this.#promptOverrides };
  }
  get metadata(): TemplateMetadata {
    return { ...this.#metadata };
  }
  get sharingLevel(): TemplateSharingLevel {
    return this.#sharingLevel;
  }
  get currentVersion(): number {
    return this.#currentVersion;
  }
  get graphNodeId(): string | null {
    return this.#graphNodeId;
  }
  get syncStatus(): "pending" | "synced" | "failed" {
    return this.#syncStatus;
  }
  get createdAt(): string {
    return this.#createdAt;
  }
  get updatedAt(): string {
    return this.#updatedAt;
  }

  canBeAccessedBy(
    userId: string,
    userInstitutionId: string,
    userCourseIds?: string[],
  ): boolean {
    if (this.#ownerId === userId) return true;
    if (this.#sharingLevel === "public") return true;
    if (
      this.#sharingLevel === "shared_institution" &&
      this.#institutionId === userInstitutionId
    )
      return true;
    if (
      this.#sharingLevel === "shared_course" &&
      this.#institutionId === userInstitutionId
    ) {
      const courseId = this.#scopeConfig.course_id;
      return !!courseId && !!userCourseIds?.includes(courseId);
    }
    return false;
  }

  canBeEditedBy(userId: string): boolean {
    return this.#ownerId === userId;
  }

  assertOwnership(userId: string, action: string): void {
    if (!this.canBeEditedBy(userId)) {
      throw new TemplatePermissionError(action, this.#id);
    }
  }

  createVersionSnapshot(createdBy: string): TemplateVersionDTO {
    return {
      id: crypto.randomUUID(),
      template_id: this.#id,
      version_number: this.#currentVersion,
      name: this.#name,
      description: this.#description,
      question_type: this.#questionType,
      difficulty_distribution: { ...this.#difficultyDistribution },
      bloom_levels: [...this.#bloomLevels],
      scope_config: { ...this.#scopeConfig },
      prompt_overrides: { ...this.#promptOverrides },
      metadata: { ...this.#metadata },
      sharing_level: this.#sharingLevel,
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };
  }

  toDTO(): TemplateDTO {
    return {
      id: this.#id,
      institution_id: this.#institutionId,
      owner_id: this.#ownerId,
      name: this.#name,
      description: this.#description,
      question_type: this.#questionType,
      difficulty_distribution: { ...this.#difficultyDistribution },
      bloom_levels: [...this.#bloomLevels],
      scope_config: { ...this.#scopeConfig },
      prompt_overrides: { ...this.#promptOverrides },
      metadata: { ...this.#metadata },
      sharing_level: this.#sharingLevel,
      current_version: this.#currentVersion,
      graph_node_id: this.#graphNodeId,
      sync_status: this.#syncStatus,
      created_at: this.#createdAt,
      updated_at: this.#updatedAt,
    };
  }

  toNeo4jProperties(): {
    id: string;
    name: string;
    sharing_level: string;
    question_type: string;
  } {
    return {
      id: this.#id,
      name: this.#name,
      sharing_level: this.#sharingLevel,
      question_type: this.#questionType,
    };
  }

  static fromRow(row: Record<string, unknown>): TemplateModel {
    return new TemplateModel({
      id: row.id as string,
      institution_id: row.institution_id as string,
      owner_id: row.owner_id as string,
      name: row.name as string,
      description: (row.description as string) ?? "",
      question_type: row.question_type as TemplateQuestionType,
      difficulty_distribution:
        row.difficulty_distribution as DifficultyDistribution,
      bloom_levels: row.bloom_levels as number[],
      scope_config: (row.scope_config as TemplateScopeConfig) ?? {},
      prompt_overrides: (row.prompt_overrides as TemplatePromptOverrides) ?? {},
      metadata: (row.metadata as TemplateMetadata) ?? {},
      sharing_level: row.sharing_level as TemplateSharingLevel,
      current_version: row.current_version as number,
      graph_node_id: (row.graph_node_id as string) ?? null,
      sync_status:
        (row.sync_status as "pending" | "synced" | "failed") ?? "pending",
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    });
  }
}
