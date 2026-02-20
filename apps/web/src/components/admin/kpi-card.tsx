"use client";

import { SparklineSVG } from "./sparkline-svg";

interface KPICardProps {
  readonly label: string;
  readonly value: number;
  readonly previousValue: number;
  readonly trend: "up" | "down" | "flat";
  readonly sparkline: readonly number[];
  readonly unit?: string;
}

function TrendIndicator({ trend }: { readonly trend: "up" | "down" | "flat" }) {
  if (trend === "up") {
    return (
      <span className="text-[#69a338]" aria-label="Trending up">
        &#9650;
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="text-red-600" aria-label="Trending down">
        &#9660;
      </span>
    );
  }
  return (
    <span className="text-gray-500" aria-label="No change">
      &#8212;
    </span>
  );
}

export function KPICard({
  label,
  value,
  previousValue,
  trend,
  sparkline,
  unit,
}: KPICardProps) {
  const changeValue = value - previousValue;
  const changeLabel =
    changeValue > 0
      ? `+${changeValue}`
      : changeValue < 0
        ? `${changeValue}`
        : "0";

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <SparklineSVG data={sparkline} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-gray-900">
          {value.toLocaleString()}
          {unit ? (
            <span className="text-sm font-normal text-gray-500">{unit}</span>
          ) : null}
        </p>
        <div className="flex items-center gap-1 text-sm">
          <TrendIndicator trend={trend} />
          <span className="text-gray-500">{changeLabel}</span>
        </div>
      </div>
    </div>
  );
}
