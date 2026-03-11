'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Clock, CheckCircle, AlertTriangle, RefreshCw, Calendar, ChevronRight } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

type ExamStatus = 'upcoming' | 'available' | 'in_progress' | 'completed' | 'expired';

interface StudentExam {
  id: string;
  session_id: string;
  name: string;
  course: string;
  question_count: number;
  time_limit: number | null;
  available_from: string;
  deadline: string;
  status: ExamStatus;
  score?: number;
  completed_at?: string;
}

const MOCK_EXAMS: StudentExam[] = [
  { id: 'e1', session_id: 'ses1', name: 'Cardiovascular Pharmacology Midterm', course: 'Cardiovascular Pharmacology', question_count: 40, time_limit: 60, available_from: '2026-03-10T08:00:00Z', deadline: '2026-03-12T23:59:00Z', status: 'available' },
  { id: 'e2', session_id: 'ses2', name: 'Renal Physiology Quiz 3', course: 'Renal Physiology', question_count: 15, time_limit: 20, available_from: '2026-03-15T08:00:00Z', deadline: '2026-03-17T23:59:00Z', status: 'upcoming' },
  { id: 'e3', session_id: 'ses3', name: 'Neuroscience Block Exam', course: 'Neuroscience', question_count: 60, time_limit: 90, available_from: '2026-03-01T08:00:00Z', deadline: '2026-03-03T23:59:00Z', status: 'completed', score: 84, completed_at: '2026-03-02T14:30:00Z' },
  { id: 'e4', session_id: 'ses4', name: 'Endocrine Pathophysiology Final', course: 'Endocrine Pathophysiology', question_count: 50, time_limit: 75, available_from: '2026-02-20T08:00:00Z', deadline: '2026-02-22T23:59:00Z', status: 'completed', score: 72, completed_at: '2026-02-21T16:45:00Z' },
  { id: 'e5', session_id: 'ses5', name: 'GI Pathology Practice Exam', course: 'GI Pathology', question_count: 20, time_limit: null, available_from: '2026-02-10T08:00:00Z', deadline: '2026-02-12T23:59:00Z', status: 'expired' },
];

const STATUS_CONFIG: Record<ExamStatus, { label: string; color: string; Icon: typeof Clock }> = {
  upcoming: { label: 'Upcoming', color: C.textMuted, Icon: Calendar },
  available: { label: 'Available Now', color: C.blue, Icon: FileText },
  in_progress: { label: 'In Progress', color: C.warning, Icon: Clock },
  completed: { label: 'Completed', color: C.green, Icon: CheckCircle },
  expired: { label: 'Expired', color: C.error, Icon: AlertTriangle },
};

export default function StudentExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'completed'>('active');

  useEffect(() => {
    (async () => {
      setLoading(true);
      await new Promise(r => setTimeout(r, 500));
      setExams(MOCK_EXAMS);
      setLoading(false);
    })();
  }, []);

  const activeExams = exams.filter(e => e.status === 'available' || e.status === 'upcoming' || e.status === 'in_progress');
  const completedExams = exams.filter(e => e.status === 'completed' || e.status === 'expired');
  const displayed = tab === 'active' ? activeExams : completedExams;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const daysUntil = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Past due';
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days} days left`;
  };

  const scoreColor = (score: number) => score >= 80 ? C.green : score >= 60 ? C.warning : C.error;

  return (
    <>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.cream, padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {(['active', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', fontFamily: sans, fontSize: 14, cursor: 'pointer',
              background: tab === t ? C.white : 'transparent', color: tab === t ? C.textPrimary : C.textMuted,
              boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              textTransform: 'capitalize',
            }}
          >
            {t} ({t === 'active' ? activeExams.length : completedExams.length})
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <RefreshCw size={32} style={{ color: C.blue, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: sans, color: C.textMuted, marginTop: 16 }}>Loading exams...</p>
        </div>
      )}

      {!loading && displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <FileText size={48} style={{ color: C.warmGray, marginBottom: 16 }} />
          <p style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 8 }}>
            {tab === 'active' ? 'No upcoming exams' : 'No completed exams'}
          </p>
          <p style={{ fontFamily: sans, color: C.textMuted }}>
            {tab === 'active' ? 'Exams will appear here when assigned by your instructor.' : 'Completed exams and scores will appear here.'}
          </p>
        </div>
      )}

      {!loading && displayed.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayed.map(exam => {
            const cfg = STATUS_CONFIG[exam.status];
            const StatusIcon = cfg.Icon;
            return (
              <div
                key={exam.id}
                style={{
                  background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
                  cursor: exam.status === 'available' || exam.status === 'in_progress' ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (exam.status === 'available' || exam.status === 'in_progress') {
                    router.push(`/exams/${exam.session_id}/take`);
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusIcon size={16} style={{ color: cfg.color }} />
                    <span style={{ fontFamily: sans, fontSize: 12, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>{cfg.label}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary }}>{exam.name}</div>
                    <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                      {exam.course} &middot; {exam.question_count} questions
                      {exam.time_limit ? ` \u00b7 ${exam.time_limit} min` : ' \u00b7 Untimed'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
                    {exam.status === 'completed' && exam.score !== undefined && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: sans, fontSize: 24, color: scoreColor(exam.score) }}>{exam.score}%</div>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>Score</div>
                      </div>
                    )}
                    {(exam.status === 'available' || exam.status === 'upcoming') && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: sans, fontSize: 14, color: exam.status === 'available' ? C.blue : C.textSecondary }}>{daysUntil(exam.deadline)}</div>
                        <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Due {formatDate(exam.deadline)}</div>
                      </div>
                    )}
                    {exam.status === 'completed' && exam.completed_at && (
                      <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>Completed {formatDate(exam.completed_at)}</div>
                    )}
                    {(exam.status === 'available' || exam.status === 'in_progress') && (
                      <ChevronRight size={20} style={{ color: C.blue }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
