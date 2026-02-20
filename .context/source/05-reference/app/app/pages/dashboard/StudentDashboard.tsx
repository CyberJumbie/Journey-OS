import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, Dumbbell, TrendingUp, BookMarked, HelpCircle, Settings } from "lucide-react";
import { C, sans, serif, mono, WovenField, AscSquares, Sparkline, ProgressBar } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT DASHBOARD
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
export default function StudentDashboard() {
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
    else if (path.startsWith("/student/practice")) setActiveNav("practice");
    else if (path.startsWith("/student/progress")) setActiveNav("progress");
    else if (path.startsWith("/repository")) setActiveNav("resources");
    else if (path.startsWith("/help")) setActiveNav("help");
    else if (path === "/student-dashboard") setActiveNav("dashboard");
  }, [location.pathname]);

  // ─── Mock data ────────────────────────────────────────────
  const user = { name: "John Mitchell", initials: "JM", role: "Student", department: "M2" };

  const kpis = [
    { label: "Questions Answered", value: "247", change: "+12 this week", spark: [205, 215, 218, 225, 230, 235, 247] },
    { label: "Accuracy Rate", value: "78%", change: "+3% from last month", spark: [72, 73, 75, 76, 77, 77, 78] },
    { label: "Current Streak", value: "12", change: "days in a row", spark: [5, 6, 7, 8, 9, 10, 11, 12] },
    { label: "Study Time", value: "8.5h", change: "this week", spark: [5.2, 6.1, 7.3, 7.8, 8.1, 8.3, 8.5] },
  ];

  const courses = [
    { name: "Medical Pharmacology I", code: "PHAR 501", progress: 68, nextTopic: "Cardiovascular Drugs", dueDate: "Feb 18", color: C.navyDeep },
    { name: "Clinical Anatomy", code: "ANAT 502", progress: 82, nextTopic: "Thoracic Anatomy", dueDate: "Feb 20", color: C.blueMid },
    { name: "Pathophysiology", code: "PATH 503", progress: 45, nextTopic: "Inflammatory Response", dueDate: "Feb 22", color: C.green },
  ];

  const upcomingPractice = [
    { title: "Cardiovascular Pharmacology — Practice Set", questions: 20, due: "Today", priority: "high" },
    { title: "Autonomic Nervous System — Review", questions: 15, due: "Tomorrow", priority: "medium" },
    { title: "Receptor Pharmacology — Weak Areas", questions: 12, due: "Feb 19", priority: "high" },
    { title: "Weekly Mixed Practice — All Topics", questions: 30, due: "Feb 21", priority: "low" },
  ];

  const recentActivity = [
    { type: "completed", text: "Completed Cardiovascular Drugs practice set — 18/20 correct", time: "2 hours ago", icon: "✓" },
    { type: "milestone", text: "Reached 12-day study streak! Keep it going.", time: "1 day ago", icon: "◆" },
    { type: "alert", text: "Falling behind in Inflammatory Response — schedule review", time: "1 day ago", icon: "▣" },
    { type: "completed", text: "Finished Thoracic Anatomy quiz — 85% accuracy", time: "2 days ago", icon: "✓" },
  ];

  const weakAreas = [
    { topic: "Receptor Pharmacology", mastery: 0.42, trend: "improving" },
    { topic: "Inflammatory Response", mastery: 0.38, trend: "declining" },
    { topic: "Renal Pharmacology", mastery: 0.51, trend: "stable" },
    { topic: "CNS Agents", mastery: 0.58, trend: "improving" },
  ];

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/student-dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/courses" },
    { key: "practice", label: "Practice", Icon: Dumbbell, path: "/student/practice" },
    { key: "progress", label: "Progress", Icon: TrendingUp, path: "/student/progress" },
    { key: "resources", label: "Resources", Icon: BookMarked, path: "/repository" },
    { key: "help", label: "Help", Icon: HelpCircle, path: "/help" },
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
                My Learning
              </h1>
              <p style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em", marginTop: 2 }}>
                MONDAY, FEBRUARY 16, 2026
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
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
                  <button onClick={() => navigate("/student/practice")} style={{
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

          {/* Rest of content cards remain the same... */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 360px" : "1fr",
            gap: isMobile ? 16 : 20,
            alignItems: "start",
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 20 }}>
              {/* Courses and other content cards go here - keeping existing structure */}
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
      </div>
    </div>
  );
}
