'use client';

/**
 * BATCH CARD -- Displays a batch summary with progress bar and status badge.
 *
 * Organism level: renders a single batch row on the batches list page.
 * Data comes via props from the parent page (which uses useBatches hook).
 */

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type { BulkBatchRow } from '@journey-os/shared-types';

interface BatchCardProps {
  batch: BulkBatchRow;
}

const STATUS_CONFIG: Record<
  BulkBatchRow['status'],
  {
    icon: React.ComponentType<{ className?: string }>;
    variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
    label: string;
  }
> = {
  pending: { icon: Clock, variant: 'default', label: 'Pending' },
  running: { icon: Loader2, variant: 'info', label: 'Running' },
  completed: { icon: CheckCircle2, variant: 'success', label: 'Completed' },
  failed: { icon: AlertCircle, variant: 'danger', label: 'Failed' },
};

function formatCost(cost: number | null): string {
  if (cost === null) return '--';
  return `$${cost.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function BatchCard({ batch }: BatchCardProps) {
  const router = useRouter();
  const config = STATUS_CONFIG[batch.status];
  const StatusIcon = config.icon;

  const progressPct =
    batch.total_count > 0
      ? Math.round(
          ((batch.completed_count + batch.failed_count) / batch.total_count) *
            100,
        )
      : 0;

  return (
    <Card
      variant="default"
      className="p-5 cursor-pointer"
      onClick={() => router.push(`/batches/${batch.id}`)}
    >
      {/* Header row: ID + status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`size-4 ${
              batch.status === 'running'
                ? 'animate-spin text-[var(--blue-mid)]'
                : ''
            } ${batch.status === 'completed' ? 'text-[var(--green)]' : ''} ${
              batch.status === 'failed' ? 'text-[var(--danger)]' : ''
            } ${batch.status === 'pending' ? 'text-[var(--text-muted)]' : ''}`}
          />
          <span className="font-mono text-xs text-[var(--text-muted)] tracking-wider">
            {batch.id.slice(0, 8)}
          </span>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={progressPct} className="h-2" />
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            {batch.completed_count}/{batch.total_count} completed
            {batch.failed_count > 0 && (
              <span className="text-[var(--danger)] ml-1">
                ({batch.failed_count} failed)
              </span>
            )}
          </span>
          <span>Est. {formatCost(batch.estimated_cost)}</span>
        </div>
      </div>

      {/* Footer: date + action */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">
          {formatDate(batch.created_at)}
        </span>
        {batch.status === 'completed' && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/items?batchId=${batch.id}`);
            }}
          >
            Review All
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
