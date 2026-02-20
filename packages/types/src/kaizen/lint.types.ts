/**
 * KaizenML lint rule engine types.
 * [STORY-IA-12] Data quality linting system for knowledge graph and item bank.
 */

/** Severity levels for lint findings */
export type LintSeverity = "critical" | "warning" | "info";

/** A single finding produced by a lint rule */
export interface LintFinding {
  readonly rule_id: string;
  readonly severity: LintSeverity;
  readonly affected_nodes: readonly string[];
  readonly message: string;
  readonly suggested_fix: string;
}

/** A complete lint report from one scan */
export interface LintReport {
  readonly id: string;
  readonly institution_id: string;
  readonly findings: readonly LintFinding[];
  readonly total_findings: number;
  readonly critical_count: number;
  readonly warning_count: number;
  readonly info_count: number;
  readonly mode: "delta" | "full";
  readonly duration_ms: number;
  readonly created_at: string;
}

/** Per-institution configuration for a lint rule */
export interface LintRuleConfig {
  readonly rule_id: string;
  readonly enabled: boolean;
  readonly severity_override?: LintSeverity;
  readonly threshold?: number;
}

/** Interface that all lint rules must implement */
export interface LintRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly default_severity: LintSeverity;
  execute(context: LintContext): Promise<readonly LintFinding[]>;
}

/** Context passed to each lint rule during execution */
export interface LintContext {
  readonly institution_id: string;
  readonly mode: "delta" | "full";
  readonly since?: string;
}
