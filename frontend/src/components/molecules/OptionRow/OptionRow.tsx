'use client';

/**
 * OptionRow molecule — displays one answer option (A-E).
 * Correct answer gets a green highlight; distractor rationale shown below.
 */

import type { GeneratedOption } from '@journey-os/shared-types';

interface OptionRowProps {
  option: GeneratedOption;
}

const LABEL_COLORS: Record<string, string> = {
  correct: 'bg-[var(--green)] text-white',
  distractor: 'bg-[var(--navy)] text-white',
};

export default function OptionRow({ option }: OptionRowProps) {
  const colorClass = option.is_correct ? LABEL_COLORS.correct : LABEL_COLORS.distractor;
  const borderClass = option.is_correct
    ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
    : 'border-[var(--gray-300)]';

  return (
    <div className={`flex gap-3 rounded-lg border p-3 ${borderClass}`}>
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorClass}`}
      >
        {option.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm text-[var(--navy)]">{option.text}</p>
        {option.rationale && (
          <p className="mt-1 font-sans text-xs leading-relaxed text-[var(--gray-600)]">
            {option.rationale}
          </p>
        )}
      </div>
    </div>
  );
}
