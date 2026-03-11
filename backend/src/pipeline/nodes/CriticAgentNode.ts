/**
 * CriticAgentNode — Opus-powered quality critique of generated assessment items.
 *
 * Model: claude-opus-4-6 — the ONLY place Opus runs in Phase 2 (Rule 6).
 * Runs AFTER graph_writer (item is persisted, has itemId in state).
 *
 * 6-metric scoring rubric (each 1.0–5.0):
 *   1. clinical_accuracy   — Is the medical content correct?
 *   2. vignette_realism     — Does the patient presentation feel real?
 *   3. distractor_quality   — Are wrong answers genuinely plausible?
 *   4. bloom_alignment      — Does the question match the claimed Bloom level?
 *   5. nbme_compliance      — Does it follow NBME format conventions?
 *   6. educational_value    — Would answering this teach something meaningful?
 *
 * Cost guard (Rule 11): checks monthly Opus spend before every call.
 * Threshold: $50/month. Above → skip critic, set composite=null, log alert.
 *
 * On failure: sets null scores, continues pipeline, does NOT throw.
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, CriticScore } from '@journey-os/shared-types';
import { CriticScoreSchema } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import AnthropicClient from '../../lib/AnthropicClient.js';
import SupabaseClientSingleton from '../../lib/SupabaseClient.js';
import { ItemRepository } from '../../repositories/item.repository.js';

// ── Constants ──────────────────────────────────────────────────────────────────

/** Opus model — critique ONLY (Rule 6). */
const CRITIC_MODEL = 'claude-opus-4-6';

/** Maximum time to wait for Opus response (ms). */
const OPUS_TIMEOUT_MS = 30_000;

/** Monthly cost threshold for Opus (Rule 11). */
const MONTHLY_COST_THRESHOLD_USD = 50;

/** Opus pricing per 1M tokens. */
const OPUS_INPUT_COST_PER_1M = 15;
const OPUS_OUTPUT_COST_PER_1M = 75;

// ── Zod schema for Opus response ───────────────────────────────────────────────

const CriticResponseSchema = z.object({
  scores: z.array(CriticScoreSchema).length(6),
  reasoning: z.string().min(50).max(2000),
});
type CriticResponse = z.infer<typeof CriticResponseSchema>;

// ── Prompt loading (Rule 8: never inline) ──────────────────────────────────────

function loadPrompt(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '../prompts', `${name}.txt`),
    'utf-8',
  );
}

// ── Node implementation ────────────────────────────────────────────────────────

