import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { BarChart3, Users, Settings, Shield, Activity, Award, Download, Calendar, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — ACCREDITATION REPORTS (STORY-IA-6)
// Template B: Admin Shell with compliance reports + downloads
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

interface AccreditationReport {
  id: string;
  name: string;
  type: "LCME" | "ACGME" | "NBME";
  status: "compliant" | "at_risk" | "non_compliant";
  last_review: string;
  next_review: string;
  findings_count: number;
  action_items: number;
}

export default function AccreditationReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("accreditation");

  const [reports, setReports] = useState<AccreditationReport[]>([]);
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
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockReports: AccreditationReport[] = [
        {
          id: "1",
          name: "LCME Annual Self-Study",
          type: "LCME",
          status: "compliant",
          last_review: "2025-08-15",
          next_review: "2026-08-15",
          findings_count: 2,
          action_items: 0,
        },
        {
          id: "2",
          name: "ACGME Program Review",
          type: "ACGME",
          status: "at_risk",
          last_review: "2025-11-20",
          next_review: "2026-05-20",
          findings_count: 5,
          action_items: 3,
        },
        {
          id: "3",
          name: "NBME Exam Alignment Report",
          type: "NBME",
          status: "compliant",
          last_review: "2026-01-10",
          next_review: "2026-07-10",
          findings_count: 0,
          action_items: 0,
        },
      ];

      setReports(mockReports);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: AccreditationReport["status"]) => {
    switch (status) {
      case "compliant": return { bg: "rgba(105,163,56,0.1)", text: C.green, border: "rgba(105,163,56,0.2)", icon: <CheckCircle2 size={20} /> };
      case "at_risk": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)", icon: <AlertTriangle size={20} /> };
      case "non_compliant": return { bg: "rgba(201,40,45,0.1)", text: "#c9282d", border: "rgba(201,40,45,0.2)", icon: <AlertTriangle size={20} /> };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
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
                  Accreditation Reports
                </h1>
              </div>
            </div>
          </div>
        </div>

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
              { label: "Total Reports", value: reports.length, color: C.navyDeep },
              { label: "Compliant", value: reports.filter((r) => r.status === "compliant").length, color: C.green },
              { label: "Action Items", value: reports.reduce((sum, r) => sum + r.action_items, 0), color: "#fa9d33" },
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
                  color: stat.color,
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Reports List */}
          <div style={{ ...fadeIn(0.1), display: "flex", flexDirection: "column", gap: 16 }}>
            {reports.map((report) => {
              const statusColors = getStatusColor(report.status);
              return (
                <div key={report.id} style={{
                  background: C.white,
                  border: `1px solid ${C.borderLight}`,
                  borderRadius: 12,
                  padding: isMobile ? 20 : 24,
                }}>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                        <h3 style={{
                          fontFamily: serif,
                          fontSize: 20,
                          fontWeight: 700,
                          color: C.navyDeep,
                          margin: 0,
                        }}>
                          {report.name}
                        </h3>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 9,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          background: `${statusColors.text}15`,
                          color: statusColors.text,
                          padding: "3px 8px",
                          borderRadius: 4,
                        }}>
                          {report.type}
                        </div>
                      </div>
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
                        {statusColors.icon}
                        {report.status.replace("_", " ")}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: C.parchment,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 8,
                    padding: 16,
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
                    gap: 16,
                    marginBottom: 16,
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
                        Last Review
                      </div>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 14,
                        color: C.textSecondary,
                      }}>
                        {formatDate(report.last_review)}
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
                        Next Review
                      </div>
                      <div style={{
                        fontFamily: sans,
                        fontSize: 14,
                        color: C.textSecondary,
                      }}>
                        {formatDate(report.next_review)}
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
                        Findings
                      </div>
                      <div style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.navyDeep,
                      }}>
                        {report.findings_count}
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
                        Action Items
                      </div>
                      <div style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: report.action_items > 0 ? "#fa9d33" : C.green,
                      }}>
                        {report.action_items}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: C.navyDeep,
                        border: "none",
                        borderRadius: 6,
                        fontFamily: sans,
                        fontSize: 14,
                        fontWeight: 700,
                        color: C.white,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.blue;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = C.navyDeep;
                      }}
                    >
                      <FileText size={16} />
                      View Full Report
                    </button>
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
                      <Download size={16} />
                      Export PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
