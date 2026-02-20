---
name: pluggable-rule-engine-pattern
tags: [rule-engine, registry, lint, kaizen, pluggable, constructor-di]
story: STORY-IA-12
date: 2026-02-20
---
# Pluggable Rule Engine Pattern

## Problem
You need a system that runs N independent "rules" (validators, linters, checks) against tenant-scoped data, where rules can be enabled/disabled per tenant, configured with thresholds, and new rules added without modifying the engine.

## Solution

### 1. Rule Interface (types package)
```typescript
export interface LintRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly default_severity: LintSeverity;
  execute(context: LintContext): Promise<readonly LintFinding[]>;
}
```

### 2. Rule Registry (Map-based)
```typescript
export class LintRuleRegistryService {
  readonly #rules: Map<string, LintRule> = new Map();

  register(rule: LintRule): void { this.#rules.set(rule.id, rule); }
  getRule(id: string): LintRule { /* throws if not found */ }
  getAllRules(): LintRule[] { return [...this.#rules.values()]; }
  getEnabledRules(configs: LintRuleConfig[]): LintRule[] {
    // Rules enabled by default, only skip if explicitly disabled
  }
}
```

### 3. Engine (orchestrator with error isolation)
```typescript
for (const rule of enabledRules) {
  try {
    const findings = await rule.execute(context);
    // Apply severity overrides from config
    allFindings.push(...mappedFindings);
  } catch (err) {
    console.error(`Rule "${rule.id}" failed:`, err);
    // Continue to next rule — never crash the scan
  }
}
```

### 4. Per-tenant config table
```sql
CREATE TABLE lint_rule_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  rule_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  severity_override TEXT,
  threshold FLOAT,
  UNIQUE(institution_id, rule_id)
);
```

### 5. Stub rules for missing prerequisites
Rules whose data source doesn't exist yet return `[]` with a comment noting the prerequisite. They still implement the full interface so the registry and engine work end-to-end.

## When to Use
- Data quality linting systems
- Configurable validation pipelines
- Multi-tenant rule execution where rules can be toggled per tenant
- Any system where you want to add new checks without touching the engine

## When Not to Use
- Single-rule validation (just call the function directly)
- Rules that must execute in a specific order (this pattern is order-independent)
- Rules with inter-dependencies (rule A's output feeds rule B)
