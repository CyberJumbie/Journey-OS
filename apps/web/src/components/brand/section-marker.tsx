"use client";

interface SectionMarkerProps {
  label: string;
  color?: "navy" | "green";
  className?: string;
}

export function SectionMarker({
  label,
  color = "navy",
  className = "",
}: SectionMarkerProps) {
  const dotColor = color === "green" ? "bg-green" : "bg-navy-deep";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`h-[5px] w-[5px] rounded-full ${dotColor}`} />
      <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">
        {label}
      </span>
    </div>
  );
}
