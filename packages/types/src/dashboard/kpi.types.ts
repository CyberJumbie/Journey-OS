/** Supported KPI period values */
export type KpiPeriod = "7d" | "30d" | "semester";

/** Trend direction for a KPI metric */
export type TrendDirection = "up" | "down" | "flat";

/** Single KPI metric with trend data */
export interface KpiMetric {
  /** Machine-readable metric key */
  readonly key:
    | "questions_generated"
    | "approval_rate"
    | "coverage_score"
    | "time_saved";
  /** Human-readable label */
  readonly label: string;
  /** Current period value */
  readonly value: number;
  /** Display unit (e.g., "", "%", "hrs") */
  readonly unit: string;
  /** Trend direction */
  readonly trend_direction: TrendDirection;
  /** Trend percentage change vs previous period */
  readonly trend_percent: number;
  /** Previous period value (for tooltip) */
  readonly previous_value: number;
}

/** Query parameters for the KPI endpoint */
export interface KpiQuery {
  readonly user_id: string;
  /** Default: "7d" */
  readonly period?: KpiPeriod;
}

/** Response envelope for KPI data */
export interface KpiResponse {
  readonly metrics: readonly KpiMetric[];
  readonly period: KpiPeriod;
  readonly period_start: string;
  readonly period_end: string;
  readonly scope: "personal" | "institution";
}
