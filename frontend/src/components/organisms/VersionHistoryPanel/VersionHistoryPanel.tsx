'use client';

/**
 * P2-008: VersionHistoryPanel organism — collapsible panel showing
 * prior versions of an assessment item with timestamps.
 * Data fetched via useItemVersions hook (organisms can fetch data).
 */

import { useState } from 'react';
import { useItemVersions } from '@/hooks/useItemVersions';
import VersionBadge from '@/components/atoms/VersionBadge/VersionBadge';

interface VersionHistoryPanelProps {
  itemId: string | null;
}

export default function VersionHistoryPanel({ itemId }: VersionHistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: versions, isLoading } = useItemVersions(itemId);

  if (!itemId) return null;

  const versionCount = versions?.length ?? 0;

  return (
    <div className="border-t border-[var(--gray-300)]">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-3 text-left transition-colors hover:bg-[var(--cream)]"
      >
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--gray-600)]">
          Version History ({versionCount})
        </span>
        <span className="text-[var(--gray-600)]">
          {isExpanded ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {isExpanded && (
        <div className="max-h-48 overflow-y-auto px-6 pb-4">
          {isLoading && (
            <p className="font-sans text-xs text-[var(--gray-600)]">Loading versions...</p>
          )}

          {!isLoading && versionCount === 0 && (
            <p className="font-sans text-xs text-[var(--gray-600)]">No previous versions.</p>
          )}

          {versions && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-start justify-between rounded-md border border-[var(--gray-300)] p-3"
                >
                  <div className="space-y-1">
                    <VersionBadge
                      version={versionCount - index}
                      createdAt={version.created_at}
                      isCurrent={index === 0}
                    />
                    {version.edit_instruction && (
                      <p className="font-sans text-xs italic text-[var(--gray-600)]">
                        &quot;{version.edit_instruction}&quot;
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--gray-600)]">
                    {version.stem?.slice(0, 40)}
                    {(version.stem?.length ?? 0) > 40 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
