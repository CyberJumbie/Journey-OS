'use client';

/**
 * SubConcept Review Queue — faculty reviews TEACHES edges for verification.
 * Wired to real API via useConceptMappings hook.
 * Route: /courses/:courseId/concepts/review
 */

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Filter, ChevronDown } from 'lucide-react';
import {
  useConceptMappings,
  useVerifyMapping,
  useBulkVerify,
} from '@/hooks/useConceptMappings';
import ConceptMappingCard from '@/components/organisms/ConceptMappingCard/ConceptMappingCard';

export default function SubConceptReviewQueue() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [showFilters, setShowFilters] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const { data: mappings, isLoading, error } = useConceptMappings(courseId);
  const verifyMutation = useVerifyMapping();
  const bulkVerifyMutation = useBulkVerify(courseId);

  // Track locally reviewed count for progress bar (mappings list auto-refreshes)
  const [reviewedCount, setReviewedCount] = useState(0);

  const totalCount = (mappings?.length ?? 0) + reviewedCount;
  const progressPct = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  const handleVerify = (chunkUuid: string, subConceptUuid: string) => {
    verifyMutation.mutate(
      { chunkUuid, subConceptUuid, action: 'verify' },
      {
        onSuccess: () => {
          setReviewedCount((c) => c + 1);
          // If all mappings reviewed, redirect
          if (mappings && mappings.length <= 1) {
            router.push(`/courses/${courseId}`);
          }
        },
      },
    );
  };

  const handleReject = (chunkUuid: string, subConceptUuid: string) => {
    verifyMutation.mutate(
      { chunkUuid, subConceptUuid, action: 'reject' },
      {
        onSuccess: () => {
          setReviewedCount((c) => c + 1);
          if (mappings && mappings.length <= 1) {
            router.push(`/courses/${courseId}`);
          }
        },
      },
    );
  };

  const handleBulkVerify = () => {
    bulkVerifyMutation.mutate(
      { threshold: 0.85 },
      {
        onSuccess: (result) => {
          setReviewedCount((c) => c + result.verifiedCount);
        },
      },
    );
  };

  // Filter mappings by confidence level
  const filteredMappings = (mappings ?? []).filter((m) => {
    if (confidenceFilter === 'high') return m.confidence >= 0.85;
    if (confidenceFilter === 'medium') return m.confidence >= 0.65 && m.confidence < 0.85;
    if (confidenceFilter === 'low') return m.confidence < 0.65;
    return true;
  });

  const highConfidenceCount = (mappings ?? []).filter((m) => m.confidence >= 0.85).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full size-8 border-b-2 border-[var(--navy)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center">
        <p className="text-[var(--red)]">Failed to load concept mappings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-gray-900">
            Concept Mapping Review
          </h1>
          <p className="font-sans text-[var(--gray-600)] mt-1">
            {reviewedCount} of {totalCount} mappings reviewed
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="size-4 mr-2" />
          Filters
          <ChevronDown className={`size-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border border-[var(--gray-300)] bg-white p-6">
          <label className="font-sans text-sm font-medium text-gray-700 mb-2 block">
            Confidence Level
          </label>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value as typeof confidenceFilter)}
            className="w-full max-w-xs h-10 px-3 rounded-md border border-[var(--gray-300)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
          >
            <option value="all">All</option>
            <option value="high">High (&ge; 85%)</option>
            <option value="medium">Medium (65-85%)</option>
            <option value="low">Low (&lt; 65%)</option>
          </select>
        </div>
      )}

      {/* Bulk Actions */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-blue-900 mb-1">
              Batch Verification
            </h3>
            <p className="font-sans text-sm text-blue-800">
              {highConfidenceCount} mappings with confidence &ge; 85%
            </p>
          </div>
          <Button
            onClick={handleBulkVerify}
            disabled={highConfidenceCount === 0 || bulkVerifyMutation.isPending}
            className="bg-[var(--blue)] hover:opacity-90 text-white"
          >
            <CheckCircle2 className="size-4 mr-2" />
            {bulkVerifyMutation.isPending ? 'Verifying...' : 'Verify All High Confidence'}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-[var(--gray-300)] bg-white p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-sans text-sm text-[var(--gray-600)]">Review Progress</span>
          <span className="font-sans text-sm font-semibold text-gray-900">{progressPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-[var(--blue)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Cards */}
      {filteredMappings.length === 0 ? (
        <div className="rounded-lg border border-[var(--gray-300)] bg-white p-12 text-center">
          <CheckCircle2 className="size-16 text-[var(--green)] mx-auto mb-4" />
          <h2 className="font-heading text-xl font-semibold text-gray-900 mb-2">
            All Done!
          </h2>
          <p className="font-sans text-[var(--gray-600)]">
            All concept mappings have been reviewed.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredMappings.map((mapping) => (
            <ConceptMappingCard
              key={`${mapping.chunkUuid}-${mapping.subConceptUuid}`}
              chunkUuid={mapping.chunkUuid}
              chunkExcerpt={mapping.chunkExcerpt}
              subConceptUuid={mapping.subConceptUuid}
              subConceptName={mapping.subConceptName}
              confidence={mapping.confidence}
              onVerify={handleVerify}
              onReject={handleReject}
              isLoading={verifyMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
