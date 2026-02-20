import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — QUESTION PERFORMANCE METRICS (STORY-A-2)
// Template B: Faculty Shell with question analytics
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

interface QuestionMetric {
  id: string;
  stem: string;
  system: string;
  difficulty: string;
  usage_count: number;
  avg_score: number;
  discrimination_index: number;
  status: "excellent" | "good" | "review" | "retire";
}

export default function QuestionPerformanceMetrics() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("questions");

  const [questions, setQuestions] = useState<QuestionMetric[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/faculty" || path === "/faculty/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/faculty/courses")) setActiveNav("courses");
    else if (path.startsWith("/faculty/questions")) setActiveNav("questions");
    else if (path.startsWith("/faculty/exams")) setActiveNav("exams");
    else if (path.startsWith("/faculty/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchQuestionMetrics();
  }, [filterStatus]);

  const fetchQuestionMetrics = async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mockQuestions: QuestionMetric[] = [
      {
        id: "1",
        stem: "A 62-year-old man presents with acute chest pain radiating to the left arm...",
        system: "Cardiovascular",
        difficulty: "Medium",
        usage_count: 45,
        avg_score: 0.82,
        discrimination_index: 0.38,
        status: "excellent",
      },
      {
        id: "2",
        stem: "Which of the following is the primary mechanism of action for ACE inhibitors...",
        system: "Cardiovascular",
        difficulty: "Easy",
        usage_count: 67,
        avg_score: 0.91,
        discrimination_index: 0.28,
        status: "good",
      },
      {
        id: "3",
        stem: "A 68-year-old woman with progressive dyspnea on exertion over 3 months...",
        system: "Respiratory",
        difficulty: "Hard",
        usage_count: 23,
        avg_score: 0.45,
        discrimination_index: 0.15,
        status: "review",
      },
      {
        id: "4",
        stem: "A 3-month-old infant presents with cyanosis and a systolic murmur...",
        system: "Cardiovascular",
        difficulty: "Hard",
        usage_count: 34,
        avg_score: 0.78,
        discrimination_index: 0.42,
        status: "excellent",
      },
      {
        id: "5",
        stem: "Which neurotransmitter is primarily affected by selective serotonin reuptake...",
        system: "Nervous",
        difficulty: "Easy",
        usage_count: 89,
        avg_score: 0.95,
        discrimination_index: 0.08,
        status: "retire",
      },
    ];

    const filtered = filterStatus === "all" ? mockQuestions : mockQuestions.filter((q) => q.status === filterStatus);
    setQuestions(filtered);
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/faculty/dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/faculty/courses" },
    { key: "questions", label: "Question Analytics", Icon: FileText, path: "/faculty/questions/analytics" },
    { key: "exams", label: "Exam Builder", Icon: Plus, path: "/faculty/exams" },
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

  const getStatusConfig = (status: QuestionMetric["status"]) => {
    switch (status) {
      case "excellent":
        return { label: "Excellent", color: C.green, icon: <CheckCircle size={16} /> };
      case "good":
        return { label: "Good", color: C.blueMid, icon: <CheckCircle size={16} /> };
      case "review":
        return { label: "Needs Review", color: "#fa9d33", icon: <AlertCircle size={16} /> };
      case "retire":
        return { label: "Consider Retiring", color: C.red, icon: <AlertCircle size={16} /> };
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
                Question Performance
              </h1>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                margin: "4px 0 0",
              }}>
                Analytics and metrics for your questions
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Summary Cards */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Total Questions", value: questions.length, color: C.blueMid },
              { label: "Excellent", value: questions.filter((q) => q.status === "excellent").length, color: C.green },
              { label: "Need Review", value: questions.filter((q) => q.status === "review").length, color: "#fa9d33" },
              { label: "Consider Retiring", value: questions.filter((q) => q.status === "retire").length, color: C.red },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 20,
              }}>
                <div style={{
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 8,
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontFamily: serif,
                  fontSize: 32,
                  fontWeight: 700,
                  color: stat.color,
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div style={{
            ...fadeIn(0.1),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 16 : 20,
            marginBottom: 20,
          }}>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}>
              {[
                { key: "all", label: "All Questions" },
                { key: "excellent", label: "Excellent" },
                { key: "good", label: "Good" },
                { key: "review", label: "Needs Review" },
                { key: "retire", label: "Consider Retiring" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterStatus(filter.key)}
                  style={{
                    padding: "8px 16px",
                    background: filterStatus === filter.key ? C.navyDeep : "transparent",
                    border: `1px solid ${filterStatus === filter.key ? C.navyDeep : C.border}`,
                    borderRadius: 8,
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: filterStatus === filter.key ? C.white : C.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions List */}
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
                Question Analytics
              </h2>
            </div>

            <div>
              {questions.map((question, index) => {
                const statusConfig = getStatusConfig(question.status);
                
                return (
                  <div
                    key={question.id}
                    style={{
                      padding: isMobile ? "16px 20px" : "24px",
                      borderBottom: index < questions.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}>
                      <div style={{ flex: 1, marginRight: 16 }}>
                        <p style={{
                          fontFamily: sans,
                          fontSize: 15,
                          lineHeight: 1.6,
                          color: C.textPrimary,
                          margin: "0 0 8px",
                        }}>
                          {question.stem.substring(0, 120)}...
                        </p>
                        <div style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          fontFamily: mono,
                          fontSize: 10,
                          color: C.textMuted,
                        }}>
                          <span>{question.system}</span>
                          <span>•</span>
                          <span>{question.difficulty}</span>
                          <span>•</span>
                          <span>Used {question.usage_count} times</span>
                        </div>
                      </div>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        background: `${statusConfig.color}15`,
                        border: `1px solid ${statusConfig.color}40`,
                        borderRadius: 6,
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 600,
                        color: statusConfig.color,
                        whiteSpace: "nowrap",
                      }}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </div>
                    </div>

                    <div style={{
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 16,
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                      gap: 16,
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
                          Avg Score
                        </div>
                        <div style={{
                          fontFamily: serif,
                          fontSize: 24,
                          fontWeight: 700,
                          color: question.avg_score >= 0.7 ? C.green : question.avg_score >= 0.5 ? "#fa9d33" : C.red,
                        }}>
                          {Math.round(question.avg_score * 100)}%
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
                          Discrimination
                        </div>
                        <div style={{
                          fontFamily: serif,
                          fontSize: 24,
                          fontWeight: 700,
                          color: question.discrimination_index >= 0.3 ? C.green : question.discrimination_index >= 0.2 ? "#fa9d33" : C.red,
                        }}>
                          {question.discrimination_index.toFixed(2)}
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
                          Usage Count
                        </div>
                        <div style={{
                          fontFamily: serif,
                          fontSize: 24,
                          fontWeight: 700,
                          color: C.blueMid,
                        }}>
                          {question.usage_count}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
