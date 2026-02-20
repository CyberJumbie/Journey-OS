"use client";

interface RelativeTimeProps {
  readonly dateString: string;
}

/**
 * Displays a human-readable relative time string (e.g., "5 minutes ago").
 * Uses a simple implementation to avoid external dependency on date-fns.
 */
export function RelativeTime({ dateString }: RelativeTimeProps) {
  const label = formatRelative(dateString);
  return (
    <time
      dateTime={dateString}
      className="font-mono text-[10px] uppercase tracking-wider text-text-muted whitespace-nowrap"
    >
      {label}
    </time>
  );
}

function formatRelative(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(dateString).toLocaleDateString();
}
