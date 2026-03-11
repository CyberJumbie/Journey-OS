'use client';

/**
 * P2-008: EditHighlight atom — wraps text content with an amber border
 * when the section has been modified by the apply_edit pipeline node.
 * Pure presentational: no state, no data fetching.
 */

import type { ReactNode } from 'react';

interface EditHighlightProps {
  /** Child content to render */
  children: ReactNode;
  /** Whether this section was modified (triggers amber highlight) */
  isModified: boolean;
  /** Optional label for the modified section */
  sectionLabel?: string;
}

export default function EditHighlight({ children, isModified, sectionLabel }: EditHighlightProps) {
  if (!isModified) {
    return <>{children}</>;
  }

  return (
    <div className="relative rounded-md border-l-4 border-[var(--amber)] bg-[var(--amber)]/5 pl-3">
      {sectionLabel && (
        <span className="absolute -top-2.5 left-2 rounded bg-[var(--amber)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white">
          edited
        </span>
      )}
      {children}
    </div>
  );
}
