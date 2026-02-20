import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, Calendar, Clock, Users, Send, CheckCircle } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — EXAM ASSIGNMENT/ADMINISTRATION (STORY-E-2)
// Template B: Faculty Shell with exam distribution interface
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

interface Exam {
  id: string;
  name: string;
  question_count: number;
  total_points: number;
  created_at: string;
  status: "draft" | "scheduled" | "active" | "completed";
}

interface AssignmentConfig {
  course_id: string;
  section_ids: string[];
  available_from: string;
  available_until: string;
  time_limit: number;
  attempts_allowed: number;
  randomize_questions: boolean;
  show_results: boolean;
}

export default function ExamAssignment() {
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

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [config, setConfig] = useState<AssignmentConfig>({
    course_id: "",
    section_ids: [],
    available_from: "",
    available_until: "",
    time_limit: 120,
    attempts_allowed: 1,
    randomize_questions: false,
    show_results: true,
  });
  const [submitting, setSubmitting] = useState(false);

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
    fetchExams();
  }, []);

  const fetchExams = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockExams: Exam[] = [
      { id: "1", name: "Cardiovascular Midterm Exam", question_count: 50, total_points: 500, created_at: "2026-02-15T10:00:00Z", status: "draft" },
      { id: "2", name: "Pharmacology Quiz 3", question_count: 20, total_points: 200, created_at: "2026-02-10T14:30:00Z", status: "scheduled" },
      { id: "3", name: "Clinical Scenarios Assessment", question_count: 30, total_points: 300, created_at: "2026-02-05T09:00:00Z", status: "completed" },
    ];

    setExams(mockExams);
  };

  const handleAssignExam = async () => {
    if (!selectedExam || !config.course_id || config.section_ids.length === 0) return;

    setSubmitting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Assigning exam:", selectedExam, config);
      navigate("/faculty/exams");
    } catch (err) {
      console.error("Failed to assign exam", err);
    } finally {
      setSubmitting(false);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/faculty/dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/faculty/courses" },
    { key: "questions", label: "Generate Questions", Icon: Plus, path: "/faculty/questions/generate" },
    { key: "exams", label: "Exam Builder", Icon: FileText, path: "/faculty/exams" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/faculty/settings" },
  ];

  const user = { name: "Dr. Sarah Chen", initials: "SC", role: "Faculty", department: "Pharmacology" };

  const courses = [
    { id: "1", name: "Medical Pharmacology I", code: "PHAR 501" },
    { id: "2", name: "Clinical Pharmacology", code: "PHAR 502" },
  ];

  const sections = [
    { id: "s1", name: "Section A - Morning", students: 42 },
    { id: "s2", name: "Section B - Afternoon", students: 38 },
    { id: "s3", name: "Section C - Evening", students: 35 },
  ];

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

  const getStatusColor = (status: Exam["status"]) => {
    switch (status) {
      case "draft": return { bg: `${C.textMuted}15`, text: C.textMuted, border: `${C.textMuted}30` };
      case "scheduled": return { bg: `${C.blueMid}15`, text: C.blueMid, border: `${C.blueMid}30` };
      case "active": return { bg: `${C.green}15`, text: C.green, border: `${C.green}30` };
      case "completed": return { bg: `${C.textMuted}15`, text: C.textMuted, border: `${C.textMuted}30` };
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
                Assign Exam
              </h1>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                margin: "4px 0 0",
              }}>
                Distribute exams to students and configure settings
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1200 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr",
            gap: 24,
          }}>
            {/* Left: Select Exam */}
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
              }}>
                <h2 style={{
                  fontFamily: serif,
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.navyDeep,
                  margin: 0,
                }}>
                  Select Exam
                </h2>
              </div>

              <div style={{ padding: isMobile ? 16 : 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {exams.map((exam) => {
                    const statusColors = getStatusColor(exam.status);
                    const isSelected = selectedExam?.id === exam.id;

                    return (
                      <div
                        key={exam.id}
                        onClick={() => setSelectedExam(exam)}
                        style={{
                          background: isSelected ? `${C.blueMid}10` : C.parchment,
                          border: `2px solid ${isSelected ? C.blueMid : C.border}`,
                          borderRadius: 10,
                          padding: 16,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}>
                          <h3 style={{
                            fontFamily: serif,
                            fontSize: 16,
                            fontWeight: 700,
                            color: C.navyDeep,
                            margin: 0,
                          }}>
                            {exam.name}
                          </h3>
                          <div style={{
                            fontFamily: mono,
                            fontSize: 9,
                            fontWeight: 500,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            background: statusColors.bg,
                            color: statusColors.text,
                            border: `1px solid ${statusColors.border}`,
                            padding: "3px 8px",
                            borderRadius: 4,
                          }}>
                            {exam.status}
                          </div>
                        </div>
                        <div style={{
                          display: "flex",
                          gap: 16,
                          fontFamily: mono,
                          fontSize: 11,
                          color: C.textMuted,
                        }}>
                          <span>{exam.question_count} questions</span>
                          <span>•</span>
                          <span>{exam.total_points} points</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Configuration */}
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
                  Assignment Settings
                </h2>
              </div>

              <div style={{ padding: isMobile ? 20 : 24 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Course */}
                  <div>
                    <label style={{
                      display: "block",
                      fontFamily: mono,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 8,
                    }}>
                      Course <span style={{ color: C.red }}>*</span>
                    </label>
                    <select
                      value={config.course_id}
                      onChange={(e) => setConfig({ ...config, course_id: e.target.value })}
                      style={{
                        width: "100%",
                        height: 44,
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
                      <option value="">Select a course</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sections */}
                  <div>
                    <label style={{
                      display: "block",
                      fontFamily: mono,
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.textMuted,
                      marginBottom: 8,
                    }}>
                      Sections <span style={{ color: C.red }}>*</span>
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {sections.map((section) => (
                        <label key={section.id} style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 12,
                          background: C.parchment,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          cursor: "pointer",
                        }}>
                          <input
                            type="checkbox"
                            checked={config.section_ids.includes(section.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setConfig({ ...config, section_ids: [...config.section_ids, section.id] });
                              } else {
                                setConfig({ ...config, section_ids: config.section_ids.filter((id) => id !== section.id) });
                              }
                            }}
                            style={{ width: 18, height: 18, cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontFamily: sans,
                              fontSize: 14,
                              fontWeight: 600,
                              color: C.textPrimary,
                            }}>
                              {section.name}
                            </div>
                            <div style={{
                              fontFamily: mono,
                              fontSize: 10,
                              color: C.textMuted,
                            }}>
                              {section.students} students
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 12,
                  }}>
                    <div>
                      <label style={{
                        display: "block",
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 8,
                      }}>
                        Available From
                      </label>
                      <input
                        type="datetime-local"
                        value={config.available_from}
                        onChange={(e) => setConfig({ ...config, available_from: e.target.value })}
                        style={{
                          width: "100%",
                          height: 44,
                          background: C.parchment,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: "0 12px",
                          fontFamily: sans,
                          fontSize: 14,
                          color: C.ink,
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: "block",
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: C.textMuted,
                        marginBottom: 8,
                      }}>
                        Available Until
                      </label>
                      <input
                        type="datetime-local"
                        value={config.available_until}
                        onChange={(e) => setConfig({ ...config, available_until: e.target.value })}
                        style={{
                          width: "100%",
                          height: 44,
                          background: C.parchment,
                          border: `1px solid ${C.border}`,
                          borderRadius: 8,
                          padding: "0 12px",
                          fontFamily: sans,
                          fontSize: 14,
                          color: C.ink,
                          outline: "none",
                        }}
                      />
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
                      Time Limit: {config.time_limit} minutes
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="240"
                      step="15"
                      value={config.time_limit}
                      onChange={(e) => setConfig({ ...config, time_limit: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        height: 6,
                        background: C.parchment,
                        borderRadius: 3,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    />
                  </div>

                  {/* Options */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                    }}>
                      <input
                        type="checkbox"
                        checked={config.randomize_questions}
                        onChange={(e) => setConfig({ ...config, randomize_questions: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <span style={{
                        fontFamily: sans,
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.textPrimary,
                      }}>
                        Randomize question order
                      </span>
                    </label>

                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                    }}>
                      <input
                        type="checkbox"
                        checked={config.show_results}
                        onChange={(e) => setConfig({ ...config, show_results: e.target.checked })}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                      <span style={{
                        fontFamily: sans,
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.textPrimary,
                      }}>
                        Show results immediately after submission
                      </span>
                    </label>
                  </div>

                  {/* Assign Button */}
                  <button
                    onClick={handleAssignExam}
                    disabled={!selectedExam || !config.course_id || config.section_ids.length === 0 || submitting}
                    style={{
                      width: "100%",
                      padding: "14px 24px",
                      background: (!selectedExam || !config.course_id || config.section_ids.length === 0 || submitting) ? C.textMuted : C.green,
                      border: "none",
                      borderRadius: 8,
                      fontFamily: sans,
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.white,
                      cursor: (!selectedExam || !config.course_id || config.section_ids.length === 0 || submitting) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      marginTop: 8,
                    }}
                  >
                    <Send size={18} />
                    {submitting ? "Assigning..." : "Assign Exam"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}