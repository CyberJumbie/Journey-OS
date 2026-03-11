'use client';

/**
 * ASCENDING SQUARES — Colored squares indicator
 *
 * A row of colored squares that ascend vertically,
 * representing the Journey OS brand motif.
 * Atom level: pure presentational, no state, no data fetching.
 */

import { cn } from '@/components/ui/utils';

interface AscendingSquaresProps {
  /** Array of CSS color values for each square */
  colors: string[];
  /** Square side length in px */
  size?: number;
  /** Gap between squares in px */
  gap?: number;
  /** Additional class names */
  className?: string;
  /** Inline styles for the container */
  style?: React.CSSProperties;
}

export function AscendingSquares({
  colors,
  size = 10,
  gap = 3,
  className,
  style = {},
}: AscendingSquaresProps) {
  const borderRadius = Math.max(1.5, size * 0.14);

  return (
    <div
      className={cn('flex items-end', className)}
      style={{ gap, ...style }}
    >
      {colors.map((color, i) => (
        <div
          key={`${color}-${i}`}
          style={{
            width: size,
            height: size,
            borderRadius,
            background: color,
            transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)`,
          }}
        />
      ))}
    </div>
  );
}
