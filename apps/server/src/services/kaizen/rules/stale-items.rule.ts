/**
 * StaleItemsRule — finds assessment items not updated in >N days.
 * [STORY-IA-12] Supabase-based rule. Severity: info. Default threshold: 90 days.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

const MAX_AFFECTED_NODES = 100;
const DEFAULT_THRESHOLD_DAYS = 90;

export class StaleItemsRule implements LintRule {
  readonly id = "stale-items";
  readonly name = "Stale Items";
  readonly description =
    "Assessment items not updated in over the configured threshold days";
  readonly default_severity = "info" as const;

  readonly #supabaseClient: SupabaseClient;
  #thresholdDays: number;

  constructor(supabaseClient: SupabaseClient, thresholdDays?: number) {
    this.#supabaseClient = supabaseClient;
    this.#thresholdDays = thresholdDays ?? DEFAULT_THRESHOLD_DAYS;
  }

  set thresholdDays(value: number) {
    this.#thresholdDays = value;
  }

  async execute(context: LintContext): Promise<readonly LintFinding[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.#thresholdDays);
    const cutoffISO = cutoff.toISOString();

    // Institution scoping: JOIN through courses → course_director → profiles
    // For now, query all stale items (institution scoping requires course-level filtering)
    const { data, error } = await this.#supabaseClient
      .from("assessment_items")
      .select("id, updated_at")
      .lt("updated_at", cutoffISO);

    if (error || !data || data.length === 0) {
      return [];
    }

    const staleIds = data.map(
      (item: Record<string, unknown>) => item.id as string,
    );

    if (staleIds.length === 0) {
      return [];
    }

    const displayIds = staleIds.slice(0, MAX_AFFECTED_NODES);
    const count = staleIds.length;

    return [
      {
        rule_id: this.id,
        severity: this.default_severity,
        affected_nodes: displayIds,
        message: `${count} assessment item${count === 1 ? "" : "s"} have not been updated in over ${this.#thresholdDays} days`,
        suggested_fix: "Review and update stale items or mark them as archived",
      },
    ];
  }
}
