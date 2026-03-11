'use client';

import type { GenerationHistoryRow } from '@journey-os/shared-types';
import { Clock } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface HistoryRowProps {
  row: GenerationHistoryRow;
  onClick: (itemId: string) => void;
}

const ROUTE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  auto_approve: { bg: '#e8f5e9', text: C.green, label: 'Approved' },
  faculty_review: { bg: '#fff8e1', text: '#b8860b', label: 'Review' },
  auto_reject: { bg: '#ffebee', text: C.red, label: 'Rejected' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '--';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * HistoryRow — a single row in the generation history list.
 * Pure presentational molecule. No data fetching.
 */
export function HistoryRow({ row, onClick }: HistoryRowProps) {
  const routeInfo = row.autoRoute ? ROUTE_COLORS[row.autoRoute] : null;
  const isClickable = row.itemId != null;

  return (
    <button
      type="button"
      onClick={() => {
        if (row.itemId) onClick(row.itemId);
      }}
      disabled={!isClickable}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => { if (isClickable) e.currentTarget.style.borderColor = C.blueMid; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
    >
      {/* Course badge */}
      <div
        style={{
          padding: '4px 10px',
          background: C.cream,
          borderRadius: 6,
          fontFamily: mono,
          fontSize: 11,
          color: C.textSecondary,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          flexShrink: 0,
          maxWidth: 120,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {row.courseName ?? 'Unknown'}
      </div>

      {/* Question excerpt */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: serif,
            fontSize: 14,
            color: C.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.userMessage ?? 'No message'}
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 12,
            color: C.textMuted,
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Clock size={11} />
          {formatDate(row.createdAt)}
          {row.durationMs != null && (
            <span style={{ marginLeft: 8 }}>{formatDuration(row.durationMs)}</span>
          )}
        </div>
      </div>

      {/* Auto-route badge */}
      {routeInfo && (
        <div
          style={{
            padding: '3px 10px',
            borderRadius: 12,
            background: routeInfo.bg,
            fontFamily: sans,
            fontSize: 12,
            fontWeight: 600,
            color: routeInfo.text,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {routeInfo.label}
        </div>
      )}

      {/* Critic score */}
      <div
        style={{
          fontFamily: mono,
          fontSize: 14,
          color: row.criticComposite != null ? C.textPrimary : C.textMuted,
          flexShrink: 0,
          width: 48,
          textAlign: 'right',
        }}
      >
        {row.criticComposite != null
          ? `${row.criticComposite.toFixed(1)}/5`
          : '--'}
      </div>
    </button>
  );
}
