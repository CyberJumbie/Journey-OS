/**
 * SECTION MARKER — Atomic Component
 * 
 * Small dot + mono label combo used at the top of every card and section.
 * The dot color signals content pillar:
 * - navy: structural/system content
 * - green: educational/curriculum content
 */

import { cn } from "../ui/utils";

interface SectionMarkerProps {
  label: string;
  color?: "navy" | "green";
  className?: string;
}

export function SectionMarker({ 
  label, 
  color = "navy",
  className 
}: SectionMarkerProps) {
  const dotColor = color === "green" ? "var(--green-dark)" : "var(--navy-deep)";
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className="w-[5px] h-[5px] rounded-[1px]" 
        style={{ background: dotColor }} 
      />
      <span className="font-mono text-[--font-size-label-md] uppercase tracking-[--letter-spacing-wide] text-[--text-muted]">
        {label}
      </span>
    </div>
  );
}
