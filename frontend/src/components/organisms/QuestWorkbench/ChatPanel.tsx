'use client';

/**
 * P1-026 + P2-008 + P2-009: Chat Panel — wraps CopilotChat with Journey OS styling.
 *
 * Sends courseId as readable context so the LangGraph agent
 * knows which course to generate questions for.
 *
 * In review mode, also injects { mode: 'review', itemId } into CopilotKit context
 * and registers the `applyRefinement` action (P2-009) for targeted editing.
 */

import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';

interface ChatPanelProps {
  courseId: string;
  mode?: 'generate' | 'review';
  reviewItemId?: string;
}

export default function ChatPanel({
  courseId,
  mode = 'generate',
  reviewItemId,
}: ChatPanelProps) {
  useCopilotReadable({
    description: 'The course ID for question generation',
    value: courseId,
  });

  useCopilotReadable({
    description: 'The workbench mode and optional review item ID',
    value: { mode, itemId: reviewItemId ?? null },
  });

  const isReview = mode === 'review';

  // P2-009: Register applyRefinement action for review mode.
  // This action is invoked by the CopilotKit runtime when the faculty
  // sends an edit instruction in review mode. The instruction flows
  // to the LangGraph agent as editInstruction, where ApplyEditNode
  // parses it for section routing.
  useCopilotAction({
    name: 'applyRefinement',
    description:
      'Apply a refinement instruction to the current assessment item in review mode. ' +
      'The instruction is analyzed to determine which section to target: ' +
      'vignette, stem, distractors, answer change, or full regeneration.',
    parameters: [
      {
        name: 'instruction',
        type: 'string',
        description:
          'The faculty refinement instruction, e.g. "make the distractors harder" ' +
          'or "shorten the vignette to 100 words"',
        required: true,
      },
    ],
    handler: async ({ instruction }: { instruction: string }) => {
      // The instruction is passed to the LangGraph agent via CopilotKit.
      // ApplyEditNode will parse it for section routing (keyword matching).
      // No client-side processing needed — the agent handles it.
      console.log(`[ChatPanel] applyRefinement action: "${instruction.slice(0, 80)}"`);
    },
    // Only available in review mode
    available: isReview ? 'enabled' : 'disabled',
  });

  return (
    <div className="flex h-full flex-col bg-[var(--cream)]">
      <div className="border-b border-[var(--gray-300)] px-4 py-3">
        <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-[var(--navy)]">
          {isReview ? 'Quest Editor' : 'Quest Generator'}
        </h2>
        <p className="font-[family-name:var(--font-body)] text-sm text-[var(--gray-600)]">
          {isReview
            ? 'Describe what you want to change about this question'
            : 'Describe the topic to generate an NBME-style question'}
        </p>
      </div>
      <div className="copilot-chat-wrapper flex-1 overflow-hidden">
        <CopilotChat
          labels={{
            title: isReview ? 'Quest Editor' : 'Quest Generator',
            initial: isReview
              ? 'What would you like to change about this question?'
              : 'What topic would you like to generate a question about?',
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
