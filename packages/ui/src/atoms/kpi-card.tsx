"use client";

import type { KpiMetric } from "@journey-os/types";
import { TrendIndicator } from "./trend-indicator";

export interface KpiCardProps {
  readonly metric: KpiMetric | undefined;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-border-light bg-parchment p-4 animate-pulse">
      <div className="h-4 w-24 rounded bg-warm-gray mb-3" />
      <div className="h-8 w-16 rounded bg-warm-gray mb-2" />
      <div className="h-4 w-20 rounded bg-warm-gray" />
    </div>
  );
}

export function KpiCard({ metric }: KpiCardProps) {
  if (!metric) {
    return <KpiCardSkeleton />;
  }

  return (
    <div className="rounded-lg border border-border-light bg-parchment p-4">
      <p className="text-sm font-medium text-text-secondary mb-1">
        {metric.label}
      </p>
      <p className="text-2xl font-bold text-text-primary mb-1">
        {metric.value}
        {metric.unit ? (
          <span className="text-sm font-normal text-text-muted ml-1">
            {metric.unit}
          </span>
        ) : null}
      </p>
      <TrendIndicator
        direction={metric.trend_direction}
        percent={metric.trend_percent}
      />
    </div>
  );
}
