"use client";

interface NoResultsProps {
  readonly searchQuery: string;
  readonly onClearSearch: () => void;
}

/**
 * Empty state displayed when FAQ search yields no results.
 */
export function NoResults({ searchQuery, onClearSearch }: NoResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--border-light)] bg-white px-6 py-16 text-center">
      <div
        className="mb-4 text-4xl text-[var(--text-muted)]"
        aria-hidden="true"
      >
        ?
      </div>
      <p className="mb-1 font-sans text-base font-semibold text-[var(--ink)]">
        No questions found for &lsquo;{searchQuery}&rsquo;
      </p>
      <p className="mb-6 font-sans text-sm text-[var(--text-muted)]">
        Try a different search term or browse by category.
      </p>
      <button
        type="button"
        onClick={onClearSearch}
        className="rounded-lg border border-[var(--border-light)] bg-white px-4 py-2 font-sans text-sm font-medium text-[var(--blue-mid)] transition-colors hover:bg-[var(--parchment)]"
      >
        Clear search
      </button>
    </div>
  );
}
