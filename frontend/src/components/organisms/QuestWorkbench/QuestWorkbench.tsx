'use client';

/**
 * P1-026 + P2-008: QuestWorkbench — wires ChatPanel + QuestionPreviewPanel
 * inside a WorkbenchTemplate split-pane layout.
 *
 * Supports two modes:
 * - Generate mode (default): fresh question generation
 * - Review mode: load existing item for conversational editing
 */

import WorkbenchTemplate from '@/components/templates/WorkbenchTemplate';
import ChatPanel from './ChatPanel';
import ReviewPreviewPanel from './ReviewPreviewPanel';
import QuestionPreviewPanel from './QuestionPreviewPanel';

export interface QuestWorkbenchProps {
  courseId: string;
  /** Review mode: item ID to load for editing */
  reviewItemId?: string;
  /** Current mode: 'generate' or 'review' */
  mode?: 'generate' | 'review';
}

export default function QuestWorkbench({
  courseId,
  reviewItemId,
  mode = 'generate',
}: QuestWorkbenchProps) {
  const isReview = mode === 'review' && !!reviewItemId;

  return (
    <WorkbenchTemplate
      left={
        <ChatPanel
          courseId={courseId}
          mode={isReview ? 'review' : 'generate'}
          reviewItemId={isReview ? reviewItemId : undefined}
        />
      }
      right={
        isReview ? (
          <ReviewPreviewPanel itemId={reviewItemId} />
        ) : (
          <QuestionPreviewPanel />
        )
      }
    />
  );
}
