import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, Dumbbell, TrendingUp, BookMarked, Play, Settings, Filter, Clock, Target, Brain } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT PRACTICE MODE (STORY-S-2)
// Template: Student Shell with practice session configuration
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

interface PracticeSet {
  id: string;
  title: string;
  description: string;
  question_count: number;
  estimated_time: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  topics: string[];
  last_attempted?: string;
  best_score?: number;
}

export default function StudentPractice() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("practice");

  const [practiceSets, setPracticeSets] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<"quick" | "custom" | "sets">("sets");
  const [filters, setFilters] = useState({
    difficulty: "all",
    topics: "all",
  });

  // Quick Practice Config
  const [quickConfig, setQuickConfig] = useState({
    question_count: 10,
    time_limit: 15,
    include_weak_areas: true,
  });

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
    fetchPracticeSets();
  }, [filters]);

  const fetchPracticeSets = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockSets: PracticeSet[] = [
        {
          id: "1",
          title: "Cardiovascular Pharmacology Review",
          description: "Focus on beta-blockers, ACE inhibitors, and diuretics",
          question_count: 20,
          estimated_time: 30,
          difficulty: "Medium",
          topics: ["Cardiovascular", "Pharmacology"],
          last_attempted: "2026-02-19T14:30:00Z",
          best_score: 85,
        },
        {
          id: "2",
          title: "Respiratory System Pathophysiology",
          description: "COPD, Asthma, and Pneumonia clinical scenarios",
          question_count: 15,
          estimated_time: 25,
          difficulty: "Hard",
          topics: ["Respiratory", "Pathophysiology"],
          last_attempted: "2026-02-18T10:15:00Z",
          best_score: 73,
        },
        {
          id: "3",
          title: "Autonomic Nervous System",
          description: "Sympathetic and parasympathetic pharmacology",
          question_count: 12,
          estimated_time: 20,
          difficulty: "Medium",
          topics: ["Nervous System", "Pharmacology"],
        },
        {
          id: "4",
          title: "Renal Pharmacology Basics",
          description: "Diuretics mechanism and clinical applications",
          question_count: 18,
          estimated_time: 25,
          difficulty: "Easy",
          topics: ["Renal", "Pharmacology"],
          best_score: 92,
        },
        {
          id: "5",
          title: "Mixed USMLE Practice",
          description: "Multi-system integration questions",
          question_count: 30,
          estimated_time: 45,
          difficulty: "Mixed",
          topics: ["Cardiovascular", "Respiratory", "Renal", "Endocrine"],
          last_attempted: "2026-02-17T16:00:00Z",
          best_score: 78,
        },
      ];

      let filtered = mockSets.filter((set) => {
        if (filters.difficulty !== "all" && set.difficulty !== filters.difficulty) return false;
        if (filters.topics !== "all" && !set.topics.includes(filters.topics)) return false;
        return true;
      });

      setPracticeSets(filtered);
    } catch (err) {
      console.error("Failed to fetch practice sets", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuickPractice = () => {
    // Navigate to practice session
    navigate("/student/practice/session/quick");
  };

  const handleStartPracticeSet = (setId: string) => {
    navigate(`/student/practice/session/${setId}`);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return C.green;
      case "Medium": return "#fa9d33";
      case "Hard": return C.red;
      case "Mixed": return C.blueMid;
      default: return C.textMuted;
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
                Practice Mode
              </h1>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                margin: "4px 0 0",
              }}>
                Choose a practice set or start a quick session
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Mode Selector */}
          <div style={{
            ...fadeIn(0.05),
            display: "flex",
            gap: 12,
            marginBottom: 24,
          }}>
            {[
              { key: "sets", label: "Practice Sets" },
              { key: "quick", label: "Quick Practice" },
              { key: "custom", label: "Custom Session" },
            ].map((mode) => (
              <button
                key={mode.key}
                onClick={() => setSelectedMode(mode.key as any)}
                style={{
                  padding: "10px 20px",
                  background: selectedMode === mode.key ? C.navyDeep : C.white,
                  border: `1px solid ${selectedMode === mode.key ? C.navyDeep : C.border}`,
                  borderRadius: 8,
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: selectedMode === mode.key ? C.white : C.textPrimary,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Quick Practice */}
          {selectedMode === "quick" && (
            <div style={{
              ...fadeIn(0.1),
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 24 : 32,
              maxWidth: 600,
            }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 24,
              }}>
                Quick Practice Session
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Question Count */}
                <div>
                  <label style={{
                    display: "block",
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 12,
                  }}>
                    Number of Questions: {quickConfig.question_count}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={quickConfig.question_count}
                    onChange={(e) => setQuickConfig({ ...quickConfig, question_count: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      height: 6,
                      background: C.parchment,
                      borderRadius: 3,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontFamily: mono,
                    fontSize: 10,
                    color: C.textMuted,
                  }}>
                    <span>5</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Time Limit */}
                <div>
                  <label style={{
                    display: "block",
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 12,
                  }}>
                    Time Limit: {quickConfig.time_limit} minutes
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={quickConfig.time_limit}
                    onChange={(e) => setQuickConfig({ ...quickConfig, time_limit: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      height: 6,
                      background: C.parchment,
                      borderRadius: 3,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  />
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6,
                    fontFamily: mono,
                    fontSize: 10,
                    color: C.textMuted,
                  }}>
                    <span>5 min</span>
                    <span>60 min</span>
                  </div>
                </div>

                {/* Include Weak Areas */}
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                }}>
                  <input
                    type="checkbox"
                    checked={quickConfig.include_weak_areas}
                    onChange={(e) => setQuickConfig({ ...quickConfig, include_weak_areas: e.target.checked })}
                    style={{
                      width: 18,
                      height: 18,
                      cursor: "pointer",
                    }}
                  />
                  <span style={{
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 600,
                    color: C.textPrimary,
                  }}>
                    Include questions from my weak areas
                  </span>
                </label>

                {/* Start Button */}
                <button
                  onClick={handleStartQuickPractice}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: C.green,
                    border: "none",
                    borderRadius: 8,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
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
                  <Play size={20} />
                  Start Quick Practice
                </button>
              </div>
            </div>
          )}

          {/* Practice Sets */}
          {selectedMode === "sets" && (
            <>
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
                    <option value="Mixed">Mixed</option>
                  </select>

                  <select
                    value={filters.topics}
                    onChange={(e) => setFilters({ ...filters, topics: e.target.value })}
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
                    <option value="all">All Topics</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Nervous System">Nervous System</option>
                    <option value="Renal">Renal</option>
                    <option value="Endocrine">Endocrine</option>
                  </select>
                </div>
              </div>

              {/* Practice Sets Grid */}
              <div style={{
                ...fadeIn(0.15),
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "repeat(2, 1fr)",
                gap: 16,
              }}>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} style={{
                      background: C.white,
                      border: `1px solid ${C.borderLight}`,
                      borderRadius: 12,
                      padding: 24,
                      height: 220,
                    }} />
                  ))
                ) : practiceSets.length === 0 ? (
                  <div style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: 64,
                    textAlign: "center",
                    gridColumn: "1 / -1",
                  }}>
                    <Dumbbell size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
                    <h3 style={{
                      fontFamily: serif,
                      fontSize: 22,
                      fontWeight: 700,
                      color: C.navyDeep,
                      marginBottom: 8,
                    }}>
                      No practice sets found
                    </h3>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 15,
                      color: C.textSecondary,
                    }}>
                      Try adjusting your filters
                    </p>
                  </div>
                ) : (
                  practiceSets.map((set) => (
                    <div
                      key={set.id}
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
                      }}>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 600,
                          color: getDifficultyColor(set.difficulty),
                        }}>
                          {set.difficulty}
                        </div>
                        {set.best_score && (
                          <div style={{
                            fontFamily: mono,
                            fontSize: 11,
                            fontWeight: 600,
                            color: C.green,
                          }}>
                            Best: {set.best_score}%
                          </div>
                        )}
                      </div>

                      {/* Title */}
                      <h3 style={{
                        fontFamily: serif,
                        fontSize: 18,
                        fontWeight: 700,
                        color: C.navyDeep,
                        marginBottom: 8,
                      }}>
                        {set.title}
                      </h3>

                      {/* Description */}
                      <p style={{
                        fontFamily: sans,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: C.textSecondary,
                        marginBottom: 16,
                      }}>
                        {set.description}
                      </p>

                      {/* Metadata */}
                      <div style={{
                        background: C.parchment,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 16,
                      }}>
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
                              marginBottom: 2,
                            }}>
                              Questions
                            </div>
                            <div style={{
                              fontFamily: sans,
                              fontSize: 13,
                              fontWeight: 600,
                              color: C.textPrimary,
                            }}>
                              {set.question_count}
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
                              Est. Time
                            </div>
                            <div style={{
                              fontFamily: sans,
                              fontSize: 13,
                              fontWeight: 600,
                              color: C.textPrimary,
                            }}>
                              {set.estimated_time} min
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Start Button */}
                      <button
                        onClick={() => handleStartPracticeSet(set.id)}
                        style={{
                          width: "100%",
                          padding: "12px 20px",
                          background: C.green,
                          border: "none",
                          borderRadius: 8,
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 700,
                          color: C.white,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <Play size={16} />
                        Start Practice
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Custom Session (placeholder) */}
          {selectedMode === "custom" && (
            <div style={{
              ...fadeIn(0.1),
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: 64,
              textAlign: "center",
            }}>
              <Target size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
              <h3 style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 8,
              }}>
                Custom Session Builder
              </h3>
              <p style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textSecondary,
              }}>
                Coming soon: Build your own practice session with custom filters
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
