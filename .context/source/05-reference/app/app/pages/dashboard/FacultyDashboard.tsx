import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, Sparkles, FileCheck, Users, BarChart3, Settings } from "lucide-react";
import { C, sans, serif, mono, WovenField, AscSquares, Sparkline, ProgressBar, MasteryCell } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FACULTY DASHBOARD
// Design System: Dashboard Shell Template
// Surface: sidebar (white) + top bar (white) + content (cream)
// ═══════════════════════════════════════════════════════════════

// ─── HOOKS ──────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => setBp(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════
export default function FacultyDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => { setMounted(true); }, []);

  // Set active nav based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/courses")) setActiveNav("courses");
    else if (path.startsWith("/generation") || path.startsWith("/generate")) setActiveNav("generate");
    else if (path.startsWith("/questions") || path.startsWith("/assessments")) setActiveNav("assessments");
    else if (path.startsWith("/student")) setActiveNav("students");
    else if (path.startsWith("/analytics")) setActiveNav("analytics");
    else if (path === "/dashboard" || path === "/faculty-dashboard") setActiveNav("dashboard");
  }, [location.pathname]);

  // ─── Mock data ────────────────────────────────────────────
  const user = { name: "Dr. Adeyemi", initials: "OA", role: "Faculty", department: "Pharmacology" };

  const kpis = [
    { label: "Questions Generated", value: "342", change: "+28 this week", trend: "up", spark: [12, 18, 14, 22, 19, 28, 24] },
    { label: "Avg Item Quality", value: "0.84", change: "IRT difficulty", trend: "stable", spark: [0.78, 0.81, 0.79, 0.83, 0.82, 0.84, 0.84] },
    { label: "Coverage Score", value: "91%", change: "+3% from last month", trend: "up", spark: [72, 76, 80, 83, 87, 88, 91] },
    { label: "Active Students", value: "127", change: "across 3 courses", trend: "stable", spark: [118, 120, 122, 124, 125, 126, 127] },
  ];

  const courses = [
    { id: "1", name: "Medical Pharmacology I", code: "PHAR 501", students: 64, coverage: 91, items: 186, status: "active", color: C.navyDeep },
    { id: "2", name: "Clinical Pharmacology", code: "PHAR 602", students: 38, coverage: 74, items: 98, status: "active", color: C.blueMid },
    { id: "3", name: "Pharmacogenomics", code: "PHAR 710", students: 25, coverage: 62, items: 58, status: "draft", color: C.green },
  ];

  const recentActivity = [
    { type: "generated", text: "24 new items generated for PHAR 501 — Autonomic Nervous System", time: "2 hours ago", icon: "◆" },
    { type: "review", text: "IRT calibration complete for Exam 2 item pool — 3 items flagged", time: "5 hours ago", icon: "◇" },
    { type: "alert", text: "Coverage gap detected: Renal Pharmacology below 60% threshold", time: "1 day ago", icon: "▣" },
    { type: "student", text: "12 students below mastery threshold in Receptor Pharmacology", time: "1 day ago", icon: "▢" },
    { type: "generated", text: "Exam 3 blueprint mapped — 40 items across 8 topics", time: "2 days ago", icon: "◈" },
  ];

  const masteryTopics = [
    { name: "Autonomic NS", mastery: 0.82 },
    { name: "Receptor Pharm", mastery: 0.45 },
    { name: "Cardiovascular", mastery: 0.71 },
    { name: "Renal", mastery: 0.38 },
    { name: "GI Pharm", mastery: 0.67 },
    { name: "CNS Agents", mastery: 0.59 },
    { name: "Antimicrobials", mastery: 0.88 },
    { name: "Endocrine", mastery: 0.53 },
    { name: "Chemotherapy", mastery: 0.29 },
    { name: "Pain Mgmt", mastery: 0.74 },
    { name: "Immunopharm", mastery: 0.61 },
    { name: "Toxicology", mastery: 0.42 },
  ];

  const tasks = [
    { title: "Review flagged items from Exam 2", due: "Today", priority: "high", course: "PHAR 501" },
    { title: "Approve Exam 3 blueprint", due: "Tomorrow", priority: "medium", course: "PHAR 501" },
    { title: "Map missing Renal Pharmacology objectives", due: "Feb 19", priority: "high", course: "PHAR 602" },
    { title: "Generate practice set for midterm prep", due: "Feb 21", priority: "low", course: "PHAR 710" },
  ];

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/dashboard" },
    { key: "courses", label: "Courses", Icon: BookOpen, path: "/courses" },
    { key: "generate", label: "Generate", Icon: Sparkles, path: "/generation/wizard" },
    { key: "assessments", label: "Assessments", Icon: FileCheck, path: "/questions/review" },
    { key: "students", label: "Students", Icon: Users, path: "/student/progress" },
    { key: "analytics", label: "Analytics", Icon: BarChart3, path: "/analytics" },
  ];

  const sidebarCollapsedWidth = 72;
  const sidebarExpandedWidth = 240;
  const sidebarWidth = isDesktop 
    ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth)
    : (isTablet ? 220 : 260);

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  // ─── SIDEBAR ──────────────────────────────────────────────
  const sidebar = (
    <div 
      onMouseEnter={() => isDesktop && setSidebarExpanded(true)}
      onMouseLeave={() => isDesktop && setSidebarExpanded(false)}
      style={{
      width: sidebarWidth, height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 50,
      background: C.white, borderRight: `1px solid ${C.borderLight}`,
      display: "flex", flexDirection: "column",
      padding: isDesktop && !sidebarExpanded ? "24px 12px 20px" : "24px 16px 20px",
      transform: (!isDesktop && !sidebarOpen) ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
      transition: "all 0.25s ease",
      boxShadow: (!isDesktop && sidebarOpen) ? "4px 0 24px rgba(0,44,118,0.06)" : "none",
    }}>
      {/* Logo */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
        gap: 8, 
        padding: isDesktop && !sidebarExpanded ? "0" : "0 8px", 
        marginBottom: isDesktop && !sidebarExpanded ? 20 : 8,
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}>
        {(sidebarExpanded || !isDesktop) ? (
          <>
            <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{ fontFamily: mono, fontSize: 8, color: C.greenDark, letterSpacing: "0.1em", border: `1.2px solid ${C.greenDark}`, padding: "1px 5px", borderRadius: 2.5 }}>OS</span>
          </>
        ) : (
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: serif, fontSize: 14, fontWeight: 700, color: C.white,
          }}>J</div>
        )}
      </div>
      
      {(sidebarExpanded || !isDesktop) && (
        <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em", padding: "0 8px", marginBottom: 28 }}>
          MOREHOUSE SCHOOL OF MEDICINE
        </div>
      )}

      {/* Nav items */}
      <nav style={{ flex: 1, marginTop: isDesktop && !sidebarExpanded ? 8 : 0 }}>
        {navItems.map(item => {
          const Icon = item.Icon;
          return (
            <button key={item.key} onClick={() => {
              setActiveNav(item.key);
              navigate(item.path);
              if (!isDesktop) setSidebarOpen(false);
            }} style={{
              display: "flex", 
              alignItems: "center", 
              justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
              gap: 10, 
              width: "100%",
              padding: isDesktop && !sidebarExpanded ? "10px 0" : "10px 12px",
              marginBottom: 2, 
              borderRadius: 6, 
              border: "none",
              background: activeNav === item.key ? C.parchment : "transparent",
              color: activeNav === item.key ? C.navyDeep : C.textSecondary,
              fontFamily: sans, 
              fontSize: 14, 
              fontWeight: activeNav === item.key ? 600 : 400,
              cursor: "pointer", 
              transition: "all 0.15s", 
              textAlign: "left",
              position: "relative",
            }}>
              <Icon size={18} strokeWidth={activeNav === item.key ? 2.5 : 2} style={{ flexShrink: 0 }} />
              {(sidebarExpanded || !isDesktop) && <span>{item.label}</span>}
              {isDesktop && !sidebarExpanded && activeNav === item.key && (
                <div style={{
                  position: "absolute",
                  right: -1,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: "60%",
                  background: C.navyDeep,
                  borderRadius: "2px 0 0 2px",
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Settings + user */}
      <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 16 }}>
        <button onClick={() => { navigate("/settings"); if (!isDesktop) setSidebarOpen(false); }} style={{
          display: "flex", 
          alignItems: "center", 
          justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
          gap: 10, 
          width: "100%",
          padding: isDesktop && !sidebarExpanded ? "10px 0" : "10px 12px",
          borderRadius: 6, 
          border: "none",
          background: "transparent", 
          color: C.textMuted,
          fontFamily: sans, 
          fontSize: 14, 
          cursor: "pointer",
        }}>
          <Settings size={18} strokeWidth={2} style={{ flexShrink: 0 }} />
          {(sidebarExpanded || !isDesktop) && <span>Settings</span>}
        </button>

        {/* User card */}
        <div style={{
          display: "flex", 
          alignItems: "center", 
          justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
          gap: 10, 
          padding: isDesktop && !sidebarExpanded ? "12px 0 4px" : "12px 12px 4px",
          marginTop: 8, 
          cursor: "pointer",
        }} onClick={() => { navigate("/profile"); if (!isDesktop) setSidebarOpen(false); }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 11, fontWeight: 500, color: C.white, letterSpacing: "0.04em",
            flexShrink: 0,
          }}>
            {user.initials}
          </div>
          {(sidebarExpanded || !isDesktop) && (
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.department}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── OVERLAY for mobile sidebar ───────────────────────────
  const overlay = (!isDesktop && sidebarOpen) ? (
    <div onClick={() => setSidebarOpen(false)} style={{
      position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,44,118,0.12)",
      backdropFilter: "blur(2px)", transition: "opacity 0.2s",
    }} />
  ) : null;

  return (
    <div style={{ fontFamily: sans, minHeight: "100vh", background: C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {sidebar}
      {overlay}

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <div style={{ marginLeft: isDesktop ? sidebarWidth : 0, minHeight: "100vh", transition: "margin-left 0.25s ease" }}>

        {/* ─── TOP BAR ───────────────────────────── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          background: `${C.white}F2`, backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.borderLight}`,
          padding: isMobile ? "12px 16px" : "14px 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Hamburger on mobile/tablet */}
            {!isDesktop && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 4,
                display: "flex", flexDirection: "column", gap: 4,
              }}>
                <span style={{ width: 20, height: 2, background: C.navyDeep, borderRadius: 1, display: "block", transition: "all 0.2s", transform: sidebarOpen ? "rotate(45deg) translateY(6px)" : "none" }} />
                <span style={{ width: 20, height: 2, background: C.navyDeep, borderRadius: 1, display: "block", transition: "all 0.2s", opacity: sidebarOpen ? 0 : 1 }} />
                <span style={{ width: 20, height: 2, background: C.navyDeep, borderRadius: 1, display: "block", transition: "all 0.2s", transform: sidebarOpen ? "rotate(-45deg) translateY(-6px)" : "none" }} />
              </button>
            )}
            <div>
              <h1 style={{ fontFamily: serif, fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.navyDeep, lineHeight: 1.2 }}>
                Dashboard
              </h1>
              <p style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em", marginTop: 2 }}>
                MONDAY, FEBRUARY 16, 2026
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
            {/* Search */}
            {!isMobile && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: C.parchment, border: `1px solid ${C.borderLight}`,
                borderRadius: 8, padding: "8px 14px", width: isTablet ? 180 : 220,
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={C.textMuted} strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="5.5" /><path d="M11 11l3.5 3.5" />
                </svg>
                <input placeholder="Search courses, topics..." style={{
                  border: "none", background: "transparent", outline: "none",
                  fontFamily: sans, fontSize: 13, color: C.textPrimary, width: "100%",
                }} />
              </div>
            )}

            {/* Notification bell */}
            <button onClick={() => navigate("/notifications")} style={{
              position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6,
            }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={C.textSecondary} strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 18c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM16 13V9c0-3.07-1.63-5.64-4.5-6.32V2c0-.83-.67-1.5-1.5-1.5S8.5 1.17 8.5 2v.68C5.64 3.36 4 5.92 4 9v4l-1.5 1.5V16h15v-1.5L16 13z"/>
              </svg>
              <div style={{
                position: "absolute", top: 4, right: 4, width: 7, height: 7,
                background: C.error, borderRadius: "50%", border: `1.5px solid ${C.white}`,
              }} />
            </button>

            {/* Avatar (mobile) */}
            {isMobile && (
              <div onClick={() => navigate("/profile")} style={{
                width: 32, height: 32, borderRadius: 8,
                background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: mono, fontSize: 10, color: C.white, fontWeight: 500, cursor: "pointer",
              }}>{user.initials}</div>
            )}
          </div>
        </header>

        {/* ─── CONTENT ───────────────────────────── */}
        <main style={{
          padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px",
          maxWidth: 1200, position: "relative",
        }}>

          {/* ─── WELCOME KPI STRIP (inverted) ────── */}
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
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.bluePale, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>Faculty Overview</span>
                  </div>
                  <h2 style={{ fontFamily: serif, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.white, lineHeight: 1.25 }}>
                    Good afternoon, {user.name.split(" ").pop()}
                  </h2>
                  <p style={{ fontFamily: sans, fontSize: 14, color: C.bluePale, opacity: 0.8, marginTop: 4 }}>
                    3 courses active · 2 items need review · coverage on track
                  </p>
                </div>
                {!isMobile && (
                  <button onClick={() => navigate("/generation/wizard")} style={{
                    fontFamily: sans, fontSize: 13, fontWeight: 600,
                    background: "rgba(255,255,255,0.12)", color: C.white,
                    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
                    padding: "9px 18px", cursor: "pointer", transition: "all 0.2s",
                    backdropFilter: "blur(4px)",
                  }}>
                    + Generate Items
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

          {/* ─── MAIN GRID ───────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 360px" : "1fr",
            gap: isMobile ? 16 : 20,
            alignItems: "start",
          }}>

            {/* ═══ LEFT COLUMN ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>

              {/* ── COURSES CARD ──────────────────── */}
              <div style={{
                ...fadeIn(0.1),
                background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                overflow: "hidden",
              }}>
                <div style={{
                  padding: isMobile ? "16px 16px 12px" : "20px 24px 16px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: 1, background: C.navyDeep }} />
                      <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>My Courses</span>
                    </div>
                    <h3 style={{ fontFamily: serif, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.navyDeep }}>Active Courses</h3>
                  </div>
                  <button onClick={() => navigate("/courses")} style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid,
                    background: "none", border: "none", cursor: "pointer",
                  }}>View all →</button>
                </div>

                {/* Course rows */}
                {courses.map((course, i) => (
                  <div key={i} onClick={() => navigate(`/courses/${course.id}`)} style={{
                    padding: isMobile ? "14px 16px" : "16px 24px",
                    borderTop: `1px solid ${C.borderLight}`,
                    display: "flex", alignItems: "center", gap: isMobile ? 12 : 16,
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.parchment}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Color indicator */}
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: course.color, flexShrink: 0 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontFamily: sans, fontSize: isMobile ? 14 : 15, fontWeight: 600, color: C.textPrimary }}>{course.name}</span>
                        {course.status === "draft" && (
                          <span style={{ fontFamily: mono, fontSize: 8, color: C.warning, letterSpacing: "0.08em", textTransform: "uppercase", background: `${C.warning}12`, padding: "2px 6px", borderRadius: 3 }}>DRAFT</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.04em" }}>{course.code}</span>
                        <span style={{ fontSize: 12, color: C.textMuted }}>{course.students} students</span>
                        <span style={{ fontSize: 12, color: C.textMuted }}>{course.items} items</span>
                      </div>
                    </div>

                    {/* Coverage ring */}
                    {!isMobile && (
                      <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
                        <svg width="40" height="40" viewBox="0 0 40 40">
                          <circle cx="20" cy="20" r="16" fill="none" stroke={C.borderLight} strokeWidth="3" />
                          <circle cx="20" cy="20" r="16" fill="none" stroke={course.coverage > 80 ? C.green : course.coverage > 60 ? C.blueMid : C.warning} strokeWidth="3"
                            strokeDasharray={`${(course.coverage / 100) * 100.5} 100.5`}
                            strokeLinecap="round" transform="rotate(-90 20 20)"
                            style={{ transition: "stroke-dasharray 0.6s ease" }}
                          />
                        </svg>
                        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 9, fontWeight: 500, color: C.textSecondary }}>
                          {course.coverage}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* ── MASTERY OVERVIEW CARD ─────────── */}
              <div style={{
                ...fadeIn(0.18),
                background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                padding: isMobile ? 16 : "20px 24px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16,
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: 1, background: C.green }} />
                      <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Cohort Mastery</span>
                    </div>
                    <h3 style={{ fontFamily: serif, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.navyDeep }}>PHAR 501 — Topic Mastery</h3>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {[
                      { color: C.green, label: ">70%" },
                      { color: C.blueMid, label: "40-70%" },
                      { color: C.bluePale, label: "15-40%" },
                      { color: C.borderLight, label: "<15%" },
                    ].map((l, i) => (
                      <div key={i} style={{ display: isMobile && i > 1 ? "none" : "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                        <span style={{ fontFamily: mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.04em" }}>{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${isMobile ? 4 : 6}, 1fr)`,
                  gap: 6,
                }}>
                  {masteryTopics.map((t, i) => (
                    <div key={i}>
                      <MasteryCell value={t.mastery} label={t.name} />
                      <div style={{ fontFamily: mono, fontSize: 8, color: C.textMuted, textAlign: "center", marginTop: 4, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    </div>
                  ))}
                </div>

                {/* Summary bar */}
                <div style={{
                  marginTop: 16, padding: "12px 14px",
                  background: C.parchment, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: 1, background: C.warning }} />
                    <span style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>
                      <strong style={{ color: C.textPrimary }}>3 topics</strong> below mastery threshold
                    </span>
                  </div>
                  <button onClick={() => navigate("/analytics")} style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid,
                    background: "none", border: "none", cursor: "pointer",
                  }}>View details →</button>
                </div>
              </div>
            </div>

            {/* ═══ RIGHT COLUMN ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>

              {/* ── QUICK ACTIONS ─────────────────── */}
              <div style={{
                ...fadeIn(0.12),
                background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                padding: isMobile ? 16 : "20px 24px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 5, height: 5, borderRadius: 1, background: C.blueMid }} />
                  <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Quick Actions</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "Generate Items", Icon: Sparkles, color: C.navyDeep, path: "/generation/wizard" },
                    { label: "Create Exam", Icon: FileCheck, color: C.blueMid, path: "/exams/assembly" },
                    { label: "Map Curriculum", Icon: BookOpen, color: C.green, path: "/courses/outcome-mapping" },
                    { label: "View Reports", Icon: BarChart3, color: C.greenDark, path: "/analytics" },
                  ].map((a, i) => {
                    const Icon = a.Icon;
                    return (
                      <button key={i} onClick={() => navigate(a.path)} style={{
                        background: C.parchment, border: `1px solid ${C.borderLight}`,
                        borderRadius: 8, padding: "14px 12px",
                        cursor: "pointer", transition: "all 0.2s", textAlign: "left",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,44,118,0.04)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.boxShadow = "none"; }}
                      >
                        <Icon size={20} color={a.color} strokeWidth={2} style={{ marginBottom: 6 }} />
                        <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{a.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── TASKS ────────────────────────── */}
              <div style={{
                ...fadeIn(0.18),
                background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                padding: isMobile ? 16 : "20px 24px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: 1, background: C.navyDeep }} />
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Upcoming Tasks</span>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{tasks.length}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tasks.map((t, i) => (
                    <div key={i} onClick={() => navigate("/questions/review")} style={{
                      padding: "10px 12px", borderRadius: 8,
                      background: C.parchment,
                      border: `1px solid ${i === 0 ? C.border : "transparent"}`,
                      cursor: "pointer", transition: "all 0.15s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = C.blueMid}
                      onMouseLeave={e => e.currentTarget.style.borderColor = i === 0 ? C.border : "transparent"}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.textPrimary, lineHeight: 1.4 }}>{t.title}</span>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 6,
                          background: t.priority === "high" ? C.error : t.priority === "medium" ? C.warning : C.borderLight,
                        }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>{t.course}</span>
                        <span style={{ fontFamily: sans, fontSize: 11, color: t.due === "Today" ? C.error : C.textMuted, fontWeight: t.due === "Today" ? 600 : 400 }}>{t.due}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── RECENT ACTIVITY ──────────────── */}
              <div style={{
                ...fadeIn(0.24),
                background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                padding: isMobile ? 16 : "20px 24px",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 5, height: 5, borderRadius: 1, background: C.greenDark }} />
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Recent Activity</span>
                  </div>
                  <button onClick={() => navigate("/analytics")} style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid,
                    background: "none", border: "none", cursor: "pointer",
                  }}>View all →</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {recentActivity.map((a, i) => (
                    <div key={i} style={{
                      padding: "10px 0",
                      borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none",
                      display: "flex", gap: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: a.type === "alert" ? `${C.warning}10` : a.type === "student" ? `${C.blueMid}10` : `${C.navyDeep}08`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: serif, fontSize: 12,
                        color: a.type === "alert" ? C.warning : a.type === "student" ? C.blueMid : C.navyDeep,
                      }}>{a.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.45, marginBottom: 2 }}>{a.text}</p>
                        <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>{a.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
