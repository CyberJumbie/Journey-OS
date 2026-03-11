/**
 * ReviewRouterNode — pure TypeScript routing logic (NO AI calls).
 *
 * Determines the final disposition of a generated assessment item:
 * - auto_approve: high quality, passes all checks
 * - auto_reject: blocking validation failure or dedup auto_reject
 * - faculty_review: everything else (needs human judgment)
 *
 * Also handles self-correction loops (P2-006):
 * - If validation warnings or low critic composite AND retryCount < 2,
 *   signals retry by returning autoRoute = null.
 * - Max 2 retries enforced (Rule 13). After that → faculty_review.
 *
 * Pure TypeScript — no model calls (REVIEW_MODE_REUSE).
 */

import { AIMessage } from '@langchain/core/messages';
import type { WorkbenchState, AutoRoute, ValidationResult } from '@journey-os/shared-types';
import type { IPipelineNode } from '../PipelineNode.interface.js';
import { WorkbenchStateBuilder } from '../WorkbenchStateBuilder.js';
import { ItemRepository } from '../../repositories/item.repository.js';
import { GraphRepository } from '../../repositories/graph.repository.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Composite score threshold for auto-approval. */
const AUTO_APPROVE_THRESHOLD = 4.0;

/** Composite score below which retry is warranted (if retries remain). */
const RETRY_THRESHOLD = 3.0;

/** Maximum number of retries (Rule 13: hard ceiling). */
const MAX_RETRIES = 2;

/**
 * The first 5 NBME rules are blocking — if any of these fail,
 * the item cannot be approved and may be auto-rejected.
 */
