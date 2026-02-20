/**
 * EmbeddingDriftRule — STUB: requires baseline snapshot infra not yet built.
 * [STORY-IA-12] Returns empty findings. Severity: warning.
 */

import type { LintRule, LintContext, LintFinding } from "@journey-os/types";

export class EmbeddingDriftRule implements LintRule {
  readonly id = "embedding-drift";
  readonly name = "Embedding Drift";
  readonly description = "Embeddings diverged from baseline";
  readonly default_severity = "warning" as const;

  async execute(_context: LintContext): Promise<readonly LintFinding[]> {
    // Stub: baseline snapshot infrastructure not yet built.
    // When available, compare current embeddings against baseline using cosine distance.
    return [];
  }
}
