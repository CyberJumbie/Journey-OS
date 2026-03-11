'use client';

import { Loader2, Package } from 'lucide-react';
import { useBatches } from '@/hooks/useBatches';
import { BatchCard } from '@/components/organisms/BatchCard/BatchCard';

export default function BatchesPage() {
  const { data: batches, isLoading, error } = useBatches();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-[var(--blue-mid)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)]">
          Failed to load batches. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl font-semibold text-[var(--navy-deep)]">
          Bulk Generation
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Monitor progress of your bulk item generation batches
        </p>
      </div>

      {/* Batch list */}
      {!batches || batches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-[var(--radius-xl)] border border-[var(--border-light)]">
          <Package className="size-12 text-[var(--text-muted)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)] mb-2">
            No batches yet.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Use the Quest Workbench to start a bulk generation run.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => (
            <BatchCard key={batch.id} batch={batch} />
          ))}
        </div>
      )}
    </div>
  );
}
