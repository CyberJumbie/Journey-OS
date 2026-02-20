import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Building2, Users, BookOpen, FileText, Settings, TrendingUp, TrendingDown, Award, BarChart3, Download } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — INSTITUTIONAL ANALYTICS DASHBOARD (STORY-A-1)
// Template C: Admin Shell with institutional metrics
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

interface DepartmentMetrics {
  name: string;
  questions: number;
  coverage: number;
  quality: number;
}

interface FacultyPerformance {
  name: string;
  questions: number;
  quality_score: number;
  approval_rate: number;
}

export default function InstitutionalAnalytics() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("analytics");

  const [timePeriod, setTimePeriod] = useState<"week" | "month" | "year">("month");
  const [departmentMetrics, setDepartmentMetrics] = useState<DepartmentMetrics[]>([]);
  const [facultyPerformance, setFacultyPerformance] = useState<FacultyPerformance[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/admin/institutions")) setActiveNav("institutions");
    else if (path.startsWith("/admin/users")) setActiveNav("users");
    else if (path.startsWith("/admin/analytics")) setActiveNav("analytics");
    else if (path.startsWith("/admin/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchAnalytics();
  }, [timePeriod]);

  const fetchAnalytics = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockDepartments: DepartmentMetrics[] = [
      { name: "Basic Sciences", questions: 425, coverage: 82, quality: 0.89 },
      { name: "Clinical Sciences", questions: 378, coverage: 74, quality: 0.85 },
      { name: "Pathology", questions: 215, coverage: 79, quality: 0.88 },
      { name: "Pharmacology", questions: 142, coverage: 68, quality: 0.84 },
      { name: "Microbiology", questions: 87, coverage: 71, quality: 0.86 },
    ];

    const mockFaculty: FacultyPerformance[] = [
      { name: "Dr. Sarah Chen", questions: 145, quality_score: 0.92, approval_rate: 89 },
      { name: "Dr. Michael Torres", questions: 128, quality_score: 0.88, approval_rate: 85 },
      { name: "Dr. Emily Johnson", questions: 112, quality_score: 0.90, approval_rate: 87 },
      { name: "Dr. James Wilson", questions: 98, quality_score: 0.86, approval_rate: 82 },
      { name: "Dr. Lisa Anderson", questions: 87, quality_score: 0.91, approval_rate: 88 },
    ];

    setDepartmentMetrics(mockDepartments);
    setFacultyPerformance(mockFaculty);
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/admin/dashboard" },
    { key: "institutions", label: "Institutions", Icon: Building2, path: "/admin/institutions" },
    { key: "users", label: "Users", Icon: Users, path: "/admin/users" },
    { key: "analytics", label: "Analytics", Icon: BarChart3, path: "/admin/analytics" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/admin/settings" },
  ];

  const user = { name: "Admin User", initials: "AU", role: "Superadmin" };

  const institutionMetrics = {
    total_questions: 1247,
    total_courses: 28,
    active_faculty: 45,
    avg_quality_score: 0.87,
    approval_rate: 82,
    questions_this_month: 342,
    blueprint_coverage: 76,
  };

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
          System Admin
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
                  Institutional Analytics
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  System-wide metrics and performance insights
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["week", "month", "year"].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period as any)}
                  style={{
                    padding: isMobile ? "6px 12px" : "8px 16px",
                    background: timePeriod === period ? C.navyDeep : C.white,
                    border: `1px solid ${timePeriod === period ? C.navyDeep : C.border}`,
                    borderRadius: 6,
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: timePeriod === period ? C.white : C.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1600 }}>
          {/* KPI Cards */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Total Questions", value: institutionMetrics.total_questions, icon: <FileText size={20} />, color: C.blueMid },
              { label: "Active Courses", value: institutionMetrics.total_courses, icon: <BookOpen size={20} />, color: C.green },
              { label: "Faculty Members", value: institutionMetrics.active_faculty, icon: <Users size={20} />, color: C.navyDeep },
              { label: "Approval Rate", value: `${institutionMetrics.approval_rate}%`, icon: <Award size={20} />, color: "#fa9d33" },
            ].map((stat) => (
              <div key={stat.label} style={{
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
                  background: `${stat.color}15`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stat.color,
                  flexShrink: 0,
                }}>
                  {stat.icon}
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
                    {stat.label}
                  </div>
                  <div style={{
                    fontFamily: serif,
                    fontSize: 28,
                    fontWeight: 700,
                    color: stat.color,
                  }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "2fr 1fr" : "1fr",
            gap: 24,
          }}>
            {/* Department Performance */}
            <div style={{
              ...fadeIn(0.1),
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              overflow: "hidden",
            }}>
              <div style={{
                padding: isMobile ? 20 : 24,
                borderBottom: `1px solid ${C.borderLight}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.navyDeep,
                  margin: 0,
                }}>
                  Department Performance
                </h2>
                <button style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textPrimary,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <Download size={14} />
                  Export
                </button>
              </div>

              <div style={{ padding: isMobile ? 16 : 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {departmentMetrics.map((dept) => (
                    <div key={dept.name} style={{
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 16,
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}>
                        <h3 style={{
                          fontFamily: serif,
                          fontSize: 16,
                          fontWeight: 700,
                          color: C.navyDeep,
                          margin: 0,
                        }}>
                          {dept.name}
                        </h3>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 11,
                          fontWeight: 600,
                          color: C.textMuted,
                        }}>
                          {dept.questions} questions
                        </div>
                      </div>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 12,
                      }}>
                        <div>
                          <div style={{
                            fontFamily: mono,
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: C.textMuted,
                            marginBottom: 4,
                          }}>
                            Coverage
                          </div>
                          <div style={{
                            fontFamily: serif,
                            fontSize: 20,
                            fontWeight: 700,
                            color: dept.coverage >= 75 ? C.green : "#fa9d33",
                          }}>
                            {dept.coverage}%
                          </div>
                        </div>
                        <div>
                          <div style={{
                            fontFamily: mono,
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: C.textMuted,
                            marginBottom: 4,
                          }}>
                            Quality Score
                          </div>
                          <div style={{
                            fontFamily: serif,
                            fontSize: 20,
                            fontWeight: 700,
                            color: dept.quality >= 0.85 ? C.green : "#fa9d33",
                          }}>
                            {Math.round(dept.quality * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Faculty Leaderboard */}
            <div style={{
              ...fadeIn(0.15),
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              overflow: "hidden",
            }}>
              <div style={{
                padding: isMobile ? 20 : 24,
                borderBottom: `1px solid ${C.borderLight}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Award size={20} style={{ color: "#fa9d33" }} />
                  <h2 style={{
                    fontFamily: serif,
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.navyDeep,
                    margin: 0,
                  }}>
                    Top Contributors
                  </h2>
                </div>
              </div>

              <div>
                {facultyPerformance.map((faculty, index) => (
                  <div
                    key={faculty.name}
                    style={{
                      padding: isMobile ? "16px 20px" : "20px 24px",
                      borderBottom: index < facultyPerformance.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        background: index === 0 ? "#fa9d33" : C.navyDeep,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: mono,
                        fontSize: 13,
                        fontWeight: 700,
                        color: C.white,
                        flexShrink: 0,
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {faculty.name}
                        </div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: C.textMuted,
                        }}>
                          {faculty.questions} questions
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      gap: 12,
                      fontFamily: mono,
                      fontSize: 11,
                    }}>
                      <span style={{ color: C.green }}>
                        Quality: {Math.round(faculty.quality_score * 100)}%
                      </span>
                      <span style={{ color: C.textMuted }}>•</span>
                      <span style={{ color: C.blueMid }}>
                        Approval: {faculty.approval_rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
