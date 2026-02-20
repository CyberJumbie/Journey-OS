/**
 * STAT CARD — KPI Display Molecule
 * 
 * Two variants:
 * 1. Inverted: for use inside navyDeep bookmark sections
 * 2. Light: for use on cream or white backgrounds
 */

import { cn } from "../ui/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  variant?: "inverted" | "light";
  sparkline?: number[];
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  trend = "neutral",
  variant = "light",
  sparkline,
  className
}: StatCardProps) {
  const isInverted = variant === "inverted";

  return (
    <div
      className={cn(
        "rounded-[--radius-lg] p-4 transition-all duration-[--duration-normal]",
        isInverted 
          ? "bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm" 
          : "bg-parchment border border-[--border-light]",
        className
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span 
          className={cn(
            "font-mono text-[--font-size-label-sm] uppercase tracking-[--letter-spacing-wide]",
            isInverted ? "text-[--blue-pale] opacity-60" : "text-[--text-muted]"
          )}
        >
          {label}
        </span>
        {sparkline && (
          <div className="w-16 h-6">
            {/* Sparkline would render here - simplified for now */}
            <div className="w-full h-full opacity-30" />
          </div>
        )}
      </div>
      
      <div 
        className={cn(
          "font-serif text-[28px] font-bold leading-none mb-1",
          isInverted ? "text-white" : "text-[--navy-deep]"
        )}
      >
        {value}
      </div>
      
      {change && (
        <div 
          className={cn(
            "text-[11px] font-sans",
            isInverted ? "text-[--blue-pale] opacity-65" : "text-[--text-secondary]"
          )}
        >
          {change}
        </div>
      )}
    </div>
  );
}
