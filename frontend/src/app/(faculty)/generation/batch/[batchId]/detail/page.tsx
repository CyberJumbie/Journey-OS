'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Clock, Eye, Filter, ExternalLink } from 'lucide-react';
import { C, sans } from '@/lib/design-tokens';

interface BatchItem {
  id: string;
  stem_preview: string;
  critic_score: number;
  bloom_level: string;
  usmle_system: string;
  routing: 'auto_approved' | 'faculty_review' | 'auto_rejected';
  status: 'approved' | 'pending' | 'rejected' | 'draft';
  rejection_reason?: string;
}

interface BatchInfo {
  id: string;
  name: string;
  course: string;
  subconcepts: string[];
  bloom_level: string;
  started_at: string;
  completed_at: string;
  items: BatchItem[];
}

const MOCK_BATCH: BatchInfo = {
  id: 'b1', name: 'Cardio Pharm Week 3', course: 'Cardiovascular Pharmacology',
  subconcepts: ['Beta-Blockers: Mechanism', 'Beta-Blockers: Adverse Effects', 'Beta-Blockers: Clinical Use'],
  bloom_level: 'Apply', started_at: '2026-03-09T14:00:00Z', completed_at: '2026-03-09T14:12:00Z',
  items: [
    { id: 'q1', stem_preview: 'A 58-year-old man with a history of myocardial infarction is started on metoprolol...', critic_score: 0.92, bloom_level: 'Apply', usmle_system: 'Cardiovascular', routing: 'auto_approved', status: 'approved' },
    { id: 'q2', stem_preview: 'A 45-year-old woman with chronic heart failure and asthma presents for medication review...', critic_score: 0.88, bloom_level: 'Analyze', usmle_system: 'Cardiovascular', routing: 'auto_approved', status: 'approved' },
    { id: 'q3', stem_preview: 'A 62-year-old man on atenolol for hypertension develops new-onset fatigue...', critic_score: 0.79, bloom_level: 'Apply', usmle_system: 'Cardiovascular', routing: 'faculty_review', status: 'pending' },
    { id: 'q4', stem_preview: 'A patient with pheochromocytoma is started on a beta-blocker without prior alpha-blockade...', critic_score: 0.85, bloom_level: 'Apply', usmle_system: 'Cardiovascular', routing: 'auto_approved', status: 'approved' },
    { id: 'q5', stem_preview: 'Which of the following beta-blockers has intrinsic sympathomimetic activity...', critic_score: 0.72, bloom_level: 'Remember', usmle_system: 'Cardiovascular', routing: 'faculty_review', status: 'pending' },
    { id: 'q6', stem_preview: 'A neonate born to a mother on labetalol during pregnancy presents with hypoglycemia...', critic_score: 0.91, bloom_level: 'Analyze', usmle_system: 'Cardiovascular', routing: 'auto_approved', status: 'approved' },
    { id: 'q7', stem_preview: 'Beta-blockers reduce mortality in heart failure patients primarily through which mechanism...', critic_score: 0.45, bloom_level: 'Remember', usmle_system: 'Cardiovascular', routing: 'auto_rejected', status: 'rejected', rejection_reason: 'Stem lacks clinical vignette' },
  ],
};

const ROUTING_CONFIG = {
  auto_approved: { label: 'Auto-Approved', color: C.green, Icon: CheckCircle },
  faculty_review: { label: 'Faculty Review', color: C.warning, Icon: Clock },
  auto_rejected: { label: 'Auto-Rejected', color: C.error, Icon: XCircle },
};

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [batch, setBatch] = useState<BatchInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [routingFilter, setRoutingFilter] = useState('all');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 500));
      setBatch(MOCK_BATCH);
      setLoading(false);
    })();
  }, [params?.batchId]);

  const filtered = batch?.items.filter((i) => routingFilter === 'all' || i.routing === routingFilter) ?? [];
  const formatTime = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <div>
      <button onClick={() => router.push('/generation/queue')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, padding: 0, border: 'none', background: 'transparent', color: C.blue, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
        <ArrowLeft size={16} /> Back to Batch Queue
      </button>

      {loading && <div className="text-center py-16"><p style={{ fontFamily: sans, color: C.textMuted }}>Loading batch details...</p></div>}

      {!loading && batch && (
        <>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <div className="flex gap-8 flex-wrap">
              <div><div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>SubConcepts Targeted</div><div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, marginTop: 4 }}>{batch.subconcepts.join(', ')}</div></div>
              <div><div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Bloom Level</div><div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, marginTop: 4 }}>{batch.bloom_level}</div></div>
              <div><div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Duration</div><div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary, marginTop: 4 }}>{formatTime(batch.started_at)} &mdash; {formatTime(batch.completed_at)}</div></div>
            </div>
          </div>

          <div className="flex gap-2 mb-5 flex-wrap items-center">
            <Filter size={14} style={{ color: C.textMuted }} />
            {(['all', 'auto_approved', 'faculty_review', 'auto_rejected'] as const).map((f) => (
              <button key={f} onClick={() => setRoutingFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontFamily: sans, cursor: 'pointer', border: `1px solid ${routingFilter === f ? C.blue : C.border}`, background: routingFilter === f ? C.blue : C.white, color: routingFilter === f ? C.white : C.textSecondary }}>
                {f === 'all' ? `All (${batch.items.length})` : `${ROUTING_CONFIG[f].label} (${batch.items.filter((i) => i.routing === f).length})`}
              </button>
            ))}
          </div>

          {batch.items.some((i) => i.routing === 'faculty_review') && (
            <button onClick={() => router.push('/questions/review')} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: '8px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
              <ExternalLink size={14} /> Review All in Queue
            </button>
          )}

          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: sans, fontSize: 14 }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  {['Item', 'Critic', 'Bloom', 'Routing', 'Action'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Item' ? 'left' : 'center', color: C.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const rcfg = ROUTING_CONFIG[item.routing];
                  const RIcon = rcfg.Icon;
                  const scoreColor = item.critic_score >= 0.8 ? C.green : item.critic_score >= 0.6 ? C.warning : C.error;
                  return (
                    <tr key={item.id} style={{ borderTop: idx > 0 ? `1px solid ${C.borderLight}` : undefined }}>
                      <td style={{ padding: '14px 16px', color: C.textPrimary, maxWidth: 420 }}>
                        <div className="truncate">{item.stem_preview}</div>
                        {item.rejection_reason && <div style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{item.rejection_reason}</div>}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: scoreColor }}>{item.critic_score.toFixed(2)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: C.textSecondary }}>{item.bloom_level}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span className="inline-flex items-center gap-1" style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, background: `${rcfg.color}12`, color: rcfg.color }}>
                          <RIcon size={12} /> {rcfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button onClick={() => router.push(`/questions/${item.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, color: C.blue, fontFamily: sans, fontSize: 12, cursor: 'pointer' }}>
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
