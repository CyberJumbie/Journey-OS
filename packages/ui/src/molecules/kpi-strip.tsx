"use client";

import type { KpiMetric, KpiPeriod } from "@journey-os/types";
import { KpiCard } from "../atoms/kpi-card";

export interface KpiStripProps {
  readonly metrics: readonly KpiMetric[];
  readonly period: KpiPeriod;
  readonly onPeriodChange: (period: KpiPeriod) => void;
  readonly isLoading: boolean;
}

const PERIOD_LABELS: Record<KpiPeriod, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  semester: "This semester",
};

export function KpiStrip({
  metrics,
  period,
  onPeriodChange,
  isLoading,
}: KpiStripProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold font-serif text-text-primary">
          Performance Overview
        </h2>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as KpiPeriod)}
          className="rounded-md border border-border bg-parchment px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-mid"
        >
          {(Object.keys(PERIOD_LABELS) as KpiPeriod[]).map((key) => (
            <option key={key} value={key}>
              {PERIOD_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <KpiCard key={`skeleton-${String(i)}`} metric={undefined} />
            ))
          : metrics.map((metric) => (
              <KpiCard key={metric.key} metric={metric} />
            ))}
      </div>
    </div>
  );
}
