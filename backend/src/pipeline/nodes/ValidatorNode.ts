/**
 * ValidatorNode — validates the generated item against 10 NBME quality rules.
 *
 * Pure function validation, NO AI calls.
 * All rules are warnings in Phase 1 (never block generation).
 *
 * Input state: vignette, stem, options (from prior nodes)
 * Output state: validationResults (array of ValidationResult)
 */

import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import { runAllRules } from '../validators/nbme-rules.js';

export class ValidatorNode implements IPipelineNode {
  readonly name = 'validator';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] running 10 NBME validation rules`);

    // ── 1. Assemble the generated question from state ────────────────────────────
    const generatedQuestion = {
      vignette: state.vignette,
      stem: state.stem,
      options: state.options,
    };

    // ── 2. Run all 10 validation rules ───────────────────────────────────────────
    const results = runAllRules(generatedQuestion);

    // ── 3. Compute summary ───────────────────────────────────────────────────────
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const failedRules = results
      .filter((r) => !r.passed)
      .map((r) => r.rule)
      .join(', ');

    const summary = failed === 0
      ? `Validation complete: ${passed}/${results.length} rules passed.`
      : `Validation complete: ${passed}/${results.length} passed, ${failed} warnings (${failedRules}).`;

    console.log(`[${this.name}] ${summary}`);

    // ── 4. Build state update ────────────────────────────────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withValidationResults(results)
      .build();

    // ── 5. TEXT_MESSAGE for CopilotKit UI ────────────────────────────────────────
    const textMessage = new AIMessage({ content: summary });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
