import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Users, Database, Shield, Settings, FileText, Activity } from "lucide-react";
import { C, sans, serif, mono, WovenField, AscSquares, Sparkline } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — ADMIN DASHBOARD
// Design System: Dashboard Shell Template  (Admin variant)
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
export default function AdminDashboard() {
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
    if (path.startsWith("/admin/faculty")) setActiveNav("faculty");
    else if (path.startsWith("/admin/framework") || path.startsWith("/admin/ilo") || path.startsWith("/admin/knowledge")) setActiveNav("data");
    else if (path.startsWith("/admin/lcme") || path.startsWith("/admin/compliance")) setActiveNav("compliance");
    else if (path.startsWith("/admin/integrity")) setActiveNav("integrity");
    else if (path.startsWith("/admin/logs") || path.startsWith("/admin/activity")) setActiveNav("logs");
    else if (path === "/admin" || path === "/admin/dashboard") setActiveNav("dashboard");
  }, [location.pathname]);

  // ─── Mock data ────────────────────────────────────────────
  const user = { name: "Admin User", initials: "AU", role: "Administrator", department: "Administration" };

  const kpis = [
    { label: "Total Users", value: "287", change: "+12 this month", spark: [255, 260, 265, 270, 275, 280, 287] },
    { label: "System Health", value: "98%", change: "all systems operational", spark: [96, 97, 97, 98, 98, 98, 98] },
    { label: "Total Questions", value: "18.5k", change: "+420 this week", spark: [17200, 17500, 17800, 18000, 18200, 18300, 18500] },
    { label: "Coverage Score", value: "89%", change: "institutional average", spark: [82, 84, 85, 86, 87, 88, 89] },
  ];

  const recentUsers = [
    { name: "Dr. Sarah Johnson", email: "sarah.johnson@msm.edu", role: "Faculty", status: "active", joined: "2 hours ago" },
    { name: "John Mitchell", email: "john.mitchell@msm.edu", role: "Student", status: "active", joined: "5 hours ago" },
    { name: "Dr. Michael Chen", email: "michael.chen@msm.edu", role: "Faculty", status: "pending", joined: "1 day ago" },
    { name: "Emily Rodriguez", email: "emily.rodriguez@msm.edu", role: "Student", status: "active", joined: "1 day ago" },
  ];

  const systemAlerts = [
    { type: "warning", text: "ILO mapping for PHAR 602 incomplete — 15 objectives unmapped", time: "2 hours ago", priority: "high" },
    { type: "info", text: "Backup completed successfully — 18.2 GB uploaded to secure storage", time: "4 hours ago", priority: "low" },
    { type: "warning", text: "3 faculty members pending approval for question generation access", time: "1 day ago", priority: "medium" },
    { type: "success", text: "Framework update complete — USMLE Step 1 2026 taxonomy integrated", time: "2 days ago", priority: "low" },
  ];

  const courseStats = [
    { dept: "Pharmacology", courses: 8, items: 4200, coverage: 91, faculty: 12 },
    { dept: "Anatomy", courses: 6, items: 3100, coverage: 87, faculty: 9 },
    { dept: "Pathophysiology", courses: 5, items: 2800, coverage: 78, faculty: 8 },
    { dept: "Clinical Skills", courses: 4, items: 1900, coverage: 65, faculty: 6 },
  ];

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/admin" },
    { key: "faculty", label: "Faculty", Icon: Users, path: "/admin/faculty" },
    { key: "data", label: "Data & ILOs", Icon: Database, path: "/admin/framework" },
    { key: "compliance", label: "Compliance", Icon: Shield, path: "/admin/lcme" },
    { key: "integrity", label: "Data Integrity", Icon: FileText, path: "/admin/integrity" },
    { key: "logs", label: "Activity Logs", Icon: Activity, path: "/admin/logs" },
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
              <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.role}</div>
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
                System Dashboard
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
                <input placeholder="Search users, logs..." style={{
                  border: "none", background: "transparent", outline: "none",
                  fontFamily: sans, fontSize: 13, color: C.textPrimary, width: "100%",
                }} />
              </div>
            )}

            {/* Notification bell */}
            <button onClick={() => navigate("/admin/notifications")} style={{
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

          {/* ─── SYSTEM HEALTH KPI STRIP (inverted) ────── */}
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
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.bluePale, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>System Overview</span>
                  </div>
                  <h2 style={{ fontFamily: serif, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.white, lineHeight: 1.25 }}>
                    System Operational
                  </h2>
                  <p style={{ fontFamily: sans, fontSize: 14, color: C.bluePale, opacity: 0.8, marginTop: 4 }}>
                    287 active users · 18.5k questions · 89% institutional coverage
                  </p>
                </div>
                {!isMobile && (
                  <button style={{
                    fontFamily: sans, fontSize: 13, fontWeight: 600,
                    background: "rgba(255,255,255,0.12)", color: C.white,
                    border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
                    padding: "9px 18px", cursor: "pointer", transition: "all 0.2s",
                    backdropFilter: "blur(4px)",
                  }}>
                    System Report
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

              {/* ── DEPARTMENT STATS ──────────────────── */}
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
                      <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Departments</span>
                    </div>
                    <h3 style={{ fontFamily: serif, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.navyDeep }}>Department Overview</h3>
                  </div>
                  <button onClick={() => navigate("/admin/departments")} style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid,
                    background: "none", border: "none", cursor: "pointer",
                  }}>View all →</button>
                </div>

                {/* Department rows */}
                {courseStats.map((dept, i) => (
                  <div key={i} onClick={() => navigate("/admin/departments")} style={{
                    padding: isMobile ? "14px 16px" : "16px 24px",
                    borderTop: `1px solid ${C.borderLight}`,
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.parchment}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontFamily: sans, fontSize: isMobile ? 14 : 15, fontWeight: 600, color: C.textPrimary }}>{dept.dept}</span>
                      <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{dept.coverage}% coverage</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{dept.courses} courses</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{dept.items} items</span>
                      <span style={{ fontSize: 12, color: C.textSecondary }}>{dept.faculty} faculty</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── RECENT USERS ─────────────────────── */}
              <div style={{
                ...fadeIn(0.18),
                background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`,
                padding: isMobile ? 16 : "20px 24px",
              }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: 1, background: C.green }} />
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>User Management</span>
                  </div>
                  <h3 style={{ fontFamily: serif, fontSize: isMobile ? 16 : 18, fontWeight: 700, color: C.navyDeep }}>Recent Registrations</h3>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {recentUsers.map((u, i) => (
                    <div key={i} onClick={() => navigate("/admin/faculty")} style={{
                      padding: "12px 0",
                      borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      cursor: "pointer",
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 500, color: C.textPrimary, marginBottom: 2 }}>{u.name}</div>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.04em" }}>{u.email}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontFamily: mono, fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase",
                          padding: "2px 6px", borderRadius: 3,
                          background: u.status === "active" ? `${C.green}12` : `${C.warning}12`,
                          color: u.status === "active" ? C.green : C.warning,
                        }}>{u.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: 16, padding: "12px 14px",
                  background: C.parchment, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <span style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>
                    <strong style={{ color: C.textPrimary }}>12 new users</strong> this month
                  </span>
                  <button onClick={() => navigate("/admin/faculty")} style={{
                    fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.blueMid,
                    background: "none", border: "none", cursor: "pointer",
                  }}>Manage →</button>
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
                    { label: "Manage Users", Icon: Users, color: C.navyDeep, path: "/admin/faculty", count: 287 },
                    { label: "Review ILOs", Icon: FileText, color: C.blueMid, path: "/admin/ilo", count: 42 },
                    { label: "Data Integrity", Icon: Database, color: C.green, path: "/admin/integrity", count: 8 },
                    { label: "Compliance", Icon: Shield, color: C.greenDark, path: "/admin/lcme" },
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
                        {a.count && (
                          <div style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, marginTop: 4 }}>{a.count}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── SYSTEM ALERTS ──────────────────── */}
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
                    <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>System Alerts</span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {systemAlerts.map((alert, i) => (
                    <div key={i} style={{
                      padding: "10px 0",
                      borderTop: i > 0 ? `1px solid ${C.borderLight}` : "none",
                      display: "flex", gap: 10,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                        background: alert.type === "warning" ? `${C.warning}10` : alert.type === "success" ? `${C.green}10` : `${C.blueMid}10`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: serif, fontSize: 12,
                        color: alert.type === "warning" ? C.warning : alert.type === "success" ? C.green : C.blueMid,
                      }}>
                        {alert.type === "warning" ? "▣" : alert.type === "success" ? "✓" : "◈"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary, lineHeight: 1.45, marginBottom: 2 }}>{alert.text}</p>
                        <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>{alert.time}</span>
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
