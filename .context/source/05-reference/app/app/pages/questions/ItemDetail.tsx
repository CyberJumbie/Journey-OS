import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, ArrowLeft, CheckCircle, XCircle, Edit, Clock, History, Star } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — QUESTION DETAIL VIEW (STORY-R-2)
// Template B: Faculty Shell with full question details + review actions
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

interface Option {
  id: string;
  text: string;
  is_correct: boolean;
  rationale: string;
  misconception_category?: string;
}

interface QuestionDetail {
  id: string;
  stem: string;
  lead_in: string;
  options: Option[];
  format: string;
  system: string;
  difficulty: string;
  bloom_level: string;
  clinical_setting: string;
  subconcept: string;
  target_slo: string;
  quality_score: number;
  times_used: number;
  status: "pending" | "approved" | "rejected";
  created_by: string;
  created_at: string;
  pipeline_version: string;
  core_model: string;
}

export default function ItemDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { questionId } = useParams<{ questionId: string }>();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("repository");

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockQuestion: QuestionDetail = {
        id: questionId || "1",
        stem: "A 62-year-old man presents to the emergency department with acute chest pain radiating to the left arm. The pain started 2 hours ago while he was mowing the lawn. He has a history of hypertension and type 2 diabetes. His blood pressure is 150/95 mmHg, pulse is 98/min, and respirations are 20/min. Physical examination shows diaphoresis and anxiety. ECG shows ST elevation in leads II, III, and aVF.",
        lead_in: "Which coronary artery is most likely occluded?",
        options: [
          {
            id: "a",
            text: "Right coronary artery",
            is_correct: true,
            rationale: "ST elevation in the inferior leads (II, III, aVF) indicates an inferior wall MI, which is most commonly caused by occlusion of the right coronary artery (RCA) in right-dominant circulation (85% of patients).",
            misconception_category: "Anatomical localization",
          },
          {
            id: "b",
            text: "Left anterior descending artery",
            is_correct: false,
            rationale: "The LAD supplies the anterior wall and septum. Occlusion would cause ST elevation in precordial leads (V1-V4), not inferior leads.",
            misconception_category: "Arterial territory confusion",
          },
          {
            id: "c",
            text: "Left circumflex artery",
            is_correct: false,
            rationale: "While the LCx can cause inferior MI in left-dominant systems (15% of patients), the RCA is statistically more likely. LCx occlusion often shows lateral changes (I, aVL, V5-V6).",
            misconception_category: "Statistical probability error",
          },
          {
            id: "d",
            text: "Left main coronary artery",
            is_correct: false,
            rationale: "Left main occlusion would cause widespread ischemia affecting both LAD and LCx territories, presenting with diffuse ST changes and cardiogenic shock, not isolated inferior changes.",
            misconception_category: "Severity misattribution",
          },
          {
            id: "e",
            text: "Posterior descending artery",
            is_correct: false,
            rationale: "The PDA is a terminal branch, typically of the RCA. While it supplies the inferior wall, the question asks for the 'most likely' occluded vessel, which is the parent RCA.",
            misconception_category: "Branch vs parent vessel confusion",
          },
        ],
        format: "Single Best Answer",
        system: "Cardiovascular",
        difficulty: "Medium",
        bloom_level: "Apply",
        clinical_setting: "Emergency",
        subconcept: "STEMI: Diagnosis",
        target_slo: "Correlate ECG findings with coronary anatomy",
        quality_score: 0.94,
        times_used: 42,
        status: "pending",
        created_by: "Dr. Sarah Chen",
        created_at: "2026-02-16T10:30:00Z",
        pipeline_version: "v1.2",
        core_model: "Claude Sonnet 3.5",
      };

      setQuestion(mockQuestion);
    } catch (err) {
      console.error("Failed to fetch question", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!question) return;

    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Approved question:", question.id);
      navigate("/questions/review");
    } catch (err) {
      console.error("Failed to approve question", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!question || !rejectReason) return;

    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Rejected question:", question.id, "Reason:", rejectReason);
      navigate("/questions/review");
    } catch (err) {
      console.error("Failed to reject question", err);
    } finally {
      setSubmitting(false);
      setShowRejectDialog(false);
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

  const getStatusColor = (status: QuestionDetail["status"]) => {
    switch (status) {
      case "pending": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "approved": return { bg: `${C.green}15`, text: C.green, border: `${C.green}30` };
      case "rejected": return { bg: `${C.red}15`, text: C.red, border: `${C.red}30` };
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

  if (loading || !question) {
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
            Loading question...
          </div>
        </div>
      </>
    );
  }

  const statusColors = getStatusColor(question.status);

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
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
                onClick={() => navigate("/faculty/repository")}
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
                <ArrowLeft size={14} />
                Back to Repository
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => navigate(`/questions/${question.id}/history`)}
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
                <History size={16} />
                {!isMobile && "History"}
              </button>
              <button
                onClick={() => navigate(`/questions/${question.id}/edit`)}
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
                <Edit size={16} />
                {!isMobile && "Edit"}
              </button>
            </div>
          </div>

          {/* Status & Metadata */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
            <div style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: mono,
              fontSize: 11,
              fontWeight: 600,
              color: C.green,
            }}>
              <Star size={14} fill={C.green} />
              {Math.round(question.quality_score * 100)}% Quality
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1200 }}>
          {/* Question Stem */}
          <div style={{
            ...fadeIn(0.05),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 24 : 32,
            marginBottom: 24,
          }}>
            <h2 style={{
              fontFamily: serif,
              fontSize: 20,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 16,
            }}>
              Clinical Vignette
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 16,
              lineHeight: 1.7,
              color: C.textPrimary,
              marginBottom: 24,
            }}>
              {question.stem}
            </p>

            <div style={{
              fontFamily: serif,
              fontSize: 17,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 20,
              paddingTop: 20,
              borderTop: `1px solid ${C.borderLight}`,
            }}>
              {question.lead_in}
            </div>

            {/* Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {question.options.map((option) => (
                <div
                  key={option.id}
                  style={{
                    background: option.is_correct ? `${C.green}10` : C.parchment,
                    border: `2px solid ${option.is_correct ? C.green : C.border}`,
                    borderRadius: 10,
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: 6,
                      background: option.is_correct ? C.green : C.white,
                      border: `1px solid ${option.is_correct ? C.green : C.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: mono,
                      fontSize: 14,
                      fontWeight: 700,
                      color: option.is_correct ? C.white : C.textPrimary,
                      textTransform: "uppercase",
                    }}>
                      {option.id}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.textPrimary,
                        marginBottom: 8,
                      }}>
                        {option.text}
                      </div>
                      {option.is_correct && (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          background: C.green,
                          color: C.white,
                          padding: "4px 8px",
                          borderRadius: 4,
                        }}>
                          <CheckCircle size={12} />
                          Correct Answer
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rationale */}
                  <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: `1px solid ${option.is_correct ? `${C.green}30` : C.border}`,
                  }}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 6,
                    }}>
                      Rationale
                    </div>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: C.textSecondary,
                      margin: 0,
                    }}>
                      {option.rationale}
                    </p>
                    {option.misconception_category && (
                      <div style={{
                        marginTop: 8,
                        fontFamily: mono,
                        fontSize: 10,
                        color: "#fa9d33",
                      }}>
                        Common Misconception: {option.misconception_category}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Metadata */}
          <div style={{
            ...fadeIn(0.1),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 24,
            marginBottom: 24,
          }}>
            {/* Educational Metadata */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 20 : 24,
            }}>
              <h3 style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 16,
              }}>
                Educational Metadata
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Target SLO", value: question.target_slo },
                  { label: "Subconcept", value: question.subconcept },
                  { label: "Bloom's Level", value: question.bloom_level },
                  { label: "Clinical Setting", value: question.clinical_setting },
                  { label: "Format", value: question.format },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 4,
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontFamily: sans,
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.textPrimary,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Stats */}
            <div style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 20 : 24,
            }}>
              <h3 style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 16,
              }}>
                Usage Statistics
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  { label: "Times Used", value: question.times_used },
                  { label: "Quality Score", value: `${Math.round(question.quality_score * 100)}%` },
                  { label: "Created By", value: question.created_by },
                  { label: "Pipeline Version", value: question.pipeline_version },
                  { label: "Core Model", value: question.core_model },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{
                      fontFamily: mono,
                      fontSize: 9,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 4,
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontFamily: sans,
                      fontSize: 14,
                      fontWeight: 600,
                      color: C.textPrimary,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Review Actions */}
          {question.status === "pending" && (
            <div style={{
              ...fadeIn(0.15),
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: isMobile ? 20 : 24,
            }}>
              <h3 style={{
                fontFamily: serif,
                fontSize: 18,
                fontWeight: 700,
                color: C.navyDeep,
                marginBottom: 16,
              }}>
                Review Actions
              </h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  style={{
                    flex: isMobile ? "1 1 100%" : "1",
                    padding: "14px 24px",
                    background: submitting ? C.textMuted : C.green,
                    border: "none",
                    borderRadius: 8,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <CheckCircle size={20} />
                  {submitting ? "Approving..." : "Approve Question"}
                </button>
                <button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={submitting}
                  style={{
                    flex: isMobile ? "1 1 100%" : "1",
                    padding: "14px 24px",
                    background: C.white,
                    border: `2px solid ${C.red}`,
                    borderRadius: 8,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.red,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <XCircle size={20} />
                  Reject Question
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <>
          <div
            onClick={() => setShowRejectDialog(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,44,118,0.20)",
              backdropFilter: "blur(4px)",
              zIndex: 100,
            }}
          />
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? "calc(100% - 32px)" : 500,
            maxHeight: "90vh",
            overflowY: "auto",
            background: C.white,
            borderRadius: 12,
            boxShadow: "0 24px 48px rgba(0,44,118,0.16)",
            zIndex: 101,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: 24,
              borderBottom: `1px solid ${C.borderLight}`,
            }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: 22,
                fontWeight: 700,
                color: C.navyDeep,
                margin: 0,
              }}>
                Reject Question
              </h2>
              <button
                onClick={() => setShowRejectDialog(false)}
                style={{
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "transparent",
                  border: "none",
                  borderRadius: 6,
                  color: C.textMuted,
                  cursor: "pointer",
                }}
              >
                <XCircle size={20} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
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
                Reason for Rejection <span style={{ color: C.red }}>*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejecting this question..."
                rows={6}
                style={{
                  width: "100%",
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontFamily: sans,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: C.ink,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{
              display: "flex",
              gap: 12,
              padding: 24,
              borderTop: `1px solid ${C.borderLight}`,
            }}>
              <button
                onClick={() => setShowRejectDialog(false)}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.textSecondary,
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: submitting || !rejectReason.trim() ? C.textMuted : C.red,
                  border: "none",
                  borderRadius: 8,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.white,
                  cursor: submitting || !rejectReason.trim() ? "not-allowed" : "pointer",
                }}
              >
                {submitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
