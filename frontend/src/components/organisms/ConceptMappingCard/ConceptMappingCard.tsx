'use client';

/**
 * ConceptMappingCard organism — displays a single TEACHES mapping for review.
 * Shows chunk excerpt, concept name, confidence badge, and verify/reject buttons.
 * Callbacks from parent — no data fetching here (lifted to page).
 */

import { CheckCircle2, XCircle, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfidenceBadge from '@/components/atoms/ConfidenceBadge/ConfidenceBadge';
import ChunkExcerpt from '@/components/atoms/ChunkExcerpt/ChunkExcerpt';

interface ConceptMappingCardProps {
  chunkUuid: string;
  chunkExcerpt: string;
  subConceptUuid: string;
  subConceptName: string;
  confidence: number;
  onVerify: (chunkUuid: string, subConceptUuid: string) => void;
  onReject: (chunkUuid: string, subConceptUuid: string) => void;
  isLoading?: boolean;
}

export default function ConceptMappingCard({
  chunkUuid,
  chunkExcerpt,
  subConceptUuid,
  subConceptName,
  confidence,
  onVerify,
  onReject,
  isLoading = false,
}: ConceptMappingCardProps) {
  return (
    <div className="rounded-lg border border-[var(--gray-300)] bg-white p-6">
      {/* Chunk excerpt */}
      <ChunkExcerpt text={chunkExcerpt || 'No excerpt available'} />

      {/* TEACHES arrow + confidence */}
      <div className="my-4 flex items-center gap-3">
        <span className="font-mono text-xs uppercase tracking-wide text-[var(--gray-600)]">
          TEACHES
        </span>
        <ConfidenceBadge confidence={confidence} />
      </div>

      {/* SubConcept name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-purple-100">
          <Target className="size-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-heading text-base font-semibold text-gray-900">
            {subConceptName}
          </h3>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-[var(--red)] border-red-300 hover:bg-red-50"
          onClick={() => onReject(chunkUuid, subConceptUuid)}
          disabled={isLoading}
        >
          <XCircle className="size-4 mr-2" />
          Reject
        </Button>
        <Button
          size="sm"
          className="bg-[var(--green)] hover:opacity-90 text-white"
          onClick={() => onVerify(chunkUuid, subConceptUuid)}
          disabled={isLoading}
        >
          <CheckCircle2 className="size-4 mr-2" />
          Verify
        </Button>
      </div>
    </div>
  );
}
