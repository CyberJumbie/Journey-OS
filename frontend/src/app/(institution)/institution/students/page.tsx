'use client';

import { useState, useEffect } from 'react';
import { Search, AlertCircle, RefreshCw, Users, GraduationCap } from 'lucide-react';
import { C, sans, serif, mono, ProgressBar } from '@/lib/design-tokens';

interface InstitutionStudent {
  id: string;
  name: string;
  email: string;
  student_id: string;
  year_level: string;
  enrolled_courses: string[];
  assigned_advisor: string | null;
  practice_session_count: number;
  overall_mastery: number | null;
  last_activity: string | null;
  status: 'active' | 'on_leave' | 'withdrawn';
}

interface Summary {
  m1_count: number;
  m2_count: number;
  avg_mastery: number | null;
  at_risk_count: number;
}

const PHASE_5_LAUNCHED = false;

const MOCK_STUDENTS: InstitutionStudent[] = [
  { id: 's1', name: 'Amara Johnson', email: 'ajohnson@msm.edu', student_id: 'MSM-2026-001', year_level: 'M1', enrolled_courses: ['PHARM-601', 'ANAT-401'], assigned_advisor: 'Dr. Williams', practice_session_count: 12, overall_mastery: 0.68, last_activity: '2 hours ago', status: 'active' },
  { id: 's2', name: 'Marcus Williams', email: 'mwilliams@msm.edu', student_id: 'MSM-2026-002', year_level: 'M1', enrolled_courses: ['PHARM-601', 'BIOC-301'], assigned_advisor: 'Dr. Williams', practice_session_count: 8, overall_mastery: 0.54, last_activity: '1 day ago', status: 'active' },
  { id: 's3', name: 'Priya Patel', email: 'ppatel@msm.edu', student_id: 'MSM-2025-015', year_level: 'M2', enrolled_courses: ['PATH-501', 'MICRO-501'], assigned_advisor: 'Dr. Thompson', practice_session_count: 24, overall_mastery: 0.82, last_activity: '5 hours ago', status: 'active' },
  { id: 's4', name: 'David Osei', email: 'dosei@msm.edu', student_id: 'MSM-2025-018', year_level: 'M2', enrolled_courses: ['PATH-501'], assigned_advisor: 'Dr. Thompson', practice_session_count: 3, overall_mastery: 0.41, last_activity: '2 weeks ago', status: 'active' },
  { id: 's5', name: 'Keisha Brown', email: 'kbrown@msm.edu', student_id: 'MSM-2026-009', year_level: 'M1', enrolled_courses: ['PHARM-601', 'ANAT-401', 'BIOC-301'], assigned_advisor: null, practice_session_count: 0, overall_mastery: null, last_activity: null, status: 'active' },
  { id: 's6', name: 'James Liu', email: 'jliu@msm.edu', student_id: 'MSM-2025-022', year_level: 'M2', enrolled_courses: ['PATH-501', 'MICRO-501'], assigned_advisor: 'Dr. Thompson', practice_session_count: 19, overall_mastery: 0.74, last_activity: '1 day ago', status: 'on_leave' },
];

const MOCK_SUMMARY: Summary = { m1_count: 82, m2_count: 76, avg_mastery: 0.63, at_risk_count: 14 };

