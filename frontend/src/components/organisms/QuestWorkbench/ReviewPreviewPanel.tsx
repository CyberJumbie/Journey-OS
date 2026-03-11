'use client';

/**
 * P2-008 + P2-009: ReviewPreviewPanel organism — right panel in review mode.
 *
 * Pre-populates with existing question on load (no pipeline wait).
 * Shows edit highlights (amber) on sections modified by apply_edit.
 * Shows refinement target badge when edit is detected (P2-009).
 * Includes save/discard buttons and version history panel.
 */

import { useCoAgent } from '@copilotkit/react-core';
import type { WorkbenchState, RefinementTarget } from '@journey-os/shared-types';
import { useAssessmentItem, useSaveItemContent } from '@/hooks/useAssessmentItems';
import { useQueryClient } from '@tanstack/react-query';
import EditHighlight from '@/components/atoms/EditHighlight/EditHighlight';
import OptionRow from '@/components/molecules/OptionRow/OptionRow';
import ValidationSummary from '@/components/molecules/ValidationSummary/ValidationSummary';
import VersionHistoryPanel from '@/components/organisms/VersionHistoryPanel';
import ReviewModeHeader from './ReviewModeHeader';
import ReviewActionBar from './ReviewActionBar';

/** Human-readable labels for refinement targets (P2-009). */
const REFINEMENT_LABELS: Record<RefinementTarget, string> = {
  vignette_only: 'Vignette edit',
  stem_only: 'Stem edit',
  distractor_only: 'Options edit',
  answer_change: 'Answer change',
  full_regeneration: 'Full regeneration',
  targeted_edit: 'Targeted edit',
};

interface ReviewPreviewPanelProps {
  itemId: string;
}

export default function ReviewPreviewPanel({ itemId }: ReviewPreviewPanelProps) {
  const { data: originalItem, isLoading } = useAssessmentItem(itemId);
  const { state } = useCoAgent<WorkbenchState>({ name: 'journey_generation' });
  const saveMutation = useSaveItemContent();
  const queryClient = useQueryClient();

  const editedSections = state?.editedSections ?? [];
  const hasEdits = editedSections.length > 0;
  const refinementTarget = state?.refinementTarget ?? null;

  // Use pipeline state if available (after apply_edit), otherwise original item
  const vignette = state?.vignette || originalItem?.vignette || '';
  const stem = state?.stem || originalItem?.stem || '';
  const options = state?.options ?? originalItem?.options?.map((o) => ({
    label: o.label,
    text: o.option_text ?? '',
    is_correct: o.is_correct,
    rationale: o.distractor_rationale ?? '',
    misconception_targeted: o.misconception_targeted ?? undefined,
  })) ?? [];

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--parchment)]">
        <p className="font-sans text-sm text-[var(--gray-600)]">Loading question...</p>
      </div>
    );
  }

  function handleSave() {
    saveMutation.mutate({ id: itemId, vignette, stem, options });
  }

  function handleDiscard() {
    void queryClient.invalidateQueries({ queryKey: ['assessment-item', itemId] });
  }

  const stemExcerpt = stem.slice(0, 50) + (stem.length > 50 ? '...' : '');

  return (
    <div className="flex h-full flex-col bg-[var(--parchment)]">
      <ReviewModeHeader excerpt={stemExcerpt} status={state?.pipelineStatus} />

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* P2-009: Refinement target badge */}
        {refinementTarget && hasEdits && (
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[var(--amber)] px-2 py-1 font-mono text-xs uppercase tracking-wide text-white">
              {REFINEMENT_LABELS[refinementTarget]}
            </span>
            <span className="font-sans text-xs text-[var(--gray-600)]">
              {editedSections.join(', ')} modified
            </span>
          </div>
        )}

        {vignette && (
          <EditHighlight isModified={editedSections.includes('vignette')} sectionLabel="vignette">
            <p className="font-serif text-base leading-relaxed text-[var(--gray-600)]">
              {vignette}
            </p>
          </EditHighlight>
        )}

        {stem && (
          <EditHighlight isModified={editedSections.includes('stem')} sectionLabel="stem">
            <h3 className="font-sans text-lg font-bold text-[var(--navy)]">{stem}</h3>
          </EditHighlight>
        )}

        {options.length > 0 && (
          <EditHighlight isModified={editedSections.includes('options')} sectionLabel="options">
            <div className="space-y-2">
              {options.map((option) => (
                <OptionRow key={option.label} option={option} />
              ))}
            </div>
          </EditHighlight>
        )}

        {state?.validationResults && state.validationResults.length > 0 && (
          <ValidationSummary results={state.validationResults} />
        )}

        <ReviewActionBar
          hasEdits={hasEdits}
          onSave={handleSave}
          onDiscard={handleDiscard}
          isSaving={saveMutation.isPending}
        />
      </div>

      <VersionHistoryPanel itemId={itemId} />
    </div>
  );
}
