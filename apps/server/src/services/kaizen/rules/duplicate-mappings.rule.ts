/**
 * DuplicateMappingsRule — STUB: mapping table doesn't exist yet (needs F-1 Course Model).
 * [STORY-IA-12] Returns empty findings. Severity: warning.
 */

import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

export class DuplicateMappingsRule implements LintRule {
  readonly id = "duplicate-mappings";
  readonly name = "Duplicate Mappings";
  readonly description =
    "Same ILO/SLO mapped to same framework node more than once";
  readonly default_severity = "warning" as const;

  async execute(_context: LintContext): Promise<readonly LintFinding[]> {
    // Stub: mapping table doesn't exist yet (needs F-1 Course Model story).
    return [];
  }
}
