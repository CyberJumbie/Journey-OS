/**
 * ScoreSkewRule — detects skew in quality_score distribution.
 * [STORY-IA-12] Supabase-based rule. Severity: warning. Default threshold: 1.0.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

const DEFAULT_SKEW_THRESHOLD = 1.0;
const MIN_SAMPLE_SIZE = 10;
const MAX_AFFECTED_NODES = 100;

export class ScoreSkewRule implements LintRule {
  readonly id = "score-skew";
  readonly name = "Score Skew";
  readonly description = "Quality score distribution is significantly skewed";
  readonly default_severity = "warning" as const;

  readonly #supabaseClient: SupabaseClient;
  #threshold: number;

  constructor(supabaseClient: SupabaseClient, threshold?: number) {
    this.#supabaseClient = supabaseClient;
    this.#threshold = threshold ?? DEFAULT_SKEW_THRESHOLD;
  }

  set threshold(value: number) {
    this.#threshold = value;
  }

  async execute(context: LintContext): Promise<readonly LintFinding[]> {
    let query = this.#supabaseClient
      .from("assessment_items")
      .select("id, quality_score")
      .not("quality_score", "is", null);

    if (context.mode === "delta" && context.since) {
      query = query.gte("updated_at", context.since);
    }

    const { data, error } = await query;

    if (error || !data || data.length < MIN_SAMPLE_SIZE) {
      return [];
    }

    const scores = data.map(
      (item: Record<string, unknown>) => item.quality_score as number,
    );
    const n = scores.length;

    // Calculate skewness: n * sum((x - mean)^3) / ((n-1)(n-2) * std^3)
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance =
      scores.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1);
    const std = Math.sqrt(variance);

    if (std === 0) {
      return [];
    }

    const skewness =
      (n * scores.reduce((sum, x) => sum + ((x - mean) / std) ** 3, 0)) /
      ((n - 1) * (n - 2));

    if (Math.abs(skewness) <= this.#threshold) {
      return [];
    }

    const ids = data.map((item: Record<string, unknown>) => item.id as string);
    const displayIds = ids.slice(0, MAX_AFFECTED_NODES);

    return [
      {
        rule_id: this.id,
        severity: this.default_severity,
        affected_nodes: displayIds,
        message: `Quality score distribution has skewness of ${skewness.toFixed(2)} (threshold: ${this.#threshold})`,
        suggested_fix:
          "Review the quality scoring pipeline — scores may be biased toward one end",
      },
    ];
  }
}
