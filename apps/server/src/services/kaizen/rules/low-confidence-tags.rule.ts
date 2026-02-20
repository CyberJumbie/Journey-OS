/**
 * LowConfidenceTagsRule — STUB: no tag_confidences column exists yet.
 * [STORY-IA-12] Returns empty findings. Severity: info.
 */

import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

export class LowConfidenceTagsRule implements LintRule {
  readonly id = "low-confidence-tags";
  readonly name = "Low Confidence Tags";
  readonly description = "Tags with confidence below threshold";
  readonly default_severity = "info" as const;

  async execute(_context: LintContext): Promise<readonly LintFinding[]> {
    // Stub: tag_confidences column doesn't exist on assessment_items yet.
    return [];
  }
}
