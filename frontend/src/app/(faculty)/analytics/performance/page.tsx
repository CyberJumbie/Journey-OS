'use client';

import { useState, useEffect } from 'react';
import { Target, AlertCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface QuestionMetric {
  id: string;
  stem: string;
  system: string;
  difficulty: string;
  usage_count: number;
  avg_score: number;
  discrimination_index: number;
  status: 'excellent' | 'good' | 'review' | 'retire';
}

export default function QuestionPerformanceMetrics() {
  const [questions, setQuestions] = useState<QuestionMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => { fetchQuestionMetrics(); }, [filterStatus]);

  const fetchQuestionMetrics = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockQuestions: QuestionMetric[] = [
        { id: '1', stem: 'A 62-year-old man presents with acute chest pain radiating to the left arm...', system: 'Cardiovascular', difficulty: 'Medium', usage_count: 45, avg_score: 0.82, discrimination_index: 0.38, status: 'excellent' },
        { id: '2', stem: 'Which of the following is the primary mechanism of action for ACE inhibitors...', system: 'Cardiovascular', difficulty: 'Easy', usage_count: 67, avg_score: 0.91, discrimination_index: 0.28, status: 'good' },
        { id: '3', stem: 'A 68-year-old woman with progressive dyspnea on exertion over 3 months...', system: 'Respiratory', difficulty: 'Hard', usage_count: 23, avg_score: 0.45, discrimination_index: 0.15, status: 'review' },
        { id: '4', stem: 'A 3-month-old infant presents with cyanosis and a systolic murmur...', system: 'Cardiovascular', difficulty: 'Hard', usage_count: 34, avg_score: 0.78, discrimination_index: 0.42, status: 'excellent' },
        { id: '5', stem: 'Which neurotransmitter is primarily affected by selective serotonin reuptake...', system: 'Nervous', difficulty: 'Easy', usage_count: 89, avg_score: 0.95, discrimination_index: 0.08, status: 'retire' },
      ];
      const filtered = filterStatus === 'all' ? mockQuestions : mockQuestions.filter((q) => q.status === filterStatus);
      setQuestions(filtered);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: QuestionMetric['status']) => {
    switch (status) {
      case 'excellent': return { label: 'Excellent', color: C.green, icon: <CheckCircle size={16} /> };
      case 'good': return { label: 'Good', color: C.blueMid, icon: <CheckCircle size={16} /> };
      case 'review': return { label: 'Needs Review', color: C.warning, icon: <AlertCircle size={16} /> };
      case 'retire': return { label: 'Consider Retiring', color: C.error, icon: <AlertCircle size={16} /> };
    }
  };

  return (
    <>
      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Questions', value: questions.length, color: C.blueMid },
          { label: 'Excellent', value: questions.filter((q) => q.status === 'excellent').length, color: C.green },
          { label: 'Need Review', value: questions.filter((q) => q.status === 'review').length, color: C.warning },
          { label: 'Consider Retiring', value: questions.filter((q) => q.status === 'retire').length, color: C.error },
        ].map((stat) => (
          <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontFamily: serif, fontSize: 32, fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {[
            { key: 'all', label: 'All Questions' },
            { key: 'excellent', label: 'Excellent' },
            { key: 'good', label: 'Good' },
            { key: 'review', label: 'Needs Review' },
            { key: 'retire', label: 'Consider Retiring' },
          ].map((filter) => (
            <button key={filter.key} onClick={() => setFilterStatus(filter.key)} style={{ padding: '8px 16px', background: filterStatus === filter.key ? C.navyDeep : 'transparent', border: `1px solid ${filterStatus === filter.key ? C.navyDeep : C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, fontWeight: 600, color: filterStatus === filter.key ? C.white : C.textPrimary, cursor: 'pointer' }}>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Questions List */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Question Analytics</h2>
        </div>
        <div>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ height: 16, width: '70%', background: C.parchment, borderRadius: 4, marginBottom: 12 }} />
                <div style={{ height: 12, width: '40%', background: C.parchment, borderRadius: 4 }} />
              </div>
            ))
          ) : error ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <AlertTriangle size={48} style={{ color: C.error, marginBottom: 16 }} />
              <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>Failed to load metrics</h3>
              <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 16 }}>Something went wrong. Please try again.</p>
              <button onClick={fetchQuestionMetrics} style={{ padding: '10px 20px', background: C.blueMid, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} /> Retry
              </button>
            </div>
          ) : questions.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <Target size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
              <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>No questions found</h3>
              <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary }}>Try adjusting your filter</p>
            </div>
          ) : (
            questions.map((question, index) => {
              const statusConfig = getStatusConfig(question.status);
              return (
                <div key={question.id} style={{ padding: 24, borderBottom: index < questions.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ flex: 1, marginRight: 16 }}>
                      <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: C.textPrimary, margin: '0 0 8px' }}>{question.stem.substring(0, 120)}...</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontFamily: mono, fontSize: 10, color: C.textMuted }}>
                        <span>{question.system}</span>
                        <span>&#x2022;</span>
                        <span>{question.difficulty}</span>
                        <span>&#x2022;</span>
                        <span>Used {question.usage_count} times</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: `${statusConfig.color}15`, border: `1px solid ${statusConfig.color}40`, borderRadius: 6, fontFamily: mono, fontSize: 10, fontWeight: 600, color: statusConfig.color, whiteSpace: 'nowrap' }}>
                      {statusConfig.icon}
                      {statusConfig.label}
                    </div>
                  </div>
                  <div style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Avg Score</div>
                      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: question.avg_score >= 0.7 ? C.green : question.avg_score >= 0.5 ? C.warning : C.error }}>{Math.round(question.avg_score * 100)}%</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Discrimination</div>
                      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: question.discrimination_index >= 0.3 ? C.green : question.discrimination_index >= 0.2 ? C.warning : C.error }}>{question.discrimination_index.toFixed(2)}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Usage Count</div>
                      <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.blueMid }}>{question.usage_count}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
