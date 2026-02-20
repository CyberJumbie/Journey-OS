/**
 * LintEngineService tests.
 * [STORY-IA-12] 10 tests covering scan execution, delta mode, error isolation, report creation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { LintEngineService } from "../lint-engine.service";
import { LintRuleRegistryService } from "../lint-rule-registry.service";
import type { LintReportRepository } from "../../../repositories/lint-report.repository";
import type { LintRule, LintRuleConfig } from "@journey-os/types";

function createMockRule(overrides?: Partial<LintRule>): LintRule {
  return {
    id: overrides?.id ?? "test-rule",
    name: overrides?.name ?? "Test Rule",
    description: overrides?.description ?? "A test rule",
    default_severity: overrides?.default_severity ?? "warning",
    execute: overrides?.execute ?? vi.fn().mockResolvedValue([]),
  };
}

function createMockRepository(): LintReportRepository {
  return {
    create: vi.fn().mockResolvedValue({
      id: "report-uuid-1",
      institution_id: "inst-uuid-1",
      findings: [],
      total_findings: 0,
      critical_count: 0,
      warning_count: 0,
      info_count: 0,
      mode: "full",
      duration_ms: 100,
      created_at: "2026-02-19T03:00:00Z",
    }),
    findById: vi.fn(),
    listByInstitution: vi.fn(),
    getConfigs: vi.fn().mockResolvedValue([]),
    upsertConfig: vi.fn(),
  } as unknown as LintReportRepository;
}

describe("LintEngineService", () => {
  let engine: LintEngineService;
  let repository: LintReportRepository;
  let registry: LintRuleRegistryService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    registry = new LintRuleRegistryService();
    engine = new LintEngineService(repository, registry);
  });

  describe("runScan", () => {
    it("executes all enabled rules and returns aggregated report", async () => {
      const rule1 = createMockRule({
        id: "rule-1",
        execute: vi.fn().mockResolvedValue([
          {
            rule_id: "rule-1",
            severity: "warning",
            affected_nodes: ["node-1"],
            message: "Found issue",
            suggested_fix: "Fix it",
          },
        ]),
      });
      const rule2 = createMockRule({
        id: "rule-2",
        default_severity: "critical",
        execute: vi.fn().mockResolvedValue([
          {
            rule_id: "rule-2",
            severity: "critical",
            affected_nodes: ["node-2"],
            message: "Critical issue",
            suggested_fix: "Fix urgently",
          },
        ]),
      });

      registry.register(rule1);
      registry.register(rule2);

      await engine.runScan("inst-uuid-1", "full");

      expect(rule1.execute).toHaveBeenCalledOnce();
      expect(rule2.execute).toHaveBeenCalledOnce();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: "inst-uuid-1",
          total_findings: 2,
          critical_count: 1,
          warning_count: 1,
          mode: "full",
        }),
      );
    });

    it("skips disabled rules based on institution config", async () => {
      const enabledRule = createMockRule({ id: "enabled-rule" });
      const disabledRule = createMockRule({ id: "disabled-rule" });

      registry.register(enabledRule);
      registry.register(disabledRule);

      const configs: LintRuleConfig[] = [
        { rule_id: "disabled-rule", enabled: false },
      ];
      (repository.getConfigs as ReturnType<typeof vi.fn>).mockResolvedValue(
        configs,
      );

      await engine.runScan("inst-uuid-1", "full");

      expect(enabledRule.execute).toHaveBeenCalledOnce();
      expect(disabledRule.execute).not.toHaveBeenCalled();
    });

    it("applies severity_override from config when present", async () => {
      const rule = createMockRule({
        id: "override-rule",
        execute: vi.fn().mockResolvedValue([
          {
            rule_id: "override-rule",
            severity: "warning",
            affected_nodes: ["node-1"],
            message: "Found issue",
            suggested_fix: "Fix it",
          },
        ]),
      });

      registry.register(rule);

      const configs: LintRuleConfig[] = [
        {
          rule_id: "override-rule",
          enabled: true,
          severity_override: "critical",
        },
      ];
      (repository.getConfigs as ReturnType<typeof vi.fn>).mockResolvedValue(
        configs,
      );

      await engine.runScan("inst-uuid-1", "full");

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          critical_count: 1,
          warning_count: 0,
        }),
      );
    });

    it("passes delta mode with since timestamp to rules", async () => {
      const rule = createMockRule({ id: "delta-rule" });
      registry.register(rule);

      await engine.runScan("inst-uuid-1", "delta", "2026-02-18T00:00:00Z");

      expect(rule.execute).toHaveBeenCalledWith({
        institution_id: "inst-uuid-1",
        mode: "delta",
        since: "2026-02-18T00:00:00Z",
      });
    });

    it("passes full mode without since timestamp to rules", async () => {
      const rule = createMockRule({ id: "full-rule" });
      registry.register(rule);

      await engine.runScan("inst-uuid-1", "full");

      expect(rule.execute).toHaveBeenCalledWith({
        institution_id: "inst-uuid-1",
        mode: "full",
      });
    });

    it("saves report to repository after scan completes", async () => {
      const rule = createMockRule({ id: "save-rule" });
      registry.register(rule);

      await engine.runScan("inst-uuid-1", "full");

      expect(repository.create).toHaveBeenCalledOnce();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          institution_id: "inst-uuid-1",
          mode: "full",
        }),
      );
    });

    it("records duration_ms accurately", async () => {
      const rule = createMockRule({ id: "timing-rule" });
      registry.register(rule);

      await engine.runScan("inst-uuid-1", "full");

      const createCall = (repository.create as ReturnType<typeof vi.fn>).mock
        .calls[0]![0] as { duration_ms: number };
      expect(createCall.duration_ms).toBeGreaterThanOrEqual(0);
      expect(typeof createCall.duration_ms).toBe("number");
    });

    it("continues execution when a single rule throws an error", async () => {
      const failingRule = createMockRule({
        id: "failing-rule",
        execute: vi.fn().mockRejectedValue(new Error("Rule crashed")),
      });
      const passingRule = createMockRule({
        id: "passing-rule",
        execute: vi.fn().mockResolvedValue([
          {
            rule_id: "passing-rule",
            severity: "info",
            affected_nodes: ["node-1"],
            message: "Info finding",
            suggested_fix: "Review",
          },
        ]),
      });

      registry.register(failingRule);
      registry.register(passingRule);

      await engine.runScan("inst-uuid-1", "full");

      expect(passingRule.execute).toHaveBeenCalledOnce();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_findings: 1,
          info_count: 1,
        }),
      );
    });

    it("logs error and returns partial findings when rule fails", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const failingRule = createMockRule({
        id: "failing-rule",
        execute: vi.fn().mockRejectedValue(new Error("Rule crashed")),
      });
      registry.register(failingRule);

      await engine.runScan("inst-uuid-1", "full");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("failing-rule"),
        expect.any(String),
      );

      consoleSpy.mockRestore();
    });

    it("returns empty findings when no rules produce findings", async () => {
      const rule = createMockRule({
        id: "empty-rule",
        execute: vi.fn().mockResolvedValue([]),
      });
      registry.register(rule);

      await engine.runScan("inst-uuid-1", "full");

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          total_findings: 0,
          critical_count: 0,
          warning_count: 0,
          info_count: 0,
        }),
      );
    });
  });
});
