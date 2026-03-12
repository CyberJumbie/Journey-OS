'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BatchItemRow } from '@/components/molecules/BatchItemRow/BatchItemRow';
import {
  useBatchDetail,
  useRetryBatchItem,
} from '@/hooks/useBatchDetail';
import type { BulkBatchRow } from '@journey-os/shared-types';

/** Props unwrapped from route params. */
interface BatchDetailPageProps {
  params: Promise<{ id: string }>;
}

// ── BatchHeader ─────────────────────────────────────────────────

function BatchHeader({
  batch,
  onBack,
  onReviewAll,
}: {
  batch: BulkBatchRow;
  onBack: () => void;
  onReviewAll: () => void;
}) {
  const statusVariant: Record<
    BulkBatchRow['status'],
    'default' | 'success' | 'danger' | 'info'
  > = {
    pending: 'default',
    running: 'info',
    completed: 'success',
    failed: 'danger',
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div>
          <h1 className="font-serif text-xl font-semibold text-[var(--navy-deep)]">
            Batch {batch.id.slice(0, 8)}
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {new Date(batch.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant={statusVariant[batch.status]}>
          {batch.status.toUpperCase()}
        </Badge>
      </div>
      {batch.status === 'completed' && (
        <Button variant="default" size="sm" onClick={onReviewAll}>
          Review All
          <ArrowRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── BatchProgressSection ────────────────────────────────────────

function BatchProgressSection({ batch }: { batch: BulkBatchRow }) {
  const processed = batch.completed_count + batch.failed_count;
  const progressPct =
    batch.total_count > 0
      ? Math.round((processed / batch.total_count) * 100)
      : 0;

  return (
    <Card variant="default" className="p-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatBlock label="Total Items" value={String(batch.total_count)} />
        <StatBlock
          label="Completed"
          value={String(batch.completed_count)}
          color="var(--green)"
        />
        <StatBlock
          label="Failed"
          value={String(batch.failed_count)}
          color={batch.failed_count > 0 ? 'var(--danger)' : undefined}
        />
        <StatBlock
          label="Est. Cost"
          value={
            batch.estimated_cost !== null
              ? `$${batch.estimated_cost.toFixed(2)}`
              : '--'
          }
        />
      </div>
      <Progress value={progressPct} className="h-2.5" />
      <p className="text-xs text-[var(--text-muted)] mt-1.5">
        {processed}/{batch.total_count} processed ({progressPct}%)
      </p>
    </Card>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className="text-lg font-semibold"
        style={{ color: color ?? 'var(--navy-deep)' }}
      >
        {value}
      </p>
    </div>
  );
}

// ── BatchDetailPage ─────────────────────────────────────────────

export default function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = useBatchDetail(id);
  const retryMutation = useRetryBatchItem();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-[var(--blue-mid)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--danger)]">
          Failed to load batch details. Please try again.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push('/batches')}
        >
          Back to Batches
        </Button>
      </div>
    );
  }

  const { batch, items } = data;

  return (
    <div className="space-y-6">
      <BatchHeader
        batch={batch}
        onBack={() => router.push('/batches')}
        onReviewAll={() => router.push(`/items?batchId=${batch.id}`)}
      />

      <BatchProgressSection batch={batch} />

      {/* Item list */}
      <Card variant="default" className="overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="font-serif text-base font-semibold text-[var(--navy-deep)]">
            Items ({items.length})
          </h2>
        </div>
        <div>
          {items.map((item) => (
            <BatchItemRow
              key={item.id}
              id={item.id}
              status={item.status}
              stemExcerpt={item.stem_excerpt}
              bloomLevel={item.bloom_level}
              usmleSystem={item.usmle_system}
              errorMessage={item.error_message}
              onRetry={(batchItemId) =>
                retryMutation.mutate({
                  batchId: batch.id,
                  batchItemId,
                })
              }
              isRetrying={
                retryMutation.isPending &&
                retryMutation.variables?.batchItemId === item.id
              }
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
