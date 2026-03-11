'use client';

import { useRouter } from 'next/navigation';
import {
  BookOpen, FileText, Users, Plus,
  ClipboardCheck, AlertTriangle, Sparkles,
  CheckCircle2, Award, RefreshCw,
} from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useFacultyDashboard } from '@/hooks/useDashboard';

interface Course {
  id: string;
  code: string;
  name: string;
  term: string;
  student_count: number;
  question_count: number;
  last_activity: string;
  status: 'active' | 'archived' | 'draft';
}

interface ActivityItemBase {
  id: string;
  text: string;
  description?: string;
  course_name?: string;
  time: string;
}

type ActivityItem =
  | (ActivityItemBase & { type: 'generated' })
  | (ActivityItemBase & { type: 'review' })
  | (ActivityItemBase & { type: 'alert' })
  | (ActivityItemBase & { type: 'student' })
  | (ActivityItemBase & { type: 'completed' })
  | (ActivityItemBase & { type: 'milestone' });

export default function FacultyPortalDashboard() {
  const router = useRouter();
  const { data, isLoading: loading, error: queryError, refetch } = useFacultyDashboard();
  const error = !!queryError;

  // Map API response to local display types
  const courses: Course[] = (data?.courses ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    name: c.title,
    term: c.academic_year ?? '',
    student_count: 0, // enrollment data not yet available
    question_count: c.item_count,
    last_activity: '',
    status: 'active' as const,
  }));

  const recentActivity: ActivityItem[] = (data?.activity ?? []).map((a) => ({
    id: a.id,
    type: 'generated' as const,
    text: a.stem ?? `Item ${a.status}`,
    course_name: a.course_code ?? undefined,
    time: new Date(a.created_at).toLocaleDateString(),
  }));

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'generated': return <Sparkles size={16} />;
      case 'review': return <ClipboardCheck size={16} />;
      case 'alert': return <AlertTriangle size={16} />;
      case 'student': return <Users size={16} />;
      case 'completed': return <CheckCircle2 size={16} />;
      case 'milestone': return <Award size={16} />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'generated': return C.navyDeep;
      case 'review': return C.blueMid;
      case 'alert': return '#fa9d33';
      case 'student': return C.blueMid;
      case 'completed': return C.green;
      case 'milestone': return C.greenDark;
    }
  };

  const activeCourses = courses.filter((c) => c.status === 'active');
  const totalStudents = data?.metrics.totalStudents ?? activeCourses.reduce((sum, c) => sum + c.student_count, 0);
  const totalQuestions = data?.metrics.totalQuestions ?? activeCourses.reduce((sum, c) => sum + c.question_count, 0);

  if (loading) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ background: C.borderLight, borderRadius: 8, height: 80, animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[1, 2].map((i) => (
            <div key={i} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20 }}>
              <div style={{ background: C.borderLight, borderRadius: 4, height: 16, width: '40%', marginBottom: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ background: C.borderLight, borderRadius: 4, height: 20, width: '70%', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.error}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <AlertTriangle size={28} style={{ color: C.error }} />
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>Could not load your dashboard.</h2>
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: '0 0 24px', maxWidth: 400 }}>Please check your connection and try again.</p>
        <button onClick={() => refetch()} style={{ padding: '10px 24px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: `${C.navyDeep}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <BookOpen size={36} style={{ color: C.navyDeep }} />
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>You have not created any courses yet.</h2>
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: '0 0 24px', maxWidth: 400 }}>Create your first course to start generating assessment items with Journey OS.</p>
        <button onClick={() => router.push('/faculty/courses/create')} style={{ padding: '12px 28px', background: C.green, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Plus size={18} /> Create your first course
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Courses', value: activeCourses.length, icon: <BookOpen size={20} />, color: C.navyDeep },
          { label: 'Total Students', value: totalStudents, icon: <Users size={20} />, color: C.blueMid },
          { label: 'Question Bank', value: totalQuestions, icon: <FileText size={20} />, color: C.green },
        ].map((stat) => (
          <div key={stat.label} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* My Courses */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: 0 }}>My Courses</h2>
          <button onClick={() => router.push('/faculty/courses')} style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.blueMid, background: 'none', border: 'none', cursor: 'pointer' }}>View All &rarr;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {activeCourses.map((course) => (
            <button key={course.id} onClick={() => router.push(`/faculty/courses/${course.id}`)} style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,44,118,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 8 }}>{course.code}</div>
              <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: '0 0 4px' }}>{course.name}</h3>
              <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, margin: '0 0 16px' }}>{course.term}</p>
              <div style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 6, padding: 12, display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 2 }}>Students</div>
                  <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.blueMid }}>{course.student_count}</div>
                </div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 2 }}>Questions</div>
                  <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.green }}>{course.question_count}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, marginBottom: 12 }}>Recent Activity</h2>
        <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24 }}>
          {recentActivity.map((activity, index) => (
            <div key={activity.id} style={{ display: 'flex', gap: 16, paddingBottom: 16, marginBottom: index < recentActivity.length - 1 ? 16 : 0, borderBottom: index < recentActivity.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${getActivityColor(activity.type)}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: getActivityColor(activity.type), flexShrink: 0 }}>
                {getActivityIcon(activity.type)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: '0 0 4px' }}>{activity.text}</p>
                {activity.description && <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{activity.description}</div>}
                <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{activity.course_name} &bull; {activity.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
