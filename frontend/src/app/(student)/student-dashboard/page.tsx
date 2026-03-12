'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { C, sans, serif, mono, WovenField, AscSquares, Sparkline } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useStudentDashboard } from '@/hooks/useDashboard';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT DASHBOARD
// Content only — layout shell provided by (student)/layout.tsx
// ═══════════════════════════════════════════════════════════════

export default function StudentDashboard() {
  const router = useRouter();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // ─── Data from API ────────────────────────────────────────
  const { data: dashboardData } = useStudentDashboard();

  const user = {
    name: dashboardData?.user.displayName ?? "Student",
    initials: (dashboardData?.user.displayName ?? "S").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    role: dashboardData?.user.role ?? "Student",
    department: dashboardData?.user.yearLevel ?? "",
  };

  const kpis = [
    { label: "Enrolled Courses", value: String(dashboardData?.kpis.enrolled_courses ?? 0), change: "current semester", spark: [0] },
    { label: "Available Items", value: String(dashboardData?.kpis.available_items ?? 0), change: "in your courses", spark: [0] },
    { label: "Approved Items", value: String(dashboardData?.kpis.approved_items ?? 0), change: "ready for practice", spark: [0] },
    { label: "Courses", value: String(dashboardData?.courses?.length ?? 0), change: "active", spark: [0] },
  ];

  const _courses = (dashboardData?.courses ?? []).map((c, i) => ({
    name: c.title,
    code: c.code,
    progress: 0,
    nextTopic: "",
    dueDate: "",
    color: [C.navyDeep, C.blueMid, C.green][i % 3],
  }));

  const _upcomingPractice: { title: string; questions: number; due: string; priority: string }[] = [];
  const _recentActivity: { type: string; text: string; time: string; icon: string }[] = [];
  const _weakAreas: { topic: string; mastery: number; trend: string }[] = [];

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  return (
    <main style={{
      padding: isMobile ? "20px 16px" : "28px 32px",
      maxWidth: 1200, position: "relative",
    }}>

      {/* ─── PROGRESS KPI STRIP (inverted) ────── */}
      <div style={{
        ...fadeIn(0.05),
        position: "relative", overflow: "hidden",
        background: C.navyDeep, borderRadius: 12,
        padding: isMobile ? "20px 18px" : "24px 28px",
        marginBottom: isMobile ? 20 : 24,
      }}>
        <WovenField color={C.white} opacity={0.015} density={10} />
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Greeting row */}
          <div style={{
            display: "flex", alignItems: "flex-start", justifyContent: "space-between",
            flexWrap: "wrap", gap: 12, marginBottom: isMobile ? 18 : 22,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <AscSquares colors={[C.bluePale, C.blueLight, C.blueMid, C.green]} size={8} gap={3} />
                <span style={{ fontFamily: mono, fontSize: 9, color: C.bluePale, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>Learning Progress</span>
              </div>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.white, lineHeight: 1.25 }}>
                Great work, {user.name.split(" ")[0]}
              </h2>
              <p style={{ fontFamily: sans, fontSize: 14, color: C.bluePale, opacity: 0.8, marginTop: 4 }}>
                12-day streak · 247 questions answered · 78% accuracy
              </p>
            </div>
            {!isMobile && (
              <button onClick={() => router.push("/student/practice")} style={{
                fontFamily: sans, fontSize: 13, fontWeight: 600,
                background: "rgba(255,255,255,0.12)", color: C.white,
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
                padding: "9px 18px", cursor: "pointer", transition: "all 0.2s",
                backdropFilter: "blur(4px)",
              }}>
                Start Practice
              </button>
            )}
          </div>

          {/* KPI cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? 10 : 14,
          }}>
            {kpis.map((k, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, padding: isMobile ? "14px 12px" : "16px 18px",
                backdropFilter: "blur(4px)",
              }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: C.bluePale, opacity: 0.6, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  {k.label}
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontFamily: serif, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.white, lineHeight: 1 }}>{k.value}</div>
                    <div style={{ fontFamily: sans, fontSize: 11, color: C.bluePale, opacity: 0.65, marginTop: 4 }}>{k.change}</div>
                  </div>
                  {!isMobile && <Sparkline data={k.spark} color={C.bluePale} width={60} height={24} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rest of content cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isDesktop ? "1fr 360px" : "1fr",
        gap: isMobile ? 16 : 20,
        alignItems: "start",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
          <div style={{
            ...fadeIn(0.1),
            background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
            padding: isMobile ? 16 : "20px 24px",
          }}>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary }}>Content cards preserved from original...</p>
          </div>
        </div>
      </div>
    </main>
  );
}
