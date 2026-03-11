'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface QuestionProgress {
  id: string;
  topic: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  timestamp: string;
}

export default function BatchProgressPage() {
  const router = useRouter();
  const [batchStatus, setBatchStatus] = useState<'generating' | 'completed' | 'partial_failure'>('generating');
  const [questions, setQuestions] = useState<QuestionProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const initial: QuestionProgress[] = [
        { id: '1', topic: 'Normal Cardiac Function', status: 'generating', progress: 45, timestamp: new Date().toISOString() },
        { id: '2', topic: 'Pathologic Processes', status: 'pending', progress: 0, timestamp: new Date().toISOString() },
        { id: '3', topic: 'Congenital Defects', status: 'pending', progress: 0, timestamp: new Date().toISOString() },
        { id: '4', topic: 'Pharmacology', status: 'pending', progress: 0, timestamp: new Date().toISOString() },
        { id: '5', topic: 'Normal Neural Function', status: 'pending', progress: 0, timestamp: new Date().toISOString() },
      ];
      setQuestions(initial);
      setLoading(false);

      const interval = setInterval(() => {
        setQuestions((prev) => {
          const updated = [...prev];
          let allCompleted = true;
          for (let i = 0; i < updated.length; i++) {
            if (updated[i].status === 'generating') {
              updated[i].progress = Math.min(100, updated[i].progress + Math.random() * 15);
              if (updated[i].progress >= 100) {
                updated[i] = { ...updated[i], status: 'completed', progress: 100, timestamp: new Date().toISOString() };
                if (i + 1 < updated.length && updated[i + 1].status === 'pending') {
                  updated[i + 1] = { ...updated[i + 1], status: 'generating', progress: 5 };
                }
              }
              allCompleted = false;
            } else if (updated[i].status === 'pending') {
              allCompleted = false;
            }
          }
          if (allCompleted) { setBatchStatus('completed'); clearInterval(interval); }
          return updated;
        });
      }, 1000);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const completed = questions.filter((q) => q.status === 'completed').length;
    setOverallProgress(questions.length > 0 ? Math.round((completed / questions.length) * 100) : 0);
  }, [questions]);

  const getStatusIcon = (status: QuestionProgress['status']) => {
    const map = { completed: <CheckCircle size={20} style={{ color: C.green }} />, generating: <Clock size={20} style={{ color: C.blue }} />, failed: <XCircle size={20} style={{ color: C.error }} />, pending: <Clock size={20} style={{ color: C.textMuted }} /> };
    return map[status];
  };

  const getStatusColor = (status: QuestionProgress['status']) => {
    const map = { completed: { bg: `${C.green}15`, text: C.green, border: `${C.green}30` }, generating: { bg: `${C.blue}15`, text: C.blue, border: `${C.blue}30` }, failed: { bg: `${C.error}15`, text: C.error, border: `${C.error}30` }, pending: { bg: C.parchment, text: C.textMuted, border: C.border } };
    return map[status];
  };

  const completedCount = questions.filter((q) => q.status === 'completed').length;
  const generatingCount = questions.filter((q) => q.status === 'generating').length;
  const failedCount = questions.filter((q) => q.status === 'failed').length;

  if (loading) {
    return (
      <div className="space-y-6">
        {[200, 400].map((h, i) => (
          <div key={i} className="animate-pulse rounded-xl" style={{ background: C.borderLight, height: h }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 28 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep }}>Overall Progress</h2>
          <span style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: batchStatus === 'completed' ? C.green : C.blue }}>{overallProgress}%</span>
        </div>
        <div style={{ width: '100%', height: 12, background: C.parchment, borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ height: '100%', width: `${overallProgress}%`, background: batchStatus === 'completed' ? C.green : C.blue, transition: 'width 0.5s ease' }} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Completed', value: completedCount, color: C.green }, { label: 'In Progress', value: generatingCount, color: C.blue }, { label: 'Failed', value: failedCount, color: C.error }].map((s) => (
            <div key={s.label} style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, textAlign: 'center' }}>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Question List */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>Question Generation Status</h2>
        </div>
        {questions.map((q, idx) => {
          const sc = getStatusColor(q.status);
          return (
            <div key={q.id} style={{ padding: '20px 24px', borderBottom: idx < questions.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
              <div className="flex items-center gap-4" style={{ marginBottom: q.status === 'generating' ? 12 : 0 }}>
                {getStatusIcon(q.status)}
                <div className="flex-1">
                  <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>{q.topic}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, padding: '4px 8px', borderRadius: 4 }}>{q.status.replace('_', ' ')}</span>
                </div>
                {q.status === 'completed' && (
                  <button onClick={() => router.push(`/questions/${q.id}`)} style={{ padding: '8px 16px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.blue, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Eye size={14} /> Review
                  </button>
                )}
              </div>
              {q.status === 'generating' && (
                <div style={{ marginLeft: 36 }}>
                  <div style={{ width: '100%', height: 6, background: C.parchment, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${q.progress}%`, background: C.blue, transition: 'width 0.3s ease' }} />
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginTop: 6 }}>{Math.round(q.progress)}% complete</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {batchStatus === 'completed' && (
        <div className="flex gap-3 justify-center">
          <button onClick={() => router.push('/questions/review')} style={{ padding: '12px 24px', background: C.green, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer' }}>Review All Questions</button>
          <button onClick={() => router.push('/generation/topic')} style={{ padding: '12px 24px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.navyDeep, cursor: 'pointer' }}>Generate More</button>
        </div>
      )}
    </div>
  );
}
