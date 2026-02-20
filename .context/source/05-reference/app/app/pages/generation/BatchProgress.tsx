import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, CheckCircle, Clock, AlertCircle, XCircle, Eye } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — BATCH PROGRESS TRACKER (STORY-Q-2)
// Template B: Faculty Shell with real-time generation progress
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

interface QuestionProgress {
  id: string;
  topic: string;
  status: "pending" | "generating" | "completed" | "failed";
  progress: number;
  timestamp: string;
}

export default function BatchProgress() {
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

  const [batchStatus, setBatchStatus] = useState<"generating" | "completed" | "partial_failure">("generating");
  const [questions, setQuestions] = useState<QuestionProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

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
    // Initialize questions
    const initialQuestions: QuestionProgress[] = [
      { id: "1", topic: "Normal Cardiac Function", status: "generating", progress: 45, timestamp: new Date().toISOString() },
      { id: "2", topic: "Pathologic Processes", status: "pending", progress: 0, timestamp: new Date().toISOString() },
      { id: "3", topic: "Congenital Defects", status: "pending", progress: 0, timestamp: new Date().toISOString() },
      { id: "4", topic: "Pharmacology", status: "pending", progress: 0, timestamp: new Date().toISOString() },
      { id: "5", topic: "Normal Neural Function", status: "pending", progress: 0, timestamp: new Date().toISOString() },
    ];
    setQuestions(initialQuestions);

    // Simulate progress updates
    const interval = setInterval(() => {
      setQuestions((prev) => {
        const updated = [...prev];
        let allCompleted = true;

        for (let i = 0; i < updated.length; i++) {
          if (updated[i].status === "generating") {
            updated[i].progress = Math.min(100, updated[i].progress + Math.random() * 15);
            if (updated[i].progress >= 100) {
              updated[i].status = "completed";
              updated[i].progress = 100;
              updated[i].timestamp = new Date().toISOString();

              // Start next question
              if (i + 1 < updated.length && updated[i + 1].status === "pending") {
                updated[i + 1].status = "generating";
                updated[i + 1].progress = 5;
              }
            }
            allCompleted = false;
          } else if (updated[i].status === "pending" || updated[i].status === "generating") {
            allCompleted = false;
          }
        }

        if (allCompleted) {
          setBatchStatus("completed");
          clearInterval(interval);
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const completed = questions.filter((q) => q.status === "completed").length;
    const total = questions.length;
    setOverallProgress(total > 0 ? Math.round((completed / total) * 100) : 0);
  }, [questions]);

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

  const getStatusIcon = (status: QuestionProgress["status"]) => {
    switch (status) {
      case "completed": return <CheckCircle size={20} style={{ color: C.green }} />;
      case "generating": return <Clock size={20} style={{ color: C.blueMid }} />;
      case "failed": return <XCircle size={20} style={{ color: C.red }} />;
      case "pending": return <Clock size={20} style={{ color: C.textMuted }} />;
    }
  };

  const getStatusColor = (status: QuestionProgress["status"]) => {
    switch (status) {
      case "completed": return { bg: `${C.green}15`, text: C.green, border: `${C.green}30` };
      case "generating": return { bg: `${C.blueMid}15`, text: C.blueMid, border: `${C.blueMid}30` };
      case "failed": return { bg: `${C.red}15`, text: C.red, border: `${C.red}30` };
      case "pending": return { bg: C.parchment, text: C.textMuted, border: C.border };
    }
  };

  const completedCount = questions.filter((q) => q.status === "completed").length;
  const generatingCount = questions.filter((q) => q.status === "generating").length;
  const failedCount = questions.filter((q) => q.status === "failed").length;

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
                Generation Progress
              </h1>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                margin: "4px 0 0",
              }}>
                {batchStatus === "generating" ? "Generating questions..." : "Generation complete"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1200 }}>
          {/* Overall Progress */}
          <div style={{
            ...fadeIn(0.05),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 20 : 28,
            marginBottom: 24,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: 20,
                fontWeight: 700,
                color: C.navyDeep,
                margin: 0,
              }}>
                Overall Progress
              </h2>
              <div style={{
                fontFamily: serif,
                fontSize: 28,
                fontWeight: 700,
                color: batchStatus === "completed" ? C.green : C.blueMid,
              }}>
                {overallProgress}%
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: "100%",
              height: 12,
              background: C.parchment,
              borderRadius: 6,
              overflow: "hidden",
              marginBottom: 16,
            }}>
              <div style={{
                height: "100%",
                width: `${overallProgress}%`,
                background: batchStatus === "completed" ? C.green : `linear-gradient(90deg, ${C.blueMid}, ${C.blueLight})`,
                transition: "width 0.5s ease",
              }} />
            </div>

            {/* Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: 16,
            }}>
              {[
                { label: "Completed", value: completedCount, color: C.green },
                { label: "In Progress", value: generatingCount, color: C.blueMid },
                { label: "Failed", value: failedCount, color: C.red },
              ].map((stat) => (
                <div key={stat.label} style={{
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 16,
                  textAlign: "center",
                }}>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 6,
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
          </div>

          {/* Question List */}
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
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                margin: 0,
              }}>
                Question Generation Status
              </h2>
            </div>

            <div>
              {questions.map((question, index) => {
                const statusColors = getStatusColor(question.status);
                return (
                  <div
                    key={question.id}
                    style={{
                      padding: isMobile ? "16px 20px" : "20px 24px",
                      borderBottom: index < questions.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: question.status === "generating" ? 12 : 0,
                    }}>
                      {getStatusIcon(question.status)}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.textPrimary,
                          marginBottom: 4,
                        }}>
                          {question.topic}
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
                          {question.status.replace("_", " ")}
                        </div>
                      </div>
                      {question.status === "completed" && (
                        <button
                          onClick={() => navigate(`/questions/${question.id}`)}
                          style={{
                            padding: "8px 16px",
                            background: C.white,
                            border: `1px solid ${C.border}`,
                            borderRadius: 6,
                            fontFamily: sans,
                            fontSize: 13,
                            fontWeight: 600,
                            color: C.blueMid,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Eye size={14} />
                          Review
                        </button>
                      )}
                    </div>

                    {question.status === "generating" && (
                      <div style={{
                        marginLeft: 36,
                      }}>
                        <div style={{
                          width: "100%",
                          height: 6,
                          background: C.parchment,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${question.progress}%`,
                            background: C.blueMid,
                            transition: "width 0.3s ease",
                          }} />
                        </div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: C.textMuted,
                          marginTop: 6,
                        }}>
                          {Math.round(question.progress)}% complete
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          {batchStatus === "completed" && (
            <div style={{
              ...fadeIn(0.15),
              display: "flex",
              gap: 12,
              marginTop: 24,
              justifyContent: "center",
            }}>
              <button
                onClick={() => navigate("/questions/review")}
                style={{
                  padding: "12px 24px",
                  background: C.green,
                  border: "none",
                  borderRadius: 8,
                  fontFamily: sans,
                  fontSize: 15,
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
                Review All Questions
              </button>
              <button
                onClick={() => navigate("/faculty/questions/generate")}
                style={{
                  padding: "12px 24px",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.navyDeep,
                  cursor: "pointer",
                }}
              >
                Generate More
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
