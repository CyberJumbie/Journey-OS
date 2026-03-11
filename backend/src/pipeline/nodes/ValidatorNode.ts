/**
 * ValidatorNode — validates the generated item against 30 NBME quality rules
 * plus an AI-powered "Cover the Options" check (Sonnet).
 *
 * Phase 2 upgrade (P2-003):
 * - 10 original rules (R001–R010) from nbme-rules.ts
 * - 20 extended rules (R011–R030) from rules-R011-R030.ts
 * - Cover the Options AI check (only runs if all structural rules pass)
 *
 * Blocking rules (R001–R005): vignette_present, stem_question_mark,
 * exactly_five_options, one_correct, similar_length.
 * All other rules are warnings (never block generation).
 *
 * Input state: vignette, stem, options (from prior nodes)
 * Output state: validationResults (array of ValidationResult)
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, ValidationResult } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import { runAllRules } from '../validators/nbme-rules';
import { runAllExtendedRules } from '../validators/rules-R011-R030';
import AnthropicClient from '../../lib/AnthropicClient';

/**
 * Load a prompt template from the prompts directory.
 * Rule 8: Prompts in separate .txt files, never inline.
 */
function loadPrompt(name: string): string {
  return readFileSync(
    path.join(__dirname, '../prompts', `${name}.txt`),
    'utf-8',
  );
}

// ── Blocking rule IDs (R001–R005) ────────────────────────────────────────────────

const BLOCKING_RULES = new Set([
  'vignette_present',
  'stem_question_mark',
  'exactly_five_options',
  'one_correct',
  'similar_length',
]);

// ── Cover the Options response shape ─────────────────────────────────────────────

interface CoverTheOptionsResponse {
  allOptionsAddressedByStem: boolean;
  weakOptions: string[];
  recommendation: string;
}

export class ValidatorNode implements IPipelineNode {
  readonly name = 'validator';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] running 30 NBME validation rules`);

    // ── 1. Assemble the generated question from state ────────────────────────────
    const generatedQuestion = {
      vignette: state.vignette,
      stem: state.stem,
      options: state.options,
    };

    // ── 2. Run all 30 structural validation rules ────────────────────────────────
    const coreResults = runAllRules(generatedQuestion);
    const extendedResults = runAllExtendedRules(generatedQuestion);
    const allStructuralResults: ValidationResult[] = [...coreResults, ...extendedResults];

    // ── 3. Check if any blocking rules failed ────────────────────────────────────
    const blockingFailures = allStructuralResults.filter(
      (r) => !r.passed && BLOCKING_RULES.has(r.rule),
    );
    const allStructuralPassed = allStructuralResults.every((r) => r.passed);

    // ── 4. Cover the Options (Sonnet) — only if all structural rules pass ────────
    let coverResult: ValidationResult | null = null;

    if (allStructuralPassed) {
      console.log(`[${this.name}] all structural rules passed — running Cover the Options`);
      coverResult = await this.runCoverTheOptions(state);
    } else if (blockingFailures.length > 0) {
      console.log(
        `[${this.name}] ${blockingFailures.length} blocking rule(s) failed — skipping Cover the Options`,
      );
    } else {
      console.log(
        `[${this.name}] structural warnings detected — skipping Cover the Options to save cost`,
      );
    }

    // ── 5. Combine all results ───────────────────────────────────────────────────
    const allResults: ValidationResult[] = coverResult
      ? [...allStructuralResults, coverResult]
      : allStructuralResults;

    // ── 6. Compute summary ───────────────────────────────────────────────────────
    const passed = allResults.filter((r) => r.passed).length;
    const failed = allResults.filter((r) => !r.passed).length;
    const failedRules = allResults
      .filter((r) => !r.passed)
      .map((r) => r.rule)
      .join(', ');

    let summary = failed === 0
      ? `Validation: ${passed}/${allResults.length} passed.`
      : `Validation: ${passed}/${allResults.length} passed, ${failed} warnings (${failedRules}).`;

    if (coverResult) {
      summary += coverResult.passed
        ? ' Cover the Options: all options addressed.'
        : ` Cover the Options: ${coverResult.message}`;
    }

    console.log(`[${this.name}] ${summary}`);

    // ── 7. Build state update ────────────────────────────────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withValidationResults(allResults)
      .build();

    // ── 8. TEXT_MESSAGE for CopilotKit UI ────────────────────────────────────────
    const textMessage = new AIMessage({ content: summary });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  // ── Cover the Options — AI-powered option analysis ───────────────────────────

  private async runCoverTheOptions(state: WorkbenchState): Promise<ValidationResult> {
    const systemPrompt = loadPrompt('cover-the-options-system');
    const anthropic = AnthropicClient.getInstance();

    const userPrompt = `Evaluate the following NBME-style assessment item using the Cover the Options method.

## Vignette
${state.vignette}

## Stem
${state.stem}

## Options
${state.options.map((o) => `${o.label}. ${o.text}${o.is_correct ? ' (correct)' : ''}`).join('\n')}

Perform the Cover the Options analysis and respond with JSON only.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 1024,
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        return {
          rule: 'cover_the_options',
          passed: false,
          message: 'Cover the Options: unexpected response format',
        };
      }

      const parsed: CoverTheOptionsResponse = JSON.parse(content.text);

      if (parsed.allOptionsAddressedByStem) {
        return {
          rule: 'cover_the_options',
          passed: true,
          message: 'All options are addressed by the clinical scenario',
        };
      }

      return {
        rule: 'cover_the_options',
        passed: false,
        message: `Weak options: ${parsed.weakOptions.join(', ')}. ${parsed.recommendation}`,
      };
    } catch (error) {
      console.error(`[${this.name}] Cover the Options failed:`, error);
      return {
        rule: 'cover_the_options',
        passed: false,
        message: 'Cover the Options: AI evaluation failed — manual review recommended',
      };
    }
  }
}
