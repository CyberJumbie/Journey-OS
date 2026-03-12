'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useGenerationHistory } from '@/hooks/useGenerationHistory';
import { useCourses } from '@/hooks/useCourses';
import { HistoryRow } from '@/components/molecules/HistoryRow/HistoryRow';

type AutoRouteFilter = 'auto_approve' | 'auto_reject' | 'faculty_review' | undefined;

export default function GenerationHistoryPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState<string | undefined>();
  const [autoRoute, setAutoRoute] = useState<AutoRouteFilter>();

  const { data: courses } = useCourses();
  const { data: result, isLoading, isError, refetch } = useGenerationHistory({
    page,
    limit: 20,
    courseId,
    autoRoute,
  });

  const stats = result?.stats;
  const rows = result?.data ?? [];
  const pagination = result?.pagination;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: C.textPrimary, marginBottom: 8 }}>
        Generation History
      </h1>
      <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted, marginBottom: 24 }}>
        Track your question generation sessions and pipeline statistics.
      </p>

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Filter bar */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={courseId ?? ''}
          onChange={(e) => { setCourseId(e.target.value || undefined); setPage(1); }}
          style={selectStyle}
        >
          <option value="">All Courses</option>
          {(courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>

        <select
          value={autoRoute ?? ''}
          onChange={(e) => { setAutoRoute((e.target.value || undefined) as AutoRouteFilter); setPage(1); }}
          style={selectStyle}
        >
          <option value="">All Routes</option>
          <option value="auto_approve">Auto Approved</option>
          <option value="faculty_review">Faculty Review</option>
          <option value="auto_reject">Auto Rejected</option>
        </select>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex flex-col items-center py-16">
          <RefreshCw size={32} className="animate-spin" style={{ color: C.blue }} />
          <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Loading history...</p>
        </div>
      )}

      {!isLoading && isError && (
        <div className="text-center py-16">
          <p style={{ fontFamily: sans, color: C.error, marginBottom: 12 }}>Failed to load history.</p>
          <button
            onClick={() => void refetch()}
            style={{ padding: '8px 20px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="text-center py-16">
          <Clock size={48} style={{ color: C.warmGray, marginBottom: 16 }} />
          <p style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 8 }}>
            No generation history yet
          </p>
          <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted }}>
            Generate some questions from the workbench to see history here.
          </p>
        </div>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <HistoryRow
                key={row.id}
                row={row}
                onClick={(itemId) => router.push(`/items/${itemId}`)}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <PaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ── Stats Bar ─────────────────────────────────────────────────────────────── */

function StatsBar({ stats }: { stats?: { totalGenerated: number; totalApproved: number; approvalRate: number; avgCriticScore: number | null; avgCostUsd: number | null } }) {
  if (!stats) return null;
  const pct = Math.round(stats.approvalRate * 100);

  const items: Array<{ label: string; value: string }> = [
    { label: 'Generated', value: String(stats.totalGenerated) },
    { label: 'Approved', value: String(stats.totalApproved) },
    { label: 'Rate', value: `${pct}%` },
    { label: 'Avg Score', value: stats.avgCriticScore != null ? `${stats.avgCriticScore}/5.0` : '--' },
    { label: 'Avg Cost', value: stats.avgCostUsd != null ? `$${stats.avgCostUsd.toFixed(2)}` : '--' },
  ];

  return (
    <div style={{ display: 'flex', gap: 24, padding: '16px 24px', background: C.parchment, borderRadius: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, alignSelf: 'center', marginRight: 8 }}>
        This month
      </div>
      {items.map((s) => (
        <div key={s.label} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          <div style={{ fontFamily: sans, fontSize: 18, fontWeight: 600, color: C.textPrimary, marginTop: 2 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Pagination Bar ────────────────────────────────────────────────────────── */

function PaginationBar({ page, totalPages, total, onPageChange }: { page: number; totalPages: number; total: number; onPageChange: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between mt-6">
      <span style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>{total} results</span>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ ...paginationBtnStyle, opacity: page <= 1 ? 0.4 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontFamily: mono, fontSize: 13, color: C.textPrimary }}>{page} / {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ ...paginationBtnStyle, opacity: page >= totalPages ? 0.4 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── Shared styles ─────────────────────────────────────────────────────────── */

const selectStyle: React.CSSProperties = {
  padding: '10px 32px 10px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  fontFamily: sans,
  fontSize: 14,
  background: C.white,
  color: C.textPrimary,
  cursor: 'pointer',
};

const paginationBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  background: C.white,
  color: C.textPrimary,
  cursor: 'pointer',
};
