'use client';

import { ReactNode } from 'react';

interface WorkbenchTemplateProps {
  /** Left panel content (chat) — renders at 45% width */
  left: ReactNode;
  /** Right panel content (preview) — renders at 55% width */
  right: ReactNode;
}

/**
 * P1-026: Split-pane layout for QuestWorkbench.
 * Chat panel on the left (45%), preview panel on the right (55%).
 * Full viewport height minus the DashboardTemplate chrome.
 */
export default function WorkbenchTemplate({ left, right }: WorkbenchTemplateProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden rounded-lg border border-[var(--gray-300)]">
      <div className="flex w-[45%] min-w-0 flex-col border-r border-[var(--gray-300)]">
        {left}
      </div>
      <div className="flex w-[55%] min-w-0 flex-col">
        {right}
      </div>
    </div>
  );
}
