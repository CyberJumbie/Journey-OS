import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, ChevronRight, Search, UserPlus, Mail, X, Download, Upload } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — COURSE ROSTER (STORY-F-5)
// Template B: Faculty Shell with student table + add modal
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

interface Student {
  id: string;
  name: string;
  email: string;
  questions_completed: number;
  avg_score: number;
  last_activity: string;
  enrollment_date: string;
}

export default function CourseRoster() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("courses");

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState<"single" | "bulk">("single");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [adding, setAdding] = useState(false);

  const courseName = "Pharmacology I";

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
    fetchStudents();
  }, [id]);

  const fetchStudents = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockStudents: Student[] = [
        { id: "1", name: "Sarah Johnson", email: "sjohnson@msm.edu", questions_completed: 142, avg_score: 87, last_activity: "2026-02-20T08:30:00Z", enrollment_date: "2026-01-20" },
        { id: "2", name: "Michael Chen", email: "mchen@msm.edu", questions_completed: 138, avg_score: 92, last_activity: "2026-02-19T14:20:00Z", enrollment_date: "2026-01-20" },
        { id: "3", name: "Emily Rodriguez", email: "erodriguez@msm.edu", questions_completed: 145, avg_score: 85, last_activity: "2026-02-20T09:15:00Z", enrollment_date: "2026-01-20" },
        { id: "4", name: "David Park", email: "dpark@msm.edu", questions_completed: 120, avg_score: 78, last_activity: "2026-02-18T16:00:00Z", enrollment_date: "2026-01-20" },
        { id: "5", name: "Jessica Williams", email: "jwilliams@msm.edu", questions_completed: 135, avg_score: 88, last_activity: "2026-02-19T11:00:00Z", enrollment_date: "2026-01-20" },
        { id: "6", name: "James Martinez", email: "jmartinez@msm.edu", questions_completed: 128, avg_score: 82, last_activity: "2026-02-18T15:30:00Z", enrollment_date: "2026-01-20" },
      ];

      setStudents(mockStudents);
    } catch (err) {
      console.error("Failed to fetch students", err);
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

  const filteredStudents = students.filter((student) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query);
  });

  const handleAddStudent = async () => {
    setAdding(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real app, send invitation emails
      console.log("Adding student(s):", addMode === "single" ? newStudentEmail : bulkEmails);

      setShowAddModal(false);
      setNewStudentEmail("");
      setBulkEmails("");
      fetchStudents(); // Refresh list
    } catch (err) {
      console.error("Failed to add student", err);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("Are you sure you want to remove this student from the course?")) return;

    try {
      // In real app, remove from backend
      setStudents(students.filter((s) => s.id !== studentId));
    } catch (err) {
      console.error("Failed to remove student", err);
    }
  };

  const handleExportRoster = () => {
    // In real app, generate CSV export
    console.log("Exporting roster...");
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
                onClick={() => navigate(`/faculty/courses/${id}`)}
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
                <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
                Back to Course
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleExportRoster}
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
                <Download size={16} />
                {!isMobile && "Export"}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  padding: isMobile ? "8px 14px" : "10px 18px",
                  background: C.green,
                  border: "none",
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: C.white,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <UserPlus size={18} />
                {!isMobile && "Add Students"}
              </button>
            </div>
          </div>
          <h1 style={{
            fontFamily: serif,
            fontSize: isMobile ? 24 : 30,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "0 0 4px",
          }}>
            Course Roster
          </h1>
          <p style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.textSecondary,
            margin: 0,
          }}>
            {courseName}
          </p>
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
              { label: "Total Students", value: students.length },
              { label: "Avg Completion", value: `${Math.round(students.reduce((sum, s) => sum + s.questions_completed, 0) / students.length)}` },
              { label: "Avg Score", value: `${Math.round(students.reduce((sum, s) => sum + s.avg_score, 0) / students.length)}%` },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 16,
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
                  fontSize: 28,
                  fontWeight: 700,
                  color: C.navyDeep,
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{
            ...fadeIn(0.1),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 16 : 20,
            marginBottom: 20,
          }}>
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
              <input
                type="search"
                placeholder="Search students by name or email..."
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

          {/* Student Table */}
          <div style={{
            ...fadeIn(0.15),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            overflow: "hidden",
          }}>
            {loading ? (
              <div style={{ padding: 24 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    height: 56,
                    background: C.parchment,
                    borderRadius: 6,
                    marginBottom: 8,
                  }} />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <h3 style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 8,
                }}>
                  No students found
                </h3>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.textSecondary,
                }}>
                  {searchQuery ? "Try adjusting your search" : "Add students to get started"}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                    <tr>
                      {["Name", "Email", "Questions", "Avg Score", "Last Activity", "Actions"].map((col) => (
                        <th key={col} style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                          whiteSpace: "nowrap",
                        }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id}
                        style={{
                          background: C.white,
                          borderBottom: `1px solid ${C.borderLight}`,
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = C.parchment;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = C.white;
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: sans,
                            fontSize: 15,
                            fontWeight: 600,
                            color: C.textPrimary,
                          }}>
                            {student.name}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: mono,
                            fontSize: 12,
                            color: C.textSecondary,
                          }}>
                            {student.email}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: serif,
                            fontSize: 18,
                            fontWeight: 700,
                            color: C.blueMid,
                          }}>
                            {student.questions_completed}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: serif,
                            fontSize: 18,
                            fontWeight: 700,
                            color: student.avg_score >= 80 ? C.green : student.avg_score >= 70 ? "#fa9d33" : C.red,
                          }}>
                            {student.avg_score}%
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: C.textMuted,
                          }}>
                            {formatRelativeTime(student.last_activity)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            onClick={() => handleRemoveStudent(student.id)}
                            style={{
                              padding: "6px 12px",
                              background: "transparent",
                              border: `1px solid ${C.border}`,
                              borderRadius: 6,
                              fontFamily: sans,
                              fontSize: 12,
                              fontWeight: 600,
                              color: C.red,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `${C.red}10`;
                              e.currentTarget.style.borderColor = C.red;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.borderColor = C.border;
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <>
          <div
            onClick={() => setShowAddModal(false)}
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
            {/* Modal Header */}
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
                Add Students
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
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
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24 }}>
              {/* Mode Tabs */}
              <div style={{
                display: "flex",
                gap: 8,
                marginBottom: 24,
                background: C.parchment,
                padding: 4,
                borderRadius: 8,
              }}>
                {[
                  { key: "single" as const, label: "Single Student", icon: <UserPlus size={16} /> },
                  { key: "bulk" as const, label: "Bulk Import", icon: <Upload size={16} /> },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setAddMode(mode.key)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "8px 16px",
                      background: addMode === mode.key ? C.white : "transparent",
                      border: "none",
                      borderRadius: 6,
                      fontFamily: sans,
                      fontSize: 14,
                      fontWeight: addMode === mode.key ? 600 : 400,
                      color: addMode === mode.key ? C.navyDeep : C.textSecondary,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                ))}
              </div>

              {addMode === "single" ? (
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
                    Student Email
                  </label>
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="student@msm.edu"
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
                    }}
                  />
                  <p style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.textMuted,
                    margin: "8px 0 0",
                  }}>
                    An invitation email will be sent to this student
                  </p>
                </div>
              ) : (
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
                    Student Emails (one per line)
                  </label>
                  <textarea
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="student1@msm.edu&#10;student2@msm.edu&#10;student3@msm.edu"
                    rows={8}
                    style={{
                      width: "100%",
                      background: C.parchment,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: "12px 16px",
                      fontFamily: mono,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: C.ink,
                      outline: "none",
                      resize: "vertical",
                    }}
                  />
                  <p style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.textMuted,
                    margin: "8px 0 0",
                  }}>
                    Invitation emails will be sent to all students
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex",
              gap: 12,
              padding: 24,
              borderTop: `1px solid ${C.borderLight}`,
            }}>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={adding}
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
                  cursor: adding ? "not-allowed" : "pointer",
                  opacity: adding ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={adding || (addMode === "single" ? !newStudentEmail : !bulkEmails)}
                style={{
                  flex: 1,
                  padding: "12px 24px",
                  background: adding || (addMode === "single" ? !newStudentEmail : !bulkEmails) ? C.textMuted : C.green,
                  border: "none",
                  borderRadius: 8,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.white,
                  cursor: adding || (addMode === "single" ? !newStudentEmail : !bulkEmails) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Mail size={16} />
                {adding ? "Sending..." : "Send Invitations"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
