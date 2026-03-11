'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  Plus,
  AlertCircle,
  RefreshCw,
  Users,
  FileText,
} from 'lucide-react';
import { C, sans, mono, ProgressBar } from '@/lib/design-tokens';

interface InstitutionCourse {
  id: string;
  code: string;
  name: string;
  term: string;
  status: 'active' | 'archived' | 'draft';
  faculty: { id: string; name: string }[];
  student_count: number;
  approved_item_count: number;
  coverage_pct: number;
  avg_critic_score: number;
  lcme_compliance_pct: number;
  last_activity: string;
  health: 'healthy' | 'at_risk' | 'critical';
}

function HealthBadge({ health }: { health: InstitutionCourse['health'] }) {
  const config = {
    healthy:  { bg: `${C.green}14`, color: C.green,  label: 'Healthy' },
    at_risk:  { bg: `${C.warning}14`, color: C.warning, label: 'At Risk' },
    critical: { bg: `${C.error}14`, color: C.error,  label: 'Critical' },
  }[health];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20,
      fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', background: config.bg, color: config.color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: config.color }} />
      {config.label}
    </span>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.textMuted, marginBottom: 2 }}>
        {icon}
        <span style={{ fontFamily: mono, fontSize: 10 }}>{label}</span>
      </div>
      <span style={{ fontFamily: sans, fontSize: 16, fontWeight: 600, color: C.textPrimary }}>{value}</span>
    </div>
  );
}

const MOCK_COURSES: InstitutionCourse[] = [
  { id: 'c1', code: 'PHARM-601', name: 'Principles of Pharmacology', term: 'Spring 2026', status: 'active', faculty: [{ id: 'f1', name: 'Dr. Sarah Chen' }], student_count: 82, approved_item_count: 156, coverage_pct: 78, avg_critic_score: 0.84, lcme_compliance_pct: 71, last_activity: '2 hours ago', health: 'healthy' },
  { id: 'c2', code: 'PATH-501', name: 'General Pathology', term: 'Spring 2026', status: 'active', faculty: [{ id: 'f2', name: 'Dr. James Wright' }, { id: 'f3', name: 'Dr. Maria Lopez' }], student_count: 94, approved_item_count: 89, coverage_pct: 52, avg_critic_score: 0.79, lcme_compliance_pct: 44, last_activity: '1 day ago', health: 'at_risk' },
  { id: 'c3', code: 'ANAT-401', name: 'Human Anatomy', term: 'Spring 2026', status: 'active', faculty: [{ id: 'f4', name: 'Dr. David Kim' }], student_count: 88, approved_item_count: 12, coverage_pct: 18, avg_critic_score: 0.72, lcme_compliance_pct: 10, last_activity: '5 days ago', health: 'critical' },
  { id: 'c4', code: 'BIOC-301', name: 'Medical Biochemistry', term: 'Spring 2026', status: 'active', faculty: [{ id: 'f5', name: 'Dr. Emily Okafor' }], student_count: 76, approved_item_count: 210, coverage_pct: 85, avg_critic_score: 0.88, lcme_compliance_pct: 82, last_activity: '3 hours ago', health: 'healthy' },
  { id: 'c5', code: 'MICRO-501', name: 'Medical Microbiology', term: 'Fall 2025', status: 'archived', faculty: [{ id: 'f6', name: 'Dr. Robert Patel' }], student_count: 80, approved_item_count: 178, coverage_pct: 74, avg_critic_score: 0.82, lcme_compliance_pct: 68, last_activity: '3 months ago', health: 'healthy' },
];

export default function InstitutionCoursesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [courses, setCourses] = useState<InstitutionCourse[]>([]);
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      await new Promise((r) => setTimeout(r, 600));
      setCourses(MOCK_COURSES);
      setLoading(false);
    })();
  }, []);

  const filtered = courses.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (healthFilter !== 'all' && c.health !== healthFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 72, background: C.warmGray, borderRadius: 10, opacity: 0.5 }} className="animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        <AlertCircle size={32} style={{ color: C.error }} />
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textPrimary }}>Couldn&apos;t load courses.</p>
        <button onClick={() => window.location.reload()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', border: `1px solid ${C.border}`, borderRadius: 8, background: C.white, fontFamily: sans, fontSize: 14, cursor: 'pointer', color: C.textPrimary }}>
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 360 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textMuted }} />
          <input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px 9px 36px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 14, outline: 'none', background: C.white }} />
        </div>
        <select value={healthFilter} onChange={(e) => setHealthFilter(e.target.value)} style={{ padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white, cursor: 'pointer' }}>
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="at_risk">At Risk</option>
          <option value="critical">Critical</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: sans, fontSize: 13, background: C.white, cursor: 'pointer' }}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="draft">Draft</option>
        </select>
        <div style={{ flex: 1 }} />
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: C.navyDeep, color: C.white, border: 'none', borderRadius: 8, fontFamily: sans, fontSize: 14, cursor: 'pointer' }}>
          <Plus size={15} /> Create Course
        </button>
      </div>

      {filtered.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 64 }}>
          <BookOpen size={36} style={{ color: C.textMuted }} />
          <p style={{ fontFamily: sans, fontSize: 15, color: C.textPrimary }}>
            {search || healthFilter !== 'all' ? 'No courses match your filters.' : 'No courses yet. Create the first course for your institution.'}
          </p>
          {(search || healthFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setHealthFilter('all'); setStatusFilter('all'); }} style={{ fontFamily: sans, fontSize: 13, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((course) => (
            <div
              key={course.id}
              onClick={() => router.push(`/courses/${course.id}`)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, padding: '16px 20px',
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', transition: 'box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,44,118,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: C.textMuted, letterSpacing: '0.04em' }}>{course.code}</span>
                  <HealthBadge health={course.health} />
                  {course.status === 'archived' && (
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, background: `${C.warmGray}80`, padding: '2px 8px', borderRadius: 10 }}>Archived</span>
                  )}
                </div>
                <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0, marginBottom: 6 }}>{course.name}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{course.faculty.map((f) => f.name).join(', ')}</span>
                  <span style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{course.term}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, minWidth: 300 }}>
                <StatChip icon={<Users size={13} />} label="Students" value={course.student_count} />
                <StatChip icon={<FileText size={13} />} label="Items" value={course.approved_item_count} />
                <div style={{ width: 80 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>Coverage</span>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.textPrimary }}>{course.coverage_pct}%</span>
                  </div>
                  <ProgressBar value={course.coverage_pct} max={100} height={5} />
                </div>
                <div style={{ width: 80 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>LCME</span>
                    <span style={{ fontFamily: mono, fontSize: 10, color: C.textPrimary }}>{course.lcme_compliance_pct}%</span>
                  </div>
                  <ProgressBar value={course.lcme_compliance_pct} max={100} height={5} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
