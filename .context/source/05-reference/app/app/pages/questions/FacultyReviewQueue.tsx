import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, Eye, Filter, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FACULTY REVIEW QUEUE (STORY-Q-3)
// Template B: Faculty Shell with question review queue
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

interface QuestionItem {
  id: string;
  stem: string;
  format: string;
  system: string;
  difficulty: string;
  bloom_level: string;
  subconcept: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  batch_id: string;
}

export default function FacultyReviewQueue() {
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

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    system: "all",
    difficulty: "all",
  });

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
    fetchQuestions();
  }, [filters]);

  const fetchQuestions = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockQuestions: QuestionItem[] = [
        {
          id: "1",
          stem: "A 62-year-old man presents to the emergency department with acute chest pain radiating to the left arm. The pain started 2 hours ago while he was mowing the lawn...",
          format: "Single Best Answer",
          system: "Cardiovascular",
          difficulty: "Medium",
          bloom_level: "Apply",
          subconcept: "STEMI: Diagnosis",
          status: "pending",
          created_at: "2026-02-20T10:45:00Z",
          batch_id: "batch_001",
        },
        {
          id: "2",
          stem: "A 68-year-old woman with a history of hypertension presents with progressive dyspnea on exertion over 3 months. Physical examination reveals bilateral lower extremity edema and crackles at lung bases...",
          format: "Single Best Answer",
          system: "Cardiovascular",
          difficulty: "Hard",
          bloom_level: "Analyze",
          subconcept: "Heart Failure: Diagnosis",
          status: "pending",
          created_at: "2026-02-20T10:42:00Z",
          batch_id: "batch_001",
        },
        {
          id: "3",
          stem: "A 55-year-old man is found to have an irregular pulse during a routine examination. He denies palpitations or chest pain. ECG shows absent P waves and irregularly irregular R-R intervals...",
          format: "Single Best Answer",
          system: "Cardiovascular",
          difficulty: "Medium",
          bloom_level: "Apply",
          subconcept: "Atrial Fibrillation: Treatment",
          status: "pending",
          created_at: "2026-02-20T10:38:00Z",
          batch_id: "batch_001",
        },
        {
          id: "4",
          stem: "A 45-year-old woman with type 2 diabetes presents for follow-up. Her most recent HbA1c is 8.2%. She is currently taking metformin 1000mg twice daily...",
          format: "Clinical Vignette",
          system: "Endocrine",
          difficulty: "Medium",
          bloom_level: "Apply",
          subconcept: "Diabetes Management",
          status: "approved",
          created_at: "2026-02-19T14:20:00Z",
          batch_id: "batch_002",
        },
      ];

      const filtered = mockQuestions.filter((q) => {
        if (filters.status !== "all" && q.status !== filters.status) return false;
        if (filters.system !== "all" && q.system !== filters.system) return false;
        if (filters.difficulty !== "all" && q.difficulty !== filters.difficulty) return false;
        return true;
      });

      setQuestions(filtered);
    } catch (err) {
      console.error("Failed to fetch questions", err);
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

  const getStatusColor = (status: QuestionItem["status"]) => {
    switch (status) {
      case "pending": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "approved": return { bg: `${C.green}15`, text: C.green, border: `${C.green}30` };
      case "rejected": return { bg: `${C.red}15`, text: C.red, border: `${C.red}30` };
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return C.green;
      case "Medium": return "#fa9d33";
      case "Hard": return C.red;
      default: return C.textMuted;
    }
  };

  const pendingCount = questions.filter((q) => q.status === "pending").length;
  const approvedCount = questions.filter((q) => q.status === "approved").length;
  const rejectedCount = questions.filter((q) => q.status === "rejected").length;

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
                  Review Queue
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Review and approve generated questions
                </p>
              </div>
            </div>
            <button
              onClick={fetchQuestions}
              style={{
                padding: isMobile ? "8px 12px" : "10px 16px",
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
              }}
            >
              <RefreshCw size={16} />
              {!isMobile && "Refresh"}
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
              { label: "Pending Review", value: pendingCount, icon: <Clock size={20} />, color: "#fa9d33" },
              { label: "Approved", value: approvedCount, icon: <CheckCircle size={20} />, color: C.green },
              { label: "Rejected", value: rejectedCount, icon: <XCircle size={20} />, color: C.red },
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

          {/* Filters */}
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
              alignItems: "center",
              gap: 12,
            }}>
              <Filter size={18} style={{ color: C.textMuted }} />
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{
                  height: 40,
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "0 32px 0 12px",
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.ink,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>

              <select
                value={filters.system}
                onChange={(e) => setFilters({ ...filters, system: e.target.value })}
                style={{
                  height: 40,
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "0 32px 0 12px",
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.ink,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Systems</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Nervous">Nervous System</option>
                <option value="Endocrine">Endocrine</option>
              </select>

              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                style={{
                  height: 40,
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "0 32px 0 12px",
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.ink,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question List */}
          <div style={{
            ...fadeIn(0.15),
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} style={{
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 12,
                  padding: 24,
                  height: 180,
                }} />
              ))
            ) : questions.length === 0 ? (
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: 64,
                textAlign: "center",
              }}>
                <h3 style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 8,
                }}>
                  No questions found
                </h3>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.textSecondary,
                }}>
                  Try adjusting your filters or generate new questions
                </p>
              </div>
            ) : (
              questions.map((question) => {
                const statusColors = getStatusColor(question.status);
                return (
                  <div
                    key={question.id}
                    onClick={() => navigate(`/questions/${question.id}`)}
                    style={{
                      background: C.white,
                      border: `1px solid ${C.borderLight}`,
                      borderRadius: 12,
                      padding: isMobile ? 20 : 24,
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
                    {/* Header */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      flexWrap: "wrap",
                      gap: 12,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                          {question.status}
                        </div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: getDifficultyColor(question.difficulty),
                          fontWeight: 600,
                        }}>
                          {question.difficulty}
                        </div>
                      </div>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: C.textMuted,
                      }}>
                        {formatRelativeTime(question.created_at)}
                      </div>
                    </div>

                    {/* Stem */}
                    <p style={{
                      fontFamily: sans,
                      fontSize: 15,
                      lineHeight: 1.6,
                      color: C.textPrimary,
                      margin: "0 0 16px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}>
                      {question.stem}
                    </p>

                    {/* Metadata */}
                    <div style={{
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 12,
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
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
                          marginBottom: 2,
                        }}>
                          System
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {question.system}
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
                          Format
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {question.format}
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
                          Subconcept
                        </div>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {question.subconcept}
                        </div>
                      </div>
                    </div>

                    {/* Review Button */}
                    <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                      <button
                        style={{
                          padding: "8px 16px",
                          background: C.blueMid,
                          border: "none",
                          borderRadius: 6,
                          fontFamily: sans,
                          fontSize: 13,
                          fontWeight: 600,
                          color: C.white,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Eye size={14} />
                        Review Question
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}