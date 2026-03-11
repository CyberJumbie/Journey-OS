'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Filter, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface QuestionItem {
  id: string;
  stem: string;
  format: string;
  system: string;
  difficulty: string;
  bloom_level: string;
  subconcept: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  batch_id: string;
}

const mockQuestions: QuestionItem[] = [
  { id: '1', stem: 'A 62-year-old man presents to the emergency department with acute chest pain radiating to the left arm. The pain started 2 hours ago while he was mowing the lawn...', format: 'Single Best Answer', system: 'Cardiovascular', difficulty: 'Medium', bloom_level: 'Apply', subconcept: 'STEMI: Diagnosis', status: 'pending', created_at: '2026-02-20T10:45:00Z', batch_id: 'batch_001' },
  { id: '2', stem: 'A 68-year-old woman with a history of hypertension presents with progressive dyspnea on exertion over 3 months...', format: 'Single Best Answer', system: 'Cardiovascular', difficulty: 'Hard', bloom_level: 'Analyze', subconcept: 'Heart Failure: Diagnosis', status: 'pending', created_at: '2026-02-20T10:42:00Z', batch_id: 'batch_001' },
  { id: '3', stem: 'A 55-year-old man is found to have an irregular pulse during a routine examination...', format: 'Single Best Answer', system: 'Cardiovascular', difficulty: 'Medium', bloom_level: 'Apply', subconcept: 'Atrial Fibrillation: Treatment', status: 'pending', created_at: '2026-02-20T10:38:00Z', batch_id: 'batch_001' },
  { id: '4', stem: 'A 45-year-old woman with type 2 diabetes presents for follow-up. Her most recent HbA1c is 8.2%...', format: 'Clinical Vignette', system: 'Endocrine', difficulty: 'Medium', bloom_level: 'Apply', subconcept: 'Diabetes Management', status: 'approved', created_at: '2026-02-19T14:20:00Z', batch_id: 'batch_002' },
];

export default function FacultyReviewQueuePage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState({ status: 'all', system: 'all', difficulty: 'all' });

  const fetchQuestions = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const filtered = mockQuestions.filter((q) => {
        if (filters.status !== 'all' && q.status !== filters.status) return false;
        if (filters.system !== 'all' && q.system !== filters.system) return false;
        if (filters.difficulty !== 'all' && q.difficulty !== filters.difficulty) return false;
        return true;
      });
      setQuestions(filtered);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, [filters]);

  const formatRelativeTime = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(dateString));
  };

  const getStatusColor = (status: QuestionItem['status']) => {
    const map = { pending: { bg: 'rgba(250,157,51,0.1)', text: '#fa9d33', border: 'rgba(250,157,51,0.2)' }, approved: { bg: `${C.green}15`, text: C.green, border: `${C.green}30` }, rejected: { bg: `${C.error}15`, text: C.error, border: `${C.error}30` } };
    return map[status];
  };

  const getDifficultyColor = (d: string) => d === 'Easy' ? C.green : d === 'Medium' ? '#fa9d33' : d === 'Hard' ? C.error : C.textMuted;

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;
  const rejectedCount = questions.filter((q) => q.status === 'rejected').length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ label: 'Pending Review', value: pendingCount, icon: <Clock size={20} />, color: '#fa9d33' }, { label: 'Approved', value: approvedCount, icon: <CheckCircle size={20} />, color: C.green }, { label: 'Rejected', value: rejectedCount, icon: <XCircle size={20} />, color: C.error }].map((stat) => (
          <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>{stat.icon}</div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={18} style={{ color: C.textMuted }} />
          {[
            { key: 'status', options: [['all', 'All Status'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']] },
            { key: 'system', options: [['all', 'All Systems'], ['Cardiovascular', 'Cardiovascular'], ['Respiratory', 'Respiratory'], ['Endocrine', 'Endocrine']] },
            { key: 'difficulty', options: [['all', 'All Difficulties'], ['Easy', 'Easy'], ['Medium', 'Medium'], ['Hard', 'Hard']] },
          ].map((f) => (
            <select key={f.key} value={filters[f.key as keyof typeof filters]} onChange={(e) => setFilters({ ...filters, [f.key]: e.target.value })} style={{ height: 40, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 32px 0 12px', fontFamily: sans, fontSize: 15, color: C.ink, cursor: 'pointer' }}>
              {f.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        {loading ? [...Array(3)].map((_, i) => <div key={i} className="animate-pulse" style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24, height: 180 }} />) : error ? (
          <div className="text-center py-16">
            <AlertTriangle size={24} style={{ color: C.error, margin: '0 auto 16px' }} />
            <p style={{ fontFamily: sans, color: C.error, marginBottom: 12 }}>Could not load review queue</p>
            <button onClick={fetchQuestions} style={{ padding: '10px 20px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer' }}>Retry</button>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle size={24} style={{ color: C.green, margin: '0 auto 16px' }} />
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>Review queue is empty</h3>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 20 }}>All generated questions have been reviewed.</p>
          </div>
        ) : questions.map((q) => {
          const sc = getStatusColor(q.status);
          return (
            <div key={q.id} onClick={() => router.push(`/questions/${q.id}`)} className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg" style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24 }}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: '4px 8px', borderRadius: 4 }}>{q.status}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: getDifficultyColor(q.difficulty), fontWeight: 600 }}>{q.difficulty}</span>
                </div>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{formatRelativeTime(q.created_at)}</span>
              </div>
              <p className="line-clamp-2 mb-4" style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: C.textPrimary }}>{q.stem}</p>
              <div className="grid grid-cols-3 gap-3" style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                {[{ label: 'System', value: q.system }, { label: 'Format', value: q.format }, { label: 'Subconcept', value: q.subconcept }].map((m) => (
                  <div key={m.label}>
                    <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <button style={{ padding: '8px 16px', background: C.blue, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> Review Question</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
