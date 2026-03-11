'use client';

interface SidebarLogoProps {
  showLabels: boolean;
}

export default function SidebarLogo({ showLabels }: SidebarLogoProps) {
  if (showLabels) {
    return (
      <div className="overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-2 px-2 mb-1">
          <span className="font-[family-name:var(--font-heading)] text-xl font-bold text-[var(--navy)]">
            Journey
          </span>
          <span className="font-[family-name:var(--font-label)] text-[8px] tracking-widest text-[var(--green-dark)] border border-[var(--green-dark)] px-1.5 py-px rounded-sm">
            OS
          </span>
        </div>
        <div className="font-[family-name:var(--font-label)] text-[9px] tracking-wider text-[var(--gray-600)] px-2 mb-5">
          MOREHOUSE SCHOOL OF MEDICINE
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--navy)] font-[family-name:var(--font-heading)] text-sm font-bold text-white">
        J
      </div>
    </div>
  );
}
