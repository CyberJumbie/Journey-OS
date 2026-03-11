'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Database, Shield, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { C, sans, serif, mono, WovenField, AscSquares, Sparkline } from '@/lib/design-tokens';

interface KPI {
  label: string;
  value: string;
  change: string;
  spark: number[];
}

interface RecentUser {
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

interface SystemAlert {
  type: 'warning' | 'info' | 'success';
  text: string;
  time: string;
  priority: string;
}

interface DeptStat {
  dept: string;
  courses: number;
  items: number;
  coverage: number;
  faculty: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [courseStats, setCourseStats] = useState<DeptStat[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(false);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      setKpis([
        { label: 'Total Users', value: '287', change: '+12 this month', spark: [255, 260, 265, 270, 275, 280, 287] },
        { label: 'System Health', value: '98%', change: 'all systems operational', spark: [96, 97, 97, 98, 98, 98, 98] },
        { label: 'Total Questions', value: '18.5k', change: '+420 this week', spark: [17200, 17500, 17800, 18000, 18200, 18300, 18500] },
        { label: 'Coverage Score', value: '89%', change: 'institutional average', spark: [82, 84, 85, 86, 87, 88, 89] },
      ]);
      setRecentUsers([
        { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@msm.edu', role: 'Faculty', status: 'active', joined: '2 hours ago' },
        { name: 'John Mitchell', email: 'john.mitchell@msm.edu', role: 'Student', status: 'active', joined: '5 hours ago' },
        { name: 'Dr. Michael Chen', email: 'michael.chen@msm.edu', role: 'Faculty', status: 'pending', joined: '1 day ago' },
        { name: 'Emily Rodriguez', email: 'emily.rodriguez@msm.edu', role: 'Student', status: 'active', joined: '1 day ago' },
      ]);
      setSystemAlerts([
        { type: 'warning', text: 'ILO mapping for PHAR 602 incomplete — 15 objectives unmapped', time: '2 hours ago', priority: 'high' },
        { type: 'info', text: 'Backup completed successfully — 18.2 GB uploaded to secure storage', time: '4 hours ago', priority: 'low' },
        { type: 'warning', text: '3 faculty members pending approval for question generation access', time: '1 day ago', priority: 'medium' },
        { type: 'success', text: 'Framework update complete — USMLE Step 1 2026 taxonomy integrated', time: '2 days ago', priority: 'low' },
      ]);
      setCourseStats([
        { dept: 'Pharmacology', courses: 8, items: 4200, coverage: 91, faculty: 12 },
        { dept: 'Anatomy', courses: 6, items: 3100, coverage: 87, faculty: 9 },
        { dept: 'Pathophysiology', courses: 5, items: 2800, coverage: 78, faculty: 8 },
        { dept: 'Clinical Skills', courses: 4, items: 1900, coverage: 65, faculty: 6 },
      ]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ background: C.borderLight, borderRadius: 8, height: 80 }} className="animate-pulse" />
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ background: C.borderLight, borderRadius: 8, height: 56 }} className="animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${C.error}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <AlertTriangle size={28} style={{ color: C.error }} />
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep, margin: '0 0 8px' }}>
          Couldn&apos;t load admin dashboard.
        </h2>
        <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: '0 0 24px', maxWidth: 400 }}>
          Please check your connection and try again.
        </p>
        <button onClick={fetchDashboardData} style={{ padding: '10px 24px', background: C.navyDeep, border: 'none', borderRadius: 6, fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* KPI Strip */}
      <div style={{ position: 'relative', overflow: 'hidden', background: C.navyDeep, borderRadius: 12, padding: '24px 28px', marginBottom: 24 }}>
        <WovenField color={C.white} opacity={0.015} density={10} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <AscSquares colors={[C.bluePale, C.blueLight, C.blueMid, C.green]} size={8} gap={3} />
                <span style={{ fontFamily: mono, fontSize: 9, color: C.bluePale, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7 }}>System Overview</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.white, lineHeight: 1.25 }}>System Operational</h2>
              <p style={{ fontFamily: sans, fontSize: 14, color: C.bluePale, opacity: 0.8, marginTop: 4 }}>287 active users · 18.5k questions · 89% institutional coverage</p>
            </div>
            <button style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.12)', color: C.white, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '9px 18px', cursor: 'pointer', backdropFilter: 'blur(4px)' }}>
              System Report
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '16px 18px', backdropFilter: 'blur(4px)' }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: C.bluePale, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{k.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: C.white, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontFamily: sans, fontSize: 11, color: C.bluePale, opacity: 0.65, marginTop: 4 }}>{k.change}</div>
                  </div>
                  <Sparkline data={k.spark} color={C.bluePale} width={60} height={24} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Department Stats */}
          <DepartmentStats courseStats={courseStats} onNavigate={(path) => router.push(path)} />
          {/* Recent Users */}
          <RecentUsersCard recentUsers={recentUsers} onNavigate={(path) => router.push(path)} />
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <QuickActionsCard onNavigate={(path) => router.push(path)} />
          <SystemAlertsCard systemAlerts={systemAlerts} />
        </div>
      </div>
    </>
  );
}

