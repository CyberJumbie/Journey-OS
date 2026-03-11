/**
 * RevalidateNode — thin wrapper that runs the full 30-rule validator
 * + Cover the Options check on edited content during review mode.
 *
 * Delegates to ValidatorNode.execute() to avoid duplicating validation logic.
 * This node exists as a separate graph node so the review branch has its own
 * named step for observability and logging.
 */

import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { ValidatorNode } from './ValidatorNode';

export class RevalidateNode implements IPipelineNode {
  readonly name = 'revalidate';

  private readonly validatorNode: ValidatorNode;

  constructor() {
    this.validatorNode = new ValidatorNode();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] revalidating edited content for item ${state.itemId}`);

    // Delegate to the existing ValidatorNode — same 30 rules + Cover the Options
    const result = await this.validatorNode.execute(state);

    console.log(`[${this.name}] revalidation complete`);

    return result;
  }
}
