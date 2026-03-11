'use client';

/**
 * P2-008: VersionBadge atom — displays a version number with timestamp.
 * Pure presentational: no state, no data fetching.
 */

interface VersionBadgeProps {
  /** Version number (e.g., 1, 2, 3) */
  version: number;
  /** ISO timestamp of the version */
  createdAt: string;
  /** Whether this is the current (latest) version */
  isCurrent?: boolean;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function VersionBadge({ version, createdAt, isCurrent = false }: VersionBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-xs font-bold ${
          isCurrent
            ? 'bg-[var(--amber)] text-white'
            : 'bg-[var(--gray-300)] text-[var(--gray-600)]'
        }`}
      >
        v{version}
      </span>
      <span className="font-sans text-xs text-[var(--gray-600)]">
        {formatTimestamp(createdAt)}
      </span>
    </div>
  );
}
