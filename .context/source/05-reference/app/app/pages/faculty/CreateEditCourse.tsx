import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router";
import { LayoutDashboard, BookOpen, FileText, Settings, Plus, ChevronRight, X } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — CREATE/EDIT COURSE (STORY-F-4)
// Template B: Faculty Shell with course form
// Surface: sidebar (white) + content (cream) → white card → parchment inputs
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

interface CourseFormData {
  code: string;
  name: string;
  term: string;
  description: string;
  start_date: string;
  end_date: string;
  status: "active" | "draft";
}

export default function CreateEditCourse() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("courses");

  const [formData, setFormData] = useState<CourseFormData>({
    code: "",
    name: "",
    term: "Spring 2026",
    description: "",
    start_date: "",
    end_date: "",
    status: "draft",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CourseFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEditMode = !!id;

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
    if (isEditMode) {
      fetchCourseData();
    }
  }, [id]);

  const fetchCourseData = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockCourse: CourseFormData = {
        code: "PHARM-501",
        name: "Pharmacology I",
        term: "Spring 2026",
        description: "Introduction to pharmacology principles, drug mechanisms, and therapeutic applications. Covers autonomic nervous system, cardiovascular, and CNS pharmacology.",
        start_date: "2026-01-20",
        end_date: "2026-05-15",
        status: "active",
      };

      setFormData(mockCourse);
    } catch (err) {
      console.error("Failed to fetch course data", err);
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

  const validateForm = () => {
    const newErrors: Partial<Record<keyof CourseFormData, string>> = {};

    if (!formData.code.trim()) newErrors.code = "Course code is required";
    if (!formData.name.trim()) newErrors.name = "Course name is required";
    if (!formData.term.trim()) newErrors.term = "Term is required";
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (!formData.end_date) newErrors.end_date = "End date is required";
    
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end <= start) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In a real app, save to backend
      console.log("Saving course:", formData);

      // Navigate to course detail
      navigate(`/faculty/courses/${id || "1"}`);
    } catch (err) {
      console.error("Failed to save course", err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CourseFormData, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
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
              <button
                onClick={() => navigate("/faculty/courses")}
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
                Back to Courses
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
            margin: "12px 0 0",
          }}>
            {isEditMode ? "Edit Course" : "Create New Course"}
          </h1>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 900 }}>
          {loading ? (
            <div style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: 48,
              textAlign: "center",
            }}>
              <div style={{
                fontFamily: sans,
                fontSize: 15,
                color: C.textMuted,
              }}>
                Loading course...
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ ...fadeIn(0.05) }}>
              <div style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 12,
                padding: isMobile ? 24 : 32,
              }}>
                {/* Course Code */}
                <div style={{ marginBottom: 24 }}>
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
                    Course Code <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g., PHARM-501"
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.parchment,
                      border: `1px solid ${errors.code ? C.red : C.border}`,
                      borderRadius: 8,
                      padding: "0 16px",
                      fontFamily: sans,
                      fontSize: 15,
                      color: C.ink,
                      outline: "none",
                    }}
                  />
                  {errors.code && (
                    <div style={{
                      fontFamily: sans,
                      fontSize: 12,
                      color: C.red,
                      marginTop: 6,
                    }}>
                      {errors.code}
                    </div>
                  )}
                </div>

                {/* Course Name */}
                <div style={{ marginBottom: 24 }}>
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
                    Course Name <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g., Pharmacology I"
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.parchment,
                      border: `1px solid ${errors.name ? C.red : C.border}`,
                      borderRadius: 8,
                      padding: "0 16px",
                      fontFamily: sans,
                      fontSize: 15,
                      color: C.ink,
                      outline: "none",
                    }}
                  />
                  {errors.name && (
                    <div style={{
                      fontFamily: sans,
                      fontSize: 12,
                      color: C.red,
                      marginTop: 6,
                    }}>
                      {errors.name}
                    </div>
                  )}
                </div>

                {/* Term */}
                <div style={{ marginBottom: 24 }}>
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
                    Term <span style={{ color: C.red }}>*</span>
                  </label>
                  <select
                    value={formData.term}
                    onChange={(e) => handleChange("term", e.target.value)}
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.parchment,
                      border: `1px solid ${errors.term ? C.red : C.border}`,
                      borderRadius: 8,
                      padding: "0 16px",
                      fontFamily: sans,
                      fontSize: 15,
                      color: C.ink,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Spring 2026">Spring 2026</option>
                    <option value="Summer 2026">Summer 2026</option>
                    <option value="Fall 2026">Fall 2026</option>
                    <option value="Winter 2027">Winter 2027</option>
                  </select>
                  {errors.term && (
                    <div style={{
                      fontFamily: sans,
                      fontSize: 12,
                      color: C.red,
                      marginTop: 6,
                    }}>
                      {errors.term}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div style={{ marginBottom: 24 }}>
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
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="Provide a brief description of the course..."
                    rows={4}
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

                {/* Dates */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 16,
                  marginBottom: 24,
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
                      Start Date <span style={{ color: C.red }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleChange("start_date", e.target.value)}
                      style={{
                        width: "100%",
                        height: 44,
                        background: C.parchment,
                        border: `1px solid ${errors.start_date ? C.red : C.border}`,
                        borderRadius: 8,
                        padding: "0 16px",
                        fontFamily: sans,
                        fontSize: 15,
                        color: C.ink,
                        outline: "none",
                      }}
                    />
                    {errors.start_date && (
                      <div style={{
                        fontFamily: sans,
                        fontSize: 12,
                        color: C.red,
                        marginTop: 6,
                      }}>
                        {errors.start_date}
                      </div>
                    )}
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
                      End Date <span style={{ color: C.red }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => handleChange("end_date", e.target.value)}
                      style={{
                        width: "100%",
                        height: 44,
                        background: C.parchment,
                        border: `1px solid ${errors.end_date ? C.red : C.border}`,
                        borderRadius: 8,
                        padding: "0 16px",
                        fontFamily: sans,
                        fontSize: 15,
                        color: C.ink,
                        outline: "none",
                      }}
                    />
                    {errors.end_date && (
                      <div style={{
                        fontFamily: sans,
                        fontSize: 12,
                        color: C.red,
                        marginTop: 6,
                      }}>
                        {errors.end_date}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div style={{ marginBottom: 32 }}>
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
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value as "active" | "draft")}
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
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: "flex",
                  gap: 12,
                  paddingTop: 24,
                  borderTop: `1px solid ${C.borderLight}`,
                }}>
                  <button
                    type="button"
                    onClick={() => navigate("/faculty/courses")}
                    disabled={saving}
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
                      cursor: saving ? "not-allowed" : "pointer",
                      opacity: saving ? 0.5 : 1,
                      transition: "all 0.2s ease",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: "12px 24px",
                      background: saving ? C.textMuted : C.green,
                      border: "none",
                      borderRadius: 8,
                      fontFamily: sans,
                      fontSize: 15,
                      fontWeight: 700,
                      color: C.white,
                      cursor: saving ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!saving) e.currentTarget.style.background = C.greenDark;
                    }}
                    onMouseLeave={(e) => {
                      if (!saving) e.currentTarget.style.background = C.green;
                    }}
                  >
                    {saving ? "Saving..." : (isEditMode ? "Save Changes" : "Create Course")}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
