'use client';

import { useRouter, usePathname } from 'next/navigation';


import { useState, useEffect, useCallback } from "react";
import { BarChart3, Users, Settings, Shield, Activity, Award, GitBranch, GraduationCap, ChevronUp, ChevronDown, Plus, X, RotateCcw, Eye, Layers } from "lucide-react";

import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — SECTION SEQUENCE MODELER
// Institutional Admin: Model a course sequence and see cumulative
// USMLE coverage for students following that path
// Surface: sidebar (white) + content (cream) → white cards
// ═══════════════════════════════════════════════════════════════


interface Section {
  id: string;
  code: string;
  name: string;
  department: string;
  credits: number;
  term: string;
  phase: string;
  usmle_coverage: Record<string, number>; // system -> percent
}

interface SequenceSlot {
  position: number;
  section: Section;
}

const USMLE_SYSTEMS = [
  "General Principles", "Behavioral Health", "Biostatistics",
  "Blood & Lymph", "Cardiovascular", "Endocrine",
  "Gastrointestinal", "Immune System", "Multisystem",
  "Musculoskeletal", "Nervous System", "Renal/Urinary",
  "Reproductive", "Respiratory", "Skin/Subcut"
];

// Mock available sections
const AVAILABLE_SECTIONS: Section[] = [
  { id: "s1", code: "MEDI 511", name: "Human Structure & Development", department: "Anatomy", credits: 6, term: "Fall Y1", phase: "Pre-clinical", usmle_coverage: { "General Principles": 35, "Musculoskeletal": 72, "Nervous System": 45, "Cardiovascular": 28, "Respiratory": 22, "Gastrointestinal": 18, "Reproductive": 42, "Renal/Urinary": 15, "Endocrine": 12, "Skin/Subcut": 30 } },
  { id: "s2", code: "MEDI 521", name: "Molecules, Cells & Tissues", department: "Biochemistry", credits: 5, term: "Fall Y1", phase: "Pre-clinical", usmle_coverage: { "General Principles": 68, "Immune System": 32, "Blood & Lymph": 28, "Endocrine": 18, "Gastrointestinal": 15, "Biostatistics": 8 } },
  { id: "s3", code: "MEDI 531", name: "Organ Systems I", department: "Pharmacology", credits: 8, term: "Spring Y1", phase: "Pre-clinical", usmle_coverage: { "Cardiovascular": 78, "Respiratory": 65, "Renal/Urinary": 58, "Endocrine": 52, "Blood & Lymph": 45, "Gastrointestinal": 42, "General Principles": 25, "Nervous System": 20, "Immune System": 18 } },
  { id: "s4", code: "MEDI 532", name: "Organ Systems II", department: "Pharmacology", credits: 8, term: "Fall Y2", phase: "Pre-clinical", usmle_coverage: { "Nervous System": 72, "Musculoskeletal": 55, "Skin/Subcut": 48, "Reproductive": 65, "Behavioral Health": 42, "Endocrine": 38, "Gastrointestinal": 35, "General Principles": 20 } },
  { id: "s5", code: "MEDI 541", name: "Host Defense & Infectious Disease", department: "Microbiology", credits: 5, term: "Spring Y1", phase: "Pre-clinical", usmle_coverage: { "Immune System": 82, "Blood & Lymph": 55, "General Principles": 40, "Respiratory": 30, "Gastrointestinal": 28, "Skin/Subcut": 25, "Nervous System": 15, "Renal/Urinary": 12 } },
  { id: "s6", code: "MEDI 551", name: "Pathophysiology & Therapeutics", department: "Pathology", credits: 7, term: "Fall Y2", phase: "Pre-clinical", usmle_coverage: { "General Principles": 55, "Cardiovascular": 48, "Respiratory": 42, "Gastrointestinal": 52, "Renal/Urinary": 45, "Blood & Lymph": 38, "Endocrine": 42, "Nervous System": 35, "Musculoskeletal": 28, "Multisystem": 55 } },
  { id: "s7", code: "MEDI 561", name: "Clinical Neuroscience", department: "Neurology", credits: 5, term: "Spring Y2", phase: "Pre-clinical", usmle_coverage: { "Nervous System": 88, "Behavioral Health": 65, "Musculoskeletal": 20, "General Principles": 15 } },
  { id: "s8", code: "MEDI 571", name: "Behavioral Science & Population Health", department: "Psychiatry", credits: 4, term: "Fall Y1", phase: "Pre-clinical", usmle_coverage: { "Behavioral Health": 78, "Biostatistics": 72, "Multisystem": 35, "General Principles": 25 } },
  { id: "s9", code: "MEDI 611", name: "Clinical Skills I", department: "Clinical Skills", credits: 3, term: "Fall Y1", phase: "Pre-clinical", usmle_coverage: { "General Principles": 30, "Cardiovascular": 25, "Respiratory": 20, "Gastrointestinal": 18, "Multisystem": 28 } },
  { id: "s10", code: "MEDI 612", name: "Clinical Skills II", department: "Clinical Skills", credits: 3, term: "Spring Y2", phase: "Pre-clinical", usmle_coverage: { "General Principles": 35, "Cardiovascular": 30, "Nervous System": 28, "Multisystem": 45, "Musculoskeletal": 22 } },
];

