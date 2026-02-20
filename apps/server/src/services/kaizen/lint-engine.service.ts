/**
 * LintEngineService — orchestrates lint rule execution and report creation.
 * [STORY-IA-12] Runs enabled rules, aggregates findings, saves report.
 */

import type {
  LintFinding,
  LintContext,
  LintRuleConfig,
} from "@journey-os/types";
import type { LintRuleRegistryService } from "./lint-rule-registry.service";
import type { LintReportRepository } from "../../repositories/lint-report.repository";

export class LintEngineService {
  readonly #repository: LintReportRepository;
  readonly #registry: LintRuleRegistryService;

  constructor(
    repository: LintReportRepository,
    registry: LintRuleRegistryService,
  ) {
    this.#repository = repository;
    this.#registry = registry;
  }

  async runScan(
    institutionId: string,
    mode: "delta" | "full",
    since?: string,
  ): Promise<Record<string, unknown>> {
    const start = performance.now();

    // Load institution-specific rule configs
    const configs = await this.#repository.getConfigs(institutionId);
    const configMap = new Map<string, LintRuleConfig>(
      configs.map((c) => [c.rule_id, c]),
    );

    // Get enabled rules
    const enabledRules = this.#registry.getEnabledRules(configs);

    const context: LintContext = {
      institution_id: institutionId,
      mode,
      ...(since ? { since } : {}),
    };

    // Execute each rule with error isolation
    const allFindings: LintFinding[] = [];

    for (const rule of enabledRules) {
      try {
        const ruleConfig = configMap.get(rule.id);
        const findings = await rule.execute(context);

        // Apply severity override if configured
        const severityOverride = ruleConfig?.severity_override;
        const mappedFindings = severityOverride
          ? findings.map((f) => ({ ...f, severity: severityOverride }))
          : findings;

        allFindings.push(...mappedFindings);
      } catch (err) {
        // Log error and continue — individual rule failures don't crash the scan
        console.error(
          `[LintEngine] Rule "${rule.id}" failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    const durationMs = Math.round(performance.now() - start);

    // Aggregate counts
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const finding of allFindings) {
      switch (finding.severity) {
        case "critical":
          criticalCount++;
          break;
        case "warning":
          warningCount++;
          break;
        case "info":
          infoCount++;
          break;
      }
    }

    // Save report
    const row = await this.#repository.create({
      institution_id: institutionId,
      findings: allFindings,
      total_findings: allFindings.length,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: infoCount,
      mode,
      duration_ms: durationMs,
    });

    return row;
  }
}
