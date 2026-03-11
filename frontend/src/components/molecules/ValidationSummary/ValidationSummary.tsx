'use client';

/**
 * ValidationSummary molecule — renders a list of ValidationBadge atoms.
 * Shows overall pass/fail count header.
 */

import type { ValidationResult } from '@journey-os/shared-types';
import ValidationBadge from '@/components/atoms/ValidationBadge/ValidationBadge';

interface ValidationSummaryProps {
  results: ValidationResult[];
}

export default function ValidationSummary({ results }: ValidationSummaryProps) {
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  return (
    <div className="rounded-lg border border-[var(--gray-300)] bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-mono text-xs font-bold uppercase tracking-wide text-[var(--navy)]">
          Validation
        </h4>
        <span className="font-mono text-xs text-[var(--gray-600)]">
          {passedCount}/{totalCount} passed
        </span>
      </div>
      <div className="space-y-1">
        {results.map((result) => (
          <ValidationBadge key={result.rule} result={result} />
        ))}
      </div>
    </div>
  );
}
