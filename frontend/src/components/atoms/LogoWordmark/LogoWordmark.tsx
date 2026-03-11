/**
 * LOGO WORDMARK — Reusable Brand Element
 *
 * "Journey" (serif) + "OS" badge (mono)
 * Used in: nav, sidebar, brand panels, auth pages.
 * Atom level: pure presentational, no state, no data fetching.
 */

import { cn } from '@/components/ui/utils';

interface LogoWordmarkProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
}

const SIZES = {
  sm: { journey: 'text-[18px]', badge: 'text-[8px] px-1.5 py-0.5' },
  md: { journey: 'text-[22px]', badge: 'text-[9px] px-2 py-0.5' },
  lg: { journey: 'text-[24px]', badge: 'text-[9px] px-2 py-1' },
} as const;

export function LogoWordmark({ size = 'md', className }: LogoWordmarkProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'font-serif font-bold text-[var(--navy-deep)] tracking-tight',
          SIZES[size].journey
        )}
      >
        Journey
      </span>
      <span
        className={cn(
          'font-mono text-[var(--green-dark)] uppercase tracking-wider border-[1.5px] border-[var(--green-dark)] rounded-[var(--radius-sm)]',
          SIZES[size].badge
        )}
      >
        OS
      </span>
    </div>
  );
}
