"use client";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function ProgressRing({
  percentage,
  size = 40,
  strokeWidth = 3,
  showLabel = true,
  className = "",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const arcColor =
    clamped >= 80
      ? "var(--green)"
      : clamped >= 60
        ? "var(--blue-mid)"
        : "var(--warning)";

  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ display: "block" }}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-light)"
        strokeWidth={strokeWidth}
      />
      {/* Arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={arcColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      {showLabel && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono"
          style={{ fontSize: 9 }}
          fill="var(--text-primary)"
        >
          {Math.round(clamped)}%
        </text>
      )}
    </svg>
  );
}
