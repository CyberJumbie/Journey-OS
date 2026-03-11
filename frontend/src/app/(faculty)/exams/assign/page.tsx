'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Users, Calendar, Clock, Eye } from 'lucide-react';
import { C, sans, serif } from '@/lib/design-tokens';

interface StudentOption {
  id: string;
  name: string;
  year: string;
  email: string;
}

const MOCK_STUDENTS: StudentOption[] = [
  { id: 's1', name: 'John Mitchell', year: 'M2', email: 'j.mitchell@msm.edu' },
  { id: 's2', name: 'Sarah Williams', year: 'M2', email: 's.williams@msm.edu' },
  { id: 's3', name: 'David Chen', year: 'M2', email: 'd.chen@msm.edu' },
  { id: 's4', name: 'Maria Garcia', year: 'M2', email: 'm.garcia@msm.edu' },
  { id: 's5', name: 'James Johnson', year: 'M1', email: 'j.johnson@msm.edu' },
  { id: 's6', name: 'Emily Brown', year: 'M1', email: 'e.brown@msm.edu' },
  { id: 's7', name: 'Michael Davis', year: 'M2', email: 'm.davis@msm.edu' },
  { id: 's8', name: 'Jessica Wilson', year: 'M1', email: 'j.wilson@msm.edu' },
];

export default function ExamAssign() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [deadline, setDeadline] = useState('2026-03-20T23:59');
  const [startDate, setStartDate] = useState('');
  const [timeLimit, setTimeLimit] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleStudent = (sid: string) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(sid)) { next.delete(sid); } else { next.add(sid); }
      return next;
    });
  };

  const selectAll = () => {
    const filtered = MOCK_STUDENTS.filter(s => cohortFilter === 'all' || s.year === cohortFilter);
    setSelectedStudents(new Set(filtered.map(s => s.id)));
  };

  const deselectAll = () => setSelectedStudents(new Set());

  const filtered = MOCK_STUDENTS.filter(s => cohortFilter === 'all' || s.year === cohortFilter);

  const handleAssign = () => {
    setShowConfirm(false);
    router.push(`/exams/${id}`);
  };

  return (
    <>
      <button
        onClick={() => router.push(`/exams/${id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, padding: 0, border: 'none', background: 'transparent', color: C.blue, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}
      >
        <ArrowLeft size={16} /> Back to Exam Preview
      </button>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Student selector */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: C.blue }} /> Select Students
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={cohortFilter}
                  onChange={e => setCohortFilter(e.target.value)}
                  style={{ padding: '6px 24px 6px 10px', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 13, background: C.white }}
                >
                  <option value="all">All Years</option>
                  <option value="M1">M1</option>
                  <option value="M2">M2</option>
                </select>
                <button onClick={selectAll} style={{ padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 12, background: C.white, color: C.blue, cursor: 'pointer' }}>Select All</button>
                <button onClick={deselectAll} style={{ padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 12, background: C.white, color: C.textMuted, cursor: 'pointer' }}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filtered.map(student => (
                <label
                  key={student.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: selectedStudents.has(student.id) ? `${C.blue}08` : 'transparent' }}
                >
                  <input type="checkbox" checked={selectedStudents.has(student.id)} onChange={() => toggleStudent(student.id)} style={{ accentColor: C.blue }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: sans, fontSize: 14, color: C.textPrimary }}>{student.name}</div>
                    <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{student.email}</div>
                  </div>
                  <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, padding: '2px 8px', background: C.cream, borderRadius: 4 }}>{student.year}</span>
                </label>
              ))}
            </div>
            <div style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginTop: 12 }}>{selectedStudents.size} of {filtered.length} selected</div>
          </div>
        </div>

        {/* Settings */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontFamily: serif, fontSize: 16, color: C.textPrimary, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} style={{ color: C.blue }} /> Exam Window
            </h3>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, display: 'block', marginBottom: 6 }}>Start Date (optional)</label>
              <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14 }} />
              <p style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, marginTop: 4 }}>Leave blank for immediate availability</p>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, display: 'block', marginBottom: 6 }}>Deadline *</label>
              <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14 }} />
            </div>
            <div>
              <label style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, display: 'block', marginBottom: 6 }}>
                <Clock size={14} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} /> Time Limit (minutes, optional)
              </label>
              <input type="number" min={0} placeholder="Untimed" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14 }} />
            </div>
          </div>

          {selectedStudents.size > 0 && (
            <div style={{ background: C.cream, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Eye size={14} style={{ color: C.textMuted }} />
                <span style={{ fontFamily: sans, fontSize: 13, color: C.textMuted }}>Student Preview</span>
              </div>
              <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
                {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} will see this exam in their dashboard with deadline: {deadline ? new Date(deadline).toLocaleString() : 'Not set'}
                {timeLimit ? `, time limit: ${timeLimit} minutes` : ', untimed'}.
              </p>
            </div>
          )}

          <button
            onClick={() => setShowConfirm(true)}
            disabled={selectedStudents.size === 0 || !deadline}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 20px', background: selectedStudents.size > 0 && deadline ? C.blue : C.warmGray,
              color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14,
              cursor: selectedStudents.size > 0 && deadline ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={16} /> Assign to {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontFamily: serif, fontSize: 20, color: C.textPrimary, marginBottom: 12 }}>Confirm Assignment</h3>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, lineHeight: 1.5, marginBottom: 24 }}>
              This will assign the exam to {selectedStudents.size} student{selectedStudents.size !== 1 ? 's' : ''} and send notifications. Students will see it in their Exams tab immediately.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, color: C.textSecondary, fontFamily: sans, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAssign} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: C.blue, color: C.white, fontFamily: sans, cursor: 'pointer' }}>Assign</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