export class CriticAgentNode implements IPipelineNode {
  readonly name = 'critic_agent';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] starting Opus critique (Rule 6: Opus for critique ONLY)`);

    // ── 1. Cost guard (Rule 11) ──────────────────────────────────────────────
    const costGuardResult = await this.checkMonthlyCostGuard();
    if (costGuardResult.exceeded) {
      console.warn(
        `[${this.name}] COST GUARD: monthly Opus spend $${costGuardResult.estimatedCost.toFixed(2)} exceeds $${MONTHLY_COST_THRESHOLD_USD} threshold — skipping critic`,
      );

      const skipUpdate = new WorkbenchStateBuilder()
        .withCriticScores([] as CriticScore[])
        .withCriticComposite(0)
        .build();

      const skipMessage = new AIMessage({
        content: `Critic review skipped: monthly Opus budget exceeded ($${costGuardResult.estimatedCost.toFixed(2)}/$${MONTHLY_COST_THRESHOLD_USD}). Item will proceed to faculty review without critic scores.`,
      });

      return {
        ...skipUpdate,
        criticScores: null,
        criticComposite: null,
        messages: [skipMessage],
      } as Partial<WorkbenchState>;
    }

    // ── 2. Load prompt (Rule 8) ──────────────────────────────────────────────
    const systemPrompt = loadPrompt('critic-agent-system');

    // ── 3. Build user message with full item content ─────────────────────────
    const userContent = this.buildUserContent(state);

    // ── 4. Call Opus with timeout ────────────────────────────────────────────
    let criticResponse: CriticResponse;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const anthropic = AnthropicClient.getInstance();

      const messagePromise = anthropic.messages.create({
        model: CRITIC_MODEL,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
        max_tokens: 2048,
      });

      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Opus timeout exceeded 30s')), OPUS_TIMEOUT_MS);
      });

      const message = await Promise.race([messagePromise, timeoutPromise]);

      // Extract token usage for cost tracking
      inputTokens = message.usage?.input_tokens ?? 0;
      outputTokens = message.usage?.output_tokens ?? 0;

      // Extract text from response
      const textBlock = message.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text block in Opus response');
      }

      const rawJson = textBlock.text.trim();
      const parsed: unknown = JSON.parse(rawJson);

      // ── 5. Validate with Zod ────────────────────────────────────────────────
      criticResponse = CriticResponseSchema.parse(parsed);

      // Verify all 6 metrics are present
      const requiredMetrics = [
        'clinical_accuracy',
        'vignette_realism',
        'distractor_quality',
        'bloom_alignment',
        'nbme_compliance',
        'educational_value',
      ] as const;

      for (const metric of requiredMetrics) {
        const found = criticResponse.scores.find((s) => s.metric === metric);
        if (!found) {
          throw new Error(`Missing required metric: ${metric}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] Opus critique failed: ${errorMessage}`);

      // Log token usage even on failure
      await this.logTokenUsage(state.generationLogId, inputTokens, outputTokens);

      const failUpdate = new WorkbenchStateBuilder()
        .withCriticScores([] as CriticScore[])
        .withCriticComposite(0)
        .build();

      const failMessage = new AIMessage({
        content: `Critic review failed: ${errorMessage}. Item saved without critic scores.`,
      });

      return {
        ...failUpdate,
        criticScores: null,
        criticComposite: null,
        messages: [failMessage],
      } as Partial<WorkbenchState>;
    }

    // ── 6. Compute composite score (average of 6 metrics) ────────────────────
    const scores = criticResponse.scores;
    const composite = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
    const roundedComposite = Math.round(composite * 10) / 10;

    console.log(`[${this.name}] composite score: ${roundedComposite}/5.0`);

    // ── 7. Write critic scores to Supabase assessment_items ──────────────────
    await this.writeCriticScores(state.itemId, scores, roundedComposite, criticResponse.reasoning);

    // ── 8. Log token usage to generation_logs ────────────────────────────────
    await this.logTokenUsage(state.generationLogId, inputTokens, outputTokens);

    // ── 9. Build state update (STATE_DELTA) ──────────────────────────────────
    const stateUpdate = new WorkbenchStateBuilder()
      .withCriticScores(scores)
      .withCriticComposite(roundedComposite)
      .build();

    // ── 10. TEXT_MESSAGE with verdict ────────────────────────────────────────
    const verdict = this.getVerdict(roundedComposite);
    const textMessage = new AIMessage({
      content: `Critic review: ${roundedComposite}/5.0 (${verdict})`,
    });

    console.log(`[${this.name}] complete — ${roundedComposite}/5.0 (${verdict})`);

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Build the user message with full item content for Opus critique.
   */
  private buildUserContent(state: WorkbenchState): string {
    const optionsText = state.options
      .map((opt) => {
        const correctMarker = opt.is_correct ? ' [CORRECT]' : '';
        return `${opt.label}. ${opt.text}${correctMarker}\n   Rationale: ${opt.rationale}`;
      })
      .join('\n');

    const validationText = state.validationResults.length > 0
      ? state.validationResults
          .map((v) => `- ${v.rule}: ${v.passed ? 'PASS' : 'FAIL'} — ${v.message}`)
          .join('\n')
      : 'No validation results available.';

    return [
      '## Vignette',
      state.vignette,
      '',
      '## Stem',
      state.stem,
      '',
      '## Options (with rationales)',
      optionsText,
      '',
      '## Validation Results',
      validationText,
      '',
      '## Target Concepts',
      state.targetConcepts.join(', ') || 'Not specified',
    ].join('\n');
  }

  /**
   * Check monthly Opus spend against the $50 threshold (Rule 11).
   * Queries generation_logs for cumulative critic token usage this month.
   */
  private async checkMonthlyCostGuard(): Promise<{
    exceeded: boolean;
    estimatedCost: number;
  }> {
    try {
      const supabase = SupabaseClientSingleton.getInstance();

      // Get first day of current month in ISO format
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Query generation_logs for critic token usage this month
      // critic_input_tokens and critic_output_tokens are stored as JSONB
      // fields in the pipeline_state column
      const { data, error } = await supabase
        .from('generation_logs')
        .select('pipeline_state')
        .gte('created_at', monthStart)
        .not('pipeline_state->critic_input_tokens', 'is', null);

      if (error) {
        console.warn(`[${this.name}] cost guard query failed: ${error.message} — proceeding with critic`);
        return { exceeded: false, estimatedCost: 0 };
      }

      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      if (data) {
        for (const row of data) {
          const pipelineState = row.pipeline_state as Record<string, number> | null;
          if (pipelineState) {
            totalInputTokens += pipelineState.critic_input_tokens ?? 0;
            totalOutputTokens += pipelineState.critic_output_tokens ?? 0;
          }
        }
      }

      const estimatedCost =
        (totalInputTokens / 1_000_000) * OPUS_INPUT_COST_PER_1M +
        (totalOutputTokens / 1_000_000) * OPUS_OUTPUT_COST_PER_1M;

      return {
        exceeded: estimatedCost >= MONTHLY_COST_THRESHOLD_USD,
        estimatedCost,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.warn(`[${this.name}] cost guard check failed: ${errorMessage} — proceeding with critic`);
      return { exceeded: false, estimatedCost: 0 };
    }
  }

  /**
   * Write critic scores to Supabase via ItemRepository (layer-compliant).
   * Critic scores are Supabase-only metadata (Rule 4: skinny Neo4j nodes).
   */
  private async writeCriticScores(
    itemId: string,
    scores: CriticScore[],
    composite: number,
    reasoning: string,
  ): Promise<void> {
    if (!itemId) {
      console.warn(`[${this.name}] no itemId in state — skipping DB write`);
      return;
    }

    try {
      const itemRepo = new ItemRepository();
      const scoreMap = new Map(scores.map((s) => [s.metric, s.score]));

      await itemRepo.updateCriticScores(itemId, {
        critic_clinical_accuracy: scoreMap.get('clinical_accuracy') ?? null,
        critic_vignette_realism: scoreMap.get('vignette_realism') ?? null,
        critic_distractor_quality: scoreMap.get('distractor_quality') ?? null,
        critic_bloom_alignment: scoreMap.get('bloom_alignment') ?? null,
        critic_nbme_compliance: scoreMap.get('nbme_compliance') ?? null,
        critic_educational_value: scoreMap.get('educational_value') ?? null,
        critic_composite_score: composite,
        critic_reasoning: reasoning,
      });

      console.log(`[${this.name}] critic scores written to assessment_items ${itemId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] Supabase critic write error: ${errorMessage}`);
    }
  }

  /**
   * Log Opus token usage to generation_logs pipeline_state JSONB.
   */
  private async logTokenUsage(
    generationLogId: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<void> {
    if (!generationLogId || (inputTokens === 0 && outputTokens === 0)) {
      return;
    }

    try {
      const supabase = SupabaseClientSingleton.getInstance();

      // Read current pipeline_state, merge critic tokens in
      const { data: existing, error: readError } = await supabase
        .from('generation_logs')
        .select('pipeline_state')
        .eq('id', generationLogId)
        .single();

      if (readError) {
        console.warn(`[${this.name}] failed to read generation_logs: ${readError.message}`);
        return;
      }

      const currentState = (existing?.pipeline_state as Record<string, unknown>) ?? {};
      const updatedState = {
        ...currentState,
        critic_input_tokens: inputTokens,
        critic_output_tokens: outputTokens,
        critic_cost_usd:
          (inputTokens / 1_000_000) * OPUS_INPUT_COST_PER_1M +
          (outputTokens / 1_000_000) * OPUS_OUTPUT_COST_PER_1M,
      };

      const { error: writeError } = await supabase
        .from('generation_logs')
        .update({ pipeline_state: updatedState })
        .eq('id', generationLogId);

      if (writeError) {
        console.error(`[${this.name}] failed to log critic tokens: ${writeError.message}`);
      } else {
        console.log(
          `[${this.name}] logged critic tokens: in=${inputTokens}, out=${outputTokens}`,
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] token logging error: ${errorMessage}`);
    }
  }

  /**
   * Map composite score to a human-readable verdict.
   */
  private getVerdict(composite: number): string {
    if (composite >= 4.5) return 'excellent';
    if (composite >= 4.0) return 'good';
    if (composite >= 3.5) return 'acceptable';
    if (composite >= 3.0) return 'needs revision';
    if (composite >= 2.0) return 'poor';
    return 'reject';
  }
}
