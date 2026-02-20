import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Users, Plus, TrendingUp, Activity, Clock } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FACULTY DASHBOARD (STORY-F-1)
// Template B: Faculty Shell with course cards + recent activity
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

interface Course {
  id: string;
  code: string;
  name: string;
  term: string;
  student_count: number;
  question_count: number;
  last_activity: string;
  status: "active" | "archived" | "draft";
}

interface RecentActivity {
  id: string;
  type: "question_generated" | "student_added" | "course_updated";
  description: string;
  course_name: string;
  timestamp: string;
}

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

  const [courses, setCourses] = useState<Course[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/faculty" || path === "/faculty/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/faculty/courses")) setActiveNav("courses");
    else if (path.startsWith("/faculty/questions")) setActiveNav("questions");
    else if (path.startsWith("/faculty/repository")) setActiveNav("repository");
    else if (path.startsWith("/faculty/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockCourses: Course[] = [
        {
          id: "1",
          code: "PHARM-501",
          name: "Pharmacology I",
          term: "Spring 2026",
          student_count: 48,
          question_count: 156,
          last_activity: "2026-02-20T08:30:00Z",
          status: "active",
        },
        {
          id: "2",
          code: "PHARM-502",
          name: "Clinical Pharmacology",
          term: "Spring 2026",
          student_count: 42,
          question_count: 128,
          last_activity: "2026-02-19T14:20:00Z",
          status: "active",
        },
        {
          id: "3",
          code: "PHARM-401",
          name: "Pharmacology Foundations",
          term: "Fall 2025",
          student_count: 52,
          question_count: 142,
          last_activity: "2025-12-15T10:00:00Z",
          status: "archived",
        },
      ];

      const mockActivity: RecentActivity[] = [
        {
          id: "1",
          type: "question_generated",
          description: "Generated 12 questions on Beta Blockers",
          course_name: "Pharmacology I",
          timestamp: "2026-02-20T08:30:00Z",
        },
        {
          id: "2",
          type: "course_updated",
          description: "Updated learning objectives",
          course_name: "Clinical Pharmacology",
          timestamp: "2026-02-19T14:20:00Z",
        },
        {
          id: "3",
          type: "student_added",
          description: "Added 3 new students",
          course_name: "Pharmacology I",
          timestamp: "2026-02-18T09:15:00Z",
        },
      ];

      setCourses(mockCourses);
      setRecentActivity(mockActivity);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/faculty/dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/faculty/courses" },
    { key: "questions", label: "Generate Questions", Icon: Plus, path: "/faculty/questions/generate" },
    { key: "repository", label: "Question Bank", Icon: FileText, path: "/faculty/repository" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/faculty/settings" },
  ];

  const user = { name: "Dr. Sarah Chen", initials: "SC", role: "Faculty", department: "Pharmacology" };

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

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "question_generated": return <FileText size={16} />;
      case "student_added": return <Users size={16} />;
      case "course_updated": return <Activity size={16} />;
    }
  };

  const getActivityColor = (type: RecentActivity["type"]) => {
    switch (type) {
      case "question_generated": return C.navyDeep;
      case "student_added": return C.blueMid;
      case "course_updated": return C.green;
    }
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
          {user.department}
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

  const activeCourses = courses.filter((c) => c.status === "active");
  const totalStudents = activeCourses.reduce((sum, c) => sum + c.student_count, 0);
  const totalQuestions = activeCourses.reduce((sum, c) => sum + c.question_count, 0);

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
            <button
              onClick={() => navigate("/faculty/courses/create")}
              style={{
                padding: isMobile ? "8px 14px" : "10px 18px",
                background: C.green,
                border: "none",
                borderRadius: 6,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 700,
                color: C.white,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.greenDark;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.green;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <Plus size={18} />
              {!isMobile && "New Course"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Stats */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Active Courses", value: activeCourses.length, icon: <BookOpen size={20} />, color: C.navyDeep },
              { label: "Total Students", value: totalStudents, icon: <Users size={20} />, color: C.blueMid },
              { label: "Question Bank", value: totalQuestions, icon: <FileText size={20} />, color: C.green },
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

          {/* My Courses */}
          <div style={{ ...fadeIn(0.1), marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                margin: 0,
              }}>
                My Courses
              </h2>
              <button
                onClick={() => navigate("/faculty/courses")}
                style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.blueMid,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                View All →
              </button>
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
              gap: 16,
            }}>
              {activeCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => navigate(`/faculty/courses/${course.id}`)}
                  style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: 20,
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
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
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 8,
                  }}>
                    {course.code}
                  </div>
                  <h3 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    margin: "0 0 4px",
                  }}>
                    {course.name}
                  </h3>
                  <p style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.textMuted,
                    margin: "0 0 16px",
                  }}>
                    {course.term}
                  </p>
                  <div style={{
                    background: C.parchment,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 6,
                    padding: 12,
                    display: "flex",
                    justifyContent: "space-between",
                  }}>
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
                        Students
                      </div>
                      <div style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.blueMid,
                      }}>
                        {course.student_count}
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
                        marginBottom: 2,
                      }}>
                        Questions
                      </div>
                      <div style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.green,
                      }}>
                        {course.question_count}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ ...fadeIn(0.15) }}>
            <h2 style={{
              fontFamily: serif,
              fontSize: 18,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 12,
            }}>
              Recent Activity
            </h2>
            <div style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 20 : 24,
            }}>
              {recentActivity.map((activity, index) => (
                <div key={activity.id} style={{
                  display: "flex",
                  gap: 16,
                  paddingBottom: 16,
                  marginBottom: index < recentActivity.length - 1 ? 16 : 0,
                  borderBottom: index < recentActivity.length - 1 ? `1px solid ${C.borderLight}` : "none",
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${getActivityColor(activity.type)}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: getActivityColor(activity.type),
                    flexShrink: 0,
                  }}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 15,
                      fontWeight: 600,
                      color: C.textPrimary,
                      margin: "0 0 4px",
                    }}>
                      {activity.description}
                    </p>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 10,
                      color: C.textMuted,
                    }}>
                      {activity.course_name} • {formatRelativeTime(activity.timestamp)}
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
