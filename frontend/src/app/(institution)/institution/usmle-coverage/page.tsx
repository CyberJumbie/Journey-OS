'use client';

import { useRouter, usePathname } from 'next/navigation';


import { useState, useEffect } from "react";
import { BarChart3, Users, Settings, Shield, Activity, Award, GitBranch, GraduationCap, Layers, Download, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — INSTITUTIONAL USMLE COVERAGE
// 16 USMLE Systems × 7 Disciplines heatmap at institutional level
// Surface: sidebar (white) + content (cream) → white cards
// ═══════════════════════════════════════════════════════════════


const USMLE_SYSTEMS = [
  "General Principles", "Behavioral Health", "Biostatistics/Epi",
  "Blood & Lymph", "Cardiovascular", "Endocrine",
  "Gastrointestinal", "Immune System", "Multisystem",
  "Musculoskeletal", "Nervous System", "Renal/Urinary",
  "Reproductive", "Respiratory", "Skin/Subcutaneous", "Social Sciences"
];

const USMLE_DISCIPLINES = [
  "Anatomy", "Biochemistry", "Microbiology",
  "Pathology", "Pharmacology", "Physiology", "Behavioral"
];

// Mock heatmap data: system × discipline → { item_count, coverage_pct, concept_count }
function generateHeatmapData() {
  const data: Record<string, Record<string, { items: number; coverage: number; concepts: number }>> = {};
  const weights: Record<string, number> = {
    "General Principles": 12, "Behavioral Health": 6, "Biostatistics/Epi": 4,
    "Blood & Lymph": 5, "Cardiovascular": 10, "Endocrine": 6,
    "Gastrointestinal": 8, "Immune System": 7, "Multisystem": 4,
    "Musculoskeletal": 6, "Nervous System": 9, "Renal/Urinary": 6,
    "Reproductive": 5, "Respiratory": 7, "Skin/Subcutaneous": 3, "Social Sciences": 2,
  };

  for (const sys of USMLE_SYSTEMS) {
    data[sys] = {};
    for (const disc of USMLE_DISCIPLINES) {
      const w = weights[sys] || 5;
      // Simulate realistic coverage gaps
      const base = Math.random() * 80 + (sys === "Cardiovascular" && disc === "Pharmacology" ? 30 : 0);
      const items = Math.floor(Math.random() * w * 3);
      const coverage = Math.min(100, Math.round(base * (items > 0 ? 1 : 0)));
      const concepts = Math.floor(items * 0.4 + Math.random() * 3);
      data[sys][disc] = { items, coverage, concepts };
    }
  }
  // Force some known patterns for MSM
  data["Cardiovascular"]["Pharmacology"] = { items: 42, coverage: 91, concepts: 18 };
  data["Cardiovascular"]["Physiology"] = { items: 38, coverage: 86, concepts: 15 };
  data["Cardiovascular"]["Pathology"] = { items: 35, coverage: 82, concepts: 14 };
  data["Nervous System"]["Anatomy"] = { items: 28, coverage: 78, concepts: 12 };
  data["Nervous System"]["Pharmacology"] = { items: 22, coverage: 68, concepts: 10 };
  data["General Principles"]["Biochemistry"] = { items: 45, coverage: 88, concepts: 20 };
  data["Immune System"]["Microbiology"] = { items: 30, coverage: 85, concepts: 13 };
  data["Biostatistics/Epi"]["Behavioral"] = { items: 18, coverage: 72, concepts: 8 };
  data["Gastrointestinal"]["Pathology"] = { items: 24, coverage: 74, concepts: 11 };
  data["Renal/Urinary"]["Physiology"] = { items: 20, coverage: 65, concepts: 9 };
  data["Endocrine"]["Pharmacology"] = { items: 15, coverage: 55, concepts: 7 };
  data["Reproductive"]["Anatomy"] = { items: 8, coverage: 35, concepts: 4 };
  data["Skin/Subcutaneous"]["Pathology"] = { items: 5, coverage: 22, concepts: 3 };
  data["Social Sciences"]["Behavioral"] = { items: 3, coverage: 15, concepts: 2 };
  data["Musculoskeletal"]["Pharmacology"] = { items: 2, coverage: 8, concepts: 1 };
  return data;
}

interface DepartmentCoverage {
  department: string;
  courses: number;
  items: number;
  coverage: number;
  systems_covered: number;
  top_gaps: string[];
}

export default function InstitutionalUSMLECoverage() {
  const router = useRouter();
  const pathname = usePathname();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("usmle");
  const [loading, setLoading] = useState(true);

  const [heatmapData, setHeatmapData] = useState<Record<string, Record<string, { items: number; coverage: number; concepts: number }>>>({});
  const [hoveredCell, setHoveredCell] = useState<{ system: string; discipline: string } | null>(null);
  const [_selectedDepartment, _setSelectedDepartment] = useState("all");
  const [viewMode, setViewMode] = useState<"items" | "coverage" | "concepts">("items");
  const [departmentData, setDepartmentData] = useState<DepartmentCoverage[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = pathname;
    if (path === "/institution/dashboard" || path === "/institution") setActiveNav("dashboard");
    else if (path.startsWith("/institution/users")) setActiveNav("users");
    else if (path.startsWith("/institution/frameworks")) setActiveNav("frameworks");
    else if (path.startsWith("/institution/coverage")) setActiveNav("coverage");
    else if (path.startsWith("/institution/usmle")) setActiveNav("usmle");
    else if (path.startsWith("/institution/faculty-coverage")) setActiveNav("faculty-cov");
    else if (path.startsWith("/institution/sequence")) setActiveNav("sequence");
    else if (path.startsWith("/institution/accreditation")) setActiveNav("accreditation");
  }, [pathname]);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setHeatmapData(generateHeatmapData());
      setDepartmentData([
        { department: "Pharmacology", courses: 8, items: 420, coverage: 91, systems_covered: 14, top_gaps: ["Social Sciences", "Biostatistics/Epi"] },
        { department: "Anatomy", courses: 6, items: 310, coverage: 87, systems_covered: 12, top_gaps: ["Behavioral Health", "Biostatistics/Epi", "Social Sciences"] },
        { department: "Pathology", courses: 5, items: 280, coverage: 82, systems_covered: 14, top_gaps: ["Biostatistics/Epi", "Social Sciences"] },
        { department: "Biochemistry", courses: 4, items: 195, coverage: 78, systems_covered: 10, top_gaps: ["Musculoskeletal", "Skin/Subcutaneous", "Reproductive"] },
        { department: "Microbiology", courses: 3, items: 160, coverage: 74, systems_covered: 11, top_gaps: ["Musculoskeletal", "Endocrine", "Social Sciences"] },
        { department: "Physiology", courses: 4, items: 210, coverage: 80, systems_covered: 13, top_gaps: ["Skin/Subcutaneous", "Social Sciences"] },
        { department: "Neurology", courses: 3, items: 145, coverage: 72, systems_covered: 6, top_gaps: ["Cardiovascular", "Gastrointestinal", "Renal/Urinary"] },
        { department: "Psychiatry", courses: 2, items: 85, coverage: 65, systems_covered: 5, top_gaps: ["Cardiovascular", "Respiratory", "Renal/Urinary"] },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  // Compute summary stats
  const totalItems = Object.values(heatmapData).reduce((sum, discs) =>
    sum + Object.values(discs).reduce((s, d) => s + d.items, 0), 0);
  const totalCells = USMLE_SYSTEMS.length * USMLE_DISCIPLINES.length;
  const coveredCells = Object.values(heatmapData).reduce((sum, discs) =>
    sum + Object.values(discs).filter(d => d.items > 0).length, 0);
  const gapCells = totalCells - coveredCells;
  const avgCoverage = totalCells > 0
    ? Math.round(Object.values(heatmapData).reduce((sum, discs) =>
      sum + Object.values(discs).reduce((s, d) => s + d.coverage, 0), 0) / totalCells)
    : 0;

  const getCellColor = (value: number, mode: string) => {
    if (mode === "items") {
      if (value === 0) return { bg: C.parchment, text: C.textMuted };
      if (value >= 20) return { bg: C.green, text: C.white };
      if (value >= 5) return { bg: "#fa9d33", text: C.white };
      return { bg: "#c9282d", text: C.white };
    }
    // coverage mode
    if (value === 0) return { bg: C.parchment, text: C.textMuted };
    if (value >= 70) return { bg: C.green, text: C.white };
    if (value >= 40) return { bg: "#fa9d33", text: C.white };
    return { bg: "#c9282d", text: C.white };
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: BarChart3, path: "/institution/dashboard" },
    { key: "users", label: "User Management", Icon: Users, path: "/institution/users" },
    { key: "frameworks", label: "Frameworks", Icon: Shield, path: "/institution/frameworks" },
    { key: "coverage", label: "Coverage", Icon: Activity, path: "/institution/coverage" },
    { key: "usmle", label: "USMLE Coverage", Icon: Layers, path: "/institution/usmle-coverage" },
    { key: "faculty-cov", label: "Faculty Coverage", Icon: GraduationCap, path: "/institution/faculty-coverage" },
    { key: "sequence", label: "Sequence Modeler", Icon: GitBranch, path: "/institution/sequence" },
    { key: "accreditation", label: "Accreditation", Icon: Award, path: "/institution/accreditation" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/institution/settings" },
  ];

  const { data: currentUser } = useCurrentUser();
  const user = { name: currentUser?.displayName ?? "Admin", initials: currentUser?.initials ?? "??", role: currentUser?.roleLabel ?? "Institutional Admin", institution: "Morehouse School of Medicine" }; // TODO: replace institution with dynamic value when institution API is available
  const sidebarCollapsedWidth = 72;
  const sidebarExpandedWidth = 240;
  const sidebarWidth = isDesktop ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth) : (isTablet ? 220 : 260);

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  // Sidebar
  const sidebar = (
    <div
      onMouseEnter={() => isDesktop && setSidebarExpanded(true)}
      onMouseLeave={() => isDesktop && setSidebarExpanded(false)}
      style={{
        width: sidebarWidth, height: "100vh", position: "fixed", top: 0, left: 0, zIndex: 50,
        background: C.white, borderRight: `1px solid ${C.borderLight}`,
        display: "flex", flexDirection: "column",
        padding: isDesktop && !sidebarExpanded ? "24px 12px 20px" : "24px 16px 20px",
        transform: (!isDesktop && !sidebarOpen) ? `translateX(-${sidebarWidth}px)` : "translateX(0)",
        transition: "all 0.25s ease",
        boxShadow: (!isDesktop && sidebarOpen) ? "4px 0 24px rgba(0,44,118,0.06)" : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start", gap: 8, padding: isDesktop && !sidebarExpanded ? "0" : "0 8px", marginBottom: isDesktop && !sidebarExpanded ? 20 : 8, overflow: "hidden", whiteSpace: "nowrap" }}>
        {(sidebarExpanded || !isDesktop) ? (
          <>
            <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{ fontFamily: mono, fontSize: 8, color: C.greenDark, letterSpacing: "0.1em", border: `1.2px solid ${C.greenDark}`, padding: "1px 5px", borderRadius: 2.5 }}>OS</span>
          </>
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: serif, fontSize: 14, fontWeight: 700, color: C.white }}>J</div>
        )}
      </div>
      {(sidebarExpanded || !isDesktop) && <p style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, padding: "0 8px", marginBottom: 24 }}>{user.institution}</p>}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ key, label, Icon, path }) => {
          const isActive = activeNav === key;
          return (
            <button key={key} onClick={() => router.push(path)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: isDesktop && !sidebarExpanded ? "10px 0" : "10px 12px",
              justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start",
              borderRadius: 6, background: "transparent",
              borderLeft: isActive ? `3px solid ${C.greenDark}` : "3px solid transparent",
              fontFamily: sans, fontSize: 14, fontWeight: isActive ? 600 : 400,
              color: isActive ? C.navyDeep : C.textSecondary, cursor: "pointer", outline: "none",
              transition: "all 0.15s ease", textAlign: "left", border: "none",
            }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.parchment; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {(sidebarExpanded || !isDesktop) && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{ borderTop: `1px solid ${C.borderLight}`, paddingTop: 16, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: isDesktop && !sidebarExpanded ? "8px 0" : "8px", justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `${C.navyDeep}12`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: mono, fontSize: 12, fontWeight: 600, color: C.navyDeep, flexShrink: 0 }}>{user.initials}</div>
          {(sidebarExpanded || !isDesktop) && (
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{user.name}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted }}>{user.role}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: sans, minHeight: "100vh", background: C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      {sidebar}

      {!isDesktop && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 40, background: C.white, borderBottom: `1px solid ${C.borderLight}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <div style={{ width: 20, height: 2, background: C.ink, marginBottom: 5 }} />
            <div style={{ width: 20, height: 2, background: C.ink, marginBottom: 5 }} />
            <div style={{ width: 20, height: 2, background: C.ink }} />
          </button>
          <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>USMLE Coverage</span>
        </div>
      )}
      {!isDesktop && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 45 }} />}

      <div style={{ marginLeft: isDesktop ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth) : 0, paddingTop: isDesktop ? 0 : 56, transition: "margin-left 0.25s ease", minHeight: "100vh" }}>
        <div style={{ padding: isMobile ? "20px 16px" : "32px 32px" }}>
          {/* Header */}
          <div style={{ ...fadeIn(0.1), display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Layers size={20} color={C.navyDeep} />
                <h1 style={{ fontFamily: serif, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Institutional USMLE Coverage</h1>
              </div>
              <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, margin: 0 }}>
                16 USMLE Systems × 7 Disciplines — assessment item distribution across the institution
              </p>
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13,
              fontWeight: 500, color: C.textSecondary, cursor: "pointer",
            }}>
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* KPI Strip */}
          <div style={{ ...fadeIn(0.15), display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Total Items", value: totalItems.toLocaleString(), icon: <BarChart3 size={18} color={C.blueMid} />, color: C.blueMid },
              { label: "Avg Coverage", value: `${avgCoverage}%`, icon: <TrendingUp size={18} color={C.green} />, color: C.green },
              { label: "Cells Covered", value: `${coveredCells}/${totalCells}`, icon: <CheckCircle2 size={18} color={C.green} />, color: C.green },
              { label: "Gap Cells", value: gapCells.toString(), icon: <AlertTriangle size={18} color="#c9282d" />, color: "#c9282d" },
            ].map((kpi, i) => (
              <div key={i} style={{ background: C.white, borderRadius: 10, padding: "16px 18px", border: `1px solid ${C.borderLight}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${kpi.color}10`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{kpi.icon}</div>
                <div>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 4 }}>{kpi.label}</div>
                  <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, color: C.navyDeep }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* View mode toggle */}
          <div style={{ ...fadeIn(0.2), display: "flex", gap: 6, marginBottom: 16 }}>
            {([["items", "Item Count"], ["coverage", "Coverage %"], ["concepts", "Concepts"]] as const).map(([mode, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: "6px 14px", borderRadius: 6,
                border: `1px solid ${viewMode === mode ? C.navyDeep : C.border}`,
                background: viewMode === mode ? `${C.navyDeep}08` : C.white,
                fontFamily: sans, fontSize: 12, fontWeight: viewMode === mode ? 600 : 400,
                color: viewMode === mode ? C.navyDeep : C.textMuted, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {/* Heatmap */}
          <div style={{ ...fadeIn(0.25), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "24px", overflowX: "auto", marginBottom: 24 }}>
            {loading ? (
              <div style={{ padding: "60px 0", textAlign: "center" }}>
                <div style={{ width: 24, height: 24, border: `3px solid ${C.borderLight}`, borderTopColor: C.navyDeep, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted }}>Loading coverage data...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <div style={{ minWidth: 700 }}>
                {/* Column headers */}
                <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${USMLE_DISCIPLINES.length}, 1fr)`, gap: 3, marginBottom: 4 }}>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", color: C.textMuted, padding: "8px 0" }}>SYSTEM \ DISCIPLINE</div>
                  {USMLE_DISCIPLINES.map(disc => (
                    <div key={disc} style={{
                      fontFamily: mono, fontSize: 9, letterSpacing: "0.06em", color: C.textMuted,
                      textAlign: "center", padding: "8px 4px",
                      transform: isDesktop ? "rotate(-35deg)" : "none",
                      transformOrigin: "center bottom", height: isDesktop ? 55 : "auto",
                      display: "flex", alignItems: isDesktop ? "flex-end" : "center", justifyContent: "center",
                    }}>{disc}</div>
                  ))}
                </div>

                {/* Rows */}
                {USMLE_SYSTEMS.map((system) => (
                  <div key={system} style={{
                    display: "grid",
                    gridTemplateColumns: `160px repeat(${USMLE_DISCIPLINES.length}, 1fr)`,
                    gap: 3, marginBottom: 3,
                  }}>
                    <div style={{
                      fontFamily: sans, fontSize: 12, fontWeight: 500, color: C.textPrimary,
                      padding: "8px 4px", display: "flex", alignItems: "center",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{system}</div>
                    {USMLE_DISCIPLINES.map(disc => {
                      const cell = heatmapData[system]?.[disc] || { items: 0, coverage: 0, concepts: 0 };
                      const value = viewMode === "items" ? cell.items : viewMode === "coverage" ? cell.coverage : cell.concepts;
                      const colors = getCellColor(value, viewMode);
                      const isHovered = hoveredCell?.system === system && hoveredCell?.discipline === disc;
                      return (
                        <div
                          key={disc}
                          onMouseEnter={() => setHoveredCell({ system, discipline: disc })}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            borderRadius: 4,
                            padding: "8px 4px",
                            textAlign: "center",
                            fontFamily: mono,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                            transform: isHovered ? "scale(1.08)" : "scale(1)",
                            boxShadow: isHovered ? "0 4px 12px rgba(0,44,118,0.15)" : "none",
                            position: "relative",
                            minHeight: 36,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          onClick={() => {
                            if (cell.items === 0) {
                              router.push(`/faculty/quest?system=${encodeURIComponent(system)}&discipline=${encodeURIComponent(disc)}`);
                            }
                          }}
                        >
                          {value === 0 ? "—" : value}
                          {/* Tooltip */}
                          {isHovered && (
                            <div style={{
                              position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
                              transform: "translateX(-50%)", background: C.ink, color: C.white,
                              padding: "10px 14px", borderRadius: 8, fontSize: 11, fontFamily: sans,
                              fontWeight: 400, whiteSpace: "nowrap", zIndex: 20,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>{system} × {disc}</div>
                              <div>Items: {cell.items} · Coverage: {cell.coverage}% · Concepts: {cell.concepts}</div>
                              {cell.items === 0 && <div style={{ color: "#fa9d33", marginTop: 4 }}>Click to generate questions for this gap</div>}
                              <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `6px solid ${C.ink}` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Legend */}
                <div style={{ display: "flex", gap: 16, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.borderLight}`, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em" }}>
                    {viewMode === "items" ? "ITEM COUNT:" : viewMode === "coverage" ? "COVERAGE %:" : "CONCEPTS:"}
                  </span>
                  {(viewMode === "items"
                    ? [{ color: C.green, label: "≥20 items" }, { color: "#fa9d33", label: "5-19 items" }, { color: "#c9282d", label: "1-4 items" }, { color: C.parchment, label: "0 items (gap)" }]
                    : [{ color: C.green, label: "≥70%" }, { color: "#fa9d33", label: "40-69%" }, { color: "#c9282d", label: "<40%" }, { color: C.parchment, label: "No data" }]
                  ).map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, border: item.color === C.parchment ? `1px solid ${C.border}` : "none" }} />
                      <span style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Department Coverage Table */}
          <div style={{ ...fadeIn(0.3), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "24px", marginBottom: 24 }}>
            <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: "0 0 20px" }}>Department Coverage Breakdown</h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Department", "Courses", "Items", "Avg Coverage", "Systems Covered", "Top Gaps"].map(h => (
                      <th key={h} style={{
                        fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                        color: C.textMuted, textAlign: "left", padding: "10px 12px",
                        borderBottom: `2px solid ${C.borderLight}`, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {departmentData.map((dept, _i) => (
                    <tr key={dept.department} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                      <td style={{ padding: "12px", fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary }}>{dept.department}</td>
                      <td style={{ padding: "12px", fontFamily: mono, fontSize: 13, color: C.textSecondary }}>{dept.courses}</td>
                      <td style={{ padding: "12px", fontFamily: mono, fontSize: 13, color: C.textSecondary }}>{dept.items.toLocaleString()}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 80, height: 8, background: C.parchment, borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ width: `${dept.coverage}%`, height: "100%", background: dept.coverage >= 80 ? C.green : dept.coverage >= 60 ? "#fa9d33" : "#c9282d", borderRadius: 4 }} />
                          </div>
                          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: dept.coverage >= 80 ? C.green : dept.coverage >= 60 ? "#fa9d33" : "#c9282d" }}>{dept.coverage}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px", fontFamily: mono, fontSize: 13, color: C.textSecondary }}>{dept.systems_covered}/16</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {dept.top_gaps.map(gap => (
                            <span key={gap} style={{
                              padding: "2px 8px", borderRadius: 4, fontFamily: sans, fontSize: 11,
                              background: "rgba(201,40,45,0.08)", color: "#c9282d", border: "1px solid rgba(201,40,45,0.15)",
                            }}>{gap}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