function DepartmentStats({ courseStats, onNavigate }: { courseStats: DeptStat[]; onNavigate: (path: string) => void }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: 1, background: C.navyDeep }} />
            <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Departments</span>
          </div>
          <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>Department Overview</h3>
        </div>
        <button onClick={() => onNavigate('/admin/departments')} style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
      </div>
      {courseStats.map((dept, i) => (
        <div key={i} onClick={() => onNavigate('/admin/departments')} style={{ padding: '16px 24px', borderTop: `1px solid ${C.borderLight}`, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = C.parchment}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{dept.dept}</span>
            <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{dept.coverage}% coverage</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: C.textSecondary }}>{dept.courses} courses</span>
            <span style={{ fontSize: 12, color: C.textSecondary }}>{dept.items} items</span>
            <span style={{ fontSize: 12, color: C.textSecondary }}>{dept.faculty} faculty</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentUsersCard({ recentUsers, onNavigate }: { recentUsers: RecentUser[]; onNavigate: (path: string) => void }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: '20px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 5, height: 5, borderRadius: 1, background: C.green }} />
          <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>User Management</span>
        </div>
        <h3 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>Recent Registrations</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {recentUsers.map((u, i) => (
          <div key={i} onClick={() => onNavigate('/admin/faculty')} style={{ padding: '12px 0', borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 2 }}>{u.name}</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: '0.04em' }}>{u.email}</div>
            </div>
            <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3, background: u.status === 'active' ? `${C.green}12` : `${C.warning}12`, color: u.status === 'active' ? C.green : C.warning }}>{u.status}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: '12px 14px', background: C.parchment, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>
          <strong style={{ color: C.textPrimary }}>12 new users</strong> this month
        </span>
        <button onClick={() => onNavigate('/admin/faculty')} style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid, background: 'none', border: 'none', cursor: 'pointer' }}>Manage →</button>
      </div>
    </div>
  );
}

function QuickActionsCard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const actions = [
    { label: 'Manage Users', Icon: Users, color: C.navyDeep, path: '/admin/faculty', count: 287 },
    { label: 'Review ILOs', Icon: FileText, color: C.blueMid, path: '/admin/ilos', count: 42 },
    { label: 'Data Integrity', Icon: Database, color: C.green, path: '/admin/data-integrity', count: 8 },
    { label: 'Compliance', Icon: Shield, color: C.greenDark, path: '/admin/lcme-compliance-heatmap' },
  ];

  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 5, height: 5, borderRadius: 1, background: C.blueMid }} />
        <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Actions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {actions.map((a, i) => {
          const Icon = a.Icon;
          return (
            <button key={i} onClick={() => onNavigate(a.path)} style={{ background: C.parchment, border: `1px solid ${C.borderLight}`, borderRadius: 8, padding: '14px 12px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,44,118,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Icon size={20} color={a.color} strokeWidth={2} style={{ marginBottom: 6 }} />
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{a.label}</div>
              {'count' in a && a.count && <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginTop: 4 }}>{a.count}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SystemAlertsCard({ systemAlerts }: { systemAlerts: SystemAlert[] }) {
  return (
    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: 1, background: C.greenDark }} />
          <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>System Alerts</span>
        </div>
      </div>
      {systemAlerts.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: sans, fontSize: 14, color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span>✓</span> No system alerts.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {systemAlerts.map((alert, i) => (
            <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? `1px solid ${C.borderLight}` : 'none', display: 'flex', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0, background: alert.type === 'warning' ? `${C.warning}10` : alert.type === 'success' ? `${C.green}10` : `${C.blueMid}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 12, color: alert.type === 'warning' ? C.warning : alert.type === 'success' ? C.green : C.blueMid }}>
                {alert.type === 'warning' ? '▣' : alert.type === 'success' ? '✓' : '◈'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.45, marginBottom: 2 }}>{alert.text}</p>
                <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: '0.04em' }}>{alert.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
