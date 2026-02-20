/**
 * ASCENDING SQUARES — Brand Identity Motif
 * 
 * Four squares in pillar colors, ascending right-to-left.
 * Used in: hero decoration, step progress, section openers, brand panels
 */

import { cn } from "../ui/utils";

interface AscendingSquaresProps {
  colors: string[];
  size?: number;
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AscendingSquares({ 
  colors, 
  size = 14, 
  gap = 4,
  className,
  style = {}
}: AscendingSquaresProps) {
  return (
    <div 
      className={cn("flex items-end", className)}
      style={{ gap: `${gap}px`, ...style }}
    >
      {colors.map((color, i) => (
        <div 
          key={i}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: `${Math.max(2, size * 0.14)}px`,
            background: color,
            transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)`,
          }}
        />
      ))}
    </div>
  );
}