export default function SectionSequenceModeler() {
  const router = useRouter();
  const pathname = usePathname();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("sequence");

  const [sequence, setSequence] = useState<SequenceSlot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhase, setSelectedPhase] = useState("all");
  const [hoveredSystem, setHoveredSystem] = useState<string | null>(null);
  const [showCumulativeView, setShowCumulativeView] = useState(true);

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
    else if (path.startsWith("/institution/settings")) setActiveNav("settings");
  }, [pathname]);

  // Compute cumulative coverage
  const computeCumulativeCoverage = useCallback(() => {
    const cumulative: Record<string, number>[] = [];
    const running: Record<string, number> = {};
    USMLE_SYSTEMS.forEach(s => { running[s] = 0; });

    for (const slot of sequence) {
      const sectionCov = slot.section.usmle_coverage;
      for (const sys of USMLE_SYSTEMS) {
        if (sectionCov[sys]) {
          // Coverage combines (caps at 100)
          running[sys] = Math.min(100, running[sys] + sectionCov[sys] * 0.7);
        }
      }
      cumulative.push({ ...running });
    }
    return cumulative;
  }, [sequence]);

  const cumulativeCoverage = computeCumulativeCoverage();
  const finalCoverage = cumulativeCoverage.length > 0 ? cumulativeCoverage[cumulativeCoverage.length - 1] : {};
  const overallScore = USMLE_SYSTEMS.length > 0
    ? Math.round(USMLE_SYSTEMS.reduce((sum, s) => sum + (finalCoverage[s] || 0), 0) / USMLE_SYSTEMS.length)
    : 0;

  const addSection = (section: Section) => {
    if (sequence.find(s => s.section.id === section.id)) return;
    setSequence(prev => [...prev, { position: prev.length, section }]);
  };

  const removeSection = (index: number) => {
    setSequence(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i })));
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSeq = [...sequence];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSeq.length) return;
    [newSeq[index], newSeq[targetIndex]] = [newSeq[targetIndex], newSeq[index]];
    setSequence(newSeq.map((s, i) => ({ ...s, position: i })));
  };

  const resetSequence = () => setSequence([]);

  const filteredSections = AVAILABLE_SECTIONS.filter(s => {
    const matchesSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = selectedPhase === "all" || s.phase === selectedPhase;
    const notInSequence = !sequence.find(slot => slot.section.id === s.id);
    return matchesSearch && matchesPhase && notInSequence;
  });

  const getCoverageColor = (pct: number) => {
    if (pct >= 70) return C.green;
    if (pct >= 40) return "#fa9d33";
    if (pct > 0) return "#c9282d";
    return C.borderLight;
  };

  const getCoverageBarColor = (pct: number) => {
    if (pct >= 70) return C.green;
    if (pct >= 40) return "#fa9d33";
    return "#c9282d";
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

      {(sidebarExpanded || !isDesktop) && (
        <p style={{ fontFamily: mono, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, padding: "0 8px", marginBottom: 24, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.institution}</p>
      )}

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
              color: isActive ? C.navyDeep : C.textSecondary,
              cursor: "pointer", outline: "none", transition: "all 0.15s ease",
              textAlign: "left", border: "none",
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
              <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
              <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.06em" }}>{user.role}</div>
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

      {/* Mobile header */}
      {!isDesktop && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, zIndex: 40, background: C.white, borderBottom: `1px solid ${C.borderLight}`, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}>
            <div style={{ width: 20, height: 2, background: C.ink, marginBottom: 5, borderRadius: 1 }} />
            <div style={{ width: 20, height: 2, background: C.ink, marginBottom: 5, borderRadius: 1 }} />
            <div style={{ width: 20, height: 2, background: C.ink, borderRadius: 1 }} />
          </button>
          <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>Sequence Modeler</span>
        </div>
      )}

      {/* Overlay */}
      {!isDesktop && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 45 }} />
      )}

      {/* Main content */}
      <div style={{
        marginLeft: isDesktop ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth) : 0,
        paddingTop: isDesktop ? 0 : 56,
        transition: "margin-left 0.25s ease",
        minHeight: "100vh",
      }}>
        <div style={{ padding: isMobile ? "20px 16px" : "32px 32px" }}>
          {/* Header */}
          <div style={{ ...fadeIn(0.1), marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <GitBranch size={20} color={C.navyDeep} />
              <h1 style={{ fontFamily: serif, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.navyDeep, margin: 0, letterSpacing: "-0.01em" }}>
                Section Sequence Modeler
              </h1>
            </div>
            <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 600 }}>
              Model the course sequence students follow and see how USMLE coverage builds cumulatively across the curriculum path.
            </p>
          </div>

          {/* Top KPI strip */}
          {sequence.length > 0 && (
            <div style={{ ...fadeIn(0.15), display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Sections", value: sequence.length, sub: `of ${AVAILABLE_SECTIONS.length} available` },
                { label: "Total Credits", value: sequence.reduce((s, sl) => s + sl.section.credits, 0), sub: "credit hours" },
                { label: "Overall Coverage", value: `${overallScore}%`, sub: "avg across systems" },
                { label: "Systems ≥70%", value: USMLE_SYSTEMS.filter(s => (finalCoverage[s] || 0) >= 70).length, sub: `of ${USMLE_SYSTEMS.length} systems` },
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: C.white, borderRadius: 10, padding: "16px 18px",
                  border: `1px solid ${C.borderLight}`,
                }}>
                  <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, marginBottom: 6 }}>{kpi.label}</div>
                  <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.navyDeep }}>{kpi.value}</div>
                  <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, marginTop: 2 }}>{kpi.sub}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "320px 1fr" : "1fr", gap: 20 }}>
            {/* Left: Available Sections + Sequence Builder */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Available Sections */}
              <div style={{ ...fadeIn(0.2), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "20px 18px", overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Available Sections</h2>
                  <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted }}>{filteredSections.length} sections</span>
                </div>

                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search sections..."
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 6,
                    border: `1px solid ${C.border}`, background: C.parchment, fontFamily: sans,
                    fontSize: 13, color: C.ink, outline: "none", marginBottom: 10,
                  }}
                />

                <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {["all", "Pre-clinical", "Clinical"].map(phase => (
                    <button key={phase} onClick={() => setSelectedPhase(phase)} style={{
                      padding: "4px 10px", borderRadius: 4, border: `1px solid ${selectedPhase === phase ? C.navyDeep : C.border}`,
                      background: selectedPhase === phase ? `${C.navyDeep}0A` : C.white,
                      fontFamily: mono, fontSize: 10, color: selectedPhase === phase ? C.navyDeep : C.textMuted,
                      cursor: "pointer", letterSpacing: "0.06em",
                    }}>{phase === "all" ? "All" : phase}</button>
                  ))}
                </div>

                <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                  {filteredSections.map(section => (
                    <button key={section.id} onClick={() => addSection(section)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      borderRadius: 8, border: `1px solid ${C.borderLight}`, background: C.parchment,
                      cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                      width: "100%",
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.background = C.white; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.borderLight; e.currentTarget.style.background = C.parchment; }}
                    >
                      <Plus size={14} color={C.blueMid} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: mono, fontSize: 10, color: C.blueMid, letterSpacing: "0.06em" }}>{section.code}</div>
                        <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 500, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{section.name}</div>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>{section.department} · {section.credits} cr</div>
                      </div>
                    </button>
                  ))}
                  {filteredSections.length === 0 && (
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>
                      {sequence.length === AVAILABLE_SECTIONS.length ? "All sections added" : "No matching sections"}
                    </p>
                  )}
                </div>
              </div>

              {/* Built Sequence */}
              <div style={{ ...fadeIn(0.25), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "20px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Student Sequence</h2>
                  {sequence.length > 0 && (
                    <button onClick={resetSequence} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 4,
                      border: `1px solid ${C.border}`, background: C.white, fontFamily: mono,
                      fontSize: 10, color: C.textMuted, cursor: "pointer",
                    }}>
                      <RotateCcw size={12} /> Reset
                    </button>
                  )}
                </div>

                {sequence.length === 0 ? (
                  <div style={{ padding: "32px 16px", textAlign: "center", border: `2px dashed ${C.border}`, borderRadius: 8 }}>
                    <GitBranch size={32} color={C.textMuted} style={{ margin: "0 auto 12px" }} />
                    <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted, margin: 0 }}>Click sections above to build the student path</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {sequence.map((slot, i) => (
                      <div key={slot.section.id} style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                        borderRadius: 8, background: C.parchment, border: `1px solid ${C.borderLight}`,
                      }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: "50%", background: C.navyDeep,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: mono, fontSize: 10, fontWeight: 600, color: C.white, flexShrink: 0,
                        }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: sans, fontSize: 12, fontWeight: 600, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{slot.section.code} — {slot.section.name}</div>
                        </div>
                        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                          <button onClick={() => moveSection(i, "up")} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", padding: 2, opacity: i === 0 ? 0.3 : 1 }}><ChevronUp size={14} color={C.textMuted} /></button>
                          <button onClick={() => moveSection(i, "down")} disabled={i === sequence.length - 1} style={{ background: "none", border: "none", cursor: i === sequence.length - 1 ? "default" : "pointer", padding: 2, opacity: i === sequence.length - 1 ? 0.3 : 1 }}><ChevronDown size={14} color={C.textMuted} /></button>
                          <button onClick={() => removeSection(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}><X size={14} color="#c9282d" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cumulative Coverage Visualization */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Coverage Heatmap */}
              <div style={{ ...fadeIn(0.3), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <h2 style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep, margin: 0 }}>
                    {showCumulativeView ? "Cumulative USMLE Coverage" : "Final Coverage by System"}
                  </h2>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setShowCumulativeView(!showCumulativeView)} style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                      borderRadius: 6, border: `1px solid ${C.border}`, background: C.white,
                      fontFamily: sans, fontSize: 12, color: C.textSecondary, cursor: "pointer",
                    }}>
                      <Eye size={14} /> {showCumulativeView ? "Bar View" : "Cumulative"}
                    </button>
                  </div>
                </div>

                {sequence.length === 0 ? (
                  <div style={{ padding: "60px 20px", textAlign: "center" }}>
                    <Layers size={48} color={C.borderLight} style={{ margin: "0 auto 16px" }} />
                    <p style={{ fontFamily: sans, fontSize: 15, color: C.textMuted, margin: "0 0 4px" }}>Add sections to see coverage build</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, margin: 0 }}>Coverage accumulates as students progress through the sequence</p>
                  </div>
                ) : showCumulativeView ? (
                  /* Cumulative view: show how each section adds coverage */
                  <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: 600 }}>
                      {/* Header row */}
                      <div style={{ display: "grid", gridTemplateColumns: `140px repeat(${sequence.length}, 1fr)`, gap: 2, marginBottom: 8 }}>
                        <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", padding: "4px 0" }}>SYSTEM</div>
                        {sequence.map((slot, i) => (
                          <div key={i} style={{ fontFamily: mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.06em", textAlign: "center", padding: "4px 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {slot.section.code}
                          </div>
                        ))}
                      </div>

                      {/* System rows */}
                      {USMLE_SYSTEMS.map((system) => (
                        <div
                          key={system}
                          onMouseEnter={() => setHoveredSystem(system)}
                          onMouseLeave={() => setHoveredSystem(null)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: `140px repeat(${sequence.length}, 1fr)`,
                            gap: 2,
                            padding: "3px 0",
                            background: hoveredSystem === system ? `${C.navyDeep}06` : "transparent",
                            borderRadius: 4,
                            transition: "background 0.15s",
                          }}
                        >
                          <div style={{
                            fontFamily: sans, fontSize: 12, fontWeight: 500, color: C.textPrimary,
                            padding: "6px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{system}</div>
                          {cumulativeCoverage.map((cumul, i) => {
                            const pct = Math.round(cumul[system] || 0);
                            const prevPct = i > 0 ? Math.round(cumulativeCoverage[i - 1][system] || 0) : 0;
                            const added = pct - prevPct;
                            return (
                              <div key={i} style={{
                                borderRadius: 4,
                                background: pct > 0 ? getCoverageColor(pct) : C.parchment,
                                opacity: pct > 0 ? (0.3 + (pct / 100) * 0.7) : 1,
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                padding: "4px 2px", minHeight: 32,
                                position: "relative",
                              }}>
                                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: pct > 0 ? C.white : C.textMuted }}>{pct > 0 ? `${pct}%` : "—"}</span>
                                {added > 0 && (
                                  <span style={{ fontFamily: mono, fontSize: 8, color: pct >= 40 ? "rgba(255,255,255,0.8)" : C.textMuted }}>+{added}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Bar view: final coverage per system */
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {USMLE_SYSTEMS.map((system) => {
                      const pct = Math.round(finalCoverage[system] || 0);
                      return (
                        <div key={system} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 140, fontFamily: sans, fontSize: 13, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{system}</div>
                          <div style={{ flex: 1, height: 20, background: C.parchment, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                            <div style={{
                              width: `${pct}%`, height: "100%", background: getCoverageBarColor(pct),
                              borderRadius: 4, transition: "width 0.5s ease",
                            }} />
                          </div>
                          <div style={{ width: 40, fontFamily: mono, fontSize: 12, fontWeight: 600, color: getCoverageBarColor(pct), textAlign: "right" }}>{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Legend */}
                {sequence.length > 0 && (
                  <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.borderLight}` }}>
                    {[
                      { color: C.green, label: "≥70% (Strong)" },
                      { color: "#fa9d33", label: "40-69% (Developing)" },
                      { color: "#c9282d", label: "<40% (Gap)" },
                      { color: C.borderLight, label: "No coverage" },
                    ].map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                        <span style={{ fontFamily: sans, fontSize: 11, color: C.textMuted }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gap Analysis */}
              {sequence.length > 0 && (
                <div style={{ ...fadeIn(0.35), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "20px 22px" }}>
                  <h2 style={{ fontFamily: serif, fontSize: 16, fontWeight: 700, color: C.navyDeep, margin: "0 0 16px" }}>Coverage Gap Analysis</h2>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                    {/* Systems with gaps */}
                    <div>
                      <h3 style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#c9282d", margin: "0 0 10px" }}>Needs Attention ({USMLE_SYSTEMS.filter(s => (finalCoverage[s] || 0) < 40).length})</h3>
                      {USMLE_SYSTEMS.filter(s => (finalCoverage[s] || 0) < 40).map(system => (
                        <div key={system} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(201,40,45,0.05)", borderRadius: 6, marginBottom: 4, border: "1px solid rgba(201,40,45,0.1)" }}>
                          <span style={{ fontFamily: sans, fontSize: 13, color: C.textPrimary }}>{system}</span>
                          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: "#c9282d" }}>{Math.round(finalCoverage[system] || 0)}%</span>
                        </div>
                      ))}
                      {USMLE_SYSTEMS.filter(s => (finalCoverage[s] || 0) < 40).length === 0 && (
                        <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, padding: "8px 0" }}>No critical gaps</p>
                      )}
                    </div>
                    {/* Strong systems */}
                    <div>
                      <h3 style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.green, margin: "0 0 10px" }}>Strong Coverage ({USMLE_SYSTEMS.filter(s => (finalCoverage[s] || 0) >= 70).length})</h3>
                      {USMLE_SYSTEMS.filter(s => (finalCoverage[s] || 0) >= 70).map(system => (
                        <div key={system} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "rgba(105,163,56,0.05)", borderRadius: 6, marginBottom: 4, border: "1px solid rgba(105,163,56,0.1)" }}>
                          <span style={{ fontFamily: sans, fontSize: 13, color: C.textPrimary }}>{system}</span>
                          <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: C.green }}>{Math.round(finalCoverage[system] || 0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
