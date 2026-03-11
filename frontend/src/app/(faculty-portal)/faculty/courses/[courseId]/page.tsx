'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Users, Plus, Edit, Calendar,
  TrendingUp, Activity, Upload, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface Course {
  id: string;
  code: string;
  name: string;
  term: string;
  description: string;
  student_count: number;
  question_count: number;
  status: 'active' | 'archived' | 'draft';
  created_at: string;
  start_date: string;
  end_date: string;
  syllabusStatus: 'none' | 'uploaded' | 'processing' | 'mapping_complete';
  coveragePipelineRan: boolean;
  approvedItemCount: number;
  coveragePercentage: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  questions_completed: number;
  avg_score: number;
  last_activity: string;
}

interface QuestionStat {
  status: string;
  count: number;
  color: string;
}

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.courseId as string;

  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'questions' | 'analytics'>('overview');
  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { fetchCourseData(); }, [id]);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setCourse({
        id: id || '1', code: 'PHARM-501', name: 'Pharmacology I', term: 'Spring 2026',
        description: 'Introduction to pharmacology principles, drug mechanisms, and therapeutic applications. Covers autonomic nervous system, cardiovascular, and CNS pharmacology.',
        student_count: 48, question_count: 156, status: 'active', created_at: '2026-01-15T10:00:00Z',
        start_date: '2026-01-20', end_date: '2026-05-15', syllabusStatus: 'mapping_complete',
        coveragePipelineRan: true, approvedItemCount: 124, coveragePercentage: 80,
      });
      setStudents([
        { id: '1', name: 'Sarah Johnson', email: 'sjohnson@msm.edu', questions_completed: 142, avg_score: 87, last_activity: '2026-02-20T08:30:00Z' },
        { id: '2', name: 'Michael Chen', email: 'mchen@msm.edu', questions_completed: 138, avg_score: 92, last_activity: '2026-02-19T14:20:00Z' },
        { id: '3', name: 'Emily Rodriguez', email: 'erodriguez@msm.edu', questions_completed: 145, avg_score: 85, last_activity: '2026-02-20T09:15:00Z' },
        { id: '4', name: 'David Park', email: 'dpark@msm.edu', questions_completed: 120, avg_score: 78, last_activity: '2026-02-18T16:00:00Z' },
      ]);
      setQuestionStats([
        { status: 'Approved', count: 124, color: C.green },
        { status: 'In Review', count: 18, color: '#fa9d33' },
        { status: 'Draft', count: 14, color: C.textMuted },
      ]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'overview' as const, label: 'Overview', Icon: LayoutDashboard },
    { key: 'roster' as const, label: 'Roster', Icon: Users },
    { key: 'questions' as const, label: 'Questions', Icon: FileText },
    { key: 'analytics' as const, label: 'Analytics', Icon: TrendingUp },
  ];

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString));

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

  const getStatusColor = (status: Course['status']) => {
    switch (status) {
      case 'active': return { bg: 'rgba(105,163,56,0.1)', text: C.green, border: 'rgba(105,163,56,0.2)' };
      case 'draft': return { bg: 'rgba(250,157,51,0.1)', text: '#fa9d33', border: 'rgba(250,157,51,0.2)' };
      case 'archived': return { bg: 'rgba(0,44,118,0.1)', text: C.textMuted, border: 'rgba(0,44,118,0.1)' };
    }
  };

  if (loading) {
    return (
      <>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ width: 80 + i * 10, height: 32, borderRadius: 16, background: C.borderLight, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: C.borderLight, animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ height: 80, borderRadius: 8, background: C.borderLight, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        </div>
        <div style={{ marginTop: 24, height: 48, borderRadius: 8, background: C.borderLight, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </>
    );
  }

  if (error || !course) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.error}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <AlertTriangle size={28} style={{ color: C.error }} />
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>Could not load course details.</h2>
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: '0 0 24px', maxWidth: 400 }}>Please check your connection and try again.</p>
        <button onClick={fetchCourseData} style={{ padding: '10px 24px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  const statusColors = getStatusColor(course.status);

  const getPipelineCTA = () => {
    switch (course.syllabusStatus) {
      case 'none': return { label: 'Upload Syllabus', Icon: Upload, path: `/faculty/courses/${id}/syllabus/upload` };
      case 'uploaded': return { label: 'Process Syllabus', Icon: Activity, path: `/faculty/courses/${id}/syllabus/process` };
      case 'processing': return { label: 'Check Status', Icon: RefreshCw, path: `/faculty/courses/${id}/syllabus/status` };
      case 'mapping_complete': return { label: 'Generate Questions', Icon: Plus, path: `/faculty/courses/${id}/questions/generate` };
      default: return null;
    }
  };

  return (
    <>
      {/* Header Badges + Edit Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.navyDeep, margin: 0 }}>{course.name}</h1>
          <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: C.navyDeep, background: C.parchment, border: `1px solid ${C.border}`, padding: '6px 10px', borderRadius: 6 }}>{course.code}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', background: statusColors.bg, color: statusColors.text, border: `1px solid ${statusColors.border}`, padding: '4px 8px', borderRadius: 4 }}>{course.status}</div>
        </div>
        <button onClick={() => router.push(`/faculty/courses/${id}/edit`)}
          style={{ padding: '10px 18px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.navyDeep, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.color = C.blueMid; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.navyDeep; }}>
          <Edit size={16} /> Edit Course
        </button>
      </div>
      <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, marginBottom: 16 }}>{course.term}</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.borderLight}`, marginBottom: 24 }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: isActive ? `3px solid ${C.greenDark}` : '3px solid transparent', fontFamily: sans, fontSize: 14, fontWeight: isActive ? 700 : 600, color: isActive ? C.navyDeep : C.textSecondary, cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = C.navyDeep; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = C.textSecondary; }}>
              <tab.Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Pipeline CTA */}
      {activeTab === 'overview' && (() => {
        const cta = getPipelineCTA();
        if (!cta) return null;
        return (
          <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Pipeline Status</div>
              <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
                {course.syllabusStatus === 'none' && 'No syllabus uploaded yet'}
                {course.syllabusStatus === 'uploaded' && 'Syllabus uploaded -- processing queued'}
                {course.syllabusStatus === 'processing' && 'Syllabus processing in progress...'}
                {course.syllabusStatus === 'mapping_complete' && 'Syllabus mapped -- ready for generation'}
              </div>
            </div>
            <button onClick={() => router.push(cta.path)}
              style={{ padding: '10px 20px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.greenDark; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = C.green; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <cta.Icon size={16} /> {cta.label}
            </button>
          </div>
        );
      })()}

      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Students', value: course.student_count, icon: <Users size={20} />, color: C.blueMid },
              { label: 'Questions', value: course.question_count, icon: <FileText size={20} />, color: C.green },
              { label: 'Avg Performance', value: '85%', icon: <TrendingUp size={20} />, color: C.navyDeep },
            ].map((stat) => (
              <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>{stat.icon}</div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
            {/* Course Info */}
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, marginBottom: 12 }}>Course Information</h2>
              <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>Description</div>
                  <p style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.6, color: C.textPrimary, margin: 0 }}>{course.description}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 6 }}>Start Date</div>
                    <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} style={{ color: C.blueMid }} /> {formatDate(course.start_date)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 6 }}>End Date</div>
                    <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={16} style={{ color: C.blueMid }} /> {formatDate(course.end_date)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question Stats */}
            <div>
              <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, marginBottom: 12 }}>Question Bank</h2>
              <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24 }}>
                {questionStats.map((stat) => (
                  <div key={stat.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                    <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{stat.status}</div>
                    <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: stat.color }}>{stat.count}</div>
                  </div>
                ))}
                <button onClick={() => router.push(`/faculty/courses/${id}/questions`)}
                  style={{ width: '100%', marginTop: 16, padding: '10px 18px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = C.greenDark; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = C.green; e.currentTarget.style.transform = 'translateY(0)'; }}>
                  View All Questions
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'roster' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Student Roster</h2>
            <button onClick={() => router.push(`/faculty/courses/${id}/roster`)}
              style={{ padding: '8px 16px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Manage Roster
            </button>
          </div>
          <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                  <tr>
                    {['Name', 'Email', 'Questions', 'Avg Score', 'Last Activity'].map((col) => (
                      <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, whiteSpace: 'nowrap' }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} style={{ background: C.white, borderBottom: `1px solid ${C.borderLight}`, cursor: 'pointer', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = C.parchment; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = C.white; }}>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{student.name}</span></td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: mono, fontSize: 12, color: C.textSecondary }}>{student.email}</span></td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.blueMid }}>{student.questions_completed}</span></td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: student.avg_score >= 80 ? C.green : student.avg_score >= 70 ? '#fa9d33' : C.error }}>{student.avg_score}%</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}><span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{formatRelativeTime(student.last_activity)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <FileText size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
          <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>Question Management</h3>
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 24 }}>View and manage all questions for this course</p>
          <button onClick={() => router.push(`/faculty/courses/${id}/questions`)}
            style={{ padding: '10px 24px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer' }}>
            View Question Bank
          </button>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <TrendingUp size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
          <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>Course Analytics</h3>
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 24 }}>View detailed analytics and insights for this course</p>
          <button onClick={() => router.push(`/faculty/courses/${id}/analytics`)}
            style={{ padding: '10px 24px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer' }}>
            View Full Analytics
          </button>
        </div>
      )}
    </>
  );
}
