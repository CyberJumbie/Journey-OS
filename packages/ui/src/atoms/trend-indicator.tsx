"use client";

import { ChevronUp, ChevronDown, Minus } from "lucide-react";
import type { TrendDirection } from "@journey-os/types";

export interface TrendIndicatorProps {
  readonly direction: TrendDirection;
  readonly percent: number;
}

export function TrendIndicator({ direction, percent }: TrendIndicatorProps) {
  const absPercent = Math.abs(percent);

  if (direction === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm font-medium text-green">
        <ChevronUp className="h-4 w-4" />
        <span>+{absPercent.toFixed(1)}%</span>
      </span>
    );
  }

  if (direction === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-sm font-medium text-error">
        <ChevronDown className="h-4 w-4" />
        <span>-{absPercent.toFixed(1)}%</span>
      </span>
    );
  }

  // flat
  return (
    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-text-muted">
      <Minus className="h-4 w-4" />
      <span>{absPercent.toFixed(1)}%</span>
    </span>
  );
}
