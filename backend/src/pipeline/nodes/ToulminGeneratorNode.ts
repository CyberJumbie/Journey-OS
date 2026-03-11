/**
 * ToulminGeneratorNode — generates a Toulmin evidentiary argument for ECD.
 *
 * Runs after tagger, before critic_agent in both generation and review branches.
 * Uses Claude Sonnet (claude-sonnet-4-6) — quality matters for ECD structure (Rule 6).
 * Prompt loaded from .txt file (Rule 8: never inline prompts).
 *
 * All 6 Toulmin fields must be present (TOULMIN_ALL_FIELDS).
 * On failure: logs warning, sets toulmin to null, continues pipeline.
 */

import fs from 'fs';
import path from 'path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, ToulminArgument } from '@journey-os/shared-types';
import { ToulminArgumentSchema } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import AnthropicClient from '../../lib/AnthropicClient';
import { ItemRepository } from '../../repositories/item.repository';

/** Load a prompt from the prompts directory. Never inline prompts (Rule 8). */
function loadPrompt(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '../prompts', `${name}.txt`),
    'utf-8',
  );
}

/** Sonnet model — quality matters for ECD structure (Rule 6). */
const TOULMIN_MODEL = 'claude-sonnet-4-6-20250514';

/** Required Toulmin fields — all must be present (TOULMIN_ALL_FIELDS). */
const TOULMIN_FIELDS: ReadonlyArray<keyof ToulminArgument> = [
  'claim',
  'data',
  'warrant',
  'backing',
  'rebuttal',
  'qualifier',
] as const;

export class ToulminGeneratorNode implements IPipelineNode {
  readonly name = 'toulmin_generator';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] generating Toulmin argument with Sonnet`);

    // ── 1. Load prompt template (Rule 8) ──────────────────────────────────────
    const promptTemplate = loadPrompt('toulmin-generator-system');

    // ── 2. Build the user message from item state ─────────────────────────────
    const optionsText = state.options
      .map((opt) => `${opt.label}. ${opt.text}${opt.is_correct ? ' (correct)' : ''}`)
      .join('\n');

    const correctOption = state.options.find((opt) => opt.is_correct);
    const correctText = correctOption
      ? `${correctOption.label}. ${correctOption.text}`
      : 'N/A';

    // Substitute placeholders in the prompt template to build user message
    const userMessage = promptTemplate
      .replace('{vignette}', state.vignette || 'N/A')
      .replace('{stem}', state.stem || 'N/A')
      .replace('{options}', optionsText || 'N/A')
      .replace('{correct_option}', correctText)
      .replace('{explanation}', state.context || 'N/A');

    // ── 3. TEXT_MESSAGE: "Building evidence chain..." ─────────────────────────
    const progressMessage = new AIMessage({
      content: 'Building evidence chain...',
    });

    // ── 4. Call Claude Sonnet ──────────────────────────────────────────────────
    let toulmin: ToulminArgument | null = null;

    try {
      const anthropic = AnthropicClient.getInstance();
      const message = await anthropic.messages.create({
        model: TOULMIN_MODEL,
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 1024,
      });

      // Extract text from response
      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in Sonnet response');
      }

      const rawJson = textBlock.text.trim();
      const parsed: unknown = JSON.parse(rawJson);

      // ── 5. Validate with Zod and enforce all 6 fields ────────────────────
      const validated = ToulminArgumentSchema.parse(parsed);

      // Ensure all fields are non-empty; replace empty with 'N/A'
      toulmin = {
        claim: validated.claim || 'N/A',
        data: validated.data || 'N/A',
        warrant: validated.warrant || 'N/A',
        backing: validated.backing || 'N/A',
        rebuttal: validated.rebuttal || 'N/A',
        qualifier: validated.qualifier || 'N/A',
      };

      // Double-check all 6 fields present (TOULMIN_ALL_FIELDS)
      for (const field of TOULMIN_FIELDS) {
        if (!toulmin[field]) {
          toulmin[field] = 'N/A';
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[${this.name}] Toulmin generation failed: ${errorMessage}`);

      // On failure: set toulmin to null, continue pipeline (never block)
      const failUpdate = new WorkbenchStateBuilder()
        .withToulmin(null as unknown as ToulminArgument)
        .build();

      const failMessage = new AIMessage({
        content: `Toulmin argument skipped: ${errorMessage}`,
      });

      return {
        ...failUpdate,
        toulmin: null,
        messages: [progressMessage, failMessage],
      } as Partial<WorkbenchState>;
    }

    // ── 6. Write to Supabase (Rule 2: Supabase first) ────────────────────────
    if (state.itemId) {
      try {
        const itemRepo = new ItemRepository();
        await itemRepo.updateToulmin(state.itemId, toulmin);
        console.log(`[${this.name}] Toulmin written to Supabase ${state.itemId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[${this.name}] Supabase Toulmin write error: ${errorMessage}`);
      }
    } else {
      console.warn(`[${this.name}] no itemId in state — skipping DB write`);
    }

    // ── 7. Build STATE_DELTA with toulmin object ──────────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withToulmin(toulmin)
      .build();

    const summaryMessage = new AIMessage({
      content: `Evidence chain built: claim="${toulmin.claim.substring(0, 60)}..."`,
    });

    console.log(`[${this.name}] Toulmin argument generated successfully`);

    return {
      ...stateUpdate,
      messages: [progressMessage, summaryMessage],
    } as Partial<WorkbenchState>;
  }
}
