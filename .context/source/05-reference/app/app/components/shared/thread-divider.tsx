/**
 * THREAD DIVIDER — Decorative Section Separator
 * 
 * Two overlapping sinusoidal SVG paths.
 * Used between major sections on landing page.
 */

import { cn } from "../ui/utils";

interface ThreadDividerProps {
  className?: string;
}

export function ThreadDivider({ className }: ThreadDividerProps) {
  return (
    <svg 
      className={cn("w-full max-w-[200px] h-5 mx-auto", className)}
      viewBox="0 0 200 20" 
      fill="none"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* First wave */}
      <path
        d="M0,10 Q50,5 100,10 T200,10"
        stroke="var(--warm-gray)"
        strokeWidth="1"
        fill="none"
        opacity="0.6"
      />
      {/* Second wave (offset) */}
      <path
        d="M0,12 Q50,15 100,12 T200,12"
        stroke="var(--warm-gray)"
        strokeWidth="1"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
