"use client";

interface JourneyLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { serif: 17, mono: 8, padding: "1px 5px" },
  md: { serif: 20, mono: 9, padding: "2px 7px" },
  lg: { serif: 24, mono: 9, padding: "2px 7px" },
};

export function JourneyLogo({ size = "md" }: JourneyLogoProps) {
  const s = sizes[size];

  return (
    <div className="flex items-center gap-2">
      <span
        className="font-serif font-bold text-navy-deep"
        style={{ fontSize: s.serif }}
      >
        Journey
      </span>
      <span
        className="rounded-sm border-[1.5px] border-green-dark font-mono text-green-dark"
        style={{
          fontSize: s.mono,
          letterSpacing: "0.1em",
          padding: s.padding,
        }}
      >
        OS
      </span>
    </div>
  );
}
