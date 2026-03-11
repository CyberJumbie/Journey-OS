/**
 * VignetteBuilderNode — generates an NBME-style clinical vignette via Claude Sonnet.
 *
 * Streams the vignette character by character using the Anthropic SDK streaming API.
 * The accumulated vignette is returned in the `vignette` state field.
 *
 * Model: claude-sonnet-4-5-20250929 (generation quality — Rule 6)
 * Prompt: backend/src/pipeline/prompts/vignette-builder-system.txt (Rule 8)
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import AnthropicClient from '../../lib/AnthropicClient.js';

/** Claude Sonnet model ID for generation nodes. */
const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

/** Maximum tokens for vignette output (~200 words). */
const MAX_TOKENS = 1024;

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

export class VignetteBuilderNode implements IPipelineNode {
  readonly name = 'vignette_builder';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] generating clinical vignette for concepts: ${state.targetConcepts.join(', ')}`);

    // ── 1. Load system prompt from file ─────────────────────────────────────────
    const systemPrompt = loadPrompt('vignette-builder-system');

    // ── 2. Build user prompt with context, concepts, and faculty request ─────────
    const userPrompt = [
      `Target concepts: ${state.targetConcepts.join(', ')}`,
      `Faculty request: ${state.userMessage}`,
      '',
      'Curriculum context:',
      state.context,
    ].join('\n');

    // ── 3. Stream vignette from Claude Sonnet ───────────────────────────────────
    const anthropic = AnthropicClient.getInstance();

    const stream = anthropic.messages.stream({
      model: SONNET_MODEL,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: MAX_TOKENS,
    });

    let accumulated = '';

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        accumulated += event.delta.text;
      }
    }

    console.log(`[${this.name}] vignette generated: ${accumulated.length} chars`);

    // ── 4. Build state update via WorkbenchStateBuilder ──────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withVignette(accumulated)
      .build();

    // ── 5. TEXT_MESSAGE for CopilotKit UI ───────────────────────────────────────
    const textMessage = new AIMessage({
      content: 'Writing clinical vignette...',
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
