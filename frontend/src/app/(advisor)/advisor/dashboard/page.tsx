'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Users, AlertTriangle, TrendingUp, TrendingDown, Target, Search,
  ArrowUpDown, Eye, FileText, Activity, RefreshCw, AlertCircle,
} from 'lucide-react';
import { C, sans, mono } from '@/lib/design-tokens';

interface Student {
  id: string; name: string; year: string; courses: string[];
  overall_mastery: number; mastery_trend: 'rising' | 'declining' | 'stable';
  accuracy_pct: number; streak_days: number; at_risk: boolean;
  at_risk_weeks?: number; last_active: string; weakest_area: string;
}

interface CohortKPIs {
  total_students: number; avg_mastery_pct: number; at_risk_count: number;
  avg_accuracy_pct: number; mastery_change_pct: number;
}

const MOCK_KPIS: CohortKPIs = { total_students: 24, avg_mastery_pct: 64, at_risk_count: 5, avg_accuracy_pct: 71, mastery_change_pct: 2.3 };

const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'Amara Johnson', year: 'M1', courses: ['Pharmacology', 'Anatomy'], overall_mastery: 68, mastery_trend: 'rising', accuracy_pct: 74, streak_days: 12, at_risk: false, last_active: '2 hours ago', weakest_area: 'Renal Pharmacology' },
  { id: 's2', name: 'Marcus Williams', year: 'M1', courses: ['Pharmacology', 'Biochemistry'], overall_mastery: 54, mastery_trend: 'declining', accuracy_pct: 58, streak_days: 3, at_risk: true, at_risk_weeks: 3, last_active: '1 day ago', weakest_area: 'Drug Metabolism' },
  { id: 's3', name: 'Priya Patel', year: 'M2', courses: ['Pathology', 'Microbiology'], overall_mastery: 82, mastery_trend: 'rising', accuracy_pct: 86, streak_days: 28, at_risk: false, last_active: '5 hours ago', weakest_area: 'Viral Immunology' },
  { id: 's4', name: 'David Osei', year: 'M2', courses: ['Pathology'], overall_mastery: 41, mastery_trend: 'declining', accuracy_pct: 44, streak_days: 0, at_risk: true, at_risk_weeks: 4, last_active: '2 weeks ago', weakest_area: 'Cell Injury' },
  { id: 's5', name: 'Keisha Brown', year: 'M1', courses: ['Pharmacology', 'Anatomy', 'Biochemistry'], overall_mastery: 72, mastery_trend: 'stable', accuracy_pct: 76, streak_days: 8, at_risk: false, last_active: '3 hours ago', weakest_area: 'Autonomic Pharmacology' },
  { id: 's6', name: 'James Liu', year: 'M2', courses: ['Pathology', 'Microbiology'], overall_mastery: 48, mastery_trend: 'declining', accuracy_pct: 52, streak_days: 1, at_risk: true, at_risk_weeks: 2, last_active: '1 day ago', weakest_area: 'Inflammatory Mediators' },
];

function TrendBadge({ trend }: { trend: Student['mastery_trend'] }) {
  if (trend === 'rising') return <TrendingUp size={14} style={{ color: C.green }} />;
  if (trend === 'declining') return <TrendingDown size={14} style={{ color: C.error }} />;
  return <Activity size={14} style={{ color: C.textMuted }} />;
}

