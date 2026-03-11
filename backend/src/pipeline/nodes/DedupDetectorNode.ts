/**
 * DedupDetectorNode — detects duplicate assessment items via vector similarity.
 *
 * Pure vector search, NO AI model calls.
 * Runs AFTER distractor_generator, BEFORE validator.
 *
 * Thresholds:
 *   >= 0.95 → auto_reject (too similar)
 *   >= 0.85 → flag_for_review
 *   <  0.85 → pass
 *
 * Rule 12: Dedup never blocks. On any failure, set dedup_status='skipped'
 * and continue the pipeline.
 */

import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder';
import { EmbedderService } from '../../ingestion/EmbedderService';
import { config } from '../../config/config';
import SupabaseClientSingleton from '../../lib/SupabaseClient';

interface StemSearchResult {
  item_id: string;
  similarity: number;
  stem: string;
}

type DedupStatus = 'auto_reject' | 'flag_for_review' | 'pass' | 'skipped';

const THRESHOLD_AUTO_REJECT = 0.95;
const THRESHOLD_FLAG_REVIEW = 0.85;

export class DedupDetectorNode implements IPipelineNode {
  readonly name = 'dedup_detector';

  private readonly embedderService: EmbedderService;

  constructor() {
    this.embedderService = new EmbedderService();
  }

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] checking for duplicate items`);

    try {
      return await this.runDedupCheck(state);
    } catch (err) {
      // Rule 12: Dedup never blocks — log error, skip, continue
      console.error(`[${this.name}] dedup check failed, skipping:`, err);
      return this.buildResult('skipped', null, null, 'Dedup check skipped due to an error. Continuing pipeline.');
    }
  }

  private async runDedupCheck(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    const stem = state.stem;
    const courseId = state.courseId;

    if (!stem || !courseId) {
      console.warn(`[${this.name}] missing stem or courseId, skipping dedup`);
      return this.buildResult('skipped', null, null, 'Dedup check skipped — missing stem or course ID.');
    }

    // ── 1. Embed the stem ──────────────────────────────────────────────────────
    const embedding = await this.embedderService.embedStem(stem);

    // ── 2. Query pgvector for similar items ────────────────────────────────────
    const rpcName = config.EMBEDDING_SEARCH_PROVIDER === 'voyage'
      ? 'search_items_by_stem_voyage'
      : 'search_items_by_stem_openai';

    const supabase = SupabaseClientSingleton.getInstance();

    const { data, error } = await supabase.rpc(rpcName, {
      query_embedding: JSON.stringify(embedding),
      p_course_id: courseId,
      similarity_threshold: THRESHOLD_FLAG_REVIEW,
      match_count: 5,
    });

    if (error) {
      console.error(`[${this.name}] pgvector search failed:`, error.message);
      return this.buildResult('skipped', null, null, 'Dedup check skipped — vector search failed.');
    }

    const results = (data ?? []) as StemSearchResult[];

    // ── 3. No similar items found → pass ───────────────────────────────────────
    if (results.length === 0) {
      console.log(`[${this.name}] no similar items found — pass`);
      return this.buildResult('pass', null, null, 'Dedup check passed — no similar items found.');
    }

    // ── 4. Evaluate top match against thresholds ───────────────────────────────
    const topMatch = results[0];

    if (topMatch.similarity >= THRESHOLD_AUTO_REJECT) {
      console.log(
        `[${this.name}] auto_reject — similarity ${topMatch.similarity.toFixed(3)} with item ${topMatch.item_id}`,
      );
      return this.buildResult(
        'auto_reject',
        topMatch.similarity,
        topMatch.item_id,
        `Warning: This item is very similar (${(topMatch.similarity * 100).toFixed(1)}%) to existing item ${topMatch.item_id}. Flagged as potential duplicate. Continuing pipeline.`,
      );
    }

    if (topMatch.similarity >= THRESHOLD_FLAG_REVIEW) {
      console.log(
        `[${this.name}] flag_for_review — similarity ${topMatch.similarity.toFixed(3)} with item ${topMatch.item_id}`,
      );
      return this.buildResult(
        'flag_for_review',
        topMatch.similarity,
        topMatch.item_id,
        `Note: This item has moderate similarity (${(topMatch.similarity * 100).toFixed(1)}%) to existing item ${topMatch.item_id}. Flagged for faculty review. Continuing pipeline.`,
      );
    }

    // Below threshold — pass
    console.log(`[${this.name}] pass — top similarity ${topMatch.similarity.toFixed(3)} below threshold`);
    return this.buildResult('pass', null, null, 'Dedup check passed — no concerning similarities found.');
  }

  private buildResult(
    status: DedupStatus,
    similarity: number | null,
    itemId: string | null,
    message: string,
  ): Partial<WorkbenchState> {
    const isDuplicate = status === 'auto_reject' || status === 'flag_for_review';

    const stateUpdate = new WorkbenchStateBuilder()
      .withDedupResult(isDuplicate, similarity, itemId)
      .build();

    const textMessage = new AIMessage({ content: message });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }
}
