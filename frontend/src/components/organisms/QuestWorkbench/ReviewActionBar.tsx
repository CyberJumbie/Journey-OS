'use client';

/**
 * P2-008: ReviewActionBar — Save Changes / Discard buttons for review mode.
 * Pure presentational: receives callbacks from parent organism.
 * Extracted from ReviewPreviewPanel to respect God Component rule.
 */

interface ReviewActionBarProps {
  hasEdits: boolean;
  onSave: () => void;
  onDiscard: () => void;
  isSaving: boolean;
}

export default function ReviewActionBar({
  hasEdits,
  onSave,
  onDiscard,
  isSaving,
}: ReviewActionBarProps) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={!hasEdits || isSaving}
        className="flex-1 rounded-md bg-[var(--green)] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
      <button
        type="button"
        onClick={onDiscard}
        disabled={isSaving}
        className="flex-1 rounded-md border border-[var(--gray-300)] bg-white px-4 py-2 font-sans text-sm font-semibold text-[var(--gray-600)] transition-colors hover:bg-[var(--cream)] disabled:opacity-50"
      >
        Discard
      </button>
    </div>
  );
}
