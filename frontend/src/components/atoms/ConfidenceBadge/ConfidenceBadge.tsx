'use client';

/**
 * ConfidenceBadge atom — displays a confidence score with color-coded indicator.
 * Green >= 0.85, Amber 0.65-0.85, Red < 0.65.
 * No state, no data fetching (atom rule).
 */

interface ConfidenceBadgeProps {
  confidence: number;
}

function getConfidenceLevel(confidence: number): {
  label: string;
  textClass: string;
  bgClass: string;
  barClass: string;
} {
  if (confidence >= 0.85) {
    return {
      label: 'HIGH',
      textClass: 'text-[var(--green)]',
      bgClass: 'bg-green-100',
      barClass: 'bg-[var(--green)]',
    };
  }
  if (confidence >= 0.65) {
    return {
      label: 'MEDIUM',
      textClass: 'text-[var(--amber)]',
      bgClass: 'bg-amber-100',
      barClass: 'bg-[var(--amber)]',
    };
  }
  return {
    label: 'LOW',
    textClass: 'text-[var(--red)]',
    bgClass: 'bg-red-100',
    barClass: 'bg-[var(--red)]',
  };
}

export default function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const level = getConfidenceLevel(confidence);
  const pct = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${level.barClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono uppercase tracking-wide ${level.textClass} ${level.bgClass}`}
      >
        {pct}% {level.label}
      </span>
    </div>
  );
}
