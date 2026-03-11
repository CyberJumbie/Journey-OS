/**
 * StemWriterNode — generates an NBME-style lead-in question stem via Claude Sonnet.
 *
 * Streams the stem using the Anthropic SDK streaming API.
 * The accumulated stem is returned in the `stem` state field.
 *
 * Model: claude-sonnet-4-5-20250929 (generation quality — Rule 6)
 * Prompt: backend/src/pipeline/prompts/stem-writer-system.txt (Rule 8)
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import AnthropicClient from '../../lib/AnthropicClient';

/** Claude Sonnet model ID for generation nodes. */
const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

/** Maximum tokens for stem output (~50 words). */
const MAX_TOKENS = 256;

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

export class StemWriterNode implements IPipelineNode {
  readonly name = 'stem_writer';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] crafting question stem for concepts: ${state.targetConcepts.join(', ')}`);

    // ── 1. Load system prompt from file ─────────────────────────────────────────
    const systemPrompt = loadPrompt('stem-writer-system');

    // ── 2. Build user prompt with vignette, concepts, and context ───────────────
    const userPrompt = [
      `Target concepts: ${state.targetConcepts.join(', ')}`,
      '',
      'Vignette:',
      state.vignette,
      '',
      'Curriculum context:',
      state.context,
    ].join('\n');

    // ── 3. Stream stem from Claude Sonnet ─────────────────────────────────────
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

    console.log(`[${this.name}] stem generated: ${accumulated.length} chars`);

    // ── 4. Build state update via WorkbenchStateBuilder ──────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withStem(accumulated)
      .build();

    // ── 5. TEXT_MESSAGE for CopilotKit UI ───────────────────────────────────────
    const textMessage = new AIMessage({
      content: 'Crafting question stem...',
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
