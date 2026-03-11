'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, AlertTriangle, TrendingDown, TrendingUp, Activity,
  BookOpen, Mail, RefreshCw, AlertCircle, Zap,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { C, sans, serif, mono, ProgressBar } from '@/lib/design-tokens';

interface StudentProfile {
  id: string; name: string; email: string; year: string;
  courses: { id: string; name: string }[]; streak_days: number;
  overall_mastery: number; accuracy_pct: number;
  mastery_trend: 'rising' | 'declining' | 'stable';
  at_risk: boolean; at_risk_weeks?: number;
  total_sessions: number; last_active: string;
}

interface TrajectoryPoint { day: string; mastery: number; threshold?: number; }
interface RootCause { id: string; subconcept: string; mastery_pct: number; downstream_failures: number; is_prerequisite_of: string[]; impact_score: number; }
interface Intervention { id: string; subconcept: string; reason: string; estimated_impact: 'high' | 'medium' | 'low'; practice_url: string; }

const MOCK_STUDENT: StudentProfile = {
  id: 's2', name: 'Marcus Williams', email: 'mwilliams@msm.edu', year: 'M1',
  courses: [{ id: 'c1', name: 'Principles of Pharmacology' }, { id: 'c4', name: 'Medical Biochemistry' }],
  streak_days: 3, overall_mastery: 54, accuracy_pct: 58, mastery_trend: 'declining',
  at_risk: true, at_risk_weeks: 3, total_sessions: 8, last_active: '1 day ago',
};

const MOCK_TRAJECTORY: TrajectoryPoint[] = [
  { day: 'Feb 8', mastery: 62 }, { day: 'Feb 15', mastery: 64 }, { day: 'Feb 22', mastery: 61 },
  { day: 'Mar 1', mastery: 58 }, { day: 'Mar 8', mastery: 55 }, { day: 'Mar 15', mastery: 53 },
  { day: 'Mar 22', mastery: 51 }, { day: 'Mar 29', mastery: 54 },
].map((p) => ({ ...p, threshold: 60 }));

const MOCK_ROOT_CAUSES: RootCause[] = [
  { id: 'rc1', subconcept: 'Phase I Metabolism (CYP450)', mastery_pct: 28, downstream_failures: 12, is_prerequisite_of: ['Drug Interactions', 'Prodrug Activation', 'First-Pass Effect'], impact_score: 0.92 },
  { id: 'rc2', subconcept: 'Receptor Binding Kinetics', mastery_pct: 35, downstream_failures: 8, is_prerequisite_of: ['Dose-Response Curves', 'Competitive Antagonism'], impact_score: 0.78 },
  { id: 'rc3', subconcept: 'Renal Tubular Secretion', mastery_pct: 42, downstream_failures: 5, is_prerequisite_of: ['Drug Clearance', 'Dosage Adjustment'], impact_score: 0.65 },
];

const MOCK_INTERVENTIONS: Intervention[] = [
  { id: 'i1', subconcept: 'Phase I Metabolism (CYP450)', reason: 'Foundational gap causing 12 downstream failures in Drug Interactions and Prodrug Activation', estimated_impact: 'high', practice_url: '/student/practice?focus=cyp450' },
  { id: 'i2', subconcept: 'Receptor Binding Kinetics', reason: 'Prerequisite for Dose-Response Curves -- mastering this unlocks 2 downstream concepts', estimated_impact: 'high', practice_url: '/student/practice?focus=receptor-kinetics' },
  { id: 'i3', subconcept: 'Renal Tubular Secretion', reason: 'Low mastery impacting Drug Clearance understanding', estimated_impact: 'medium', practice_url: '/student/practice?focus=renal-secretion' },
];

function MiniStat({ label, value, color, icon }: { label: string; value: string | number; color: string; icon?: React.ReactNode }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 56 }}>
      <p style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginBottom: 2, letterSpacing: '0.04em' }}>{label.toUpperCase()}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
        <span style={{ fontFamily: sans, fontSize: 20, fontWeight: 700, color }}>{value}</span>
        {icon}
      </div>
    </div>
  );
}

