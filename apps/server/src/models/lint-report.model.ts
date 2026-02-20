/**
 * LintReport domain model.
 * [STORY-IA-12] OOP class with #private fields and public getters.
 */

import type { LintReport, LintFinding } from "@journey-os/types";
import { LintReportNotFoundError } from "../errors";

export class LintReportModel {
  readonly #id: string;
  readonly #institutionId: string;
  readonly #findings: readonly LintFinding[];
  readonly #totalFindings: number;
  readonly #criticalCount: number;
  readonly #warningCount: number;
  readonly #infoCount: number;
  readonly #mode: "delta" | "full";
  readonly #durationMs: number;
  readonly #createdAt: string;

  constructor(data: LintReport) {
    this.#id = data.id;
    this.#institutionId = data.institution_id;
    this.#findings = data.findings;
    this.#totalFindings = data.total_findings;
    this.#criticalCount = data.critical_count;
    this.#warningCount = data.warning_count;
    this.#infoCount = data.info_count;
    this.#mode = data.mode;
    this.#durationMs = data.duration_ms;
    this.#createdAt = data.created_at;
  }

  get id(): string {
    return this.#id;
  }
  get institutionId(): string {
    return this.#institutionId;
  }
  get findings(): readonly LintFinding[] {
    return this.#findings;
  }
  get totalFindings(): number {
    return this.#totalFindings;
  }
  get criticalCount(): number {
    return this.#criticalCount;
  }
  get warningCount(): number {
    return this.#warningCount;
  }
  get infoCount(): number {
    return this.#infoCount;
  }
  get mode(): "delta" | "full" {
    return this.#mode;
  }
  get durationMs(): number {
    return this.#durationMs;
  }
  get createdAt(): string {
    return this.#createdAt;
  }

  static fromRow(row: Record<string, unknown>): LintReportModel {
    if (!row || !row.id) {
      throw new LintReportNotFoundError("unknown");
    }

    return new LintReportModel({
      id: row.id as string,
      institution_id: row.institution_id as string,
      findings: (row.findings as LintFinding[]) ?? [],
      total_findings: (row.total_findings as number) ?? 0,
      critical_count: (row.critical_count as number) ?? 0,
      warning_count: (row.warning_count as number) ?? 0,
      info_count: (row.info_count as number) ?? 0,
      mode: row.mode as "delta" | "full",
      duration_ms: (row.duration_ms as number) ?? 0,
      created_at: row.created_at as string,
    });
  }

  toJSON(): LintReport {
    return {
      id: this.#id,
      institution_id: this.#institutionId,
      findings: this.#findings,
      total_findings: this.#totalFindings,
      critical_count: this.#criticalCount,
      warning_count: this.#warningCount,
      info_count: this.#infoCount,
      mode: this.#mode,
      duration_ms: this.#durationMs,
      created_at: this.#createdAt,
    };
  }
}
