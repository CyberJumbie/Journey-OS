'use client';

/**
 * BATCH ITEM ROW -- Displays a single batch item's status and metadata.
 *
 * Molecule level: no data fetching, no mutations.
 * Callbacks (onRetry) passed from parent organism.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
} from 'lucide-react';

type BatchItemStatus = 'pending' | 'running' | 'completed' | 'failed';

interface BatchItemRowProps {
  id: string;
  status: BatchItemStatus;
  stemExcerpt: string | null;
  bloomLevel: number | null;
  usmleSystem: string | null;
  errorMessage: string | null;
  onRetry: (batchItemId: string) => void;
  isRetrying: boolean;
}

const STATUS_CONFIG: Record<
  BatchItemStatus,
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

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
};

export function BatchItemRow({
  id,
  status,
  stemExcerpt,
  bloomLevel,
  usmleSystem,
  errorMessage,
  onRetry,
  isRetrying,
}: BatchItemRowProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--border-light)] first:border-t-0">
      {/* Status icon */}
      <div className="flex-shrink-0">
        <StatusIcon
          className={`size-4 ${
            status === 'running' ? 'animate-spin text-[var(--blue-mid)]' : ''
          } ${status === 'completed' ? 'text-[var(--green)]' : ''} ${
            status === 'failed' ? 'text-[var(--danger)]' : ''
          } ${status === 'pending' ? 'text-[var(--text-muted)]' : ''}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate">
          {stemExcerpt ?? 'Generating...'}
        </p>

        {/* Error message for failed items */}
        {status === 'failed' && errorMessage && (
          <p className="text-xs text-[var(--danger)] mt-0.5 truncate">
            {errorMessage}
          </p>
        )}

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={config.variant}>{config.label}</Badge>
          {bloomLevel !== null && (
            <Badge variant="secondary">
              B{bloomLevel}: {BLOOM_LABELS[bloomLevel] ?? `Level ${bloomLevel}`}
            </Badge>
          )}
          {usmleSystem && (
            <Badge variant="outline">{usmleSystem}</Badge>
          )}
        </div>
      </div>

      {/* Retry button for failed items */}
      {status === 'failed' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRetry(id)}
          disabled={isRetrying}
          className="flex-shrink-0"
        >
          {isRetrying ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RotateCcw className="size-3.5" />
          )}
          Retry
        </Button>
      )}
    </div>
  );
}
