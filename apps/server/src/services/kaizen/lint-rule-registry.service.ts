/**
 * LintRuleRegistryService — holds all lint rules in a registry.
 * [STORY-IA-12] Pluggable rule pattern with Map-based storage.
 */

import type { LintRule, LintRuleConfig } from "@journey-os/types";
import { LintRuleNotFoundError } from "../../errors";

export class LintRuleRegistryService {
  readonly #rules: Map<string, LintRule> = new Map();

  register(rule: LintRule): void {
    this.#rules.set(rule.id, rule);
  }

  getRule(id: string): LintRule {
    const rule = this.#rules.get(id);
    if (!rule) {
      throw new LintRuleNotFoundError(id);
    }
    return rule;
  }

  getAllRules(): LintRule[] {
    return [...this.#rules.values()];
  }

  getEnabledRules(configs: LintRuleConfig[]): LintRule[] {
    const configMap = new Map(configs.map((c) => [c.rule_id, c]));

    return this.getAllRules().filter((rule) => {
      const config = configMap.get(rule.id);
      // Rules are enabled by default unless explicitly disabled
      return config ? config.enabled : true;
    });
  }
}
