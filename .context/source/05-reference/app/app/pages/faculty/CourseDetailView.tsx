import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, Users, Edit, ChevronRight, Calendar, Target, TrendingUp, Activity, Download } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — COURSE DETAIL VIEW (STORY-F-3)
// Template B: Faculty Shell with course detail tabs
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
  description: string;
  student_count: number;
  question_count: number;
  status: "active" | "archived" | "draft";
  created_at: string;
  start_date: string;
  end_date: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  questions_completed: number;
  avg_score: number;
  last_activity: string;
}

interface QuestionStat {
  status: string;
  count: number;
  color: string;
}

export default function CourseDetailView() {
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
  const [activeNav, setActiveNav] = useState("courses");
  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "questions" | "analytics">("overview");

  const [course, setCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
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
    fetchCourseData();
  }, [id]);

  const fetchCourseData = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockCourse: Course = {
        id: id || "1",
        code: "PHARM-501",
        name: "Pharmacology I",
        term: "Spring 2026",
        description: "Introduction to pharmacology principles, drug mechanisms, and therapeutic applications. Covers autonomic nervous system, cardiovascular, and CNS pharmacology.",
        student_count: 48,
        question_count: 156,
        status: "active",
        created_at: "2026-01-15T10:00:00Z",
        start_date: "2026-01-20",
        end_date: "2026-05-15",
      };

      const mockStudents: Student[] = [
        { id: "1", name: "Sarah Johnson", email: "sjohnson@msm.edu", questions_completed: 142, avg_score: 87, last_activity: "2026-02-20T08:30:00Z" },
        { id: "2", name: "Michael Chen", email: "mchen@msm.edu", questions_completed: 138, avg_score: 92, last_activity: "2026-02-19T14:20:00Z" },
        { id: "3", name: "Emily Rodriguez", email: "erodriguez@msm.edu", questions_completed: 145, avg_score: 85, last_activity: "2026-02-20T09:15:00Z" },
        { id: "4", name: "David Park", email: "dpark@msm.edu", questions_completed: 120, avg_score: 78, last_activity: "2026-02-18T16:00:00Z" },
      ];

      const mockQuestionStats: QuestionStat[] = [
        { status: "Approved", count: 124, color: C.green },
        { status: "In Review", count: 18, color: "#fa9d33" },
        { status: "Draft", count: 14, color: C.textMuted },
      ];

      setCourse(mockCourse);
      setStudents(mockStudents);
      setQuestionStats(mockQuestionStats);
    } catch (err) {
      console.error("Failed to fetch course data", err);
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

  const tabs = [
    { key: "overview" as const, label: "Overview", Icon: LayoutDashboard },
    { key: "roster" as const, label: "Roster", Icon: Users },
    { key: "questions" as const, label: "Questions", Icon: FileText },
    { key: "analytics" as const, label: "Analytics", Icon: TrendingUp },
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

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateString));
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

  const getStatusColor = (status: Course["status"]) => {
    switch (status) {
      case "active": return { bg: "rgba(105,163,56,0.1)", text: C.green, border: "rgba(105,163,56,0.2)" };
      case "draft": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "archived": return { bg: "rgba(0,44,118,0.1)", text: C.textMuted, border: "rgba(0,44,118,0.1)" };
    }
  };

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

  if (loading || !course) {
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
            fontFamily: sans,
            fontSize: 15,
            color: C.textMuted,
          }}>
            Loading course...
          </div>
        </div>
      </>
    );
  }

  const statusColors = getStatusColor(course.status);

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
        }}>
          <div style={{ padding: isMobile ? "16px 16px" : "20px 32px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
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
                  onClick={() => navigate("/faculty/courses")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: C.blueMid,
                  }}
                >
                  <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
                  Back to Courses
                </button>
              </div>
              <button
                onClick={() => navigate(`/faculty/courses/${id}/edit`)}
                style={{
                  padding: isMobile ? "8px 14px" : "10px 18px",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.navyDeep,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = C.blueMid;
                  e.currentTarget.style.color = C.blueMid;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = C.border;
                  e.currentTarget.style.color = C.navyDeep;
                }}
              >
                <Edit size={16} />
                {!isMobile && "Edit Course"}
              </button>
            </div>

            {/* Course Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                fontFamily: mono,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: C.navyDeep,
                background: C.parchment,
                border: `1px solid ${C.border}`,
                padding: "6px 10px",
                borderRadius: 6,
              }}>
                {course.code}
              </div>
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
                {course.status}
              </div>
            </div>
            <h1 style={{
              fontFamily: serif,
              fontSize: isMobile ? 24 : 32,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              margin: "0 0 4px",
            }}>
              {course.name}
            </h1>
            <p style={{
              fontFamily: sans,
              fontSize: 14,
              color: C.textSecondary,
              margin: 0,
            }}>
              {course.term}
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex",
            gap: 4,
            padding: "0 32px",
            borderTop: `1px solid ${C.borderLight}`,
          }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 20px",
                    background: "transparent",
                    border: "none",
                    borderBottom: isActive ? `3px solid ${C.greenDark}` : "3px solid transparent",
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 600,
                    color: isActive ? C.navyDeep : C.textSecondary,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = C.navyDeep;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = C.textSecondary;
                  }}
                >
                  <tab.Icon size={16} />
                  {!isMobile && tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {activeTab === "overview" && (
            <>
              {/* Stats */}
              <div style={{
                ...fadeIn(0.05),
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}>
                {[
                  { label: "Students", value: course.student_count, icon: <Users size={20} />, color: C.blueMid },
                  { label: "Questions", value: course.question_count, icon: <FileText size={20} />, color: C.green },
                  { label: "Avg Performance", value: "85%", icon: <TrendingUp size={20} />, color: C.navyDeep },
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
                gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "2fr 1fr",
                gap: 24,
              }}>
                {/* Course Info */}
                <div style={{ ...fadeIn(0.1) }}>
                  <h2 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    marginBottom: 12,
                  }}>
                    Course Information
                  </h2>
                  <div style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 8,
                      }}>
                        Description
                      </div>
                      <p style={{
                        fontFamily: sans,
                        fontSize: 15,
                        lineHeight: 1.6,
                        color: C.textPrimary,
                        margin: 0,
                      }}>
                        {course.description}
                      </p>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                    }}>
                      <div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                          marginBottom: 6,
                        }}>
                          Start Date
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.textPrimary,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                          <Calendar size={16} style={{ color: C.blueMid }} />
                          {formatDate(course.start_date)}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                          marginBottom: 6,
                        }}>
                          End Date
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.textPrimary,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}>
                          <Calendar size={16} style={{ color: C.blueMid }} />
                          {formatDate(course.end_date)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question Stats */}
                <div style={{ ...fadeIn(0.15) }}>
                  <h2 style={{
                    fontFamily: serif,
                    fontSize: 18,
                    fontWeight: 700,
                    color: C.navyDeep,
                    marginBottom: 12,
                  }}>
                    Question Bank
                  </h2>
                  <div style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: 24,
                  }}>
                    {questionStats.map((stat) => (
                      <div key={stat.status} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 0",
                        borderBottom: `1px solid ${C.borderLight}`,
                      }}>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {stat.status}
                        </div>
                        <div style={{
                          fontFamily: serif,
                          fontSize: 20,
                          fontWeight: 700,
                          color: stat.color,
                        }}>
                          {stat.count}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => navigate(`/faculty/courses/${id}/questions`)}
                      style={{
                        width: "100%",
                        marginTop: 16,
                        padding: "10px 18px",
                        background: C.green,
                        border: "none",
                        borderRadius: 6,
                        fontFamily: sans,
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.white,
                        cursor: "pointer",
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
                      View All Questions
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "roster" && (
            <div style={{ ...fadeIn(0.05) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.navyDeep,
                  margin: 0,
                }}>
                  Student Roster
                </h2>
                <button
                  onClick={() => navigate(`/faculty/courses/${id}/roster`)}
                  style={{
                    padding: "8px 16px",
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
                  }}
                >
                  <Plus size={16} />
                  Manage Roster
                </button>
              </div>

              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                overflow: "hidden",
              }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                      <tr>
                        {["Name", "Email", "Questions", "Avg Score", "Last Activity"].map((col) => (
                          <th key={col} style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: C.textMuted,
                            whiteSpace: "nowrap",
                          }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr
                          key={student.id}
                          style={{
                            background: C.white,
                            borderBottom: `1px solid ${C.borderLight}`,
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = C.parchment;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = C.white;
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: sans,
                              fontSize: 15,
                              fontWeight: 600,
                              color: C.textPrimary,
                            }}>
                              {student.name}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 12,
                              color: C.textSecondary,
                            }}>
                              {student.email}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: serif,
                              fontSize: 18,
                              fontWeight: 700,
                              color: C.blueMid,
                            }}>
                              {student.questions_completed}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: serif,
                              fontSize: 18,
                              fontWeight: 700,
                              color: student.avg_score >= 80 ? C.green : student.avg_score >= 70 ? "#fa9d33" : C.red,
                            }}>
                              {student.avg_score}%
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 10,
                              color: C.textMuted,
                            }}>
                              {formatRelativeTime(student.last_activity)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "questions" && (
            <div style={{ ...fadeIn(0.05), textAlign: "center", padding: 64 }}>
              <FileText size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
              <h3 style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 8,
              }}>
                Question Management
              </h3>
              <p style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textSecondary,
                marginBottom: 24,
              }}>
                View and manage all questions for this course
              </p>
              <button
                onClick={() => navigate(`/faculty/courses/${id}/questions`)}
                style={{
                  padding: "10px 24px",
                  background: C.green,
                  border: "none",
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.white,
                  cursor: "pointer",
                }}
              >
                View Question Bank
              </button>
            </div>
          )}

          {activeTab === "analytics" && (
            <div style={{ ...fadeIn(0.05), textAlign: "center", padding: 64 }}>
              <TrendingUp size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
              <h3 style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 8,
              }}>
                Course Analytics
              </h3>
              <p style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textSecondary,
                marginBottom: 24,
              }}>
                View detailed analytics and insights for this course
              </p>
              <button
                onClick={() => navigate(`/faculty/courses/${id}/analytics`)}
                style={{
                  padding: "10px 24px",
                  background: C.green,
                  border: "none",
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.white,
                  cursor: "pointer",
                }}
              >
                View Full Analytics
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
