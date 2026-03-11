'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

interface Batch {
  id: string;
  name: string;
  course: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  items_generated: number;
  items_approved: number;
  items_failed: number;
  approval_rate: number | null;
  avg_critic_score: number | null;
  error_reason?: string;
}

const MOCK_BATCHES: Batch[] = [
  { id: 'b1', name: 'Cardio Pharm Week 3', course: 'Cardiovascular Pharmacology', started_at: '2026-03-09T14:00:00Z', completed_at: '2026-03-09T14:12:00Z', status: 'completed', items_generated: 12, items_approved: 10, items_failed: 0, approval_rate: 83, avg_critic_score: 0.87 },
  { id: 'b2', name: 'Renal Physiology Batch', course: 'Renal Physiology', started_at: '2026-03-09T15:30:00Z', completed_at: null, status: 'running', items_generated: 4, items_approved: 0, items_failed: 0, approval_rate: null, avg_critic_score: null },
  { id: 'b3', name: 'Neuro NMJ Questions', course: 'Neuroscience', started_at: '2026-03-08T10:00:00Z', completed_at: '2026-03-08T10:08:00Z', status: 'completed', items_generated: 8, items_approved: 7, items_failed: 0, approval_rate: 88, avg_critic_score: 0.91 },
  { id: 'b4', name: 'Endocrine DM2 Set', course: 'Endocrine Pathophysiology', started_at: '2026-03-07T16:00:00Z', completed_at: '2026-03-07T16:05:00Z', status: 'partial', items_generated: 6, items_approved: 3, items_failed: 2, approval_rate: 75, avg_critic_score: 0.72, error_reason: '2 items failed critic validation' },
  { id: 'b5', name: 'GI Pathology Set', course: 'GI Pathology', started_at: '2026-03-06T09:00:00Z', completed_at: '2026-03-06T09:01:00Z', status: 'failed', items_generated: 0, items_approved: 0, items_failed: 10, approval_rate: null, avg_critic_score: null, error_reason: 'Syllabus content not found for selected week' },
];

const STATUS_CONFIG: Record<Batch['status'], { label: string; color: string; Icon: typeof CheckCircle }> = {
  running: { label: 'Running', color: C.blue, Icon: RefreshCw },
  completed: { label: 'Completed', color: C.green, Icon: CheckCircle },
  failed: { label: 'Failed', color: C.error, Icon: XCircle },
  partial: { label: 'Partial', color: C.warning, Icon: AlertTriangle },
};

export default function BatchQueuePage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchBatches = async () => {
    setLoading(true); setError(false);
    try { await new Promise((r) => setTimeout(r, 600)); setBatches(MOCK_BATCHES); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBatches(); }, []);

  const filtered = batches.filter((b) => statusFilter === 'all' || b.status === statusFilter);
  const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {['all', 'running', 'completed', 'partial', 'failed'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className="capitalize" style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${statusFilter === s ? C.blue : C.border}`, background: statusFilter === s ? C.blue : C.white, color: statusFilter === s ? C.white : C.textSecondary, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col items-center py-16">
          <RefreshCw size={32} className="animate-spin" style={{ color: C.blue }} />
          <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Loading batches...</p>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16">
          <p style={{ fontFamily: sans, color: C.error, marginBottom: 12 }}>Failed to load batch queue.</p>
          <button onClick={fetchBatches} style={{ padding: '8px 20px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <Layers size={48} style={{ color: C.warmGray, marginBottom: 16 }} />
          <p style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 8 }}>No batch jobs yet</p>
          <p style={{ fontFamily: sans, color: C.textMuted }}>Batch jobs are created when you generate questions in the Workbench.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((batch) => {
            const cfg = STATUS_CONFIG[batch.status];
            const StatusIcon = cfg.Icon;
            return (
              <div key={batch.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <StatusIcon size={16} className={batch.status === 'running' ? 'animate-spin' : ''} style={{ color: cfg.color }} />
                      <span className="uppercase" style={{ fontFamily: sans, fontSize: 12, color: cfg.color, letterSpacing: 0.5 }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary, marginBottom: 4 }}>{batch.name}</div>
                    <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>{batch.course} &middot; Started {formatTime(batch.started_at)}</div>
                    {batch.error_reason && <div className="mt-2" style={{ padding: '8px 12px', background: `${C.error}08`, border: `1px solid ${C.error}20`, borderRadius: 6, fontFamily: sans, fontSize: 13, color: C.error }}>{batch.error_reason}</div>}
                  </div>
                  <div className="flex gap-6 items-center">
                    {batch.items_generated > 0 && (
                      <>
                        <div className="text-center"><div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Items</div><div style={{ fontFamily: sans, fontSize: 18, color: C.textPrimary }}>{batch.items_generated}</div></div>
                        {batch.approval_rate !== null && <div className="text-center"><div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Approval</div><div style={{ fontFamily: sans, fontSize: 18, color: C.green }}>{batch.approval_rate}%</div></div>}
                        {batch.avg_critic_score !== null && <div className="text-center"><div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Critic</div><div style={{ fontFamily: sans, fontSize: 18, color: C.textPrimary }}>{batch.avg_critic_score.toFixed(2)}</div></div>}
                      </>
                    )}
                    <button onClick={() => router.push(`/generation/batch/${batch.id}/detail`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.parchment, color: C.blue, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
                      <Eye size={14} /> View Details
                    </button>
                    {batch.status === 'failed' && <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}><RefreshCw size={14} /> Retry</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
