/**
 * DanglingSloRule — finds SLOs with invalid course_id references.
 * [STORY-IA-12] Supabase-based rule. Severity: critical.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

const MAX_AFFECTED_NODES = 100;

export class DanglingSloRule implements LintRule {
  readonly id = "dangling-slo";
  readonly name = "Dangling SLOs";
  readonly description = "SLOs referencing non-existent courses";
  readonly default_severity = "critical" as const;

  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async execute(context: LintContext): Promise<readonly LintFinding[]> {
    // Find SLOs whose course_id doesn't match any course
    // Use RPC or a raw query approach via LEFT JOIN
    let query = this.#supabaseClient
      .from("student_learning_objectives")
      .select("id, course_id")
      .not("course_id", "is", null);

    if (context.mode === "delta" && context.since) {
      query = query.gte("updated_at", context.since);
    }

    const { data: slos, error: sloError } = await query;

    if (sloError || !slos || slos.length === 0) {
      return [];
    }

    // Get all valid course IDs
    const courseIds = [
      ...new Set(
        slos.map((s: Record<string, unknown>) => s.course_id as string),
      ),
    ];
    const { data: courses } = await this.#supabaseClient
      .from("courses")
      .select("id")
      .in("id", courseIds);

    const validCourseIds = new Set(
      (courses ?? []).map((c: Record<string, unknown>) => c.id as string),
    );

    const danglingIds = slos
      .filter(
        (s: Record<string, unknown>) =>
          !validCourseIds.has(s.course_id as string),
      )
      .map((s: Record<string, unknown>) => s.id as string);

    if (danglingIds.length === 0) {
      return [];
    }

    const displayIds = danglingIds.slice(0, MAX_AFFECTED_NODES);
    const count = danglingIds.length;

    return [
      {
        rule_id: this.id,
        severity: this.default_severity,
        affected_nodes: displayIds,
        message: `${count} SLO${count === 1 ? "" : "s"} reference${count === 1 ? "s" : ""} a non-existent course`,
        suggested_fix:
          "Update the SLO's course_id to a valid course or delete the SLO",
      },
    ];
  }
}