function StatusBadge({ status }: { status: InstitutionStudent['status'] }) {
  const config = {
    active:    { bg: `${C.green}14`, color: C.green,  label: 'Active' },
    on_leave:  { bg: `${C.warning}14`, color: C.warning, label: 'On Leave' },
    withdrawn: { bg: `${C.error}14`, color: C.error,  label: 'Withdrawn' },
  }[status];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontFamily: mono, fontSize: 10, fontWeight: 600, background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div style={{ padding: '14px 16px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <p style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: sans, fontSize: 22, fontWeight: 700, color: highlight ? C.error : C.textPrimary, margin: 0 }}>{value}</p>
    </div>
  );
}

export default function InstitutionStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [students, setStudents] = useState<InstitutionStudent[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      await new Promise((r) => setTimeout(r, 600));
      if (PHASE_5_LAUNCHED) {
        setStudents(MOCK_STUDENTS);
        setSummary(MOCK_SUMMARY);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = students.filter((s) => {
    if (yearFilter !== 'all' && s.year_level !== yearFilter) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.student_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 72, background: C.warmGray, borderRadius: 10, opacity: 0.5 }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 52, background: C.warmGray, borderRadius: 8, opacity: 0.4 }} className="animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        <AlertCircle size={32} style={{ color: C.error }} />
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textPrimary }}>Couldn&apos;t load students.</p>
        <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 14, cursor: 'pointer', color: C.textPrimary }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!PHASE_5_LAUNCHED) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: `${C.blue}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GraduationCap size={32} style={{ color: C.blue }} />
        </div>
        <h3 style={{ fontFamily: serif, fontSize: 20, color: C.textPrimary, margin: 0 }}>Student Enrollment Coming Soon</h3>
        <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, textAlign: 'center', maxWidth: 440, lineHeight: 1.6 }}>
          Student enrollment is not yet active. Students will appear here once Phase 5 launches
          and they register. You can continue building your item bank and assembling exams
          in the meantime.
        </p>
      </div>
    );
  }

  return (
    <>
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
          <SummaryCard label="M1 Students" value={summary.m1_count} />
          <SummaryCard label="M2 Students" value={summary.m2_count} />
          <SummaryCard label="Avg Mastery" value={summary.avg_mastery !== null ? `${Math.round(summary.avg_mastery * 100)}%` : '\u2014'} />
          <SummaryCard label="At Risk" value={summary.at_risk_count} highlight />
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: C.white }} />
        </div>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={{ padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white, cursor: 'pointer' }}>
          <option value="all">All Years</option>
          <option value="M1">M1</option>
          <option value="M2">M2</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white, cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 48 }}>
          <Users size={32} style={{ color: C.textMuted }} />
          <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>
            {search ? `No students match '${search}'.` : 'No students enrolled yet.'}
          </p>
          {search && (
            <button onClick={() => setSearch('')} style={{ fontFamily: sans, fontSize: 13, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear search
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <thead>
              <tr>
                {['Name', 'ID', 'Year', 'Courses', 'Advisor', 'Mastery', 'Sessions', 'Status'].map((h) => (
                  <th key={h} style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted, textAlign: 'left', padding: '8px 12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} style={{ background: C.white }}>
                  <td style={{ padding: '12px 12px', fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}`, borderLeft: `1px solid ${C.borderLight}`, borderRadius: '8px 0 0 8px' }}>
                    {s.name}<br />
                    <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 400, color: C.textMuted }}>{s.email}</span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: mono, fontSize: 12, color: C.textSecondary, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>{s.student_id}</td>
                  <td style={{ padding: '12px', fontFamily: mono, fontSize: 12, color: C.textSecondary, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>{s.year_level}</td>
                  <td style={{ padding: '12px', fontFamily: sans, fontSize: 12, color: C.textSecondary, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>{s.enrolled_courses.join(', ')}</td>
                  <td style={{ padding: '12px', fontFamily: sans, fontSize: 12, color: s.assigned_advisor ? C.textSecondary : C.textMuted, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>{s.assigned_advisor ?? 'Unassigned'}</td>
                  <td style={{ padding: '12px', borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>
                    {s.overall_mastery !== null ? (
                      <div style={{ width: 60 }}>
                        <span style={{ fontFamily: mono, fontSize: 12, color: C.textPrimary }}>{Math.round(s.overall_mastery * 100)}%</span>
                        <ProgressBar value={s.overall_mastery * 100} max={100} height={4} />
                      </div>
                    ) : (
                      <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{'\u2014'}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', fontFamily: mono, fontSize: 12, color: C.textSecondary, borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}` }}>{s.practice_session_count}</td>
                  <td style={{ padding: '12px', borderTop: `1px solid ${C.borderLight}`, borderBottom: `1px solid ${C.borderLight}`, borderRight: `1px solid ${C.borderLight}`, borderRadius: '0 8px 8px 0' }}>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
