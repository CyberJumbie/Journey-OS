/**
 * WorkbenchStateBuilder — Builder pattern for constructing partial
 * WorkbenchState updates returned by pipeline nodes.
 *
 * Never construct WorkbenchState with object literals. Use this builder.
 */

import type { WorkbenchState, PipelineStatus, GeneratedOption, ValidationResult } from '@journey-os/shared-types';

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

  build(): Partial<WorkbenchState> {
    return { ...this.state };
  }
}
