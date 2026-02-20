import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, Search, Save, CheckCircle, AlertTriangle, BarChart3, X, GripVertical } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — EXAM ASSEMBLY/BUILDER (STORY-E-1)
// Template B: Faculty Shell with exam construction interface
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

interface Question {
  id: string;
  stem: string;
  system: string;
  difficulty: "Easy" | "Medium" | "Hard";
  bloom_level: string;
  clinical_setting: string;
}

interface BlueprintValidation {
  system_distribution: { system: string; actual: number; target: number; status: "pass" | "warn" | "fail" }[];
  difficulty_balance: { difficulty: string; actual: number; target: number; status: "pass" | "warn" | "fail" }[];
  total_questions: number;
  total_points: number;
}

export default function ExamAssembly() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("exams");

  const [examName, setExamName] = useState("Cardiovascular Midterm Exam");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [validation, setValidation] = useState<BlueprintValidation | null>(null);

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
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (selectedQuestions.length > 0) {
      calculateValidation();
    }
  }, [selectedQuestions]);

  const fetchQuestions = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockQuestions: Question[] = [
      { id: "1", stem: "A 62-year-old man presents with acute chest pain radiating to the left arm...", system: "Cardiovascular", difficulty: "Medium", bloom_level: "Apply", clinical_setting: "Emergency" },
      { id: "2", stem: "A 68-year-old woman with progressive dyspnea on exertion over 3 months...", system: "Cardiovascular", difficulty: "Hard", bloom_level: "Analyze", clinical_setting: "Ambulatory" },
      { id: "3", stem: "A 3-month-old infant presents with cyanosis and a systolic murmur...", system: "Cardiovascular", difficulty: "Hard", bloom_level: "Analyze", clinical_setting: "Emergency" },
      { id: "4", stem: "Which of the following is the primary mechanism of action for ACE inhibitors...", system: "Cardiovascular", difficulty: "Easy", bloom_level: "Remember", clinical_setting: "Ambulatory" },
      { id: "5", stem: "A 55-year-old man with atrial fibrillation presents with sudden onset leg pain...", system: "Cardiovascular", difficulty: "Medium", bloom_level: "Apply", clinical_setting: "Emergency" },
    ];

    setAvailableQuestions(mockQuestions);
    setSelectedQuestions([mockQuestions[0], mockQuestions[1]]); // Pre-select 2 for demo
  };

  const calculateValidation = () => {
    const total = selectedQuestions.length;
    const systemCounts: Record<string, number> = {};
    const difficultyCounts: Record<string, number> = {};

    selectedQuestions.forEach((q) => {
      systemCounts[q.system] = (systemCounts[q.system] || 0) + 1;
      difficultyCounts[q.difficulty] = (difficultyCounts[q.difficulty] || 0) + 1;
    });

    // System targets (percentages)
    const systemTargets: Record<string, number> = {
      Cardiovascular: 50,
      Respiratory: 20,
      Nervous: 15,
      Renal: 10,
      Endocrine: 5,
    };

    const system_distribution = Object.entries(systemTargets).map(([system, target]) => {
      const actual = total > 0 ? ((systemCounts[system] || 0) / total) * 100 : 0;
      const diff = Math.abs(actual - target);
      return {
        system,
        actual,
        target,
        status: diff <= 5 ? "pass" : diff <= 15 ? "warn" : "fail" as "pass" | "warn" | "fail",
      };
    });

    // Difficulty targets
    const difficultyTargets: Record<string, number> = { Easy: 30, Medium: 50, Hard: 20 };
    const difficulty_balance = Object.entries(difficultyTargets).map(([difficulty, target]) => {
      const actual = total > 0 ? ((difficultyCounts[difficulty] || 0) / total) * 100 : 0;
      const diff = Math.abs(actual - target);
      return {
        difficulty,
        actual,
        target,
        status: diff <= 10 ? "pass" : diff <= 20 ? "warn" : "fail" as "pass" | "warn" | "fail",
      };
    });

    setValidation({
      system_distribution,
      difficulty_balance,
      total_questions: total,
      total_points: total * 10,
    });
  };

  const handleAddQuestion = (question: Question) => {
    if (!selectedQuestions.find((q) => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const handleRemoveQuestion = (questionId: string) => {
    setSelectedQuestions(selectedQuestions.filter((q) => q.id !== questionId));
  };

  const handleSaveExam = () => {
    console.log("Saving exam:", examName, selectedQuestions);
    navigate("/faculty/exams");
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/faculty/dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/faculty/courses" },
    { key: "questions", label: "Generate Questions", Icon: Plus, path: "/faculty/questions/generate" },
    { key: "exams", label: "Exam Builder", Icon: FileText, path: "/faculty/exams" },
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return C.green;
      case "Medium": return "#fa9d33";
      case "Hard": return C.red;
      default: return C.textMuted;
    }
  };

  const getStatusColor = (status: "pass" | "warn" | "fail") => {
    switch (status) {
      case "pass": return C.green;
      case "warn": return "#fa9d33";
      case "fail": return C.red;
    }
  };

  const filteredQuestions = availableQuestions.filter((q) => 
    !selectedQuestions.find((sq) => sq.id === q.id) &&
    (searchQuery === "" || q.stem.toLowerCase().includes(searchQuery.toLowerCase()) || q.system.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                  Exam Builder
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Assemble and validate your exam
                </p>
              </div>
            </div>
            <button
              onClick={handleSaveExam}
              disabled={selectedQuestions.length === 0}
              style={{
                padding: isMobile ? "8px 16px" : "10px 20px",
                background: selectedQuestions.length === 0 ? C.textMuted : C.green,
                border: "none",
                borderRadius: 8,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 700,
                color: C.white,
                cursor: selectedQuestions.length === 0 ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Save size={16} />
              {!isMobile && "Save Exam"}
            </button>
          </div>

          {/* Exam Name */}
          <input
            type="text"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="Enter exam name..."
            style={{
              width: "100%",
              height: 44,
              background: C.white,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "0 16px",
              fontFamily: serif,
              fontSize: 18,
              fontWeight: 700,
              color: C.navyDeep,
              outline: "none",
            }}
          />
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1600 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "2fr 1fr" : "1fr",
            gap: 24,
          }}>
            {/* Left Column: Questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Selected Questions */}
              <div style={{
                ...fadeIn(0.05),
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
                    Selected Questions
                  </h2>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.textMuted,
                  }}>
                    {selectedQuestions.length} questions
                  </div>
                </div>

                <div style={{ padding: isMobile ? 16 : 20 }}>
                  {selectedQuestions.length === 0 ? (
                    <div style={{
                      padding: 40,
                      textAlign: "center",
                      color: C.textMuted,
                      fontFamily: sans,
                      fontSize: 15,
                    }}>
                      No questions selected yet. Add questions from the available pool below.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {selectedQuestions.map((question, index) => (
                        <div
                          key={question.id}
                          style={{
                            background: C.parchment,
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            padding: 16,
                            display: "flex",
                            gap: 12,
                          }}
                        >
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}>
                            <GripVertical size={18} style={{ color: C.textMuted, cursor: "grab" }} />
                            <div style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              background: C.navyDeep,
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
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{
                              fontFamily: sans,
                              fontSize: 14,
                              lineHeight: 1.6,
                              color: C.textPrimary,
                              margin: "0 0 8px",
                            }}>
                              {question.stem.substring(0, 100)}...
                            </p>
                            <div style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}>
                              <span style={{
                                fontFamily: mono,
                                fontSize: 10,
                                fontWeight: 600,
                                color: getDifficultyColor(question.difficulty),
                              }}>
                                {question.difficulty}
                              </span>
                              <span style={{ color: C.textMuted }}>•</span>
                              <span style={{
                                fontFamily: mono,
                                fontSize: 10,
                                color: C.textMuted,
                              }}>
                                {question.system}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveQuestion(question.id)}
                            style={{
                              width: 32,
                              height: 32,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "transparent",
                              border: "none",
                              borderRadius: 6,
                              color: C.red,
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Available Questions */}
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
                    marginBottom: 16,
                  }}>
                    Available Questions
                  </h2>
                  <div style={{ position: "relative" }}>
                    <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
                    <input
                      type="search"
                      placeholder="Search questions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        height: 44,
                        background: C.parchment,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "0 16px 0 44px",
                        fontFamily: sans,
                        fontSize: 15,
                        color: C.ink,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ padding: isMobile ? 16 : 20, maxHeight: 600, overflowY: "auto" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {filteredQuestions.map((question) => (
                      <div
                        key={question.id}
                        style={{
                          background: C.parchment,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: 16,
                          display: "flex",
                          gap: 12,
                          cursor: "pointer",
                        }}
                        onClick={() => handleAddQuestion(question)}
                      >
                        <div style={{ flex: 1 }}>
                          <p style={{
                            fontFamily: sans,
                            fontSize: 14,
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
                          }}>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 10,
                              fontWeight: 600,
                              color: getDifficultyColor(question.difficulty),
                            }}>
                              {question.difficulty}
                            </span>
                            <span style={{ color: C.textMuted }}>•</span>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 10,
                              color: C.textMuted,
                            }}>
                              {question.system}
                            </span>
                          </div>
                        </div>
                        <button
                          style={{
                            width: 32,
                            height: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: C.green,
                            border: "none",
                            borderRadius: 6,
                            color: C.white,
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Blueprint Validation */}
            <div style={{
              ...fadeIn(0.15),
            }}>
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                position: isDesktop ? "sticky" : "relative",
                top: isDesktop ? 100 : 0,
              }}>
                <div style={{
                  padding: isMobile ? 20 : 24,
                  borderBottom: `1px solid ${C.borderLight}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <BarChart3 size={20} style={{ color: C.blueMid }} />
                    <h2 style={{
                      fontFamily: serif,
                      fontSize: 20,
                      fontWeight: 700,
                      color: C.navyDeep,
                      margin: 0,
                    }}>
                      Blueprint Validation
                    </h2>
                  </div>
                </div>

                {validation && (
                  <div style={{ padding: isMobile ? 20 : 24 }}>
                    {/* Summary */}
                    <div style={{
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: 16,
                      marginBottom: 20,
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
                            marginBottom: 4,
                          }}>
                            Questions
                          </div>
                          <div style={{
                            fontFamily: serif,
                            fontSize: 24,
                            fontWeight: 700,
                            color: C.navyDeep,
                          }}>
                            {validation.total_questions}
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
                            Total Points
                          </div>
                          <div style={{
                            fontFamily: serif,
                            fontSize: 24,
                            fontWeight: 700,
                            color: C.navyDeep,
                          }}>
                            {validation.total_points}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* System Distribution */}
                    <div style={{ marginBottom: 20 }}>
                      <h3 style={{
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 12,
                      }}>
                        System Distribution
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {validation.system_distribution.map((item) => (
                          <div key={item.system}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}>
                              <span style={{
                                fontFamily: sans,
                                fontSize: 13,
                                fontWeight: 600,
                                color: C.textPrimary,
                              }}>
                                {item.system}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {item.status === "pass" ? (
                                  <CheckCircle size={14} style={{ color: getStatusColor(item.status) }} />
                                ) : (
                                  <AlertTriangle size={14} style={{ color: getStatusColor(item.status) }} />
                                )}
                                <span style={{
                                  fontFamily: mono,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: getStatusColor(item.status),
                                }}>
                                  {Math.round(item.actual)}% / {item.target}%
                                </span>
                              </div>
                            </div>
                            <div style={{
                              width: "100%",
                              height: 6,
                              background: C.parchment,
                              borderRadius: 3,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(item.actual, 100)}%`,
                                background: getStatusColor(item.status),
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Difficulty Balance */}
                    <div>
                      <h3 style={{
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 12,
                      }}>
                        Difficulty Balance
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {validation.difficulty_balance.map((item) => (
                          <div key={item.difficulty}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}>
                              <span style={{
                                fontFamily: sans,
                                fontSize: 13,
                                fontWeight: 600,
                                color: C.textPrimary,
                              }}>
                                {item.difficulty}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                {item.status === "pass" ? (
                                  <CheckCircle size={14} style={{ color: getStatusColor(item.status) }} />
                                ) : (
                                  <AlertTriangle size={14} style={{ color: getStatusColor(item.status) }} />
                                )}
                                <span style={{
                                  fontFamily: mono,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: getStatusColor(item.status),
                                }}>
                                  {Math.round(item.actual)}% / {item.target}%
                                </span>
                              </div>
                            </div>
                            <div style={{
                              width: "100%",
                              height: 6,
                              background: C.parchment,
                              borderRadius: 3,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                height: "100%",
                                width: `${Math.min(item.actual, 100)}%`,
                                background: getStatusColor(item.status),
                                transition: "width 0.5s ease",
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