function ImpactBadge({ impact }: { impact: Intervention['estimated_impact'] }) {
  const config = {
    high:   { bg: `${C.error}12`, color: C.error, label: 'High Impact' },
    medium: { bg: `${C.warning}12`, color: C.warning, label: 'Medium' },
    low:    { bg: `${C.blue}10`, color: C.blue, label: 'Low' },
  }[impact];
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontFamily: mono, fontSize: 10, fontWeight: 600, background: config.bg, color: config.color }}>
      {config.label}
    </span>
  );
}

export default function AdvisorStudentDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [rootCauses, setRootCauses] = useState<RootCause[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [flagSent, setFlagSent] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(false);
      await new Promise((r) => setTimeout(r, 700));
      setStudent(MOCK_STUDENT); setTrajectory(MOCK_TRAJECTORY);
      setRootCauses(MOCK_ROOT_CAUSES); setInterventions(MOCK_INTERVENTIONS);
      setLoading(false);
    })();
  }, [id]);

  const handleFlag = () => { setFlagSent(true); setTimeout(() => setFlagSent(false), 3000); };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ height: 120, background: C.warmGray, borderRadius: 12, opacity: 0.45 }} className="animate-pulse" />
        <div style={{ height: 280, background: C.warmGray, borderRadius: 12, opacity: 0.35 }} className="animate-pulse" />
        <div style={{ height: 200, background: C.warmGray, borderRadius: 12, opacity: 0.3 }} className="animate-pulse" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        <AlertCircle size={32} style={{ color: C.error }} />
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textPrimary }}>Couldn&apos;t load student data.</p>
        <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 14, cursor: 'pointer', color: C.textPrimary }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const TrendIcon = student.mastery_trend === 'declining' ? TrendingDown : student.mastery_trend === 'rising' ? TrendingUp : Activity;
  const trendColor = student.mastery_trend === 'declining' ? C.error : student.mastery_trend === 'rising' ? C.green : C.textMuted;

  return (
    <>
      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => router.push('/advisor/dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', background: 'none', border: 'none', fontFamily: sans, fontSize: 13, color: C.textMuted, cursor: 'pointer' }}>
          <ArrowLeft size={14} /> Back to Cohort
        </button>
        <button onClick={handleFlag} disabled={flagSent} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
          background: flagSent ? `${C.green}10` : `${C.error}08`, color: flagSent ? C.green : C.error,
          border: `1px solid ${flagSent ? C.green : C.error}30`, borderRadius: 8, fontFamily: sans, fontSize: 13,
          cursor: flagSent ? 'default' : 'pointer',
        }}>
          <Mail size={14} /> {flagSent ? 'Flagged -- Notification Sent' : 'Flag for Faculty Review'}
        </button>
      </div>

      {/* Profile Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, padding: '20px 24px', background: C.white, border: `1px solid ${student.at_risk ? `${C.error}30` : C.border}`, borderRadius: 12, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: student.at_risk ? `${C.error}12` : `${C.blue}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 16, fontWeight: 600, color: student.at_risk ? C.error : C.blue }}>
              {student.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p style={{ fontFamily: sans, fontSize: 18, fontWeight: 600, color: C.textPrimary, margin: 0 }}>{student.name}</p>
              <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, margin: 0 }}>{student.email}</p>
            </div>
            {student.at_risk && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: `${C.error}10`, marginLeft: 8 }}>
                <AlertTriangle size={13} style={{ color: C.error }} />
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.error }}>At-Risk &middot; {student.at_risk_weeks}w declining</span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: mono, fontSize: 11, color: C.textMuted }}>{student.year}</span>
            {student.courses.map((c) => (
              <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: sans, fontSize: 12, color: C.textSecondary }}>
                <BookOpen size={12} /> {c.name}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <MiniStat label="Mastery" value={`${student.overall_mastery}%`} color={student.overall_mastery < 50 ? C.error : C.textPrimary} icon={<TrendIcon size={14} style={{ color: trendColor }} />} />
          <MiniStat label="Accuracy" value={`${student.accuracy_pct}%`} color={C.textPrimary} />
          <MiniStat label="Streak" value={`${student.streak_days}d`} color={student.streak_days > 0 ? C.green : C.textMuted} />
          <MiniStat label="Sessions" value={student.total_sessions} color={C.textPrimary} />
        </div>
      </div>

      {/* Mastery Trajectory Chart */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 4 }}>Mastery Trajectory</h3>
        <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 20 }}>30-day BKT mastery values. Dashed line = 60% threshold.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trajectory} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.borderLight} />
            <XAxis dataKey="day" tick={{ fontFamily: mono, fontSize: 11, fill: C.textMuted }} />
            <YAxis domain={[0, 100]} tick={{ fontFamily: mono, fontSize: 11, fill: C.textMuted }} />
            <Tooltip contentStyle={{ fontFamily: sans, fontSize: 13, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} formatter={(value) => [`${value}%`, 'Mastery']} />
            <ReferenceLine y={60} stroke={C.textMuted} strokeDasharray="6 4" label={{ value: 'Threshold', position: 'right', fill: C.textMuted, fontFamily: mono, fontSize: 10 }} />
            <Line type="monotone" dataKey="mastery" stroke={C.error} strokeWidth={2.5} dot={{ r: 4, fill: C.error, stroke: C.white, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Root-Cause Analysis */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 4 }}>Root-Cause Analysis</h3>
        <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 20 }}>PREREQUISITE_OF graph traversal identifies foundational gaps causing downstream failures.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rootCauses.map((rc) => (
            <div key={rc.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr auto', gap: 16, alignItems: 'center', padding: '14px 16px', background: C.cream, borderRadius: 10 }}>
              <div>
                <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: 0 }}>{rc.subconcept}</p>
                <p style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, margin: '2px 0 0' }}>{rc.downstream_failures} downstream failure{rc.downstream_failures !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>Mastery</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: rc.mastery_pct < 40 ? C.error : C.textPrimary }}>{rc.mastery_pct}%</span>
                </div>
                <ProgressBar value={rc.mastery_pct} max={100} height={5} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {rc.is_prerequisite_of.map((dep) => (
                  <span key={dep} style={{ padding: '2px 8px', borderRadius: 10, background: `${C.blue}10`, fontFamily: sans, fontSize: 11, color: C.blue }}>{dep}</span>
                ))}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: '0.04em' }}>IMPACT</span>
                <p style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: rc.impact_score >= 0.8 ? C.error : rc.impact_score >= 0.6 ? C.warning : C.textPrimary, margin: 0 }}>
                  {Math.round(rc.impact_score * 100)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Interventions */}
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
        <h3 style={{ fontFamily: serif, fontSize: 18, color: C.textPrimary, marginBottom: 4 }}>Recommended Interventions</h3>
        <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginBottom: 20 }}>SubConcepts to practice, ordered by estimated impact on overall mastery.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {interventions.map((iv) => (
            <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', border: `1px solid ${C.borderLight}`, borderRadius: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: iv.estimated_impact === 'high' ? `${C.error}10` : iv.estimated_impact === 'medium' ? `${C.warning}10` : `${C.blue}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Zap size={16} style={{ color: iv.estimated_impact === 'high' ? C.error : iv.estimated_impact === 'medium' ? C.warning : C.blue }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: 0 }}>{iv.subconcept}</p>
                <p style={{ fontFamily: sans, fontSize: 12, color: C.textSecondary, margin: '2px 0 0', lineHeight: 1.4 }}>{iv.reason}</p>
              </div>
              <ImpactBadge impact={iv.estimated_impact} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
