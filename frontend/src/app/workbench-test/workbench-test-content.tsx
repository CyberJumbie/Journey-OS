'use client';

/**
 * Workbench test content — loaded with ssr: false to avoid
 * CopilotKit prerender errors (useCoAgent needs browser context).
 */

import { useCoAgent } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import type { PipelineStatus } from '@journey-os/shared-types';

// ── Agent State Type ────────────────────────────────────────────────────────────

interface SpikeAgentState {
  pipelineStatus: PipelineStatus;
  userMessage: string;
  stem: string;
  vignette: string;
  context: string;
}

const INITIAL_STATE: SpikeAgentState = {
  pipelineStatus: 'idle',
  userMessage: '',
  stem: '',
  vignette: '',
  context: '',
};

// ── Status Badge ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PipelineStatus }) {
  const colorMap: Record<PipelineStatus, string> = {
    idle: 'bg-gray-200 text-gray-700',
    running: 'bg-amber-200 text-amber-800',
    completed: 'bg-green-200 text-green-800',
    failed: 'bg-red-200 text-red-800',
  };

  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${colorMap[status]}`}
    >
      {status}
    </span>
  );
}

// ── State Panel ─────────────────────────────────────────────────────────────────

function StatePanel({ state }: { state: SpikeAgentState }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--navy)]">
        Agent State (useCoAgent)
      </h3>
      <div className="space-y-2 font-[family-name:var(--font-label)] text-sm uppercase">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Pipeline Status:</span>
          <StatusBadge status={state.pipelineStatus} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500">User Message:</span>
          <span className="max-w-[200px] truncate text-gray-700">
            {state.userMessage || '(none)'}
          </span>
        </div>
      </div>

      {state.vignette && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-600">Vignette</h4>
          <p className="mt-1 text-sm text-gray-700">{state.vignette}</p>
        </div>
      )}

      {state.stem && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-600">Stem</h4>
          <p className="mt-1 text-sm text-gray-700">{state.stem}</p>
        </div>
      )}

      {state.context && (
        <div className="mt-3">
          <h4 className="text-sm font-semibold text-gray-600">Context</h4>
          <p className="mt-1 text-sm text-gray-700">{state.context}</p>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-gray-400">
          Raw State JSON
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
          {JSON.stringify(state, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ── Main Content ────────────────────────────────────────────────────────────────

export default function WorkbenchTestContent() {
  const {
    state: agentState,
    setState: setAgentState,
    running,
  } = useCoAgent<SpikeAgentState>({
    name: 'journey_generation',
    initialState: INITIAL_STATE,
  });

  return (
    <div className="min-h-screen bg-[var(--cream)] p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-[var(--navy)]">
            P1-008: CopilotKit + LangGraph Spike
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Proves AG-UI streaming: TEXT_MESSAGE via CopilotChat, STATE_DELTA
            via useCoAgent
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-400">Agent running:</span>
            <span
              className={`text-xs font-semibold ${running ? 'text-amber-600' : 'text-gray-400'}`}
            >
              {running ? 'YES' : 'NO'}
            </span>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Left: State Panel */}
          <div className="space-y-4">
            <StatePanel state={agentState} />

            {/* Manual state trigger for testing */}
            <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-[family-name:var(--font-heading)] text-sm font-semibold text-gray-600">
                Manual State Test
              </h3>
              <p className="mb-3 text-xs text-gray-400">
                Click buttons to test state transitions manually (proves
                useCoAgent reactivity)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    setAgentState((prev) => ({
                      ...(prev ?? INITIAL_STATE),
                      pipelineStatus: 'idle' as const,
                    }))
                  }
                  className="rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300"
                >
                  Set Idle
                </button>
                <button
                  onClick={() =>
                    setAgentState((prev) => ({
                      ...(prev ?? INITIAL_STATE),
                      pipelineStatus: 'running' as const,
                    }))
                  }
                  className="rounded bg-amber-200 px-3 py-1 text-xs text-amber-800 hover:bg-amber-300"
                >
                  Set Running
                </button>
                <button
                  onClick={() =>
                    setAgentState((prev) => ({
                      ...(prev ?? INITIAL_STATE),
                      pipelineStatus: 'completed' as const,
                      stem: 'Spike test stem',
                      vignette:
                        'A 45-year-old presents with chest pain...',
                    }))
                  }
                  className="rounded bg-green-200 px-3 py-1 text-xs text-green-800 hover:bg-green-300"
                >
                  Set Completed
                </button>
              </div>
            </div>
          </div>

          {/* Right: CopilotChat */}
          <div className="h-[600px] rounded-lg border border-gray-300 bg-white shadow-sm">
            <CopilotChat
              instructions="You are the Journey OS assessment item generation assistant. When the user asks to generate a question, call the run_pipeline action with their message. Keep responses concise."
              labels={{
                title: 'Journey OS Spike',
                initial: 'Type a message to test the AG-UI streaming loop.',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
