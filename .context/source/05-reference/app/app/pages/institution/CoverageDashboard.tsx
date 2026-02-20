import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { BarChart3, Users, Settings, Shield, Activity, Award, TrendingUp, AlertCircle } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — COVERAGE DASHBOARD (STORY-IA-5)
// Template B: Admin Shell with coverage heatmap + metrics
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

interface CoverageItem {
  id: string;
  domain: string;
  subdomain: string;
  coverage_percent: number;
  question_count: number;
  gap_priority: "high" | "medium" | "low";
}

export default function CoverageDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("coverage");

  const [coverageData, setCoverageData] = useState<CoverageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState("USMLE-STEP1");

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
    fetchCoverageData();
  }, [selectedFramework]);

  const fetchCoverageData = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockData: CoverageItem[] = [
        { id: "1", domain: "Biochemistry", subdomain: "Metabolism", coverage_percent: 92, question_count: 48, gap_priority: "low" },
        { id: "2", domain: "Biochemistry", subdomain: "Molecular Biology", coverage_percent: 76, question_count: 32, gap_priority: "medium" },
        { id: "3", domain: "Biochemistry", subdomain: "Genetics", coverage_percent: 84, question_count: 38, gap_priority: "low" },
        { id: "4", domain: "Physiology", subdomain: "Cardiovascular", coverage_percent: 88, question_count: 54, gap_priority: "low" },
        { id: "5", domain: "Physiology", subdomain: "Respiratory", coverage_percent: 62, question_count: 28, gap_priority: "high" },
        { id: "6", domain: "Physiology", subdomain: "Renal", coverage_percent: 72, question_count: 34, gap_priority: "medium" },
        { id: "7", domain: "Pharmacology", subdomain: "Autonomic", coverage_percent: 94, question_count: 42, gap_priority: "low" },
        { id: "8", domain: "Pharmacology", subdomain: "Cardiovascular", coverage_percent: 86, question_count: 40, gap_priority: "low" },
        { id: "9", domain: "Pharmacology", subdomain: "Antimicrobials", coverage_percent: 58, question_count: 24, gap_priority: "high" },
        { id: "10", domain: "Pathology", subdomain: "Neoplasia", coverage_percent: 78, question_count: 36, gap_priority: "medium" },
        { id: "11", domain: "Pathology", subdomain: "Inflammation", coverage_percent: 82, question_count: 38, gap_priority: "low" },
        { id: "12", domain: "Pathology", subdomain: "Hemodynamics", coverage_percent: 68, question_count: 30, gap_priority: "medium" },
      ];

      setCoverageData(mockData);
    } catch (err) {
      console.error("Failed to fetch coverage data", err);
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

  const getCoverageColor = (percent: number) => {
    if (percent >= 80) return C.green;
    if (percent >= 60) return "#fa9d33";
    return "#c9282d";
  };

  const getPriorityColor = (priority: CoverageItem["gap_priority"]) => {
    switch (priority) {
      case "high": return { bg: "rgba(201,40,45,0.1)", text: "#c9282d", border: "rgba(201,40,45,0.2)" };
      case "medium": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "low": return { bg: "rgba(105,163,56,0.1)", text: C.green, border: "rgba(105,163,56,0.2)" };
    }
  };

  const groupedData = coverageData.reduce((acc, item) => {
    if (!acc[item.domain]) acc[item.domain] = [];
    acc[item.domain].push(item);
    return acc;
  }, {} as Record<string, CoverageItem[]>);

  const overallCoverage = Math.round(
    coverageData.reduce((sum, item) => sum + item.coverage_percent, 0) / coverageData.length || 0
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
                  Coverage Dashboard
                </h1>
              </div>
            </div>
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              style={{
                height: 40,
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: "0 32px 0 12px",
                fontFamily: sans,
                fontSize: 14,
                color: C.ink,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="USMLE-STEP1">USMLE Step 1</option>
              <option value="USMLE-STEP2">USMLE Step 2 CK</option>
              <option value="ACGME">ACGME Core</option>
            </select>
          </div>
        </div>

        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Overall Stats */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Overall Coverage", value: `${overallCoverage}%`, icon: <Activity size={20} />, color: getCoverageColor(overallCoverage) },
              { label: "Total Questions", value: coverageData.reduce((sum, i) => sum + i.question_count, 0), icon: <TrendingUp size={20} />, color: C.navyDeep },
              { label: "High Priority Gaps", value: coverageData.filter((i) => i.gap_priority === "high").length, icon: <AlertCircle size={20} />, color: "#c9282d" },
              { label: "Domains", value: Object.keys(groupedData).length, icon: <Shield size={20} />, color: C.blueMid },
            ].map((stat) => (
              <div key={stat.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 20,
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}>
                <div style={{
                  width: 48,
                  height: 48,
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
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 4,
                  }}>
                    {stat.label}
                  </div>
                  <div style={{
                    fontFamily: serif,
                    fontSize: 28,
                    fontWeight: 700,
                    color: stat.color,
                  }}>
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coverage by Domain */}
          <div style={{ ...fadeIn(0.1) }}>
            <h2 style={{
              fontFamily: serif,
              fontSize: 18,
              fontWeight: 700,
              color: C.navyDeep,
              marginBottom: 12,
            }}>
              Coverage by Domain
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {Object.entries(groupedData).map(([domain, items]) => {
                const domainAvg = Math.round(items.reduce((sum, i) => sum + i.coverage_percent, 0) / items.length);
                return (
                  <div key={domain} style={{
                    background: C.white,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 12,
                    padding: isMobile ? 20 : 24,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <h3 style={{
                        fontFamily: serif,
                        fontSize: 20,
                        fontWeight: 700,
                        color: C.navyDeep,
                        margin: 0,
                      }}>
                        {domain}
                      </h3>
                      <div style={{
                        fontFamily: serif,
                        fontSize: 24,
                        fontWeight: 700,
                        color: getCoverageColor(domainAvg),
                      }}>
                        {domainAvg}%
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                      {items.map((item) => {
                        const priorityColors = getPriorityColor(item.gap_priority);
                        return (
                          <div key={item.id} style={{
                            background: C.parchment,
                            border: `1px solid ${C.borderLight}`,
                            borderRadius: 8,
                            padding: 16,
                          }}>
                            <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 8 }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{
                                  fontFamily: sans,
                                  fontSize: 15,
                                  fontWeight: 700,
                                  color: C.navyDeep,
                                  margin: "0 0 4px",
                                }}>
                                  {item.subdomain}
                                </h4>
                                <p style={{
                                  fontFamily: mono,
                                  fontSize: 10,
                                  color: C.textMuted,
                                  margin: 0,
                                }}>
                                  {item.question_count} questions
                                </p>
                              </div>
                              <div style={{
                                fontFamily: mono,
                                fontSize: 9,
                                fontWeight: 500,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                                background: priorityColors.bg,
                                color: priorityColors.text,
                                border: `1px solid ${priorityColors.border}`,
                                padding: "3px 8px",
                                borderRadius: 4,
                              }}>
                                {item.gap_priority}
                              </div>
                            </div>

                            <div style={{
                              height: 6,
                              background: C.white,
                              borderRadius: 3,
                              overflow: "hidden",
                              marginTop: 12,
                            }}>
                              <div style={{
                                width: `${item.coverage_percent}%`,
                                height: "100%",
                                background: getCoverageColor(item.coverage_percent),
                                transition: "width 0.3s ease",
                              }} />
                            </div>
                            <div style={{
                              fontFamily: serif,
                              fontSize: 18,
                              fontWeight: 700,
                              color: getCoverageColor(item.coverage_percent),
                              marginTop: 8,
                            }}>
                              {item.coverage_percent}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}