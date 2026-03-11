'use client';

/**
 * ChunkExcerpt atom — displays a truncated content chunk excerpt.
 * No state, no data fetching (atom rule).
 */

interface ChunkExcerptProps {
  text: string;
  maxLength?: number;
}

export default function ChunkExcerpt({ text, maxLength = 200 }: ChunkExcerptProps) {
  const truncated = text.length > maxLength
    ? `${text.slice(0, maxLength)}...`
    : text;

  return (
    <div className="rounded-lg border border-[var(--gray-300)] bg-[var(--parchment)] p-3">
      <div className="font-mono text-xs uppercase tracking-wide text-[var(--gray-600)] mb-1">
        Source Chunk
      </div>
      <p className="font-sans text-sm text-gray-900 leading-relaxed">
        {truncated}
      </p>
    </div>
  );
}
