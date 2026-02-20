import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { BarChart3, Users, BookOpen, FileText, Settings, Shield, TrendingUp, Activity, AlertCircle, CheckCircle2, Clock, Award } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — INSTITUTIONAL ADMIN DASHBOARD (STORY-IA-1)
// Template B: Admin Shell with metrics, charts, alerts
// Surface: sidebar (white) + content (cream) → white cards → parchment
// ═══════════════════════════════════════════════════════════════

function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => setBp(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

interface Alert {
  id: string;
  type: "info" | "warning" | "success";
  title: string;
  description: string;
  timestamp: string;
  action_label?: string;
  action_href?: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

export default function InstitutionalAdminDashboard() {
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

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<QuickStat[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/institution/dashboard" || path === "/institution") setActiveNav("dashboard");
    else if (path.startsWith("/institution/users")) setActiveNav("users");
    else if (path.startsWith("/institution/frameworks")) setActiveNav("frameworks");
    else if (path.startsWith("/institution/coverage")) setActiveNav("coverage");
    else if (path.startsWith("/institution/accreditation")) setActiveNav("accreditation");
    else if (path.startsWith("/institution/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockAlerts: Alert[] = [
        {
          id: "1",
          type: "warning",
          title: "LCME Accreditation Review Due",
          description: "Annual self-study report submission deadline in 14 days",
          timestamp: "2026-02-20T09:00:00Z",
          action_label: "View Report",
          action_href: "/institution/accreditation",
        },
        {
          id: "2",
          type: "info",
          title: "New Faculty Pending Approval",
          description: "3 faculty members are waiting for account activation",
          timestamp: "2026-02-19T14:30:00Z",
          action_label: "Review Users",
          action_href: "/institution/users",
        },
        {
          id: "3",
          type: "success",
          title: "Curriculum Mapping Complete",
          description: "Pharmacology course now has 100% USMLE coverage",
          timestamp: "2026-02-18T11:15:00Z",
        },
      ];

      const mockStats: QuickStat[] = [
        { label: "Total Users", value: 342, change: "+12 this month", trend: "up", icon: <Users size={24} />, color: C.blueMid },
        { label: "Active Courses", value: 28, change: "+2 this month", trend: "up", icon: <BookOpen size={24} />, color: C.green },
        { label: "Question Bank", value: "1,842", change: "+156 this week", trend: "up", icon: <FileText size={24} />, color: C.navyDeep },
        { label: "Coverage Score", value: "87%", change: "+3% this month", trend: "up", icon: <Award size={24} />, color: "#fa9d33" },
      ];

      setAlerts(mockAlerts);
      setStats(mockStats);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: BarChart3, path: "/institution/dashboard" },
    { key: "users", label: "User Management", Icon: Users, path: "/institution/users" },
    { key: "frameworks", label: "Frameworks", Icon: Shield, path: "/institution/frameworks" },
    { key: "coverage", label: "Coverage", Icon: Activity, path: "/institution/coverage" },
    { key: "accreditation", label: "Accreditation", Icon: Award, path: "/institution/accreditation" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/institution/settings" },
  ];

  const user = { name: "Dr. Sarah Johnson", initials: "SJ", role: "Institutional Admin", institution: "Morehouse School of Medicine" };

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

  const getAlertColors = (type: Alert["type"]) => {
    switch (type) {
      case "warning": return { bg: "rgba(250,157,51,0.1)", border: "#fa9d33", text: "#fa9d33", icon: <AlertCircle size={20} /> };
      case "info": return { bg: "rgba(43,113,185,0.1)", border: C.blueMid, text: C.blueMid, icon: <Clock size={20} /> };
      case "success": return { bg: "rgba(105,163,56,0.1)", border: C.green, text: C.green, icon: <CheckCircle2 size={20} /> };
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  };

  // Sidebar
  const sidebar = (
    <div
      onMouseEnter={() => isDesktop && setSidebarExpanded(true)}
      onMouseLeave={() => isDesktop && setSidebarExpanded(false)}
      style={{
        width: sidebarWidth,
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
        background: C.white,
        borderRight: `1px solid ${C.borderLight}`,
        display: "flex",
        flexDirection: "column",
        padding: isDesktop && !sidebarExpanded ? "24px 12px 20px" : "24px 16px 20px",
        transform: (!isDesktop && !sidebarOpen) ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
        transition: "all 0.25s ease",
        boxShadow: (!isDesktop && sidebarOpen) ? "4px 0 24px rgba(0,44,118,0.06)" : "none",
      }}
    >
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
            <span style={{
              fontFamily: mono,
              fontSize: 8,
              color: C.greenDark,
              letterSpacing: "0.1em",
              border: `1.2px solid ${C.greenDark}`,
              padding: "1px 5px",
              borderRadius: 2.5,
            }}>
              OS
            </span>
          </>
        ) : (
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: C.navyDeep,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: serif,
            fontSize: 14,
            fontWeight: 700,
            color: C.white,
          }}>
            J
          </div>
        )}
      </div>

      {(sidebarExpanded || !isDesktop) && (
        <p style={{
          fontFamily: mono,
          fontSize: 9,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: C.textMuted,
          padding: "0 8px",
          marginBottom: 24,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {user.institution}
        </p>
      )}

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ key, label, Icon, path }) => {
          const isActive = activeNav === key;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: isDesktop && !sidebarExpanded ? "10px 0" : "10px 12px",
                justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
                borderRadius: 6,
                background: "transparent",
                borderLeft: isActive ? `3px solid ${C.greenDark}` : "3px solid transparent",
                fontFamily: sans,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.navyDeep : C.textSecondary,
                cursor: "pointer",
                outline: "none",
                transition: "all 0.15s ease",
                textAlign: "left",
                border: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = C.parchment;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {(sidebarExpanded || !isDesktop) && (
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{
        borderTop: `1px solid ${C.borderLight}`,
        paddingTop: 16,
        marginTop: 16,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: isDesktop && !sidebarExpanded ? "8px 0" : "8px",
          justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background: C.navyDeep,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: mono,
            fontSize: 11,
            fontWeight: 600,
            color: C.white,
            flexShrink: 0,
          }}>
            {user.initials}
          </div>
          {(sidebarExpanded || !isDesktop) && (
            <div style={{ overflow: "hidden", flex: 1 }}>
              <p style={{
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                color: C.ink,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {user.name}
              </p>
              <p style={{
                fontFamily: mono,
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: C.textMuted,
                margin: 0,
              }}>
                {user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {sidebar}
      
      {!isDesktop && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,44,118,0.12)",
            backdropFilter: "blur(2px)",
            zIndex: 40,
          }}
        />
      )}

      <div style={{
        marginLeft: isDesktop ? sidebarWidth : 0,
        minHeight: "100vh",
        background: C.cream,
        transition: "margin 0.25s ease",
      }}>
        {/* Top Bar */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.borderLight}`,
          padding: isMobile ? "16px 16px" : "20px 32px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {!isDesktop && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  style={{
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ width: 18, height: 2, background: C.navyDeep, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: C.navyDeep, borderRadius: 1 }} />
                    <div style={{ width: 18, height: 2, background: C.navyDeep, borderRadius: 1 }} />
                  </div>
                </button>
              )}
              <div>
                <h1 style={{
                  fontFamily: serif,
                  fontSize: isMobile ? 24 : 30,
                  fontWeight: 700,
                  color: C.navyDeep,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}>
                  Dashboard
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div style={{ ...fadeIn(0), marginBottom: 24 }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 12,
              }}>
                Action Required
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {alerts.map((alert) => {
                  const colors = getAlertColors(alert.type);
                  return (
                    <div key={alert.id} style={{
                      background: C.white,
                      border: `1px solid ${colors.border}`,
                      borderLeft: `4px solid ${colors.border}`,
                      borderRadius: 8,
                      padding: isMobile ? 16 : 20,
                      display: "flex",
                      alignItems: "start",
                      gap: 16,
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: colors.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: colors.text,
                        flexShrink: 0,
                      }}>
                        {colors.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                          <h3 style={{
                            fontFamily: sans,
                            fontSize: 16,
                            fontWeight: 700,
                            color: C.navyDeep,
                            margin: 0,
                          }}>
                            {alert.title}
                          </h3>
                          <span style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: C.textMuted,
                            flexShrink: 0,
                          }}>
                            {formatRelativeTime(alert.timestamp)}
                          </span>
                        </div>
                        <p style={{
                          fontFamily: sans,
                          fontSize: 14,
                          color: C.textSecondary,
                          lineHeight: 1.6,
                          margin: "0 0 12px",
                        }}>
                          {alert.description}
                        </p>
                        {alert.action_label && alert.action_href && (
                          <button
                            onClick={() => navigate(alert.action_href!)}
                            style={{
                              padding: "6px 14px",
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              borderRadius: 6,
                              fontFamily: sans,
                              fontSize: 13,
                              fontWeight: 700,
                              color: colors.text,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {alert.action_label} →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {stats.map((stat) => (
              <div key={stat.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: `${stat.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: stat.color,
                  }}>
                    {stat.icon}
                  </div>
                  {stat.trend === "up" && (
                    <TrendingUp size={20} color={C.green} />
                  )}
                </div>
                <div style={{
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 4,
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontFamily: serif,
                  fontSize: 32,
                  fontWeight: 700,
                  color: C.navyDeep,
                  lineHeight: 1,
                  marginBottom: 8,
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontFamily: sans,
                  fontSize: 13,
                  color: stat.trend === "up" ? C.green : C.textMuted,
                }}>
                  {stat.change}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{ ...fadeIn(0.1) }}>
            <h2 style={{
              fontFamily: serif,
              fontSize: 18,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 12,
            }}>
              Quick Actions
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
              gap: 16,
            }}>
              {[
                { label: "Invite Users", description: "Add faculty, students, or advisors", icon: <Users size={20} />, path: "/institution/users" },
                { label: "Configure Frameworks", description: "Manage USMLE, ACGME standards", icon: <Shield size={20} />, path: "/institution/frameworks" },
                { label: "View Coverage Report", description: "Check curriculum alignment", icon: <Activity size={20} />, path: "/institution/coverage" },
                { label: "Accreditation Status", description: "LCME compliance dashboard", icon: <Award size={20} />, path: "/institution/accreditation" },
                { label: "Manage Courses", description: "Review active courses", icon: <BookOpen size={20} />, path: "/courses" },
                { label: "Question Bank", description: "Browse institutional repository", icon: <FileText size={20} />, path: "/repository" },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: 20,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "start",
                    gap: 16,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.blueMid;
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,44,118,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.borderLight;
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: "rgba(43,113,185,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.blueMid,
                    flexShrink: 0,
                  }}>
                    {action.icon}
                  </div>
                  <div>
                    <h3 style={{
                      fontFamily: sans,
                      fontSize: 16,
                      fontWeight: 700,
                      color: C.navyDeep,
                      margin: "0 0 4px",
                    }}>
                      {action.label}
                    </h3>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 14,
                      color: C.textSecondary,
                      margin: 0,
                    }}>
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
