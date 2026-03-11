'use client';

/**
 * P1-027: QuestionPreviewPanel organism — renders WorkbenchState progressively
 * as STATE_DELTA events arrive from the CopilotKit/LangGraph pipeline.
 *
 * Data comes exclusively from useCoAgent (no fetch, no useQuery).
 * Does NOT include ApproveRejectBar (that is P1-028).
 */

import { useCoAgent } from '@copilotkit/react-core';
import type { WorkbenchState } from '@journey-os/shared-types';
import StreamingText from '@/components/atoms/StreamingText/StreamingText';
import OptionRow from '@/components/molecules/OptionRow/OptionRow';
import ValidationSummary from '@/components/molecules/ValidationSummary/ValidationSummary';
import ApproveRejectBar from '@/components/molecules/ApproveRejectBar/ApproveRejectBar';
import { useUpdateItemStatus } from '@/hooks/useAssessmentItems';

const STATUS_LABELS: Record<string, string> = {
  idle: 'Ready',
  running: 'Generating...',
  completed: 'Complete',
  failed: 'Generation Failed',
};

function EmptyPreview() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="font-serif text-lg font-semibold text-[var(--navy)]">Question Preview</p>
        <p className="mt-2 font-sans text-sm text-[var(--gray-600)]">
          Ask me to generate a question in the chat panel.
        </p>
      </div>
    </div>
  );
}

function PipelineStatusIndicator({ status }: { status: string }) {
  const isRunning = status === 'running';
  return (
    <div className="flex items-center gap-2 rounded-md bg-[var(--cream)] px-3 py-2">
      {isRunning && (
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[var(--blue)]" />
      )}
      <span className="font-mono text-xs uppercase tracking-wide text-[var(--gray-600)]">
        {STATUS_LABELS[status] ?? status}
      </span>
    </div>
  );
}

export default function QuestionPreviewPanel() {
  const { state } = useCoAgent<WorkbenchState>({ name: 'journey_generation' });
  const mutation = useUpdateItemStatus();

  const hasContent = state?.vignette || state?.stem || (state?.options && state.options.length > 0);

  if (!hasContent) {
    return (
      <div className="h-full bg-[var(--parchment)]">
        <EmptyPreview />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[var(--parchment)]">
      {/* Status bar */}
      {state.pipelineStatus && (
        <div className="border-b border-[var(--gray-300)] px-6 py-3">
          <PipelineStatusIndicator status={state.pipelineStatus} />
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Vignette */}
        {state.vignette && (
          <StreamingText
            text={state.vignette}
            className="font-serif text-base leading-relaxed text-[var(--gray-600)]"
          />
        )}

        {/* Stem */}
        {state.stem && (
          <h3 className="font-sans text-lg font-bold text-[var(--navy)]">{state.stem}</h3>
        )}

        {/* Options */}
        {state.options && state.options.length > 0 && (
          <div className="space-y-2">
            {state.options.map((option) => (
              <OptionRow key={option.label} option={option} />
            ))}
          </div>
        )}

        {/* Validation */}
        {state.validationResults && state.validationResults.length > 0 && (
          <ValidationSummary results={state.validationResults} />
        )}

        {/* Approve/Reject — visible only when generation is completed */}
        {state.pipelineStatus === 'completed' && state.itemId && (
          <ApproveRejectBar
            onApprove={() => mutation.mutate({ id: state.itemId as string, status: 'approved' })}
            onReject={() => mutation.mutate({ id: state.itemId as string, status: 'rejected' })}
            isPending={mutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
