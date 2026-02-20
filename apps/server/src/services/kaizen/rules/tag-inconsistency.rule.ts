/**
 * TagInconsistencyRule — finds items with contradictory tags.
 * [STORY-IA-12] Supabase-based rule. Severity: warning.
 * Note: assessment_items.tags is text[] (not JSONB). Uses array overlap check.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

const MAX_AFFECTED_NODES = 100;

/** Tag pairs that are contradictory */
const CONTRADICTORY_PAIRS: readonly [string, string][] = [
  ["easy", "hard"],
  ["basic", "advanced"],
  ["simple", "complex"],
  ["introductory", "expert"],
];

export class TagInconsistencyRule implements LintRule {
  readonly id = "tag-inconsistency";
  readonly name = "Tag Inconsistency";
  readonly description = "Items with contradictory tags";
  readonly default_severity = "warning" as const;

  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async execute(context: LintContext): Promise<readonly LintFinding[]> {
    let query = this.#supabaseClient
      .from("assessment_items")
      .select("id, tags")
      .not("tags", "is", null);

    if (context.mode === "delta" && context.since) {
      query = query.gte("updated_at", context.since);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return [];
    }

    const inconsistentIds: string[] = [];

    for (const item of data as Record<string, unknown>[]) {
      const tags = item.tags as string[] | null;
      if (!tags || tags.length < 2) continue;

      const tagSet = new Set(tags.map((t) => t.toLowerCase()));

      for (const [a, b] of CONTRADICTORY_PAIRS) {
        if (tagSet.has(a) && tagSet.has(b)) {
          inconsistentIds.push(item.id as string);
          break;
        }
      }
    }

    if (inconsistentIds.length === 0) {
      return [];
    }

    const displayIds = inconsistentIds.slice(0, MAX_AFFECTED_NODES);
    const count = inconsistentIds.length;

    return [
      {
        rule_id: this.id,
        severity: this.default_severity,
        affected_nodes: displayIds,
        message: `${count} assessment item${count === 1 ? "" : "s"} have contradictory tags`,
        suggested_fix:
          "Review and resolve contradictory tag pairs (e.g., easy+hard)",
      },
    ];
  }
}
