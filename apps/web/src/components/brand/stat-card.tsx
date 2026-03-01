"use client";

import { Sparkline } from "@web/components/dashboard/sparkline";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "stable" | "down";
  sparkData?: number[];
  variant?: "light" | "inverted";
  className?: string;
}

const trendIcons: Record<string, string> = {
  up: "\u2191",
  down: "\u2193",
  stable: "\u2192",
};

const trendColors: Record<string, string> = {
  up: "text-green",
  down: "text-error",
  stable: "text-text-muted",
};

export function StatCard({
  label,
  value,
  change,
  trend = "stable",
  sparkData,
  variant = "light",
  className = "",
}: StatCardProps) {
  const isInverted = variant === "inverted";

  return (
    <div
      className={`flex items-end justify-between rounded-lg p-4 ${
        isInverted
          ? "border border-white/[0.08] bg-white/[0.06]"
          : "border border-border-light bg-parchment"
      } ${className}`}
    >
      <div className="flex flex-col gap-1">
        <span
          className={`font-mono text-[9px] uppercase tracking-wider ${
            isInverted ? "text-white/60" : "text-text-muted"
          }`}
        >
          {label}
        </span>
        <span
          className={`font-serif text-2xl font-bold ${
            isInverted ? "text-white" : "text-navy-deep"
          }`}
        >
          {value}
        </span>
        {change && (
          <span className={`text-xs font-medium ${trendColors[trend]}`}>
            {trendIcons[trend]} {change}
          </span>
        )}
      </div>
      {sparkData && sparkData.length > 1 && (
        <Sparkline
          data={sparkData}
          color={
            isInverted
              ? "rgba(255,255,255,0.5)"
              : "#2b71b9" /* token: --blue-mid */
          }
          width={64}
          height={24}
        />
      )}
    </div>
  );
}
