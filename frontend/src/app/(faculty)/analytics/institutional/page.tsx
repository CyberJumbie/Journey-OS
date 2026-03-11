'use client';

import { useState, useEffect } from 'react';
import { Users, BookOpen, FileText, Award, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { C, sans, serif, mono } from '@/lib/design-tokens';

interface DepartmentMetrics {
  name: string;
  questions: number;
  coverage: number;
  quality: number;
}

interface FacultyPerformance {
  name: string;
  questions: number;
  quality_score: number;
  approval_rate: number;
}

export default function InstitutionalAnalytics() {
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
  const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetrics[]>([]);
  const [facultyPerformance, setFacultyPerformance] = useState<FacultyPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => { fetchAnalytics(); }, [timePeriod]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setDepartmentMetrics([
        { name: 'Basic Sciences', questions: 425, coverage: 82, quality: 0.89 },
        { name: 'Clinical Sciences', questions: 378, coverage: 74, quality: 0.85 },
        { name: 'Pathology', questions: 215, coverage: 79, quality: 0.88 },
        { name: 'Pharmacology', questions: 142, coverage: 68, quality: 0.84 },
        { name: 'Microbiology', questions: 87, coverage: 71, quality: 0.86 },
      ]);
      setFacultyPerformance([
        { name: 'Dr. Sarah Chen', questions: 145, quality_score: 0.92, approval_rate: 89 },
        { name: 'Dr. Michael Torres', questions: 128, quality_score: 0.88, approval_rate: 85 },
        { name: 'Dr. Emily Johnson', questions: 112, quality_score: 0.90, approval_rate: 87 },
        { name: 'Dr. James Wilson', questions: 98, quality_score: 0.86, approval_rate: 82 },
        { name: 'Dr. Lisa Anderson', questions: 87, quality_score: 0.91, approval_rate: 88 },
      ]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const institutionMetrics = {
    total_questions: 1247,
    total_courses: 28,
    active_faculty: 45,
    approval_rate: 82,
  };

  return (
    <>
      {/* Time period filter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <button key={period} onClick={() => setTimePeriod(period)}
              style={{ padding: '8px 16px', background: timePeriod === period ? C.navyDeep : C.white, border: `1px solid ${timePeriod === period ? C.navyDeep : C.border}`, borderRadius: 6, fontFamily: mono, fontSize: 10, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: timePeriod === period ? C.white : C.textPrimary, cursor: 'pointer' }}>
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Questions', value: institutionMetrics.total_questions, icon: <FileText size={20} />, color: C.blueMid },
          { label: 'Active Courses', value: institutionMetrics.total_courses, icon: <BookOpen size={20} />, color: C.green },
          { label: 'Faculty Members', value: institutionMetrics.active_faculty, icon: <Users size={20} />, color: C.navyDeep },
          { label: 'Approval Rate', value: `${institutionMetrics.approval_rate}%`, icon: <Award size={20} />, color: C.warning },
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
        {loading ? (
          <>
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, height: 400, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, height: 400, animation: 'pulse 1.5s ease-in-out infinite' }} />
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
          </>
        ) : error ? (
          <div style={{ gridColumn: '1 / -1', background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 64, textAlign: 'center' }}>
            <AlertTriangle size={48} style={{ color: C.error, marginBottom: 16 }} />
            <h3 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, marginBottom: 8 }}>Failed to load analytics</h3>
            <p style={{ fontFamily: sans, fontSize: 15, color: C.textSecondary, marginBottom: 16 }}>Something went wrong. Please try again.</p>
            <button onClick={fetchAnalytics} style={{ padding: '10px 20px', background: C.blueMid, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={16} /> Retry
            </button>
          </div>
        ) : (
          <>
            {/* Department Performance */}
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Department Performance</h2>
                <button style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Download size={14} /> Export
                </button>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {departmentMetrics.map((dept) => (
                    <div key={dept.name} style={{ background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <h3 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navyDeep, margin: 0 }}>{dept.name}</h3>
                        <div style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.textMuted }}>{dept.questions} questions</div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                        <div>
                          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Coverage</div>
                          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: dept.coverage >= 75 ? C.green : C.warning }}>{dept.coverage}%</div>
                        </div>
                        <div>
                          <div style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>Quality Score</div>
                          <div style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: dept.quality >= 0.85 ? C.green : C.warning }}>{Math.round(dept.quality * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Faculty Leaderboard */}
            <div style={{ background: C.white, border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: 24, borderBottom: `1px solid ${C.borderLight}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Award size={20} style={{ color: C.warning }} />
                  <h2 style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Top Contributors</h2>
                </div>
              </div>
              <div>
                {facultyPerformance.map((faculty, index) => (
                  <div key={faculty.name} style={{ padding: '20px 24px', borderBottom: index < facultyPerformance.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: index === 0 ? C.warning : C.navyDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.white, flexShrink: 0 }}>{index + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{faculty.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{faculty.questions} questions</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontFamily: mono, fontSize: 11 }}>
                      <span style={{ color: C.green }}>Quality: {Math.round(faculty.quality_score * 100)}%</span>
                      <span style={{ color: C.textMuted }}>&middot;</span>
                      <span style={{ color: C.blueMid }}>Approval: {faculty.approval_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
