"use client";

interface HelpSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly resultCount?: number;
  readonly className?: string;
}

/**
 * Search input for FAQ filtering.
 * Shows an "N results" badge when resultCount is provided.
 * Uses design tokens for focus ring and background.
 */
export function HelpSearch({
  value,
  onChange,
  placeholder = "Search questions...",
  resultCount,
  className = "",
}: HelpSearchProps) {
  return (
    <div className={["relative", className].join(" ")}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg
          className="h-4 w-4 text-[var(--text-muted)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          "w-full rounded-lg border border-[var(--border-light)] bg-[var(--parchment)] py-2.5 pl-10 pr-4 font-sans text-sm text-[var(--text-primary)]",
          "placeholder:text-[var(--text-muted)]",
          "focus:border-[var(--blue-mid)] focus:outline-none focus:ring-2 focus:ring-[var(--blue-mid)]/20",
          "transition-colors",
        ].join(" ")}
        aria-label="Search FAQ"
      />
      {resultCount !== undefined && value.length > 0 ? (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
