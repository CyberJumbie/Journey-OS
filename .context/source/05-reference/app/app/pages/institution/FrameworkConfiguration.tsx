import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { BarChart3, Users, Settings, Shield, Activity, Award, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FRAMEWORK CONFIGURATION (STORY-IA-4)
// Template B: Admin Shell with framework cards + toggle controls
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

interface Framework {
  id: string;
  name: string;
  code: string;
  description: string;
  type: "competency" | "assessment" | "accreditation";
  enabled: boolean;
  item_count: number;
  coverage_percent: number;
}

export default function FrameworkConfiguration() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("frameworks");

  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/institution/dashboard" || path === "/institution") setActiveNav("dashboard");
    else if (path.startsWith("/institution/users")) setActiveNav("users");
    else if (path.startsWith("/institution/frameworks")) setActiveNav("frameworks");
    else if (path.startsWith("/institution/coverage")) setActiveNav("coverage");
    else if (path.startsWith("/institution/accreditation")) setActiveNav("accreditation");
    else if (path.startsWith("/institution/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const fetchFrameworks = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockFrameworks: Framework[] = [
        {
          id: "1",
          name: "USMLE Step 1 Content Outline",
          code: "USMLE-STEP1",
          description: "United States Medical Licensing Examination Step 1 competencies covering foundational sciences",
          type: "assessment",
          enabled: true,
          item_count: 342,
          coverage_percent: 87,
        },
        {
          id: "2",
          name: "USMLE Step 2 CK Content Outline",
          code: "USMLE-STEP2-CK",
          description: "Clinical Knowledge competencies for medical licensure",
          type: "assessment",
          enabled: true,
          item_count: 289,
          coverage_percent: 76,
        },
        {
          id: "3",
          name: "ACGME Core Competencies",
          code: "ACGME-CORE",
          description: "Six core competencies for graduate medical education: Patient Care, Medical Knowledge, Practice-Based Learning, Interpersonal Skills, Professionalism, Systems-Based Practice",
          type: "competency",
          enabled: true,
          item_count: 156,
          coverage_percent: 92,
        },
        {
          id: "4",
          name: "LCME Accreditation Standards",
          code: "LCME",
          description: "Liaison Committee on Medical Education standards for medical school accreditation",
          type: "accreditation",
          enabled: true,
          item_count: 124,
          coverage_percent: 94,
        },
        {
          id: "5",
          name: "NBME Subject Exam Blueprints",
          code: "NBME",
          description: "National Board of Medical Examiners subject examination content specifications",
          type: "assessment",
          enabled: false,
          item_count: 0,
          coverage_percent: 0,
        },
        {
          id: "6",
          name: "EPA (Entrustable Professional Activities)",
          code: "EPA",
          description: "AAMC Core Entrustable Professional Activities for Entering Residency",
          type: "competency",
          enabled: false,
          item_count: 0,
          coverage_percent: 0,
        },
      ];

      setFrameworks(mockFrameworks);
    } catch (err) {
      console.error("Failed to fetch frameworks", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFramework = async (id: string, currentState: boolean) => {
    try {
      setFrameworks((prev) =>
        prev.map((f) => (f.id === id ? { ...f, enabled: !currentState } : f))
      );

      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error("Failed to toggle framework", err);
    }
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: BarChart3, path: "/institution/dashboard" },
    { key: "users", label: "User Management", Icon: Users, path: "/institution/users" },
    { key: "frameworks", label: "Frameworks", Icon: Shield, path: "/institution/frameworks" },
    { key: "coverage", label: "Coverage", Icon: Activity, path: "/institution/coverage" },
    { key: "accreditation", label: "Accreditation", Icon: Award, path: "/institution/accreditation" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/institution/settings" },
  ];

  const user = { name: "Dr. Sarah Johnson", initials: "SJ", role: "Institutional Admin", institution: "Morehouse School of Medicine" };

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

  const getTypeColor = (type: Framework["type"]) => {
    switch (type) {
      case "competency": return { bg: "rgba(43,113,185,0.1)", text: C.blueMid };
      case "assessment": return { bg: "rgba(105,163,56,0.1)", text: C.green };
      case "accreditation": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33" };
    }
  };

  const getTypeLabel = (type: Framework["type"]) => {
    switch (type) {
      case "competency": return "Competency";
      case "assessment": return "Assessment";
      case "accreditation": return "Accreditation";
    }
  };

  // Sidebar (same pattern)
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
          {user.institution}
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
                  Framework Configuration
                </h1>
              </div>
            </div>
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
              { label: "Total Frameworks", value: frameworks.length },
              { label: "Enabled", value: frameworks.filter((f) => f.enabled).length },
              { label: "Avg Coverage", value: `${Math.round(frameworks.filter((f) => f.enabled).reduce((sum, f) => sum + f.coverage_percent, 0) / frameworks.filter((f) => f.enabled).length || 0)}%` },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 20,
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
                  fontSize: 32,
                  fontWeight: 700,
                  color: C.navyDeep,
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Framework Cards */}
          <div style={{ ...fadeIn(0.1) }}>
            <h2 style={{
              fontFamily: serif,
              fontSize: 18,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 12,
            }}>
              Available Frameworks
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    height: 120,
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                ))
              ) : (
                frameworks.map((framework) => {
                  const typeColors = getTypeColor(framework.type);
                  return (
                    <div key={framework.id} style={{
                      background: C.white,
                      border: `1px solid ${framework.enabled ? C.blueMid : C.borderLight}`,
                      borderRadius: 12,
                      padding: isMobile ? 20 : 24,
                      transition: "all 0.2s ease",
                    }}>
                      <div style={{
                        display: "flex",
                        alignItems: "start",
                        justifyContent: "space-between",
                        gap: 16,
                        marginBottom: 12,
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                            <h3 style={{
                              fontFamily: serif,
                              fontSize: 20,
                              fontWeight: 700,
                              color: C.navyDeep,
                              margin: 0,
                            }}>
                              {framework.name}
                            </h3>
                            <div style={{
                              fontFamily: mono,
                              fontSize: 9,
                              fontWeight: 500,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              background: typeColors.bg,
                              color: typeColors.text,
                              padding: "3px 8px",
                              borderRadius: 4,
                            }}>
                              {getTypeLabel(framework.type)}
                            </div>
                          </div>
                          <p style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: C.textMuted,
                            margin: "0 0 12px",
                          }}>
                            {framework.code}
                          </p>
                          <p style={{
                            fontFamily: sans,
                            fontSize: 14,
                            color: C.textSecondary,
                            lineHeight: 1.6,
                            margin: 0,
                          }}>
                            {framework.description}
                          </p>
                        </div>

                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleFramework(framework.id, framework.enabled)}
                          style={{
                            width: 52,
                            height: 28,
                            borderRadius: 14,
                            background: framework.enabled ? C.green : C.textMuted,
                            border: "none",
                            cursor: "pointer",
                            position: "relative",
                            transition: "background 0.2s ease",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: C.white,
                            position: "absolute",
                            top: 3,
                            left: framework.enabled ? 27 : 3,
                            transition: "left 0.2s ease",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          }} />
                        </button>
                      </div>

                      {framework.enabled && (
                        <div style={{
                          background: C.parchment,
                          border: `1px solid ${C.borderLight}`,
                          borderRadius: 8,
                          padding: 16,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 16,
                          marginTop: 16,
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
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
                                  Mapped Items
                                </div>
                                <div style={{
                                  fontFamily: serif,
                                  fontSize: 24,
                                  fontWeight: 700,
                                  color: C.navyDeep,
                                }}>
                                  {framework.item_count}
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
                                  Coverage
                                </div>
                                <div style={{
                                  fontFamily: serif,
                                  fontSize: 24,
                                  fontWeight: 700,
                                  color: framework.coverage_percent >= 80 ? C.green : framework.coverage_percent >= 50 ? "#fa9d33" : "#c9282d",
                                }}>
                                  {framework.coverage_percent}%
                                </div>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <div style={{
                              height: 8,
                              background: C.white,
                              borderRadius: 4,
                              overflow: "hidden",
                            }}>
                              <div style={{
                                width: `${framework.coverage_percent}%`,
                                height: "100%",
                                background: framework.coverage_percent >= 80 ? C.green : framework.coverage_percent >= 50 ? "#fa9d33" : "#c9282d",
                                transition: "width 0.3s ease",
                              }} />
                            </div>
                          </div>

                          <button
                            onClick={() => navigate(`/institution/frameworks/${framework.id}`)}
                            style={{
                              padding: "8px 16px",
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
                              gap: 6,
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = C.blueMid;
                              e.currentTarget.style.color = C.blueMid;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = C.border;
                              e.currentTarget.style.color = C.navyDeep;
                            }}
                          >
                            Configure
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
