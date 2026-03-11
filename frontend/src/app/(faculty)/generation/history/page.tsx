'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Search, RefreshCw, ChevronDown, ChevronRight, RotateCcw, FileText } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

interface GenerationSession {
  id: string;
  date: string;
  course: string;
  subconcept: string;
  items_generated: number;
  items_approved: number;
  approval_rate: number;
  avg_critic_score: number;
  prompt_preview: string;
  first_item_stem: string;
}

const MOCK_SESSIONS: GenerationSession[] = [
  { id: 's1', date: '2026-03-09T14:32:00Z', course: 'Cardiovascular Pharmacology', subconcept: 'Beta-Blockers: Mechanism of Action', items_generated: 8, items_approved: 6, approval_rate: 75, avg_critic_score: 0.82, prompt_preview: 'Generate NBME-style questions on beta-blocker pharmacology focusing on mechanism, clinical indications, and adverse effects', first_item_stem: 'A 58-year-old man with a history of myocardial infarction is started on metoprolol...' },
  { id: 's2', date: '2026-03-08T09:15:00Z', course: 'Cardiovascular Pharmacology', subconcept: 'ACE Inhibitors: Clinical Use', items_generated: 6, items_approved: 5, approval_rate: 83, avg_critic_score: 0.88, prompt_preview: 'Generate questions on ACE inhibitor clinical pharmacology with emphasis on heart failure management', first_item_stem: 'A 72-year-old woman with NYHA Class III heart failure presents for medication review...' },
  { id: 's3', date: '2026-03-07T16:45:00Z', course: 'Renal Physiology', subconcept: 'Glomerular Filtration Rate', items_generated: 5, items_approved: 2, approval_rate: 40, avg_critic_score: 0.65, prompt_preview: 'Questions about GFR calculation, clinical significance, and factors affecting filtration', first_item_stem: 'A 45-year-old diabetic patient has a serum creatinine of 2.1 mg/dL...' },
  { id: 's4', date: '2026-03-06T11:20:00Z', course: 'Neuroscience', subconcept: 'Neuromuscular Junction', items_generated: 7, items_approved: 6, approval_rate: 86, avg_critic_score: 0.91, prompt_preview: 'NBME-style items on neuromuscular junction physiology including myasthenia gravis and Lambert-Eaton', first_item_stem: 'A 32-year-old woman reports progressive ptosis and diplopia that worsens throughout the day...' },
  { id: 's5', date: '2026-03-05T10:00:00Z', course: 'Cardiovascular Pharmacology', subconcept: 'Anticoagulants: Warfarin', items_generated: 10, items_approved: 8, approval_rate: 80, avg_critic_score: 0.85, prompt_preview: 'Generate clinical vignette questions on warfarin pharmacology, drug interactions, and monitoring', first_item_stem: 'A 68-year-old man on warfarin for atrial fibrillation presents with an INR of 5.2...' },
];

export default function GenerationHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSessions = async () => {
    setLoading(true); setError(false);
    try { await new Promise((r) => setTimeout(r, 600)); setSessions(MOCK_SESSIONS); }
    catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); }, []);

  const courses = [...new Set(MOCK_SESSIONS.map((s) => s.course))];
  const filtered = sessions.filter((s) => {
    if (courseFilter !== 'all' && s.course !== courseFilter) return false;
    if (searchQuery && !s.subconcept.toLowerCase().includes(searchQuery.toLowerCase()) && !s.prompt_preview.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div>
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by concept or prompt..." style={{ width: '100%', padding: '10px 12px 10px 36px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, background: C.white, color: C.textPrimary }} />
        </div>
        <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} style={{ padding: '10px 32px 10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, background: C.white, color: C.textPrimary }}>
          <option value="all">All Courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading && <div className="flex flex-col items-center py-16"><RefreshCw size={32} className="animate-spin" style={{ color: C.blue }} /><p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Loading generation history...</p></div>}
      {!loading && error && <div className="text-center py-16"><p style={{ fontFamily: sans, color: C.error, marginBottom: 12 }}>Failed to load history.</p><button onClick={fetchSessions} style={{ padding: '8px 20px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, cursor: 'pointer' }}>Retry</button></div>}
      {!loading && !error && filtered.length === 0 && <div className="text-center py-16"><Clock size={48} style={{ color: C.warmGray, marginBottom: 16 }} /><p style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 8 }}>No generation history yet</p></div>}

      {!loading && !error && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((session) => {
            const isExpanded = expandedId === session.id;
            const rateColor = session.approval_rate >= 70 ? C.green : session.approval_rate >= 50 ? C.warning : C.error;
            return (
              <div key={session.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setExpandedId(isExpanded ? null : session.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                  {isExpanded ? <ChevronDown size={18} style={{ color: C.textMuted, flexShrink: 0 }} /> : <ChevronRight size={18} style={{ color: C.textMuted, flexShrink: 0 }} />}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: serif, fontSize: 15, color: C.textPrimary, marginBottom: 4 }}>{session.subconcept}</div>
                    <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>{session.course} &middot; {formatDate(session.date)}</div>
                  </div>
                  <div className="flex gap-6 items-center flex-shrink-0">
                    {[{ l: 'Generated', v: session.items_generated, c: C.textPrimary }, { l: 'Approved', v: session.items_approved, c: C.green }, { l: 'Rate', v: `${session.approval_rate}%`, c: rateColor }, { l: 'Critic', v: session.avg_critic_score.toFixed(2), c: C.textPrimary }].map((s) => (
                      <div key={s.l} className="text-center"><div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>{s.l}</div><div style={{ fontFamily: sans, fontSize: 16, color: s.c }}>{s.v}</div></div>
                    ))}
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ padding: '0 20px 20px 54px', borderTop: `1px solid ${C.borderLight}` }}>
                    <div className="mt-4 mb-3">
                      <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Original Prompt</div>
                      <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, background: C.cream, padding: 12, borderRadius: 8 }}>{session.prompt_preview}</p>
                    </div>
                    <div className="mb-4">
                      <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>First Generated Item</div>
                      <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, fontStyle: 'italic' }}>{session.first_item_stem}</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => router.push('/generation/wizard')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: C.blue, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}><RotateCcw size={14} /> Regenerate</button>
                      <button onClick={() => router.push('/questions/review')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}><FileText size={14} /> View in Review Queue</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
