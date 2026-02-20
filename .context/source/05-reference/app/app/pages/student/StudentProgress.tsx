import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, Dumbbell, TrendingUp, BookMarked, TrendingDown, Target, Award, Clock } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT PROGRESS/ANALYTICS (STORY-S-3)
// Template: Student Shell with performance analytics
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

interface TopicMastery {
  topic: string;
  mastery: number;
  questions_attempted: number;
  trend: "improving" | "stable" | "declining";
}

interface RecentSession {
  id: string;
  title: string;
  date: string;
  score: number;
  questions: number;
  time_spent: number;
}

export default function StudentProgress() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("progress");

  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");
  const [topicMastery, setTopicMastery] = useState<TopicMastery[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/student" || path === "/student-dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/courses")) setActiveNav("courses");
    else if (path.startsWith("/student/practice")) setActiveNav("practice");
    else if (path.startsWith("/student/progress")) setActiveNav("progress");
    else if (path.startsWith("/repository")) setActiveNav("resources");
  }, [location.pathname]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockTopics: TopicMastery[] = [
        { topic: "Cardiovascular Pharmacology", mastery: 0.85, questions_attempted: 142, trend: "improving" },
        { topic: "Respiratory Pathophysiology", mastery: 0.78, questions_attempted: 98, trend: "stable" },
        { topic: "Autonomic Nervous System", mastery: 0.72, questions_attempted: 76, trend: "improving" },
        { topic: "Renal Pharmacology", mastery: 0.65, questions_attempted: 54, trend: "declining" },
        { topic: "Endocrine System", mastery: 0.58, questions_attempted: 42, trend: "stable" },
        { topic: "CNS Pharmacology", mastery: 0.52, questions_attempted: 38, trend: "improving" },
      ];

      const mockSessions: RecentSession[] = [
        {
          id: "1",
          title: "Cardiovascular Pharmacology Review",
          date: "2026-02-20T14:30:00Z",
          score: 85,
          questions: 20,
          time_spent: 28,
        },
        {
          id: "2",
          title: "Quick Practice Session",
          date: "2026-02-19T10:15:00Z",
          score: 78,
          questions: 15,
          time_spent: 18,
        },
        {
          id: "3",
          title: "Respiratory System Review",
          date: "2026-02-18T16:45:00Z",
          score: 82,
          questions: 18,
          time_spent: 25,
        },
        {
          id: "4",
          title: "Mixed USMLE Practice",
          date: "2026-02-17T13:20:00Z",
          score: 73,
          questions: 30,
          time_spent: 42,
        },
        {
          id: "5",
          title: "Autonomic NS Focus",
          date: "2026-02-16T09:00:00Z",
          score: 88,
          questions: 12,
          time_spent: 16,
        },
      ];

      setTopicMastery(mockTopics);
      setRecentSessions(mockSessions);
    } catch (err) {
      console.error("Failed to fetch analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/student-dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/courses" },
    { key: "practice", label: "Practice", Icon: Dumbbell, path: "/student/practice" },
    { key: "progress", label: "Progress", Icon: TrendingUp, path: "/student/progress" },
    { key: "resources", label: "Resources", Icon: BookMarked, path: "/repository" },
  ];

  const user = { name: "John Mitchell", initials: "JM", role: "Student", year: "M2" };

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

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.8) return C.green;
    if (mastery >= 0.6) return "#fa9d33";
    return C.red;
  };

  const getTrendIcon = (trend: TopicMastery["trend"]) => {
    switch (trend) {
      case "improving": return <TrendingUp size={16} style={{ color: C.green }} />;
      case "declining": return <TrendingDown size={16} style={{ color: C.red }} />;
      case "stable": return <div style={{ width: 16, height: 2, background: C.textMuted }} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
  };

  const avgScore = recentSessions.reduce((sum, s) => sum + s.score, 0) / recentSessions.length;
  const totalQuestions = recentSessions.reduce((sum, s) => sum + s.questions, 0);
  const totalTime = recentSessions.reduce((sum, s) => sum + s.time_spent, 0);
  const currentStreak = 12; // Mock data

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
          {user.year}
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
                  My Progress
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Track your performance and mastery
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["week", "month", "all"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  style={{
                    padding: isMobile ? "6px 12px" : "8px 16px",
                    background: timeRange === range ? C.navyDeep : C.white,
                    border: `1px solid ${timeRange === range ? C.navyDeep : C.border}`,
                    borderRadius: 6,
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: timeRange === range ? C.white : C.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Stats */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Average Score", value: `${Math.round(avgScore)}%`, icon: <Target size={20} />, color: avgScore >= 80 ? C.green : "#fa9d33" },
              { label: "Questions Done", value: totalQuestions, icon: <BookOpen size={20} />, color: C.blueMid },
              { label: "Study Time", value: `${Math.floor(totalTime / 60)}h ${totalTime % 60}m`, icon: <Clock size={20} />, color: C.navyDeep },
              { label: "Current Streak", value: `${currentStreak} days`, icon: <Award size={20} />, color: C.green },
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
            gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
            gap: 24,
          }}>
            {/* Topic Mastery */}
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
              }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.navyDeep,
                  margin: 0,
                }}>
                  Topic Mastery
                </h2>
              </div>

              <div style={{ padding: isMobile ? 16 : 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {topicMastery.map((topic) => (
                    <div key={topic.topic}>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {topic.topic}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {getTrendIcon(topic.trend)}
                          <span style={{
                            fontFamily: serif,
                            fontSize: 18,
                            fontWeight: 700,
                            color: getMasteryColor(topic.mastery),
                          }}>
                            {Math.round(topic.mastery * 100)}%
                          </span>
                        </div>
                      </div>
                      <div style={{
                        width: "100%",
                        height: 8,
                        background: C.parchment,
                        borderRadius: 4,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${topic.mastery * 100}%`,
                          background: getMasteryColor(topic.mastery),
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: C.textMuted,
                        marginTop: 4,
                      }}>
                        {topic.questions_attempted} questions attempted
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
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
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.navyDeep,
                  margin: 0,
                }}>
                  Recent Sessions
                </h2>
              </div>

              <div>
                {recentSessions.map((session, index) => (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/student/results/${session.id}`)}
                    style={{
                      padding: isMobile ? "16px 20px" : "20px 24px",
                      borderBottom: index < recentSessions.length - 1 ? `1px solid ${C.borderLight}` : "none",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = C.parchment;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.textPrimary,
                      }}>
                        {session.title}
                      </div>
                      <div style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: session.score >= 80 ? C.green : session.score >= 60 ? "#fa9d33" : C.red,
                      }}>
                        {session.score}%
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      fontFamily: mono,
                      fontSize: 10,
                      color: C.textMuted,
                    }}>
                      <span>{session.questions} questions</span>
                      <span>•</span>
                      <span>{session.time_spent} min</span>
                      <span>•</span>
                      <span>{formatDate(session.date)}</span>
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
