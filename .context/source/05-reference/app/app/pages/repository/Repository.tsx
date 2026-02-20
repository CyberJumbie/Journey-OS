import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, Search, Grid3x3, List, Filter, Star, Download, Eye, TrendingUp } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — REPOSITORY / QUESTION BANK (STORY-R-1)
// Template B: Faculty Shell with question repository browser
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
  difficulty: "Easy" | "Medium" | "Hard";
  system: string;
  subconcept: string;
  format: string;
  quality_score: number;
  times_used: number;
  last_used: string;
  created_by: string;
  created_at: string;
  status: "approved" | "draft" | "archived";
}

export default function Repository() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("repository");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    difficulty: "all",
    system: "all",
    status: "approved",
  });
  const [sortBy, setSortBy] = useState<"recent" | "quality" | "popular">("recent");

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
  }, [filters, sortBy]);

  const fetchQuestions = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockQuestions: Question[] = [
        {
          id: "1",
          stem: "A 62-year-old man presents to the emergency department with acute chest pain radiating to the left arm. The pain started 2 hours ago while he was mowing the lawn. ECG shows ST elevation in leads II, III, and aVF...",
          difficulty: "Medium",
          system: "Cardiovascular",
          subconcept: "STEMI: Diagnosis",
          format: "Single Best Answer",
          quality_score: 0.94,
          times_used: 42,
          last_used: "2026-02-18T14:00:00Z",
          created_by: "Dr. Sarah Chen",
          created_at: "2026-01-15T10:00:00Z",
          status: "approved",
        },
        {
          id: "2",
          stem: "A 45-year-old woman with type 2 diabetes presents for follow-up. Her most recent HbA1c is 8.2%. She is currently taking metformin 1000mg twice daily. Which of the following is the most appropriate next step?",
          difficulty: "Medium",
          system: "Endocrine",
          subconcept: "Diabetes Management",
          format: "Clinical Vignette",
          quality_score: 0.91,
          times_used: 38,
          last_used: "2026-02-19T09:30:00Z",
          created_by: "Dr. Michael Torres",
          created_at: "2026-01-20T14:00:00Z",
          status: "approved",
        },
        {
          id: "3",
          stem: "A 68-year-old woman with a history of hypertension presents with progressive dyspnea on exertion over 3 months. Physical examination reveals bilateral lower extremity edema and crackles at lung bases. Which diagnostic test would be most useful?",
          difficulty: "Hard",
          system: "Cardiovascular",
          subconcept: "Heart Failure: Diagnosis",
          format: "Single Best Answer",
          quality_score: 0.96,
          times_used: 51,
          last_used: "2026-02-20T08:00:00Z",
          created_by: "Dr. Sarah Chen",
          created_at: "2026-01-10T11:00:00Z",
          status: "approved",
        },
        {
          id: "4",
          stem: "A 32-year-old woman presents with polyuria, polydipsia, and weight loss over the past month. Random glucose is 285 mg/dL. Which of the following tests would best distinguish between Type 1 and Type 2 diabetes?",
          difficulty: "Easy",
          system: "Endocrine",
          subconcept: "Diabetes Diagnosis",
          format: "Single Best Answer",
          quality_score: 0.88,
          times_used: 29,
          last_used: "2026-02-17T16:20:00Z",
          created_by: "Dr. Emily Rodriguez",
          created_at: "2026-01-25T09:00:00Z",
          status: "approved",
        },
        {
          id: "5",
          stem: "A 55-year-old man is found to have an irregular pulse during a routine examination. He denies palpitations or chest pain. ECG shows absent P waves and irregularly irregular R-R intervals. What is the most appropriate initial management?",
          difficulty: "Medium",
          system: "Cardiovascular",
          subconcept: "Atrial Fibrillation: Treatment",
          format: "Clinical Vignette",
          quality_score: 0.92,
          times_used: 35,
          last_used: "2026-02-16T13:45:00Z",
          created_by: "Dr. James Park",
          created_at: "2026-01-18T15:30:00Z",
          status: "approved",
        },
        {
          id: "6",
          stem: "A 28-year-old woman presents with fever, joint pain, and a facial rash. Laboratory studies show positive ANA and anti-dsDNA antibodies. Which of the following organs is most commonly affected in this condition?",
          difficulty: "Hard",
          system: "Rheumatology",
          subconcept: "Systemic Lupus Erythematosus",
          format: "Single Best Answer",
          quality_score: 0.89,
          times_used: 18,
          last_used: "2026-02-15T10:00:00Z",
          created_by: "Dr. Sarah Chen",
          created_at: "2026-02-01T12:00:00Z",
          status: "approved",
        },
      ];

      let filtered = mockQuestions.filter((q) => {
        if (filters.difficulty !== "all" && q.difficulty !== filters.difficulty) return false;
        if (filters.system !== "all" && q.system !== filters.system) return false;
        if (filters.status !== "all" && q.status !== filters.status) return false;
        if (searchQuery && !q.stem.toLowerCase().includes(searchQuery.toLowerCase()) && 
            !q.subconcept.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      });

      // Sort
      if (sortBy === "quality") {
        filtered.sort((a, b) => b.quality_score - a.quality_score);
      } else if (sortBy === "popular") {
        filtered.sort((a, b) => b.times_used - a.times_used);
      } else {
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return C.green;
      case "Medium": return "#fa9d33";
      case "Hard": return C.red;
      default: return C.textMuted;
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return C.green;
    if (score >= 0.8) return "#fa9d33";
    return C.red;
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
                  Question Bank
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Browse and search your question repository
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.textSecondary,
                  cursor: "pointer",
                }}
              >
                {viewMode === "grid" ? <List size={18} /> : <Grid3x3 size={18} />}
              </button>
              {!isMobile && (
                <button
                  style={{
                    padding: "10px 16px",
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
                  <Download size={16} />
                  Export
                </button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
            <input
              type="search"
              placeholder="Search questions by content or concept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 44,
                background: C.white,
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
              { label: "Total Questions", value: questions.length, icon: <FileText size={20} />, color: C.blueMid },
              { label: "Avg Quality", value: `${Math.round(questions.reduce((sum, q) => sum + q.quality_score, 0) / questions.length * 100)}%`, icon: <Star size={20} />, color: "#fa9d33" },
              { label: "Most Used", value: Math.max(...questions.map((q) => q.times_used)), icon: <TrendingUp size={20} />, color: C.green },
              { label: "This Month", value: questions.filter((q) => new Date(q.created_at).getMonth() === 1).length, icon: <Plus size={20} />, color: C.navyDeep },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
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
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 2,
                  }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontFamily: serif,
                    fontSize: 24,
                    fontWeight: 700,
                    color: stat.color,
                  }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Sort */}
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
                <option value="Endocrine">Endocrine</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Rheumatology">Rheumatology</option>
              </select>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
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
                  <option value="recent">Most Recent</option>
                  <option value="quality">Highest Quality</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </div>

          {/* Question Grid/List */}
          <div style={{
            ...fadeIn(0.15),
            display: viewMode === "grid" ? "grid" : "flex",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "repeat(2, 1fr)",
            flexDirection: "column",
            gap: 16,
          }}>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 12,
                  padding: 24,
                  height: 240,
                }} />
              ))
            ) : questions.length === 0 ? (
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: 64,
                textAlign: "center",
                gridColumn: "1 / -1",
              }}>
                <FileText size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
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
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              questions.map((question) => (
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
                    gap: 8,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 600,
                        color: getDifficultyColor(question.difficulty),
                      }}>
                        {question.difficulty}
                      </div>
                      <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: C.border,
                      }} />
                      <div style={{
                        fontFamily: mono,
                        fontSize: 10,
                        color: C.textMuted,
                      }}>
                        {question.system}
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: mono,
                      fontSize: 11,
                      fontWeight: 600,
                      color: getQualityColor(question.quality_score),
                    }}>
                      <Star size={14} fill={getQualityColor(question.quality_score)} />
                      {Math.round(question.quality_score * 100)}%
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
                    WebkitLineClamp: 3,
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
                    marginBottom: 12,
                  }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 4,
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

                  {/* Footer */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 12,
                    borderTop: `1px solid ${C.borderLight}`,
                  }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 10,
                      color: C.textMuted,
                    }}>
                      Used {question.times_used} times
                    </div>
                    <button
                      style={{
                        padding: "6px 12px",
                        background: C.blueMid,
                        border: "none",
                        borderRadius: 6,
                        fontFamily: sans,
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.white,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
