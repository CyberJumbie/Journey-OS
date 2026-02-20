import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";

// ═══════════════════════════════════════════════════════════════
// DASHBOARD LAYOUT — Base template for all dashboard screens
// Surface: sidebar (white) + top bar (white frosted) + content (cream)
// Used by: 52+ screens
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1", bluePale: "#a3d9ff",
  greenDark: "#5d7203", green: "#69a338",
  ink: "#1b232a", warmGray: "#d7d3c8", cream: "#f5f3ef",
  parchment: "#faf9f6", white: "#ffffff",
  textPrimary: "#1b232a", textSecondary: "#4a5568", textMuted: "#718096",
  border: "#e2dfd8", borderLight: "#edeae4",
  error: "#c9282d",
};

const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, sans-serif";
const serif = "'Lora', Georgia, serif";
const mono = "'DM Mono', Menlo, monospace";

// ─── HOOK ───────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => setBp(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  showSearch?: boolean;
  user?: {
    name: string;
    initials: string;
    department: string;
    role: string;
  };
}

export default function DashboardLayout({
  children,
  pageTitle = "Dashboard",
  pageSubtitle = "MONDAY, FEBRUARY 16, 2026",
  showSearch = false,
  user = { name: "Dr. User", initials: "DU", department: "Faculty", role: "Faculty" },
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => {
    // Set active nav based on current path
    const path = location.pathname;
    if (path.startsWith("/courses")) setActiveNav("courses");
    else if (path.startsWith("/generation") || path.startsWith("/generate")) setActiveNav("generate");
    else if (path.startsWith("/questions") || path.startsWith("/assessments")) setActiveNav("assessments");
    else if (path.startsWith("/student")) setActiveNav("students");
    else if (path.startsWith("/analytics")) setActiveNav("analytics");
    else if (path === "/dashboard") setActiveNav("dashboard");
  }, [location.pathname]);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: "◈", path: "/dashboard" },
    { key: "courses", label: "Courses", icon: "◆", path: "/courses" },
    { key: "generate", label: "Generate", icon: "✦", path: "/generation/wizard" },
    { key: "assessments", label: "Assessments", icon: "◇", path: "/questions/review" },
    { key: "students", label: "Students", icon: "▢", path: "/student/progress" },
    { key: "analytics", label: "Analytics", icon: "▣", path: "/analytics" },
  ];

  const sidebarWidth = isDesktop ? 240 : isTablet ? 220 : 260;

  // ─── SIDEBAR ────────────────────────────────────────────────
  const sidebar = (
    <div style={{
      width: sidebarWidth, height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 50,
      background: C.white, borderRight: `1px solid ${C.borderLight}`,
      display: "flex", flexDirection: "column",
      padding: "24px 16px 20px",
      transform: (!isDesktop && !sidebarOpen) ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
      transition: "transform 0.25s ease",
      boxShadow: (!isDesktop && sidebarOpen) ? "4px 0 24px rgba(0,44,118,0.06)" : "none",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 8 }}>
        <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep }}>Journey</span>
        <span style={{
          fontFamily: mono, fontSize: 8, color: C.greenDark, letterSpacing: "0.1em",
          border: `1.2px solid ${C.greenDark}`, padding: "1px 5px", borderRadius: 2.5
        }}>OS</span>
      </div>
      <div style={{
        fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em",
        padding: "0 8px", marginBottom: 28
      }}>
        MOREHOUSE SCHOOL OF MEDICINE
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1 }}>
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => {
              setActiveNav(item.key);
              navigate(item.path);
              if (!isDesktop) setSidebarOpen(false);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", marginBottom: 2, borderRadius: 6, border: "none",
              background: activeNav === item.key ? C.parchment : "transparent",
              color: activeNav === item.key ? C.navyDeep : C.textSecondary,
              fontFamily: sans, fontSize: 14, fontWeight: activeNav === item.key ? 600 : 400,
              cursor: "pointer", transition: "all 0.15s", textAlign: "left",
            }}
          >
            <span style={{
              fontFamily: serif, fontSize: 14, width: 20, textAlign: "center",
              opacity: activeNav === item.key ? 1 : 0.5
            }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom: Settings + user */}
      <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 16 }}>
        <button
          onClick={() => { navigate("/settings"); if (!isDesktop) setSidebarOpen(false); }}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 6, border: "none",
            background: "transparent", color: C.textMuted,
            fontFamily: sans, fontSize: 14, cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14 }}>⚙</span>
          Settings
        </button>

        {/* User card */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 12px 4px",
          marginTop: 8,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: mono, fontSize: 11, fontWeight: 500, color: C.white, letterSpacing: "0.04em",
          }}>
            {user.initials}
          </div>
          <div>
            <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{user.name}</div>
            <div style={{
              fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em",
              textTransform: "uppercase"
            }}>{user.department}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── OVERLAY for mobile sidebar ────────────────────────────
  const overlay = (!isDesktop && sidebarOpen) ? (
    <div
      onClick={() => setSidebarOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,44,118,0.12)",
        backdropFilter: "blur(2px)", transition: "opacity 0.2s",
      }}
    />
  ) : null;

  return (
    <div style={{ fontFamily: sans, minHeight: "100vh", background: C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {sidebar}
      {overlay}

      {/* ═══════════════ MAIN AREA ═══════════════ */}
      <div style={{ marginLeft: isDesktop ? sidebarWidth : 0, minHeight: "100vh" }}>

        {/* ─── TOP BAR ─────────────────────────── */}
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
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  display: "flex", flexDirection: "column", gap: 4,
                }}
              >
                <span style={{
                  width: 20, height: 2, background: C.navyDeep, borderRadius: 1, display: "block",
                  transition: "all 0.2s",
                  transform: sidebarOpen ? "rotate(45deg) translateY(6px)" : "none"
                }} />
                <span style={{
                  width: 20, height: 2, background: C.navyDeep, borderRadius: 1, display: "block",
                  transition: "all 0.2s", opacity: sidebarOpen ? 0 : 1
                }} />
                <span style={{
                  width: 20, height: 2, background: C.navyDeep, borderRadius: 1, display: "block",
                  transition: "all 0.2s",
                  transform: sidebarOpen ? "rotate(-45deg) translateY(-6px)" : "none"
                }} />
              </button>
            )}
            <div>
              <h1 style={{
                fontFamily: serif, fontSize: isMobile ? 18 : 22, fontWeight: 700,
                color: C.navyDeep, lineHeight: 1.2
              }}>
                {pageTitle}
              </h1>
              <p style={{
                fontFamily: mono, fontSize: 10, color: C.textMuted,
                letterSpacing: "0.06em", marginTop: 2
              }}>
                {pageSubtitle}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
            {/* Search */}
            {showSearch && !isMobile && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: C.parchment, border: `1px solid ${C.borderLight}`,
                borderRadius: 8, padding: "8px 14px", width: isTablet ? 180 : 220,
              }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={C.textMuted} strokeWidth="1.5">
                  <circle cx="6.5" cy="6.5" r="5.5" /><path d="M11 11l3.5 3.5" />
                </svg>
                <input
                  placeholder="Search courses, topics..."
                  style={{
                    border: "none", background: "transparent", outline: "none",
                    fontFamily: sans, fontSize: 13, color: C.textPrimary, width: "100%",
                  }}
                />
              </div>
            )}

            {/* Notification bell */}
            <button
              onClick={() => navigate("/notifications")}
              style={{
                position: "relative", background: "none", border: "none", cursor: "pointer", padding: 6,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke={C.textSecondary} strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 18c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2zM16 13V9c0-3.07-1.63-5.64-4.5-6.32V2c0-.83-.67-1.5-1.5-1.5S8.5 1.17 8.5 2v.68C5.64 3.36 4 5.92 4 9v4l-1.5 1.5V16h15v-1.5L16 13z" />
              </svg>
              <div style={{
                position: "absolute", top: 4, right: 4, width: 7, height: 7,
                background: C.error, borderRadius: "50%", border: `1.5px solid ${C.white}`,
              }} />
            </button>

            {/* Avatar (mobile) */}
            {isMobile && (
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: mono, fontSize: 10, color: C.white, fontWeight: 500,
              }}>{user.initials}</div>
            )}
          </div>
        </header>

        {/* ─── CONTENT ─────────────────────────── */}
        <main style={{
          padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px",
          maxWidth: 1200, position: "relative",
        }}>
          {children}
        </main>
      </div>
    </div>
  );
}
