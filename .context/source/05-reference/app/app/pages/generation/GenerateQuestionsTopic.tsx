import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, Search, ChevronDown, ChevronRight, Sparkles, Target } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — GENERATE QUESTIONS (TOPIC MODE) (STORY-Q-1)
// Template B: Faculty Shell with topic selector + generation config
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

interface Topic {
  id: string;
  name: string;
  parent: string;
  questionCount: number;
}

interface SystemCategory {
  id: string;
  name: string;
  topics: Topic[];
}

export default function GenerateQuestionsTopic() {
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

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["cardiovascular"]);
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [questionType, setQuestionType] = useState<"mcq" | "clinical_vignette" | "mixed">("mixed");

  const [generating, setGenerating] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/faculty" || path === "/faculty/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/faculty/courses")) setActiveNav("courses");
    else if (path.startsWith("/faculty/questions")) setActiveNav("questions");
    else if (path.startsWith("/faculty/repository")) setActiveNav("repository");
    else if (path.startsWith("/faculty/settings")) setActiveNav("settings");
  }, [location.pathname]);

  const categories: SystemCategory[] = [
    {
      id: "cardiovascular",
      name: "Cardiovascular System",
      topics: [
        { id: "cv-1", name: "Normal Cardiac Function", parent: "Cardiovascular System", questionCount: 124 },
        { id: "cv-2", name: "Pathologic Processes", parent: "Cardiovascular System", questionCount: 156 },
        { id: "cv-3", name: "Congenital Defects", parent: "Cardiovascular System", questionCount: 89 },
        { id: "cv-4", name: "Pharmacology", parent: "Cardiovascular System", questionCount: 142 },
      ],
    },
    {
      id: "respiratory",
      name: "Respiratory System",
      topics: [
        { id: "resp-1", name: "Normal Respiratory Function", parent: "Respiratory System", questionCount: 98 },
        { id: "resp-2", name: "Pathologic Processes", parent: "Respiratory System", questionCount: 134 },
        { id: "resp-3", name: "Diagnostic Tests", parent: "Respiratory System", questionCount: 76 },
      ],
    },
    {
      id: "nervous",
      name: "Nervous System & Psychiatry",
      topics: [
        { id: "ns-1", name: "Normal Neural Function", parent: "Nervous System", questionCount: 112 },
        { id: "ns-2", name: "Pathologic Processes", parent: "Nervous System", questionCount: 168 },
        { id: "ns-3", name: "Neuropharmacology", parent: "Nervous System", questionCount: 94 },
        { id: "ns-4", name: "Behavioral Science", parent: "Nervous System", questionCount: 82 },
      ],
    },
    {
      id: "renal",
      name: "Renal & Urinary System",
      topics: [
        { id: "renal-1", name: "Normal Renal Function", parent: "Renal System", questionCount: 86 },
        { id: "renal-2", name: "Pathologic Processes", parent: "Renal System", questionCount: 118 },
        { id: "renal-3", name: "Acid-Base Disorders", parent: "Renal System", questionCount: 72 },
      ],
    },
  ];

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

  const toggleCategory = (categoryId: string) => {
    if (expandedCategories.includes(categoryId)) {
      setExpandedCategories(expandedCategories.filter((c) => c !== categoryId));
    } else {
      setExpandedCategories([...expandedCategories, categoryId]);
    }
  };

  const toggleTopic = (topicId: string) => {
    if (selectedTopics.includes(topicId)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topicId));
    } else {
      setSelectedTopics([...selectedTopics, topicId]);
    }
  };

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) return;

    setGenerating(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // In real app, send generation request to backend
      console.log("Generating questions:", {
        topics: selectedTopics,
        count: questionCount,
        difficulty,
        questionType,
      });

      // Navigate to batch progress
      navigate("/generation/progress");
    } catch (err) {
      console.error("Failed to generate questions", err);
    } finally {
      setGenerating(false);
    }
  };

  const filteredCategories = categories
    .map((category) => ({
      ...category,
      topics: category.topics.filter((topic) =>
        searchQuery ? topic.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
      ),
    }))
    .filter((category) => category.topics.length > 0);

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
                  Generate Questions
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Select topics and configure generation settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 380px" : "1fr",
            gap: 24,
          }}>
            {/* Topic Selection */}
            <div style={{ ...fadeIn(0.05) }}>
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: isMobile ? 20 : 24,
              }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 16,
                }}>
                  Select Topics
                </h2>

                {/* Search */}
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
                  <input
                    type="search"
                    placeholder="Search topics..."
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

                {/* Categories */}
                <div style={{ maxHeight: isDesktop ? 600 : 400, overflowY: "auto" }}>
                  {filteredCategories.map((category) => (
                    <div key={category.id} style={{ marginBottom: 12 }}>
                      <button
                        onClick={() => toggleCategory(category.id)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 16px",
                          background: C.parchment,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          fontFamily: sans,
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.navyDeep,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = C.blueMid;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = C.border;
                        }}
                      >
                        <span>{category.name}</span>
                        {expandedCategories.includes(category.id) ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </button>

                      {expandedCategories.includes(category.id) && (
                        <div style={{
                          marginTop: 8,
                          marginLeft: 16,
                          padding: "12px 0",
                          borderLeft: `2px solid ${C.borderLight}`,
                        }}>
                          {category.topics.map((topic) => (
                            <label
                              key={topic.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                padding: "8px 16px",
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
                              <input
                                type="checkbox"
                                checked={selectedTopics.includes(topic.id)}
                                onChange={() => toggleTopic(topic.id)}
                                style={{
                                  width: 18,
                                  height: 18,
                                  cursor: "pointer",
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontFamily: sans,
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: C.textPrimary,
                                }}>
                                  {topic.name}
                                </div>
                                <div style={{
                                  fontFamily: mono,
                                  fontSize: 10,
                                  color: C.textMuted,
                                }}>
                                  {topic.questionCount} questions available
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Configuration Panel */}
            <div style={{ ...fadeIn(0.1) }}>
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: isMobile ? 20 : 24,
                position: isDesktop ? "sticky" : "relative",
                top: isDesktop ? 100 : 0,
              }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 18,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 20,
                }}>
                  Generation Settings
                </h2>

                {/* Selected Topics Count */}
                <div style={{
                  background: selectedTopics.length > 0 ? `${C.green}15` : C.parchment,
                  border: `1px solid ${selectedTopics.length > 0 ? C.green : C.border}`,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 24,
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
                    Topics Selected
                  </div>
                  <div style={{
                    fontFamily: serif,
                    fontSize: 32,
                    fontWeight: 700,
                    color: selectedTopics.length > 0 ? C.green : C.textMuted,
                  }}>
                    {selectedTopics.length}
                  </div>
                </div>

                {/* Question Count */}
                <div style={{ marginBottom: 24 }}>
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
                    Number of Questions: {questionCount}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
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
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div style={{ marginBottom: 24 }}>
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
                    Difficulty Level
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[
                      { value: "easy", label: "Easy" },
                      { value: "medium", label: "Medium" },
                      { value: "hard", label: "Hard" },
                      { value: "mixed", label: "Mixed" },
                    ].map((option) => (
                      <label
                        key={option.value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          background: difficulty === option.value ? `${C.blueMid}15` : C.parchment,
                          border: `1px solid ${difficulty === option.value ? C.blueMid : C.border}`,
                          borderRadius: 6,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <input
                          type="radio"
                          name="difficulty"
                          value={option.value}
                          checked={difficulty === option.value}
                          onChange={(e) => setDifficulty(e.target.value as any)}
                          style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        <span style={{
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.textPrimary,
                        }}>
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Question Type */}
                <div style={{ marginBottom: 32 }}>
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
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => setQuestionType(e.target.value as any)}
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "0 16px",
                      fontFamily: sans,
                      fontSize: 15,
                      color: C.ink,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="mcq">Multiple Choice (MCQ)</option>
                    <option value="clinical_vignette">Clinical Vignette</option>
                    <option value="mixed">Mixed Types</option>
                  </select>
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={selectedTopics.length === 0 || generating}
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    background: selectedTopics.length === 0 || generating ? C.textMuted : C.green,
                    border: "none",
                    borderRadius: 8,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    cursor: selectedTopics.length === 0 || generating ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTopics.length > 0 && !generating) {
                      e.currentTarget.style.background = C.greenDark;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTopics.length > 0 && !generating) {
                      e.currentTarget.style.background = C.green;
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  <Sparkles size={20} />
                  {generating ? "Generating..." : "Generate Questions"}
                </button>

                {selectedTopics.length === 0 && (
                  <p style={{
                    fontFamily: sans,
                    fontSize: 12,
                    color: C.textMuted,
                    textAlign: "center",
                    margin: "12px 0 0",
                  }}>
                    Select at least one topic to generate questions
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
