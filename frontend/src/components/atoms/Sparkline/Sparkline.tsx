/**
 * SPARKLINE — Mini SVG sparkline chart
 *
 * Renders a small inline polyline chart with an endpoint dot.
 * Used inside StatCards and dashboard KPI rows.
 * Atom level: pure presentational, no state, no data fetching.
 */

import { cn } from '@/components/ui/utils';

interface SparklineProps {
  /** Data points to chart */
  data: number[];
  /** Line color — CSS var or hex */
  color?: string;
  /** SVG width in px */
  width?: number;
  /** SVG height in px */
  height?: number;
  /** Additional class names */
  className?: string;
}

export function Sparkline({
  data,
  color = 'var(--blue-mid)',
  width = 80,
  height = 28,
  className,
}: SparklineProps) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const polylinePoints = points
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  const lastPoint = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      className={cn('block', className)}
    >
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}