const BLOCKING_RULES = new Set([
  'vignette_present',
  'stem_question_mark',
  'exactly_five_options',
  'one_correct',
  'similar_length',
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Check whether any blocking validation rule failed. */
function hasBlockingFailure(results: ValidationResult[]): boolean {
  return results.some((r) => BLOCKING_RULES.has(r.rule) && !r.passed);
}

/** Check whether any non-blocking validation rule failed (warnings). */
function hasWarnings(results: ValidationResult[]): boolean {
  return results.some((r) => !BLOCKING_RULES.has(r.rule) && !r.passed);
}

/** Get human-readable list of failed blocking rules. */
function getBlockingFailureReasons(results: ValidationResult[]): string[] {
  return results
    .filter((r) => BLOCKING_RULES.has(r.rule) && !r.passed)
    .map((r) => r.message);
}

/** Determine if the dedup result signals auto-rejection. */
function isDedupAutoReject(state: WorkbenchState): boolean {
  // isDuplicate with high similarity triggers auto_reject
  return state.isDuplicate && state.dupSimilarity !== null && state.dupSimilarity >= 0.95;
}

// ── Node ──────────────────────────────────────────────────────────────────────

export class ReviewRouterNode implements IPipelineNode {
  readonly name = 'review_router';

  async execute(state: WorkbenchState): Promise<Partial<WorkbenchState>> {
    console.log(`[${this.name}] routing item ${state.itemId}`);

    const validationResults = state.validationResults ?? [];
    const criticComposite = state.criticComposite;
    const retryCount = state.retryCount ?? 0;
    const blockingFailed = hasBlockingFailure(validationResults);
    const warnings = hasWarnings(validationResults);
    const dedupReject = isDedupAutoReject(state);

    // ── 1. Check if retry is needed (P2-006: Self-Correction Loops) ─────────
    const shouldRetry = this.shouldRetry(
      blockingFailed,
      warnings,
      criticComposite,
      dedupReject,
      retryCount,
    );

    if (shouldRetry) {
      return this.handleRetry(retryCount);
    }

    // ── 2. Determine final route ────────────────────────────────────────────
    const route = this.determineRoute(
      blockingFailed,
      dedupReject,
      criticComposite,
      validationResults,
    );

    // ── 3. Build rejection reason if applicable ─────────────────────────────
    let rejectionReason: string | undefined;
    if (route === 'auto_reject') {
      const reasons: string[] = [];
      if (blockingFailed) {
        reasons.push(...getBlockingFailureReasons(validationResults));
      }
      if (dedupReject) {
        reasons.push(`Duplicate detected (similarity: ${state.dupSimilarity?.toFixed(2)}, matched item: ${state.dupItemId})`);
      }
      rejectionReason = reasons.join('; ');
    }

    // ── 4. DualWrite route decision: Supabase first, Neo4j second ──────────
    await this.writeRouteToDb(state.itemId, route, rejectionReason);

    // ── 5. Build state update ───────────────────────────────────────────────
    const builder = new WorkbenchStateBuilder()
      .withAutoRoute(route)
      .withPipelineStatus('completed');

    const stateUpdate = builder.build();

    // ── 6. Build TEXT_MESSAGE ────────────────────────────────────────────────
    const messageContent = this.buildTextMessage(route, criticComposite, rejectionReason, retryCount);
    console.log(`[${this.name}] ${messageContent}`);

    const textMessage = new AIMessage({ content: messageContent });

    return {
      ...stateUpdate,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  // ── Private Methods ─────────────────────────────────────────────────────────

  /**
   * Determine if a retry is warranted.
   *
   * Retry conditions (ALL must be true):
   * 1. No blocking validation failures (those go straight to auto_reject)
   * 2. No dedup auto_reject
   * 3. retryCount < MAX_RETRIES (Rule 13)
   * 4. Either: non-blocking validation warnings OR critic composite < 3.0
   */
  private shouldRetry(
    blockingFailed: boolean,
    warnings: boolean,
    criticComposite: number | null,
    dedupReject: boolean,
    retryCount: number,
  ): boolean {
    // Never retry blocking failures or dedup rejections
    if (blockingFailed || dedupReject) return false;

    // Hard ceiling: max 2 retries (Rule 13)
    if (retryCount >= MAX_RETRIES) return false;

    // Retry if critic composite is below threshold
    if (criticComposite !== null && criticComposite < RETRY_THRESHOLD) return true;

    // Retry if there are non-blocking warnings AND critic score is mediocre
    if (warnings && criticComposite !== null && criticComposite < AUTO_APPROVE_THRESHOLD) return true;

    return false;
  }

  /** Handle the retry case: bump count, leave autoRoute null, signal retry. */
  private handleRetry(retryCount: number): Partial<WorkbenchState> {
    const newCount = retryCount + 1;
    const attemptNumber = newCount + 1; // 1-indexed for display
    const maxAttempts = MAX_RETRIES + 1; // Total attempts = retries + 1

    console.log(`[${this.name}] retrying (attempt ${attemptNumber}/${maxAttempts})`);

    const builder = new WorkbenchStateBuilder()
      .withRetryCount(newCount)
      .withPipelineStatus('running');

    const stateUpdate = builder.build();

    const textMessage = new AIMessage({
      content: `Retrying (attempt ${attemptNumber}/${maxAttempts})...`,
    });

    return {
      ...stateUpdate,
      autoRoute: null,
      messages: [textMessage],
    } as Partial<WorkbenchState>;
  }

  /** Determine the final route based on all signals. */
  private determineRoute(
    blockingFailed: boolean,
    dedupReject: boolean,
    criticComposite: number | null,
    validationResults: ValidationResult[],
  ): AutoRoute {
    // Auto-reject: blocking validation failure or dedup auto_reject
    if (blockingFailed || dedupReject) {
      return 'auto_reject';
    }

    // Auto-approve: high composite AND all validations passed
    const allPassed = validationResults.every((r) => r.passed);
    if (
      criticComposite !== null &&
      criticComposite >= AUTO_APPROVE_THRESHOLD &&
      allPassed
    ) {
      return 'auto_approve';
    }

    // Everything else → faculty_review
    return 'faculty_review';
  }

  /** DualWrite: route decision to Supabase (source of truth) + Neo4j status sync. */
  private async writeRouteToDb(
    itemId: string,
    route: AutoRoute,
    rejectionReason?: string,
  ): Promise<void> {
    if (!itemId) {
      console.warn(`[${this.name}] no itemId — skipping DB write`);
      return;
    }

    // Map route to assessment_items.status
    const statusMap: Record<AutoRoute, string> = {
      auto_approve: 'approved',
      auto_reject: 'rejected',
      faculty_review: 'draft',
    };

    const status = statusMap[route];

    // Supabase write first (source of truth — Rule 2)
    try {
      const itemRepo = new ItemRepository();
      await itemRepo.updateRoute(itemId, {
        auto_route: route,
        status,
        rejection_reason: rejectionReason,
      });
      console.log(`[${this.name}] route written to Supabase: ${route} → status ${status}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] Supabase route write error: ${errorMessage}`);
    }

    // Neo4j write second (sync status on skinny node — Rule 4)
    try {
      const graphRepo = new GraphRepository();
      await graphRepo.setItemStatus(itemId, status);
      console.log(`[${this.name}] status synced to Neo4j: ${status}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[${this.name}] Neo4j status sync failed (non-blocking): ${errorMessage}`);
    }
  }

  /** Build human-readable TEXT_MESSAGE based on route decision. */
  private buildTextMessage(
    route: AutoRoute,
    criticComposite: number | null,
    rejectionReason?: string,
    retryCount?: number,
  ): string {
    const compositeStr = criticComposite !== null
      ? `${criticComposite.toFixed(1)}/5.0`
      : 'N/A';

    const retryNote = retryCount && retryCount > 0
      ? ` (after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'})`
      : '';

    switch (route) {
      case 'auto_approve':
        return `Auto-approved${retryNote} — composite ${compositeStr}, all validations passed.`;
      case 'auto_reject':
        return `Auto-rejected: ${rejectionReason ?? 'unknown reason'}`;
      case 'faculty_review':
        return `Sent to review queue${retryNote} — composite score ${compositeStr}, needs faculty judgment.`;
    }
  }
}
