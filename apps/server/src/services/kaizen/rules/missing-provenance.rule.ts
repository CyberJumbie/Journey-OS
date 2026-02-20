/**
 * MissingProvenanceRule — finds items without batch_id.
 * [STORY-IA-12] Supabase-based rule. Severity: info.
 * Note: brief says generation_session_id, actual column is batch_id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

const MAX_AFFECTED_NODES = 100;

export class MissingProvenanceRule implements LintRule {
  readonly id = "missing-provenance";
  readonly name = "Missing Provenance";
  readonly description = "Assessment items without generation provenance";
  readonly default_severity = "info" as const;

  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async execute(context: LintContext): Promise<readonly LintFinding[]> {
    let query = this.#supabaseClient
      .from("assessment_items")
      .select("id")
      .is("batch_id", null);

    if (context.mode === "delta" && context.since) {
      query = query.gte("updated_at", context.since);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return [];
    }

    const ids = data.map((item: Record<string, unknown>) => item.id as string);
    const displayIds = ids.slice(0, MAX_AFFECTED_NODES);
    const count = ids.length;

    return [
      {
        rule_id: this.id,
        severity: this.default_severity,
        affected_nodes: displayIds,
        message: `${count} assessment item${count === 1 ? "" : "s"} have no generation provenance (batch_id is null)`,
        suggested_fix:
          "Re-generate these items through the generation pipeline to establish provenance",
      },
    ];
  }
}
