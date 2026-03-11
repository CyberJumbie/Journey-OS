'use client';

/**
 * ApproveRejectBar molecule — two buttons + confirmation message.
 * Pure presentational: receives callbacks from parent organism.
 * No data fetching or mutations (atomic design compliance).
 */

import { useState, useEffect } from 'react';

interface ApproveRejectBarProps {
  onApprove: () => void;
  onReject: () => void;
  isPending: boolean;
}

export default function ApproveRejectBar({ onApprove, onReject, isPending }: ApproveRejectBarProps) {
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmation) return;
    const timer = setTimeout(() => setConfirmation(null), 2000);
    return () => clearTimeout(timer);
  }, [confirmation]);

  function handleApprove() {
    onApprove();
    setConfirmation('Approved');
  }

  function handleReject() {
    onReject();
    setConfirmation('Rejected');
  }

  if (confirmation) {
    const isApproved = confirmation === 'Approved';
    return (
      <div className={`rounded-md px-4 py-3 text-center font-sans text-sm font-semibold ${isApproved ? 'bg-green-50 text-[var(--green)]' : 'bg-red-50 text-[var(--red)]'}`}>
        {isApproved ? 'Approved' : 'Rejected'}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleApprove}
        disabled={isPending}
        className="flex-1 rounded-md bg-[var(--green)] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Approve'}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={isPending}
        className="flex-1 rounded-md bg-[var(--red)] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Reject'}
      </button>
    </div>
  );
}
