'use client';

/**
 * P2-008: ReviewModeHeader — amber badge and pipeline status for review mode.
 * Extracted from ReviewPreviewPanel to respect God Component rule.
 */

interface ReviewModeHeaderProps {
  /** Short excerpt from the question stem */
  excerpt: string;
  /** Current pipeline status (optional — only shown when pipeline is active) */
  status?: string;
}

const STATUS_LABELS: Record<string, string> = {
  idle: 'Ready',
  running: 'Applying edit...',
  completed: 'Edit applied',
  failed: 'Edit failed',
};

export default function ReviewModeHeader({ excerpt, status }: ReviewModeHeaderProps) {
  const isRunning = status === 'running';

  return (
    <div className="border-b border-[var(--gray-300)] px-6 py-3">
      <div className="flex items-center gap-3">
        {/* Review mode amber pill badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--amber)] px-3 py-1 font-mono text-xs font-bold uppercase tracking-wide text-white">
          Review Mode
        </span>
        <span className="truncate font-sans text-sm text-[var(--gray-600)]">
          {excerpt}
        </span>
      </div>

      {status && status !== 'idle' && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-[var(--cream)] px-3 py-2">
          {isRunning && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--amber)]" />
          )}
          <span className="font-mono text-xs uppercase tracking-wide text-[var(--gray-600)]">
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
      )}
    </div>
  );
}
