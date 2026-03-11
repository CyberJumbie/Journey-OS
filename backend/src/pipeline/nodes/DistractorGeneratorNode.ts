/**
 * DistractorGeneratorNode — two-phase generation of NBME-style answer options.
 *
 * Phase 1 (reasoning artifact): Explain correct answer + identify 4 misconceptions.
 *   - NOT streamed to UI. Stored in generation_logs.pipeline_state only.
 *   - Model: claude-sonnet-4-5-20250929
 *
 * Phase 2 (options generation): Generate 5 options as structured JSON.
 *   - Streamed via STATE_DELTA to CopilotKit UI.
 *   - Correct answer position randomized.
 *   - Model: claude-sonnet-4-5-20250929
 *
 * Prompt files (Rule 8):
 *   - backend/src/pipeline/prompts/distractor-reasoning-system.txt
 *   - backend/src/pipeline/prompts/distractor-options-system.txt
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, GeneratedOption } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import AnthropicClient from '../../lib/AnthropicClient.js';
import { GenerationLogRepository } from '../../repositories/generation-log.repository.js';

/** Claude Sonnet model ID — both phases use Sonnet (Rule 6). */
const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

/** Max tokens for Phase 1 reasoning artifact. */
const PHASE_1_MAX_TOKENS = 2048;

/** Max tokens for Phase 2 structured JSON output. */
const PHASE_2_MAX_TOKENS = 2048;

/** Option labels in order. */
const LABELS: readonly string[] = ['A', 'B', 'C', 'D', 'E'];

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

/**
 * Randomize the position of the correct answer among 5 options.
 * Assigns labels A-E based on the shuffled order.
 */
function randomizeCorrectPosition(options: GeneratedOption[]): GeneratedOption[] {
  // Fisher-Yates shuffle
  const shuffled = [...options];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Re-assign labels A-E based on new positions
  return shuffled.map((option, index) => ({
    ...option,
    label: LABELS[index],
  }));
}

/**
 * Parse the JSON array from Phase 2 response, validating structure.
 * Throws if the response is not valid JSON or does not match expected shape.
 */
function parseOptionsResponse(raw: string): GeneratedOption[] {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed: unknown = JSON.parse(cleaned);

  if (!Array.isArray(parsed)) {
    throw new Error('Phase 2 response is not a JSON array');
  }

  if (parsed.length !== 5) {
    throw new Error(`Expected 5 options, got ${parsed.length}`);
  }

  const correctCount = (parsed as Array<Record<string, unknown>>).filter(
    (o) => o.is_correct === true,
  ).length;
  if (correctCount !== 1) {
    throw new Error(`Expected exactly 1 correct option, got ${correctCount}`);
  }

  return (parsed as Array<Record<string, unknown>>).map((o, i) => ({
    label: String(LABELS[i]),
    text: String(o.text ?? ''),
    is_correct: Boolean(o.is_correct),
    rationale: String(o.rationale ?? ''),
    misconception_targeted: o.misconception_targeted
      ? String(o.misconception_targeted)
      : undefined,
  }));
}

export class DistractorGeneratorNode implements IPipelineNode {
  readonly name = 'distractor_generator';

  private readonly generationLogRepo = new GenerationLogRepository();

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] starting two-phase distractor generation`);

    const anthropic = AnthropicClient.getInstance();

    // ── Phase 1: Reasoning artifact (NOT shown to user) ──────────────────────
    console.log(`[${this.name}] Phase 1: generating reasoning artifact`);

    const reasoningSystemPrompt = loadPrompt('distractor-reasoning-system');

    const reasoningUserPrompt = [
      `Target concepts: ${state.targetConcepts.join(', ')}`,
      '',
      'Clinical vignette:',
      state.vignette,
      '',
      'Question stem:',
      state.stem,
      '',
      'Curriculum context:',
      state.context,
    ].join('\n');

    // Phase 1 is NOT streamed — collect the full response
    const reasoningStream = anthropic.messages.stream({
      model: SONNET_MODEL,
      system: reasoningSystemPrompt,
      messages: [{ role: 'user', content: reasoningUserPrompt }],
      max_tokens: PHASE_1_MAX_TOKENS,
    });

    let reasoningArtifact = '';
    for await (const event of reasoningStream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        reasoningArtifact += event.delta.text;
      }
    }

    console.log(`[${this.name}] Phase 1 complete: ${reasoningArtifact.length} chars`);

    // Store reasoning artifact in generation_logs.pipeline_state (NOT in UI state)
    if (state.generationLogId) {
      await this.generationLogRepo.update(state.generationLogId, {
        pipeline_state: {
          reasoning_artifact: reasoningArtifact,
        },
      });
    }

    // ── Phase 2: Options generation (streamed via STATE_DELTA) ───────────────
    console.log(`[${this.name}] Phase 2: generating 5 answer options`);

    const optionsSystemPrompt = loadPrompt('distractor-options-system');

    const optionsUserPrompt = [
      `Target concepts: ${state.targetConcepts.join(', ')}`,
      '',
      'Clinical vignette:',
      state.vignette,
      '',
      'Question stem:',
      state.stem,
      '',
      'Curriculum context:',
      state.context,
      '',
      'Phase 1 reasoning (use this to craft options):',
      reasoningArtifact,
    ].join('\n');

    const optionsStream = anthropic.messages.stream({
      model: SONNET_MODEL,
      system: optionsSystemPrompt,
      messages: [{ role: 'user', content: optionsUserPrompt }],
      max_tokens: PHASE_2_MAX_TOKENS,
    });

    let accumulated = '';
    for await (const event of optionsStream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        accumulated += event.delta.text;
      }
    }

    console.log(`[${this.name}] Phase 2 complete: ${accumulated.length} chars`);

    // ── Parse and randomize options ──────────────────────────────────────────
    const parsedOptions = parseOptionsResponse(accumulated);
    const options = randomizeCorrectPosition(parsedOptions);

    console.log(
      `[${this.name}] options generated — correct answer: ${options.find((o) => o.is_correct)?.label}`,
    );

    // ── Build state update via WorkbenchStateBuilder ──────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withOptions(options)
      .build();

    // ── TEXT_MESSAGE for CopilotKit UI ───────────────────────────────────────
    const textMessage = new AIMessage({
      content: 'Generating answer options...',
    });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
