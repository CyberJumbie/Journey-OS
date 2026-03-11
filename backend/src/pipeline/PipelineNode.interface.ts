/**
 * PipelineNode interface — contract for all generation pipeline nodes.
 *
 * Each node receives the current WorkbenchState and returns a partial update.
 * LangGraph merges the partial into the annotated state via reducers.
 */

import type { WorkbenchState } from '@journey-os/shared-types';

export interface IPipelineNode {
  /** Human-readable name for logging and observability. */
  readonly name: string;

  /**
   * Execute this pipeline step.
   * @param state - Current graph state snapshot.
   * @returns Partial state update to merge.
   */
  execute(state: WorkbenchState): Promise<Partial<WorkbenchState>>;
}
