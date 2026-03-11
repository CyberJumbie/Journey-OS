/**
 * STAT CARD — KPI Display Molecule
 *
 * Two variants:
 * 1. Inverted: for use inside navyDeep bookmark sections
 * 2. Light: for use on cream or white backgrounds
 *
 * Molecule level: composes Sparkline atom. No data fetching.
 */

import { cn } from '@/components/ui/utils';
import { Sparkline } from '@/components/atoms/Sparkline';

interface StatCardProps {
  /** KPI label (DM Mono uppercase) */
  label: string;
  /** Main value display */
  value: string | number;
  /** Change description e.g. "+12% from last week" */
  change?: string;
  /** Trend direction (for future icon use) */
  trend?: 'up' | 'down' | 'neutral';
  /** Visual variant */
  variant?: 'inverted' | 'light';
  /** Sparkline data points */
  sparkline?: number[];
  /** Additional class names */
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  trend = 'neutral',
  variant = 'light',
  sparkline,
  className,
}: StatCardProps) {
  const isInverted = variant === 'inverted';

  const sparklineColor = isInverted
    ? 'var(--blue-pale)'
    : 'var(--blue-mid)';

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] p-4 transition-all duration-[var(--duration-normal)]',
        isInverted
          ? 'bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm'
          : 'bg-[var(--parchment)] border border-[var(--border-light)]',
        className
      )}
      data-trend={trend}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={cn(
            'font-mono text-[var(--font-size-label-sm)] uppercase tracking-[var(--letter-spacing-wide)]',
            isInverted
              ? 'text-[var(--blue-pale)] opacity-60'
              : 'text-[var(--text-muted)]'
          )}
        >
          {label}
        </span>
        {sparkline && sparkline.length > 0 && (
          <Sparkline
            data={sparkline}
            color={sparklineColor}
            width={64}
            height={24}
          />
        )}
      </div>

      <div
        className={cn(
          'font-serif text-[28px] font-bold leading-none mb-1',
          isInverted
            ? 'text-white'
            : 'text-[var(--navy-deep)]'
        )}
      >
        {value}
      </div>

      {change && (
        <div
          className={cn(
            'text-[11px] font-sans',
            isInverted
              ? 'text-[var(--blue-pale)] opacity-65'
              : 'text-[var(--text-secondary)]'
          )}
        >
          {change}
        </div>
      )}
    </div>
  );
}
