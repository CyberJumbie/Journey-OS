/**
 * Lint controller.
 * [STORY-IA-12] Handles lint report, scan, and config endpoints.
 */

import { Request, Response } from "express";
import type { ApiResponse } from "@journey-os/types";
import type { LintEngineService } from "../../services/kaizen/lint-engine.service";
import type { LintReportRepository } from "../../repositories/lint-report.repository";
import type { LintRuleRegistryService } from "../../services/kaizen/lint-rule-registry.service";
import { LintReportModel } from "../../models/lint-report.model";
import { LintReportNotFoundError, LintRuleNotFoundError } from "../../errors";

export class LintController {
  readonly #engine: LintEngineService;
  readonly #repository: LintReportRepository;
  readonly #registry: LintRuleRegistryService;

  constructor(
    engine: LintEngineService,
    repository: LintReportRepository,
    registry: LintRuleRegistryService,
  ) {
    this.#engine = engine;
    this.#repository = repository;
    this.#registry = registry;
  }

  async handleListReports(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const limitParam = req.query.limit;
      const limit =
        typeof limitParam === "string" ? parseInt(limitParam, 10) : undefined;

      const rows = await this.#repository.listByInstitution(
        institutionId,
        limit,
      );

      const body: ApiResponse<{ reports: Record<string, unknown>[] }> = {
        data: { reports: rows },
        error: null,
      };
      res.status(200).json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }

  async handleGetReport(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const idParam = req.params.id;
      const id = typeof idParam === "string" ? idParam : undefined;
      if (!id) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Report ID required" },
        };
        res.status(400).json(body);
        return;
      }

      const row = await this.#repository.findById(id, institutionId);

      if (!row) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "LINT_REPORT_NOT_FOUND",
            message: `Lint report not found: ${id}`,
          },
        };
        res.status(404).json(body);
        return;
      }

      const model = LintReportModel.fromRow(row);
      const body: ApiResponse<ReturnType<LintReportModel["toJSON"]>> = {
        data: model.toJSON(),
        error: null,
      };
      res.status(200).json(body);
    } catch (err) {
      if (err instanceof LintReportNotFoundError) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: err.code, message: err.message },
        };
        res.status(404).json(body);
        return;
      }
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }

  async handleRunScan(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const { mode, since } = req.body as {
        mode?: string;
        since?: string;
      };

      if (!mode || (mode !== "full" && mode !== "delta")) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: 'Invalid mode. Must be "full" or "delta".',
          },
        };
        res.status(400).json(body);
        return;
      }

      if (mode === "delta" && !since) {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: 'Delta mode requires a "since" timestamp.',
          },
        };
        res.status(400).json(body);
        return;
      }

      const row = await this.#engine.runScan(institutionId, mode, since);

      const body: ApiResponse<{
        report_id: string;
        total_findings: number;
        critical_count: number;
        warning_count: number;
        info_count: number;
        duration_ms: number;
      }> = {
        data: {
          report_id: row.id as string,
          total_findings: row.total_findings as number,
          critical_count: row.critical_count as number,
          warning_count: row.warning_count as number,
          info_count: row.info_count as number,
          duration_ms: row.duration_ms as number,
        },
        error: null,
      };
      res.status(201).json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }

  async handleGetConfig(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const allRules = this.#registry.getAllRules();
      const configs = await this.#repository.getConfigs(institutionId);
      const configMap = new Map(configs.map((c) => [c.rule_id, c]));

      const rules = allRules.map((rule) => {
        const config = configMap.get(rule.id);
        return {
          rule_id: rule.id,
          name: rule.name,
          description: rule.description,
          default_severity: rule.default_severity,
          enabled: config ? config.enabled : true,
          severity_override: config?.severity_override ?? null,
          threshold: config?.threshold ?? null,
        };
      });

      const body: ApiResponse<{ rules: typeof rules }> = {
        data: { rules },
        error: null,
      };
      res.status(200).json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }

  async handleUpdateConfig(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as unknown as Record<string, unknown>).user as
        | { institution_id?: string }
        | undefined;

      const institutionId = user?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        const body: ApiResponse<null> = {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Institution ID required",
          },
        };
        res.status(400).json(body);
        return;
      }

      const ruleIdParam = req.params.ruleId;
      const ruleId = typeof ruleIdParam === "string" ? ruleIdParam : undefined;
      if (!ruleId) {
        const body: ApiResponse<null> = {
          data: null,
          error: { code: "VALIDATION_ERROR", message: "Rule ID required" },
        };
        res.status(400).json(body);
        return;
      }

      // Verify rule exists in registry
      try {
        this.#registry.getRule(ruleId);
      } catch (err) {
        if (err instanceof LintRuleNotFoundError) {
          const body: ApiResponse<null> = {
            data: null,
            error: { code: err.code, message: err.message },
          };
          res.status(404).json(body);
          return;
        }
        throw err;
      }

      const { enabled, severity_override, threshold } = req.body as {
        enabled?: boolean;
        severity_override?: string | null;
        threshold?: number | null;
      };

      const config = await this.#repository.upsertConfig(
        institutionId,
        ruleId,
        { enabled, severity_override, threshold },
      );

      const body: ApiResponse<typeof config> = {
        data: config,
        error: null,
      };
      res.status(200).json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again.",
        },
      };
      res.status(500).json(body);
    }
  }
}
