"use client";

interface WeekSelectorProps {
  readonly currentWeek: number;
  readonly totalWeeks: number;
  readonly onWeekChange: (week: number) => void;
}

export function WeekSelector({
  currentWeek,
  totalWeeks,
  onWeekChange,
}: WeekSelectorProps) {
  const canGoPrev = currentWeek > 1;
  const canGoNext = currentWeek < totalWeeks;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={!canGoPrev}
        onClick={() => onWeekChange(currentWeek - 1)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous week"
      >
        &larr; Prev
      </button>
      <span className="text-sm font-medium text-gray-700">
        Week {currentWeek} of {totalWeeks}
      </span>
      <button
        type="button"
        disabled={!canGoNext}
        onClick={() => onWeekChange(currentWeek + 1)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next week"
      >
        Next &rarr;
      </button>
    </div>
  );
}
