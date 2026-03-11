/**
 * WorkbenchStateBuilder — Builder pattern for constructing partial
 * WorkbenchState updates returned by pipeline nodes.
 *
 * Never construct WorkbenchState with object literals. Use this builder.
 */

import type {
  WorkbenchState,
  PipelineStatus,
  GeneratedOption,
  ValidationResult,
  ItemTags,
  CriticScore,
  ToulminArgument,
  AutoRoute,
  RefinementTarget,
  GenerationParams,
} from '@journey-os/shared-types';

export class WorkbenchStateBuilder {
  private state: Partial<WorkbenchState> = {};

  withPipelineStatus(status: PipelineStatus): this {
    this.state.pipelineStatus = status;
    return this;
  }

  withGenerationLogId(id: string): this {
    this.state.generationLogId = id;
    return this;
  }

  withTargetConcepts(concepts: string[]): this {
    this.state.targetConcepts = concepts;
    return this;
  }

  withContext(context: string): this {
    this.state.context = context;
    return this;
  }

  withVignette(vignette: string): this {
    this.state.vignette = vignette;
    return this;
  }

  withStem(stem: string): this {
    this.state.stem = stem;
    return this;
  }

  withOptions(options: GeneratedOption[]): this {
    this.state.options = options;
    return this;
  }

  withValidationResults(results: ValidationResult[]): this {
    this.state.validationResults = results;
    return this;
  }

  withItemId(id: string): this {
    this.state.itemId = id;
    return this;
  }

  withSourceChunkIds(ids: string[]): this {
    this.state.sourceChunkIds = ids;
    return this;
  }

  // ── Phase 2 builder methods ──────────────────────────────────────────────────

  withTags(tags: ItemTags): this {
    this.state.tags = tags;
    return this;
  }

  withCriticScores(scores: CriticScore[]): this {
    this.state.criticScores = scores;
    return this;
  }

  withCriticComposite(score: number): this {
    this.state.criticComposite = score;
    return this;
  }

  withToulmin(toulmin: ToulminArgument): this {
    this.state.toulmin = toulmin;
    return this;
  }

  withAutoRoute(route: AutoRoute): this {
    this.state.autoRoute = route;
    return this;
  }

  withRetryCount(count: number): this {
    this.state.retryCount = count;
    return this;
  }

  withDedupResult(isDuplicate: boolean, similarity: number | null, itemId: string | null): this {
    this.state.isDuplicate = isDuplicate;
    this.state.dupSimilarity = similarity;
    this.state.dupItemId = itemId;
    return this;
  }

  withTaskShellId(taskShellId: string | null): this {
    this.state.taskShellId = taskShellId;
    return this;
  }

  withGenerationParams(params: GenerationParams | null): this {
    this.state.generationParams = params;
    return this;
  }

  // ── Review mode builder methods (P2-007) ─────────────────────────────────────

  withReviewItemId(reviewItemId: string | null): this {
    this.state.reviewItemId = reviewItemId;
    return this;
  }

  withEditInstruction(editInstruction: string | null): this {
    this.state.editInstruction = editInstruction;
    return this;
  }

  withEditedSections(editedSections: string[]): this {
    this.state.editedSections = editedSections;
    return this;
  }

  // ── Refinement routing (P2-009) ───────────────────────────────────────────────

  withRefinementTarget(target: RefinementTarget | null): this {
    this.state.refinementTarget = target;
    return this;
  }

  build(): Partial<WorkbenchState> {
    return { ...this.state };
  }
}
