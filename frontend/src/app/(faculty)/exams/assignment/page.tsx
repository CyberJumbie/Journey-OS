'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Send, AlertTriangle, RefreshCw } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Exam {
  id: string;
  name: string;
  question_count: number;
  total_points: number;
  created_at: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
}

interface AssignmentConfig {
  course_id: string;
  section_ids: string[];
  available_from: string;
  available_until: string;
  time_limit: number;
  attempts_allowed: number;
  randomize_questions: boolean;
  show_results: boolean;
}

export default function ExamAssignment() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [config, setConfig] = useState<AssignmentConfig>({ course_id: '', section_ids: [], available_from: '', available_until: '', time_limit: 120, attempts_allowed: 1, randomize_questions: false, show_results: true });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    setLoading(true); setError(false);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setExams([
        { id: '1', name: 'Cardiovascular Midterm Exam', question_count: 50, total_points: 500, created_at: '2026-02-15T10:00:00Z', status: 'draft' },
        { id: '2', name: 'Pharmacology Quiz 3', question_count: 20, total_points: 200, created_at: '2026-02-10T14:30:00Z', status: 'scheduled' },
        { id: '3', name: 'Clinical Scenarios Assessment', question_count: 30, total_points: 300, created_at: '2026-02-05T09:00:00Z', status: 'completed' },
      ]);
    } catch { setError(true); } finally { setLoading(false); }
  };

  const handleAssignExam = async () => {
    if (!selectedExam || !config.course_id || config.section_ids.length === 0) return;
    setSubmitting(true);
    try { await new Promise((r) => setTimeout(r, 1500)); router.push('/exams'); }
    catch { /* noop */ } finally { setSubmitting(false); }
  };

  const courses = [{ id: '1', name: 'Medical Pharmacology I', code: 'PHAR 501' }, { id: '2', name: 'Clinical Pharmacology', code: 'PHAR 502' }];
  const sections = [{ id: 's1', name: 'Section A - Morning', students: 42 }, { id: 's2', name: 'Section B - Afternoon', students: 38 }, { id: 's3', name: 'Section C - Evening', students: 35 }];

  const getStatusColor = (status: Exam['status']) => {
    switch (status) {
      case 'draft': return { bg: `${C.textMuted}15`, text: C.textMuted, border: `${C.textMuted}30` };
      case 'scheduled': return { bg: `${C.blueMid}15`, text: C.blueMid, border: `${C.blueMid}30` };
      case 'active': return { bg: `${C.green}15`, text: C.green, border: `${C.green}30` };
      case 'completed': return { bg: `${C.textMuted}15`, text: C.textMuted, border: `${C.textMuted}30` };
    }
  };

  if (loading) return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {[1, 2].map((i) => (<div key={i} style={{ background: C.borderLight, borderRadius: 12, height: i === 1 ? 280 : 420, animation: 'pulse 1.5s ease-in-out infinite' }} />))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.error}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <AlertTriangle size={28} style={{ color: C.error }} />
      </div>
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>Couldn&apos;t load exams.</h2>
      <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: '0 0 24px', maxWidth: 400 }}>Please check your connection and try again.</p>
      <button onClick={fetchExams} style={{ padding: '10px 24px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={16} /> Retry
      </button>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: Select Exam */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Select Exam</h2>
        </div>
        <div style={{ padding: 20 }}>
          {exams.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center' }}>
              <FileText size={32} style={{ color: C.textMuted, marginBottom: 12, opacity: 0.5 }} />
              <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>No exams available</h3>
              <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, margin: 0 }}>Create an exam in the Exam Builder first.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {exams.map((exam) => {
                const statusColors = getStatusColor(exam.status);
                const isSelected = selectedExam?.id === exam.id;
                return (
                  <div key={exam.id} onClick={() => setSelectedExam(exam)} style={{ background: isSelected ? `${C.blueMid}10` : C.parchment, border: `2px solid ${isSelected ? C.blueMid : C.border}`, borderRadius: 10, padding: 16, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navyDeep, margin: 0 }}>{exam.name}</h3>
                      <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}`, padding: '3px 8px', borderRadius: 4 }}>{exam.status}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontFamily: mono, fontSize: 11, color: C.textMuted }}>
                      <span>{exam.question_count} questions</span><span>&#x2022;</span><span>{exam.total_points} points</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Configuration */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
          <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Assignment Settings</h2>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Course <span style={{ color: C.error }}>*</span></label>
              <select value={config.course_id} onChange={(e) => setConfig({ ...config, course_id: e.target.value })} style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 32px 0 12px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none', cursor: 'pointer' }}>
                <option value="">Select a course</option>
                {courses.map((course) => (<option key={course.id} value={course.id}>{course.name} ({course.code})</option>))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Sections <span style={{ color: C.error }}>*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sections.map((section) => (
                  <label key={section.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.section_ids.includes(section.id)} onChange={(e) => { if (e.target.checked) setConfig({ ...config, section_ids: [...config.section_ids, section.id] }); else setConfig({ ...config, section_ids: config.section_ids.filter((id) => id !== section.id) }); }} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{section.name}</div>
                      <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{section.students} students</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([{ label: 'Available From', key: 'available_from' as const }, { label: 'Available Until', key: 'available_until' as const }]).map((field) => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>{field.label}</label>
                  <input type="datetime-local" value={config[field.key]} onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })} style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', fontFamily: sans, fontSize: 14, color: C.ink, outline: 'none' }} />
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 12 }}>Time Limit: {config.time_limit} minutes</label>
              <input type="range" min="30" max="240" step="15" value={config.time_limit} onChange={(e) => setConfig({ ...config, time_limit: Number(e.target.value) })} style={{ width: '100%', height: 6, background: C.parchment, borderRadius: 3, outline: 'none', cursor: 'pointer' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {([{ label: 'Randomize question order', key: 'randomize_questions' as const }, { label: 'Show results immediately after submission', key: 'show_results' as const }]).map((opt) => (
                <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={config[opt.key]} onChange={(e) => setConfig({ ...config, [opt.key]: e.target.checked })} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                  <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{opt.label}</span>
                </label>
              ))}
            </div>
            <button onClick={handleAssignExam} disabled={!selectedExam || !config.course_id || config.section_ids.length === 0 || submitting}
              style={{ width: '100%', padding: '14px 24px', background: (!selectedExam || !config.course_id || config.section_ids.length === 0 || submitting) ? C.textMuted : C.green, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: (!selectedExam || !config.course_id || config.section_ids.length === 0 || submitting) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8 }}>
              <Send size={18} /> {submitting ? 'Assigning...' : 'Assign Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
