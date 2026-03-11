/**
 * ToulminGeneratorNode — generates Toulmin argument for ECD evidence.
 *
 * STUB: This node will be fully implemented in P2-015 (Epic 2.2).
 * For now, it passes through and sets toulmin to null.
 *
 * Uses Claude Sonnet (claude-sonnet-4-6) when fully implemented.
 * All 6 Toulmin fields must be present (TOULMIN_ALL_FIELDS).
 */

import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';

export class ToulminGeneratorNode implements IPipelineNode {
  readonly name = 'toulmin_generator';

  async execute(_state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] stub — Toulmin argument generation (coming in P2-015)`);

    const textMessage = new AIMessage({
      content: 'Toulmin argument generation (coming in P2-015)',
    });

    return {
      toulmin: null,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
