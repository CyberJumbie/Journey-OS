/**
 * PROGRESS RING — Circular Progress Indicator
 * 
 * SVG donut chart for coverage/mastery scores.
 * Color shifts based on percentage thresholds.
 */

import { cn } from "../ui/utils";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressRing({ 
  percentage, 
  size = 40, 
  strokeWidth = 3,
  className,
  showLabel = true 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return "var(--green)";
    if (percentage >= 60) return "var(--blue-mid)";
    return "var(--warning)";
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-light)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-medium text-[--text-secondary]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
