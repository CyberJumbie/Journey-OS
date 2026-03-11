'use client';

/**
 * ValidationBadge atom — shows pass/fail for a single validation rule.
 * Green checkmark for passed, red X for failed.
 */

import type { ValidationResult } from '@journey-os/shared-types';

interface ValidationBadgeProps {
  result: ValidationResult;
}

export default function ValidationBadge({ result }: ValidationBadgeProps) {
  return (
    <div className="flex items-start gap-2 py-1">
      <span className={`mt-0.5 text-sm font-bold ${result.passed ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>
        {result.passed ? '\u2713' : '\u2717'}
      </span>
      <div className="min-w-0">
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--gray-600)]">
          {result.rule}
        </span>
        <p className="font-sans text-sm text-[var(--gray-600)]">{result.message}</p>
      </div>
    </div>
  );
}
