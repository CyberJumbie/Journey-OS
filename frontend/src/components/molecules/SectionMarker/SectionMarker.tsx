/**
 * SECTION MARKER — Dot + mono label section header
 *
 * Small colored dot + uppercase mono label combo used at the top
 * of every card and section. The dot color signals content pillar.
 * Molecule level: composes label atom pattern. No data fetching.
 */

import { cn } from '@/components/ui/utils';

interface SectionMarkerProps {
  /** Label text (rendered uppercase in DM Mono) */
  label: string;
  /** Dot color pillar */
  color?: 'navy' | 'green' | 'blue' | 'green-dark' | 'warning';
  /** Additional class names */
  className?: string;
}

const DOT_COLORS = {
  navy: 'var(--navy-deep)',
  green: 'var(--green)',
  blue: 'var(--blue-mid)',
  'green-dark': 'var(--green-dark)',
  warning: 'var(--warning)',
} as const;

export function SectionMarker({
  label,
  color = 'navy',
  className,
}: SectionMarkerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="w-[5px] h-[5px] rounded-[1px]"
        style={{ background: DOT_COLORS[color] }}
      />
      <span className="font-mono text-[var(--font-size-label-md)] uppercase tracking-[var(--letter-spacing-wide)] text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}
