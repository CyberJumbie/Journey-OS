'use client';

/**
 * P1-008: CopilotKit + LangGraph Spike Test Page
 *
 * Minimal page that proves:
 * - TEXT_MESSAGE events stream via CopilotChat
 * - useCoAgent tracks agent state (pipelineStatus transitions)
 * - STATE_DELTA rendering works in the browser
 *
 * Navigate to /workbench-test to test.
 */

import dynamic from 'next/dynamic';

// CopilotKit hooks require browser context — skip SSR prerendering
const WorkbenchTestContent = dynamic(() => import('./workbench-test-content'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[var(--cream)]">
      <p className="text-sm text-gray-400">Loading workbench...</p>
    </div>
  ),
});

export default function WorkbenchTestPage() {
  return <WorkbenchTestContent />;
}
