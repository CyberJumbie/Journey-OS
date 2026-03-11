/**
 * MASTERY CELL -- Heatmap cell for topic mastery visualization
 *
 * Renders a colored square whose fill intensity maps to a 0-1 mastery value.
 * Color thresholds: >70% green, 40-70% blue-mid, 15-40% blue-pale, <15% border-light.
 * Atom level: pure presentational, no state, no data fetching.
 */

import { cn } from '@/components/ui/utils';

interface MasteryCellProps {
  /** Mastery value 0-1 */
  value: number;
  /** Tooltip label */
  label: string;
  /** Additional class names */
  className?: string;
}

export function MasteryCell({ value, label, className }: MasteryCellProps) {
  const intensity = Math.min(1, Math.max(0, value));
  const pct = Math.round(intensity * 100);

  const bgClass =
    intensity > 0.7
      ? 'bg-[var(--green)]'
      : intensity > 0.4
        ? 'bg-[var(--blue-mid)]'
        : intensity > 0.15
          ? 'bg-[var(--blue-pale)]'
          : 'bg-[var(--border-light)]';

  const textClass =
    intensity > 0.4 ? 'text-white' : 'text-[var(--text-muted)]';

  return (
    <div
      title={`${label}: ${pct}%`}
      className={cn(
        'aspect-square w-full rounded-[4px] flex items-center justify-center',
        'font-mono text-[9px] font-medium cursor-default transition-all duration-200',
        bgClass,
        textClass,
        className
      )}
    >
      {pct}
    </div>
  );
}
