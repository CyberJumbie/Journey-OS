/**
 * LOGO WORDMARK — Reusable Brand Element
 * 
 * "Journey" (serif) + "OS" badge (mono)
 * Used in: nav, sidebar, brand panels, auth pages
 */

import { cn } from "../ui/utils";

interface LogoWordmarkProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LogoWordmark({ size = "md", className }: LogoWordmarkProps) {
  const sizes = {
    sm: { journey: "text-[18px]", badge: "text-[8px] px-1.5 py-0.5" },
    md: { journey: "text-[22px]", badge: "text-[9px] px-2 py-0.5" },
    lg: { journey: "text-[24px]", badge: "text-[9px] px-2 py-1" }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span 
        className={cn(
          "font-serif font-bold text-[--navy-deep] tracking-tight",
          sizes[size].journey
        )}
      >
        Journey
      </span>
      <span 
        className={cn(
          "font-mono text-[--green-dark] uppercase tracking-wider border-[1.5px] border-[--green-dark] rounded-[--radius-sm]",
          sizes[size].badge
        )}
      >
        OS
      </span>
    </div>
  );
}
