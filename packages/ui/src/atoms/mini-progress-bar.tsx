"use client";

export interface MiniProgressBarProps {
  readonly percent: number;
}

function getColorClass(percent: number): string {
  if (percent <= 33) return "bg-error";
  if (percent <= 66) return "bg-warning";
  return "bg-green";
}

export function MiniProgressBar({ percent }: MiniProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const colorClass = getColorClass(clamped);

  return (
    <div className="h-1.5 w-full rounded-full bg-warm-gray/30">
      <div
        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
