/**
 * TaggerNode — extracts structured taxonomy tags from the generated item.
 *
 * Uses Claude Haiku (claude-haiku-4-5) for cheap structured output.
 * NEVER Sonnet or Opus — Rule 6, OPUS_NOT_IN_TAGGER.
 *
 * Extracts 6 fields: bloom_level, usmle_system, usmle_discipline,
 * difficulty, acgme_domain, epa_number.
 *
 * On parse failure: logs warning, writes null tags, emits warning
 * TEXT_MESSAGE, does NOT throw.
 *
 * Writes tags to assessment_items via Supabase (individual columns).
 */

import fs from 'fs';
import path from 'path';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, ItemTags } from '@journey-os/shared-types';
import { ItemTagsSchema } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import AnthropicClient from '../../lib/AnthropicClient';
import { ItemRepository } from '../../repositories/item.repository';
import { GraphRepository } from '../../repositories/graph.repository';

/** Load a prompt from the prompts directory. Never inline prompts (Rule 8). */
function loadPrompt(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '../prompts', `${name}.txt`),
    'utf-8',
  );
}

/** Haiku model — cheap structured output (Rule 6, OPUS_NOT_IN_TAGGER). */
const TAGGER_MODEL = 'claude-haiku-4-5-20241022';

export class TaggerNode implements IPipelineNode {
  readonly name = 'tagger';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] extracting taxonomy tags with Haiku`);

    // ── 1. Load prompt (Rule 8: prompts in .txt files) ────────────────────────
    const systemPrompt = loadPrompt('tagger-system');

    // ── 2. Build user message with item content ────────────────────────────────
    const optionsText = state.options
      .map((opt) => `${opt.label}. ${opt.text}`)
      .join('\n');

    const userContent = [
      '## Vignette',
      state.vignette,
      '',
      '## Stem',
      state.stem,
      '',
      '## Options',
      optionsText,
    ].join('\n');

    // ── 3. Call Haiku ─────────────────────────────────────────────────────────
    let tags: ItemTags | null = null;

    try {
      const anthropic = AnthropicClient.getInstance();
      const message = await anthropic.messages.create({
        model: TAGGER_MODEL,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 256,
      });

      // Extract text from response
      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in Haiku response');
      }

      const rawJson = textBlock.text.trim();
      const parsed: unknown = JSON.parse(rawJson);

      // ── 4. Validate with Zod (strict) ──────────────────────────────────────
      tags = ItemTagsSchema.parse(parsed);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[${this.name}] tag extraction failed: ${errorMessage}`);

      // On parse failure: null tags, warning message, do NOT throw
      const warningUpdate = new WorkbenchStateBuilder()
        .withTags(null as unknown as ItemTags)
        .build();

      const warningMessage = new AIMessage({
        content: `Tagging skipped: could not parse tags (${errorMessage}). Item saved without tags.`,
      });

      return {
        ...warningUpdate,
        tags: null,
        messages: [warningMessage],
      } as Partial<WorkbenchState>;
    }

    // ── 5. DualWrite: Supabase first, Neo4j second (Rule 2) ────────────────
    if (state.itemId) {
      // Supabase write (source of truth)
      try {
        const itemRepo = new ItemRepository();
        await itemRepo.updateTags(state.itemId, {
          bloom_level: tags.bloom_level,
          usmle_system: tags.usmle_system,
          usmle_discipline: tags.usmle_discipline,
          difficulty: tags.difficulty,
          acgme_domain: tags.acgme_domain,
          epa_number: tags.epa_number,
        });
        console.log(`[${this.name}] tags written to Supabase ${state.itemId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[${this.name}] Supabase tag write error: ${errorMessage}`);
      }

      // Neo4j write (skinny: bloom_level + difficulty only, Rule 4)
      try {
        const graphRepo = new GraphRepository();
        await graphRepo.updateAssessmentItemTags(state.itemId, tags.bloom_level, tags.difficulty);
        console.log(`[${this.name}] tags synced to Neo4j ${state.itemId}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[${this.name}] Neo4j tag sync failed (non-blocking): ${errorMessage}`);
      }
    } else {
      console.warn(`[${this.name}] no itemId in state — skipping DB write`);
    }

    // ── 6. Build state update (STATE_DELTA) ──────────────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withTags(tags)
      .build();

    // ── 7. TEXT_MESSAGE for CopilotKit UI ────────────────────────────────────
    const summaryMessage = `Tagging: Bloom ${tags.bloom_level}, USMLE ${tags.usmle_system}, ${tags.usmle_discipline}, Difficulty ${tags.difficulty}`;
    console.log(`[${this.name}] ${summaryMessage}`);

    const textMessage = new AIMessage({ content: summaryMessage });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
