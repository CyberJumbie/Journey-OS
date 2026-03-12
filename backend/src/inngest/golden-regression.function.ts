import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import InngestClientSingleton from '../lib/InngestClient';
import SupabaseClientSingleton from '../lib/SupabaseClient';
import AnthropicClient from '../lib/AnthropicClient';
import SocketServer from '../lib/SocketServer';
import type { LintAlertPayload } from '../lib/SocketServer';

/**
 * Inngest cron function: golden-regression
 *
 * Runs nightly at 03:00 UTC (after data-lint at 02:00).
 * Re-scores all golden dataset items via CriticAgentNode's scoring logic.
 *
 * Key rules:
 * - GOLDEN_SCORE_ONLY: Re-scores items, NEVER changes assessment_items.status.
 * - Rule 11: Check monthly Opus spend before calling critic.
 * - Rule 14: Each item re-scoring in its own step.run().
 * - INNGEST_NO_THROW: Catch errors inside step.run(), never rethrow.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

const CRITIC_MODEL = 'claude-opus-4-6';
const OPUS_TIMEOUT_MS = 30_000;
const MONTHLY_COST_THRESHOLD_USD = 50;
const OPUS_INPUT_COST_PER_1M = 15;
const OPUS_OUTPUT_COST_PER_1M = 75;

// ── Types ──────────────────────────────────────────────────────────────────────

interface GoldenItemRow {
  id: string;
  item_id: string;
  target_critic_min: number;
  notes: string | null;
}

interface AssessmentItemRow {
  id: string;
  stem: string | null;
  vignette: string | null;
  status: string;
  bloom_level: string | null;
  critic_composite_score: number | null;
}

interface OptionRow {
  id: string;
  item_id: string;
  label: string;
  text: string;
  is_correct: boolean;
  rationale: string | null;
}

interface RescoreResult {
  itemId: string;
  previousScore: number | null;
  newScore: number | null;
  targetMin: number;
  passed: boolean;
  error: string | null;
}

// ── Zod schema for Opus critic response ─────────────────────────────────────

const CriticScoreItemSchema = z.object({
  metric: z.string(),
  score: z.number().min(1).max(5),
  rationale: z.string(),
});

const CriticResponseSchema = z.object({
  scores: z.array(CriticScoreItemSchema).length(6),
  reasoning: z.string().min(50).max(2000),
});

// ── Prompt loading (Rule 8) ─────────────────────────────────────────────────

function loadPrompt(name: string): string {
  return fs.readFileSync(
    path.join(__dirname, '../pipeline/prompts', `${name}.txt`),
    'utf-8',
  );
}

// ── Cost guard (Rule 11) ────────────────────────────────────────────────────

async function checkMonthlyCostGuard(): Promise<{
  exceeded: boolean;
  estimatedCost: number;
}> {
  try {
    const supabase = SupabaseClientSingleton.getInstance();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data, error } = await supabase
      .from('generation_logs')
      .select('pipeline_state')
      .gte('created_at', monthStart)
      .not('pipeline_state->critic_input_tokens', 'is', null);

    if (error) {
      console.warn(`[golden-regression] cost guard query failed: ${error.message} — proceeding`);
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
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[golden-regression] cost guard error: ${msg} — proceeding`);
    return { exceeded: false, estimatedCost: 0 };
  }
}

// ── Build user content for critic ───────────────────────────────────────────

function buildUserContent(
  item: AssessmentItemRow,
  options: OptionRow[],
): string {
  const optionsText = options
    .map((opt) => {
      const correctMarker = opt.is_correct ? ' [CORRECT]' : '';
      return `${opt.label}. ${opt.text}${correctMarker}\n   Rationale: ${opt.rationale ?? 'N/A'}`;
    })
    .join('\n');

  return [
    '## Vignette',
    item.vignette ?? 'Not provided',
    '',
    '## Stem',
    item.stem ?? 'Not provided',
    '',
    '## Options (with rationales)',
    optionsText,
    '',
    '## Target Bloom Level',
    item.bloom_level ?? 'Not specified',
  ].join('\n');
}

// ── Inngest function ────────────────────────────────────────────────────────

export const goldenRegressionFunction = InngestClientSingleton.getInstance().createFunction(
  {
    id: 'golden-regression',
    retries: 1,
  },
  { cron: '0 3 * * *' },
  async ({ step }) => {
    const runId = randomUUID();
    const rescoreResults: RescoreResult[] = [];

    // ── Step 1: Load golden items ───────────────────────────────────────────
    const goldenItems = await step.run('load-golden-items', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const { data, error } = await supabase
          .from('golden_dataset')
          .select('id, item_id, target_critic_min, notes');

        if (error) {
          console.error(`[golden-regression] Failed to load golden dataset: ${error.message}`);
          return [] as GoldenItemRow[];
        }

        console.log(`[golden-regression] Loaded ${(data ?? []).length} golden items`);
        return (data ?? []) as GoldenItemRow[];
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[golden-regression] load error: ${msg}`);
        return [] as GoldenItemRow[];
      }
    });

    if (goldenItems.length === 0) {
      console.warn('[golden-regression] No golden items found — skipping regression');
      return { runId, itemCount: 0, regressionCount: 0 };
    }

    // ── Step 2: Cost guard check ────────────────────────────────────────────
    const costGuard = await step.run('check-cost-guard', async () => {
      try {
        return await checkMonthlyCostGuard();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[golden-regression] cost guard error: ${msg}`);
        return { exceeded: false, estimatedCost: 0 };
      }
    });

    if (costGuard.exceeded) {
      console.warn(
        `[golden-regression] COST GUARD: $${costGuard.estimatedCost.toFixed(2)} exceeds $${MONTHLY_COST_THRESHOLD_USD} — skipping regression`,
      );
      return { runId, itemCount: goldenItems.length, regressionCount: 0, skippedReason: 'cost_guard' };
    }

    // ── Step 3: Re-score each item (Rule 14: each in own step.run) ──────────
    for (const goldenItem of goldenItems) {
      const result = await step.run(`rescore-item-${goldenItem.item_id}`, async () => {
        try {
          const supabase = SupabaseClientSingleton.getInstance();

          // Fetch the assessment item
          const { data: itemData, error: itemError } = await supabase
            .from('assessment_items')
            .select('id, stem, vignette, status, bloom_level, critic_composite_score')
            .eq('id', goldenItem.item_id)
            .single();

          if (itemError || !itemData) {
            console.error(`[golden-regression] Failed to load item ${goldenItem.item_id}: ${itemError?.message ?? 'not found'}`);
            return {
              itemId: goldenItem.item_id,
              previousScore: null,
              newScore: null,
              targetMin: goldenItem.target_critic_min,
              passed: false,
              error: itemError?.message ?? 'Item not found',
            } satisfies RescoreResult;
          }

          const item = itemData as AssessmentItemRow;

          // Fetch options for this item
          const { data: optionsData, error: optionsError } = await supabase
            .from('assessment_item_options')
            .select('id, item_id, label, text, is_correct, rationale')
            .eq('item_id', goldenItem.item_id)
            .order('label', { ascending: true });

          if (optionsError) {
            console.error(`[golden-regression] Failed to load options for ${goldenItem.item_id}: ${optionsError.message}`);
            return {
              itemId: goldenItem.item_id,
              previousScore: item.critic_composite_score,
              newScore: null,
              targetMin: goldenItem.target_critic_min,
              passed: false,
              error: optionsError.message,
            } satisfies RescoreResult;
          }

          const options = (optionsData ?? []) as OptionRow[];

          // Build user content and call Opus
          const systemPrompt = loadPrompt('critic-agent-system');
          const userContent = buildUserContent(item, options);

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

          const textBlock = message.content.find((block) => block.type === 'text');
          if (!textBlock || textBlock.type !== 'text') {
            throw new Error('No text block in Opus response');
          }

          const rawJson = textBlock.text.trim();
          const parsed: unknown = JSON.parse(rawJson);
          const criticResponse = CriticResponseSchema.parse(parsed);

          // Compute composite
          const composite = criticResponse.scores.reduce((sum, s) => sum + s.score, 0) / criticResponse.scores.length;
          const roundedComposite = Math.round(composite * 10) / 10;

          // GOLDEN_SCORE_ONLY: do NOT update assessment_items.status or critic scores.
          // This is a read-only regression check.
          const passed = roundedComposite >= goldenItem.target_critic_min;

          console.log(
            `[golden-regression] Item ${goldenItem.item_id}: previous=${item.critic_composite_score}, new=${roundedComposite}, target=${goldenItem.target_critic_min}, ${passed ? 'PASS' : 'REGRESSION'}`,
          );

          return {
            itemId: goldenItem.item_id,
            previousScore: item.critic_composite_score,
            newScore: roundedComposite,
            targetMin: goldenItem.target_critic_min,
            passed,
            error: null,
          } satisfies RescoreResult;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[golden-regression] rescore error for ${goldenItem.item_id}: ${msg}`);
          return {
            itemId: goldenItem.item_id,
            previousScore: null,
            newScore: null,
            targetMin: goldenItem.target_critic_min,
            passed: false,
            error: msg,
          } satisfies RescoreResult;
        }
      });

      rescoreResults.push(result);
    }

    // ── Step 4: Store results in kaizen_lint_runs ───────────────────────────
    await step.run('store-results', async () => {
      try {
        const supabase = SupabaseClientSingleton.getInstance();

        const regressionCount = rescoreResults.filter((r) => !r.passed).length;
        const errorCount = rescoreResults.filter((r) => r.error !== null).length;
        const avgNewScore = rescoreResults
          .filter((r) => r.newScore !== null)
          .reduce((sum, r) => sum + (r.newScore ?? 0), 0) / Math.max(rescoreResults.filter((r) => r.newScore !== null).length, 1);

        const passed = regressionCount === 0;

        const { error } = await supabase
          .from('kaizen_lint_runs')
          .insert({
            run_id: runId,
            rule_id: 'golden_regression',
            result: passed ? 'pass' : 'fail',
            count: regressionCount,
            threshold: 0,
            passed,
            details: {
              totalItems: rescoreResults.length,
              regressionCount,
              errorCount,
              avgNewScore: Math.round(avgNewScore * 10) / 10,
              items: rescoreResults.map((r) => ({
                itemId: r.itemId,
                previousScore: r.previousScore,
                newScore: r.newScore,
                targetMin: r.targetMin,
                passed: r.passed,
                error: r.error,
              })),
            },
            remediation_applied: false,
          });

        if (error) {
          console.error(`[golden-regression] Failed to store results: ${error.message}`);
        } else {
          console.log(`[golden-regression] Results stored: ${regressionCount} regressions out of ${rescoreResults.length} items`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[golden-regression] store error: ${msg}`);
      }
    });

    // ── Step 5: Notify admins if regression detected ────────────────────────
    await step.run('notify', async () => {
      const regressedItems = rescoreResults.filter((r) => !r.passed);
      if (regressedItems.length === 0) {
        console.log('[golden-regression] All golden items passed — no notification needed');
        return;
      }

      try {
        const supabase = SupabaseClientSingleton.getInstance();
        const { data: admins, error } = await supabase
          .from('user_profiles')
          .select('id')
          .in('role', ['superadmin', 'institutional_admin']);

        if (error || !admins) {
          console.error(`[golden-regression] Failed to query admin users: ${error?.message}`);
          return;
        }

        const payload: LintAlertPayload = {
          runId,
          failedRules: [{
            ruleId: 'golden_regression',
            count: regressedItems.length,
            threshold: 0,
          }],
          runAt: new Date().toISOString(),
        };

        for (const admin of admins) {
          SocketServer.emitToUser(admin.id as string, 'lint:alert', payload);
        }

        console.log(`[golden-regression] Alerted ${admins.length} admins about ${regressedItems.length} regressions`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[golden-regression] notify error: ${msg}`);
      }
    });

    const regressionCount = rescoreResults.filter((r) => !r.passed).length;
    return { runId, itemCount: rescoreResults.length, regressionCount };
  },
);
