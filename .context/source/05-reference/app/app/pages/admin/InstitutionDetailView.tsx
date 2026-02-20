import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { Settings, BarChart3, Users, FileText, Database, ArrowLeft, Building2, Mail, Globe, Calendar, TrendingUp, Activity, BookOpen, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — INSTITUTION DETAIL VIEW (STORY-SA-8)
// Template B: Admin Shell with metrics + charts + timeline
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

interface Institution {
  id: string;
  name: string;
  type: "md" | "do" | "combined";
  status: "active" | "pending" | "suspended";
  contact_email: string;
  website: string | null;
  user_count: number;
  faculty_count: number;
  student_count: number;
  admin_count: number;
  course_count: number;
  question_count: number;
  storage_used_gb: number;
  created_at: string;
  last_activity: string | null;
}

interface ActivityEvent {
  id: string;
  type: "user_added" | "course_created" | "question_generated" | "login" | "system";
  description: string;
  user_name: string | null;
  timestamp: string;
}

interface ChartDataPoint {
  date: string;
  users: number;
  questions: number;
}

export default function InstitutionDetailView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("institutions");

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/admin/users")) setActiveNav("users");
    else if (path.startsWith("/admin/applications")) setActiveNav("applications");
    else if (path.startsWith("/admin/institutions")) setActiveNav("institutions");
    else if (path.startsWith("/admin/setup")) setActiveNav("setup");
    else if (path === "/admin") setActiveNav("dashboard");
  }, [location.pathname]);

  useEffect(() => {
    if (id) fetchInstitutionDetails(id);
  }, [id]);

  const fetchInstitutionDetails = async (institutionId: string) => {
    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Mock data
      const mockInstitutions: Record<string, Institution> = {
        "1": {
          id: "1",
          name: "Morehouse School of Medicine",
          type: "md",
          status: "active",
          contact_email: "admin@msm.edu",
          website: "https://www.msm.edu",
          user_count: 342,
          faculty_count: 48,
          student_count: 286,
          admin_count: 8,
          course_count: 28,
          question_count: 1842,
          storage_used_gb: 12.4,
          created_at: "2024-08-15T00:00:00Z",
          last_activity: "2026-02-20T08:30:00Z",
        },
        "2": {
          id: "2",
          name: "Howard University College of Medicine",
          type: "md",
          status: "active",
          contact_email: "admin@howard.edu",
          website: "https://medicine.howard.edu",
          user_count: 289,
          faculty_count: 42,
          student_count: 239,
          admin_count: 8,
          course_count: 24,
          question_count: 1456,
          storage_used_gb: 9.8,
          created_at: "2024-09-01T00:00:00Z",
          last_activity: "2026-02-19T14:22:00Z",
        },
      };

      const mockActivityEvents: ActivityEvent[] = [
        { id: "1", type: "question_generated", description: "Generated 24 questions for Pharmacology", user_name: "Dr. Sarah Chen", timestamp: "2026-02-20T08:30:00Z" },
        { id: "2", type: "course_created", description: "Created course: Clinical Skills III", user_name: "Dr. James Anderson", timestamp: "2026-02-19T15:45:00Z" },
        { id: "3", type: "user_added", description: "Added 3 new students", user_name: "Admin User", timestamp: "2026-02-19T10:15:00Z" },
        { id: "4", type: "login", description: "Faculty login from 24 users", user_name: null, timestamp: "2026-02-18T09:00:00Z" },
        { id: "5", type: "question_generated", description: "Generated 18 questions for Anatomy", user_name: "Dr. Michael Torres", timestamp: "2026-02-17T16:20:00Z" },
      ];

      const mockChartData: ChartDataPoint[] = [
        { date: "Feb 14", users: 312, questions: 1620 },
        { date: "Feb 15", users: 318, questions: 1658 },
        { date: "Feb 16", users: 324, questions: 1702 },
        { date: "Feb 17", users: 328, questions: 1756 },
        { date: "Feb 18", users: 334, questions: 1784 },
        { date: "Feb 19", users: 338, questions: 1810 },
        { date: "Feb 20", users: 342, questions: 1842 },
      ];

      const inst = mockInstitutions[institutionId];
      if (!inst) {
        throw new Error("Institution not found");
      }

      setInstitution(inst);
      setActivityEvents(mockActivityEvents);
      setChartData(mockChartData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: BarChart3, path: "/admin" },
    { key: "applications", label: "Applications", Icon: CheckCircle2, path: "/admin/applications" },
    { key: "institutions", label: "Institutions", Icon: Building2, path: "/admin/institutions" },
    { key: "users", label: "User Directory", Icon: Users, path: "/admin/users" },
    { key: "setup", label: "Settings", Icon: Settings, path: "/admin/setup" },
  ];

  const user = { name: "Super Admin", initials: "SA", role: "Superadmin" };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const getActivityIcon = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "user_added": return <Users size={16} />;
      case "course_created": return <BookOpen size={16} />;
      case "question_generated": return <FileText size={16} />;
      case "login": return <Activity size={16} />;
      case "system": return <AlertCircle size={16} />;
    }
  };

  const getActivityColor = (type: ActivityEvent["type"]) => {
    switch (type) {
      case "user_added": return C.blueMid;
      case "course_created": return C.green;
      case "question_generated": return C.navyDeep;
      case "login": return C.textMuted;
      case "system": return "#fa9d33";
    }
  };

  const getStatusColor = (status: Institution["status"]) => {
    switch (status) {
      case "active": return { bg: "rgba(105,163,56,0.1)", text: C.green, border: "rgba(105,163,56,0.2)" };
      case "pending": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "suspended": return { bg: "rgba(201,40,45,0.1)", text: "#c9282d", border: "rgba(201,40,45,0.2)" };
    }
  };

  // Sidebar (same pattern)
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
          Platform Administration
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

  // Loading/Error States
  if (loading) {
    return (
      <>
        {sidebar}
        <div style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
          minHeight: "100vh",
          background: C.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: `3px solid ${C.borderLight}`,
            borderTopColor: C.blueMid,
            animation: "spin 1s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  if (error || !institution) {
    return (
      <>
        {sidebar}
        <div style={{
          marginLeft: isDesktop ? sidebarWidth : 0,
          minHeight: "100vh",
          background: C.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <div style={{
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: 48,
            textAlign: "center",
            maxWidth: 480,
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(201,40,45,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <AlertCircle size={36} color="#c9282d" />
            </div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 8,
            }}>
              {error || "Institution not found"}
            </h2>
            <button
              onClick={() => navigate("/admin/institutions")}
              style={{
                marginTop: 20,
                padding: "10px 20px",
                background: C.navyDeep,
                border: "none",
                borderRadius: 6,
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 700,
                color: C.white,
                cursor: "pointer",
              }}
            >
              ← Back to Institutions
            </button>
          </div>
        </div>
      </>
    );
  }

  // Main Content
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
            <button
              onClick={() => navigate("/admin/institutions")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                color: C.navyDeep,
                padding: "6px 12px",
                borderRadius: 6,
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.parchment; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Header */}
          <div style={{
            ...fadeIn(0),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 20 : 28,
            marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
              <div>
                <h1 style={{
                  fontFamily: serif,
                  fontSize: isMobile ? 26 : 32,
                  fontWeight: 700,
                  color: C.navyDeep,
                  lineHeight: 1.25,
                  letterSpacing: "-0.01em",
                  margin: "0 0 8px",
                }}>
                  {institution.name}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {(() => {
                    const statusColors = getStatusColor(institution.status);
                    return (
                      <div style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: mono,
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        background: statusColors.bg,
                        color: statusColors.text,
                        border: `1px solid ${statusColors.border}`,
                        padding: "4px 8px",
                        borderRadius: 4,
                      }}>
                        {institution.status === "active" && <CheckCircle2 size={12} />}
                        {institution.status === "pending" && <Clock size={12} />}
                        {institution.status === "suspended" && <AlertCircle size={12} />}
                        {institution.status}
                      </div>
                    );
                  })()}
                  <span style={{
                    fontFamily: mono,
                    fontSize: 10,
                    color: C.textMuted,
                  }}>
                    • Member since {formatDate(institution.created_at).split(",")[0]}
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              background: C.parchment,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 8,
              padding: 16,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Mail size={16} color={C.textMuted} />
                <div>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 2,
                  }}>
                    Contact
                  </div>
                  <div style={{
                    fontFamily: sans,
                    fontSize: 14,
                    color: C.textSecondary,
                  }}>
                    {institution.contact_email}
                  </div>
                </div>
              </div>
              {institution.website && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Globe size={16} color={C.textMuted} />
                  <div>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 2,
                    }}>
                      Website
                    </div>
                    <a href={institution.website} target="_blank" rel="noopener noreferrer" style={{
                      fontFamily: sans,
                      fontSize: 14,
                      color: C.blueMid,
                      textDecoration: "none",
                    }}>
                      Visit Site →
                    </a>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Activity size={16} color={C.textMuted} />
                <div>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 2,
                  }}>
                    Last Active
                  </div>
                  <div style={{
                    fontFamily: sans,
                    fontSize: 14,
                    color: C.textSecondary,
                  }}>
                    {institution.last_activity ? formatRelativeTime(institution.last_activity) : "Never"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Total Users", value: institution.user_count.toLocaleString(), icon: <Users size={20} />, color: C.blueMid },
              { label: "Faculty", value: institution.faculty_count, icon: <Users size={20} />, color: C.navyDeep },
              { label: "Students", value: institution.student_count.toLocaleString(), icon: <Users size={20} />, color: C.green },
              { label: "Courses", value: institution.course_count, icon: <BookOpen size={20} />, color: "#fa9d33" },
              { label: "Questions", value: institution.question_count.toLocaleString(), icon: <FileText size={20} />, color: C.navyDeep },
              { label: "Storage", value: `${institution.storage_used_gb.toFixed(1)} GB`, icon: <Database size={20} />, color: C.textMuted },
            ].map((metric) => (
              <div key={metric.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: `${metric.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: metric.color,
                  flexShrink: 0,
                }}>
                  {metric.icon}
                </div>
                <div>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 4,
                  }}>
                    {metric.label}
                  </div>
                  <div style={{
                    fontFamily: serif,
                    fontSize: 28,
                    fontWeight: 700,
                    color: metric.color,
                  }}>
                    {metric.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div style={{
            ...fadeIn(0.1),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 16,
            marginBottom: 24,
          }}>
            {/* User Growth Chart */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 20 : 24,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <div>
                  <h3 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    margin: "0 0 4px",
                  }}>
                    User Growth
                  </h3>
                  <p style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    margin: 0,
                  }}>
                    Last 7 Days
                  </p>
                </div>
                <TrendingUp size={20} color={C.green} />
              </div>
              
              {/* Simple Line Chart */}
              <div style={{ position: "relative", height: 160 }}>
                <svg width="100%" height="160" style={{ overflow: "visible" }}>
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 40}
                      x2="100%"
                      y2={i * 40}
                      stroke={C.borderLight}
                      strokeWidth="1"
                    />
                  ))}
                  
                  {/* Line chart */}
                  <polyline
                    fill="none"
                    stroke={C.blueMid}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * 100;
                      const minVal = Math.min(...chartData.map((p) => p.users));
                      const maxVal = Math.max(...chartData.map((p) => p.users));
                      const range = maxVal - minVal;
                      const y = 140 - ((d.users - minVal) / range) * 120;
                      return `${x}%,${y}`;
                    }).join(" ")}
                  />
                  
                  {/* Data points */}
                  {chartData.map((d, i) => {
                    const x = (i / (chartData.length - 1)) * 100;
                    const minVal = Math.min(...chartData.map((p) => p.users));
                    const maxVal = Math.max(...chartData.map((p) => p.users));
                    const range = maxVal - minVal;
                    const y = 140 - ((d.users - minVal) / range) * 120;
                    
                    return (
                      <g key={i}>
                        <circle cx={`${x}%`} cy={y} r="4" fill={C.white} stroke={C.blueMid} strokeWidth="2" />
                      </g>
                    );
                  })}
                </svg>
                
                {/* X-axis labels */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}>
                  {chartData.map((d) => (
                    <span key={d.date} style={{
                      fontFamily: mono,
                      fontSize: 9,
                      color: C.textMuted,
                    }}>
                      {d.date}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Question Generation Chart */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 20 : 24,
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}>
                <div>
                  <h3 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    margin: "0 0 4px",
                  }}>
                    Question Bank Growth
                  </h3>
                  <p style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    margin: 0,
                  }}>
                    Total Questions
                  </p>
                </div>
                <FileText size={20} color={C.navyDeep} />
              </div>
              
              {/* Simple Bar Chart */}
              <div style={{ position: "relative", height: 160 }}>
                <div style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  height: 140,
                  gap: 4,
                }}>
                  {chartData.map((d, i) => {
                    const minVal = Math.min(...chartData.map((p) => p.questions));
                    const maxVal = Math.max(...chartData.map((p) => p.questions));
                    const range = maxVal - minVal;
                    const height = ((d.questions - minVal) / range) * 100 + 20;
                    
                    return (
                      <div key={i} style={{
                        flex: 1,
                        height: `${height}%`,
                        background: C.navyDeep,
                        borderRadius: "4px 4px 0 0",
                        position: "relative",
                      }}>
                        <div style={{
                          position: "absolute",
                          top: -20,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 600,
                          color: C.navyDeep,
                          whiteSpace: "nowrap",
                        }}>
                          {d.questions}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* X-axis labels */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}>
                  {chartData.map((d) => (
                    <span key={d.date} style={{
                      fontFamily: mono,
                      fontSize: 9,
                      color: C.textMuted,
                      flex: 1,
                      textAlign: "center",
                    }}>
                      {d.date}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div style={{
            ...fadeIn(0.15),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 20 : 24,
          }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                margin: "0 0 4px",
              }}>
                Recent Activity
              </h3>
              <p style={{
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: C.textMuted,
                margin: 0,
              }}>
                Last 10 Events
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {activityEvents.map((event, index) => (
                <div key={event.id} style={{
                  display: "flex",
                  gap: 16,
                  paddingBottom: 16,
                  borderBottom: index < activityEvents.length - 1 ? `1px solid ${C.borderLight}` : "none",
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${getActivityColor(event.type)}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: getActivityColor(event.type),
                    flexShrink: 0,
                  }}>
                    {getActivityIcon(event.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 15,
                      fontWeight: 600,
                      color: C.textPrimary,
                      margin: "0 0 4px",
                    }}>
                      {event.description}
                    </p>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 10,
                      color: C.textMuted,
                    }}>
                      {event.user_name && <span>{event.user_name} • </span>}
                      {formatRelativeTime(event.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
