/**
 * LintReport Repository — Supabase query layer.
 * [STORY-IA-12] CRUD for lint_reports and lint_rule_configs tables.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LintFinding, LintRuleConfig } from "@journey-os/types";
import { LintReportNotFoundError } from "../errors";

const REPORTS_TABLE = "lint_reports";
const CONFIGS_TABLE = "lint_rule_configs";
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export class LintReportRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(report: {
    institution_id: string;
    findings: readonly LintFinding[];
    total_findings: number;
    critical_count: number;
    warning_count: number;
    info_count: number;
    mode: "delta" | "full";
    duration_ms: number;
  }): Promise<Record<string, unknown>> {
    const { data: row, error } = await this.#supabaseClient
      .from(REPORTS_TABLE)
      .insert({
        institution_id: report.institution_id,
        findings: report.findings,
        total_findings: report.total_findings,
        critical_count: report.critical_count,
        warning_count: report.warning_count,
        info_count: report.info_count,
        mode: report.mode,
        duration_ms: report.duration_ms,
      })
      .select("*")
      .single();

    if (error || !row) {
      throw new LintReportNotFoundError(
        `Failed to create lint report: ${error?.message ?? "No data returned"}`,
      );
    }

    return row as Record<string, unknown>;
  }

  async findById(
    id: string,
    institutionId: string,
  ): Promise<Record<string, unknown> | null> {
    const { data, error } = await this.#supabaseClient
      .from(REPORTS_TABLE)
      .select("*")
      .eq("id", id)
      .eq("institution_id", institutionId)
      .maybeSingle();

    if (error) {
      throw new LintReportNotFoundError(id);
    }

    return (data as Record<string, unknown>) ?? null;
  }

  async listByInstitution(
    institutionId: string,
    limit?: number,
  ): Promise<Record<string, unknown>[]> {
    const safeLimit = Math.min(Math.max(limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

    const { data, error } = await this.#supabaseClient
      .from(REPORTS_TABLE)
      .select(
        "id, institution_id, total_findings, critical_count, warning_count, info_count, mode, duration_ms, created_at",
      )
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      throw new LintReportNotFoundError(
        `Failed to list reports: ${error.message}`,
      );
    }

    return (data ?? []) as Record<string, unknown>[];
  }

  async getConfigs(institutionId: string): Promise<LintRuleConfig[]> {
    const { data, error } = await this.#supabaseClient
      .from(CONFIGS_TABLE)
      .select("rule_id, enabled, severity_override, threshold")
      .eq("institution_id", institutionId);

    if (error) {
      return [];
    }

    return (data ?? []) as LintRuleConfig[];
  }

  async upsertConfig(
    institutionId: string,
    ruleId: string,
    config: {
      enabled?: boolean;
      severity_override?: string | null;
      threshold?: number | null;
    },
  ): Promise<LintRuleConfig> {
    const { data: row, error } = await this.#supabaseClient
      .from(CONFIGS_TABLE)
      .upsert(
        {
          institution_id: institutionId,
          rule_id: ruleId,
          enabled: config.enabled,
          severity_override: config.severity_override,
          threshold: config.threshold,
        },
        { onConflict: "institution_id,rule_id" },
      )
      .select("rule_id, enabled, severity_override, threshold")
      .single();

    if (error || !row) {
      throw new LintReportNotFoundError(
        `Failed to upsert config for rule ${ruleId}: ${error?.message ?? "No data returned"}`,
      );
    }

    return row as LintRuleConfig;
  }
}