function KPICard({ label, value, icon, color, sub, subColor }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ padding: '18px 20px', background: C.white, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.textMuted }}>{label}</span>
      </div>
      <p style={{ fontFamily: sans, fontSize: 28, fontWeight: 700, color: C.textPrimary, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontFamily: sans, fontSize: 12, color: subColor || C.textMuted, marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

type SortKey = 'name' | 'mastery' | 'at-risk';

export default function AdvisorDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<'cohort' | 'at-risk'>(tabParam === 'at-risk' ? 'at-risk' : 'cohort');
  const [kpis, setKpis] = useState<CohortKPIs | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('mastery');

  useEffect(() => {
    (async () => {
      setLoading(true); setError(false);
      await new Promise((r) => setTimeout(r, 600));
      setKpis(MOCK_KPIS); setStudents(MOCK_STUDENTS); setLoading(false);
    })();
  }, []);

  const handleTabChange = (next: 'cohort' | 'at-risk') => {
    setTab(next);
  };

  const visibleStudents = students
    .filter((s) => {
      if (tab === 'at-risk' && !s.at_risk) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'mastery') return a.overall_mastery - b.overall_mastery;
      if (sortKey === 'at-risk') return (b.at_risk ? 1 : 0) - (a.at_risk ? 1 : 0) || a.overall_mastery - b.overall_mastery;
      return a.name.localeCompare(b.name);
    });

  if (loading) {
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 88, background: C.warmGray, borderRadius: 12, opacity: 0.45 }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 80, background: C.warmGray, borderRadius: 10, opacity: 0.35 }} className="animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        <AlertCircle size={32} style={{ color: C.error }} />
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textPrimary }}>Couldn&apos;t load cohort data.</p>
        <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 14, cursor: 'pointer', color: C.textPrimary }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => router.push('/advisor/lcme-report')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: C.navyDeep, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 13, cursor: 'pointer' }}>
          <FileText size={14} /> Generate Report
        </button>
      </div>

      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 32 }}>
          <KPICard label="Total Students" value={kpis.total_students} icon={<Users size={18} />} color={C.blue} />
          <KPICard label="Avg Mastery" value={`${kpis.avg_mastery_pct}%`} icon={<Target size={18} />} color={C.green} sub={`${kpis.mastery_change_pct > 0 ? '+' : ''}${kpis.mastery_change_pct}% this week`} subColor={kpis.mastery_change_pct >= 0 ? C.green : C.error} />
          <KPICard label="At-Risk Students" value={kpis.at_risk_count} icon={<AlertTriangle size={18} />} color={C.error} />
          <KPICard label="Avg Accuracy" value={`${kpis.avg_accuracy_pct}%`} icon={<TrendingUp size={18} />} color={C.blue} />
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.borderLight}`, marginBottom: 20 }}>
        {(['cohort', 'at-risk'] as const).map((t) => {
          const isActive = tab === t;
          const label = t === 'cohort' ? 'All Students' : `At-Risk (${students.filter((s) => s.at_risk).length})`;
          return (
            <button key={t} onClick={() => handleTabChange(t)} style={{
              padding: '10px 20px', fontFamily: sans, fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? C.navyDeep : C.textMuted, background: 'none',
              borderTop: 'none', borderRight: 'none', borderLeft: 'none',
              borderBottom: isActive ? `2px solid ${C.navyDeep}` : '2px solid transparent',
              cursor: 'pointer', marginBottom: -2,
            }}>{label}</button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: C.white }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={14} style={{ color: C.textMuted }} />
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{ padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white, cursor: 'pointer' }}>
            <option value="mastery">Sort by Mastery (lowest first)</option>
            <option value="at-risk">Sort by At-Risk first</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {visibleStudents.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 48 }}>
          <Users size={32} style={{ color: C.textMuted }} />
          <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>
            {tab === 'at-risk' ? 'No at-risk students detected -- great news!' : 'No students match your search.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleStudents.map((student) => (
          <div
            key={student.id}
            onClick={() => router.push(`/advisor/students/${student.id}`)}
            style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '16px 20px',
              background: C.white, border: `1px solid ${student.at_risk ? `${C.error}30` : C.border}`,
              borderRadius: 10, cursor: 'pointer', transition: 'box-shadow 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,44,118,0.06)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: student.at_risk ? `${C.error}12` : `${C.blue}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 12, fontWeight: 600, color: student.at_risk ? C.error : C.blue, flexShrink: 0 }}>
                  {student.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>{student.name}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: mono, fontSize: 11, color: C.textMuted }}>{student.year}</span>
                    <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{student.courses.join(', ')}</span>
                  </div>
                </div>
              </div>
              {student.at_risk && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${C.error}10`, marginTop: 4 }}>
                  <AlertTriangle size={12} style={{ color: C.error }} />
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.error }}>At-Risk &middot; {student.at_risk_weeks}w declining</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 260 }}>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginBottom: 2, letterSpacing: '0.04em' }}>MASTERY</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 700, color: student.overall_mastery < 50 ? C.error : C.textPrimary }}>{student.overall_mastery}%</span>
                  <TrendBadge trend={student.mastery_trend} />
                </div>
              </div>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginBottom: 2, letterSpacing: '0.04em' }}>ACCURACY</p>
                <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 700, color: C.textPrimary }}>{student.accuracy_pct}%</span>
              </div>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginBottom: 2, letterSpacing: '0.04em' }}>STREAK</p>
                <span style={{ fontFamily: sans, fontSize: 18, fontWeight: 700, color: student.streak_days > 0 ? C.green : C.textMuted }}>{student.streak_days}d</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Eye size={16} style={{ color: C.textMuted }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
