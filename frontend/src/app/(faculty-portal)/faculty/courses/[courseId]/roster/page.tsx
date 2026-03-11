'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Search, UserPlus, Download, X,
  RefreshCw, AlertTriangle, Users,
} from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Student {
  id: string;
  name: string;
  email: string;
  questions_completed: number;
  avg_score: number;
  last_activity: string;
  enrollment_date: string;
}

export default function CourseRosterPage() {
  const _router = useRouter();
  const params = useParams();
  const id = params.courseId as string;

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [bulkEmails, setBulkEmails] = useState('');
  const [adding, setAdding] = useState(false);

  const courseName = 'Pharmacology I';

  useEffect(() => { fetchStudents(); }, [id]);

  const fetchStudents = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStudents([
        { id: '1', name: 'Sarah Johnson', email: 'sjohnson@msm.edu', questions_completed: 142, avg_score: 87, last_activity: '2026-02-20T08:30:00Z', enrollment_date: '2026-01-20' },
        { id: '2', name: 'Michael Chen', email: 'mchen@msm.edu', questions_completed: 138, avg_score: 92, last_activity: '2026-02-19T14:20:00Z', enrollment_date: '2026-01-20' },
        { id: '3', name: 'Emily Rodriguez', email: 'erodriguez@msm.edu', questions_completed: 145, avg_score: 85, last_activity: '2026-02-20T09:15:00Z', enrollment_date: '2026-01-20' },
        { id: '4', name: 'David Park', email: 'dpark@msm.edu', questions_completed: 120, avg_score: 78, last_activity: '2026-02-18T16:00:00Z', enrollment_date: '2026-01-20' },
        { id: '5', name: 'Jessica Williams', email: 'jwilliams@msm.edu', questions_completed: 135, avg_score: 88, last_activity: '2026-02-19T11:00:00Z', enrollment_date: '2026-01-20' },
        { id: '6', name: 'James Martinez', email: 'jmartinez@msm.edu', questions_completed: 128, avg_score: 82, last_activity: '2026-02-18T15:30:00Z', enrollment_date: '2026-01-20' },
      ]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    setAdding(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('Adding student(s):', addMode === 'single' ? newStudentEmail : bulkEmails);
      setShowAddModal(false);
      setNewStudentEmail('');
      setBulkEmails('');
      fetchStudents();
    } catch (err) {
      console.error('Failed to add student', err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student from the course?')) return;
    setStudents(students.filter((s) => s.id !== studentId));
  };

  const handleExportRoster = () => {
    console.log('Exporting roster...');
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query);
  });

  return (
    <>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.navyDeep, margin: '0 0 4px' }}>Course Roster</h1>
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: 0 }}>{courseName}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportRoster} style={{ padding: '10px 16px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.navyDeep, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} /> Export
          </button>
          <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 18px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} /> Add Students
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Students', value: students.length },
          { label: 'Avg Completion', value: students.length > 0 ? `${Math.round(students.reduce((sum, s) => sum + s.questions_completed, 0) / students.length)}` : '--' },
          { label: 'Avg Score', value: students.length > 0 ? `${Math.round(students.reduce((sum, s) => sum + s.avg_score, 0) / students.length)}%` : '--' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 16 }}>
            <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>{stat.label}</div>
            <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: C.navyDeep }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input type="search" placeholder="Search students by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px 0 44px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none' }} />
        </div>
      </div>

      {/* Student Table */}
      <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ height: 56, background: C.borderLight, borderRadius: 6, marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.error}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <AlertTriangle size={24} style={{ color: C.error }} />
            </div>
            <h3 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>Could not load roster</h3>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted, margin: '0 0 20px', maxWidth: 360 }}>Please check your connection and try again.</p>
            <button onClick={fetchStudents} style={{ padding: '10px 20px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: `${C.blueMid}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users size={24} style={{ color: C.blueMid }} />
            </div>
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>
              {searchQuery ? 'No students match your search' : 'No students enrolled'}
            </h3>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, margin: '0 0 20px', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
              {searchQuery ? 'Try adjusting your search terms.' : 'Add students via email invitation to get started.'}
            </p>
            {!searchQuery && (
              <button onClick={() => setShowAddModal(true)}
                style={{ padding: '10px 20px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <UserPlus size={16} /> Add Students
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                <tr>
                  {['Name', 'Email', 'Questions', 'Avg Score', 'Last Activity', 'Actions'].map((col) => (
                    <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, whiteSpace: 'nowrap' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} style={{ background: C.white, borderBottom: `1px solid ${C.borderLight}`, transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = C.parchment; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{student.name}</span></td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: mono, fontSize: 12, color: C.textSecondary }}>{student.email}</span></td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.blueMid }}>{student.questions_completed}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: student.avg_score >= 80 ? C.green : student.avg_score >= 70 ? '#fa9d33' : C.error }}>{student.avg_score}%</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{formatRelativeTime(student.last_activity)}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <button onClick={() => handleRemoveStudent(student.id)}
                        style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.error, cursor: 'pointer', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = `${C.error}10`; e.currentTarget.style.borderColor = C.error; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; }}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: C.white, borderRadius: 16, padding: 32, width: 480, maxWidth: '90vw', position: 'relative' }}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 20 }}>Add Students</h2>

            <div style={{ display: 'flex', gap: 4, background: C.parchment, borderRadius: 8, padding: 4, marginBottom: 20, border: `1px solid ${C.border}` }}>
              {(['single', 'bulk'] as const).map((m) => (
                <button key={m} onClick={() => setAddMode(m)}
                  style={{ flex: 1, padding: '8px 16px', background: addMode === m ? C.navyDeep : 'transparent', border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 13, fontWeight: 600, color: addMode === m ? C.white : C.textSecondary, cursor: 'pointer' }}>
                  {m === 'single' ? 'Single Email' : 'Bulk Import'}
                </button>
              ))}
            </div>

            {addMode === 'single' ? (
              <input type="email" placeholder="student@msm.edu" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)}
                style={{ width: '100%', height: 44, background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0 16px', fontFamily: sans, fontSize: 15, color: C.ink, outline: 'none', marginBottom: 20 }} />
            ) : (
              <textarea placeholder="Paste email addresses, one per line..." value={bulkEmails} onChange={(e) => setBulkEmails(e.target.value)} rows={6}
                style={{ width: '100%', background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 16px', fontFamily: mono, fontSize: 13, color: C.ink, outline: 'none', resize: 'vertical', marginBottom: 20 }} />
            )}

            <button onClick={handleAddStudent} disabled={adding}
              style={{ width: '100%', padding: '12px 24px', background: adding ? C.textMuted : C.green, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: adding ? 'not-allowed' : 'pointer' }}>
              {adding ? 'Sending Invitations...' : 'Send Invitation'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
