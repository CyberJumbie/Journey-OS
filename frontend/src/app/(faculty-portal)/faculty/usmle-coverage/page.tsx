'use client';

import { useRouter, usePathname } from 'next/navigation';


import { useState, useEffect } from "react";
import { BarChart3, Users, Settings, Shield, Activity, Award, GitBranch, GraduationCap, Layers, ChevronDown, ChevronRight, Download, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FACULTY USMLE COVERAGE
// Per-faculty USMLE coverage vs institutional targets
// Surface: sidebar (white) + content (cream) → white cards
// ═══════════════════════════════════════════════════════════════


const USMLE_SYSTEMS = [
  "General Principles", "Behavioral Health", "Biostatistics/Epi",
  "Blood & Lymph", "Cardiovascular", "Endocrine",
  "Gastrointestinal", "Immune System", "Multisystem",
  "Musculoskeletal", "Nervous System", "Renal/Urinary",
  "Reproductive", "Respiratory", "Skin/Subcutaneous", "Social Sciences"
];

// USMLE Step 1 recommended coverage weights (approximate %)
const USMLE_TARGETS: Record<string, number> = {
  "General Principles": 12, "Behavioral Health": 6, "Biostatistics/Epi": 4,
  "Blood & Lymph": 5, "Cardiovascular": 10, "Endocrine": 6,
  "Gastrointestinal": 8, "Immune System": 7, "Multisystem": 4,
  "Musculoskeletal": 6, "Nervous System": 9, "Renal/Urinary": 6,
  "Reproductive": 5, "Respiratory": 7, "Skin/Subcutaneous": 3, "Social Sciences": 2,
};

interface FacultyMember {
  id: string;
  name: string;
  initials: string;
  title: string;
  department: string;
  courses: string[];
  total_items: number;
  overall_coverage: number;
  trend: "up" | "down" | "flat";
  trend_value: string;
  system_coverage: Record<string, { items: number; coverage_pct: number }>;
}

const MOCK_FACULTY: FacultyMember[] = [
  {
    id: "f1", name: "Dr. Amara Osei", initials: "AO", title: "Associate Professor", department: "Pharmacology",
    courses: ["MEDI 531 — Organ Systems I", "PHAR 501 — Medical Pharmacology"],
    total_items: 342, overall_coverage: 91, trend: "up", trend_value: "+8% this month",
    system_coverage: {
      "General Principles": { items: 28, coverage_pct: 85 }, "Cardiovascular": { items: 62, coverage_pct: 96 },
      "Endocrine": { items: 35, coverage_pct: 88 }, "Gastrointestinal": { items: 42, coverage_pct: 92 },
      "Nervous System": { items: 38, coverage_pct: 78 }, "Respiratory": { items: 30, coverage_pct: 82 },
      "Renal/Urinary": { items: 28, coverage_pct: 76 }, "Blood & Lymph": { items: 22, coverage_pct: 70 },
      "Immune System": { items: 18, coverage_pct: 65 }, "Musculoskeletal": { items: 15, coverage_pct: 58 },
      "Reproductive": { items: 10, coverage_pct: 45 }, "Behavioral Health": { items: 8, coverage_pct: 35 },
      "Skin/Subcutaneous": { items: 4, coverage_pct: 20 }, "Biostatistics/Epi": { items: 2, coverage_pct: 10 },
      "Multisystem": { items: 0, coverage_pct: 0 }, "Social Sciences": { items: 0, coverage_pct: 0 },
    },
  },
  {
    id: "f2", name: "Dr. James Chen", initials: "JC", title: "Professor", department: "Anatomy",
    courses: ["MEDI 511 — Human Structure & Development"],
    total_items: 310, overall_coverage: 87, trend: "up", trend_value: "+5% this month",
    system_coverage: {
      "General Principles": { items: 35, coverage_pct: 90 }, "Musculoskeletal": { items: 58, coverage_pct: 95 },
      "Nervous System": { items: 45, coverage_pct: 88 }, "Cardiovascular": { items: 32, coverage_pct: 75 },
      "Respiratory": { items: 28, coverage_pct: 72 }, "Gastrointestinal": { items: 25, coverage_pct: 68 },
      "Reproductive": { items: 30, coverage_pct: 80 }, "Renal/Urinary": { items: 20, coverage_pct: 62 },
      "Endocrine": { items: 15, coverage_pct: 50 }, "Skin/Subcutaneous": { items: 12, coverage_pct: 55 },
      "Blood & Lymph": { items: 6, coverage_pct: 28 }, "Immune System": { items: 4, coverage_pct: 18 },
      "Behavioral Health": { items: 0, coverage_pct: 0 }, "Biostatistics/Epi": { items: 0, coverage_pct: 0 },
      "Multisystem": { items: 0, coverage_pct: 0 }, "Social Sciences": { items: 0, coverage_pct: 0 },
    },
  },
  {
    id: "f3", name: "Dr. Priya Sharma", initials: "PS", title: "Associate Professor", department: "Pathology",
    courses: ["MEDI 551 — Pathophysiology & Therapeutics"],
    total_items: 280, overall_coverage: 82, trend: "flat", trend_value: "No change",
    system_coverage: {
      "General Principles": { items: 40, coverage_pct: 92 }, "Cardiovascular": { items: 30, coverage_pct: 78 },
      "Gastrointestinal": { items: 35, coverage_pct: 85 }, "Respiratory": { items: 25, coverage_pct: 72 },
      "Blood & Lymph": { items: 28, coverage_pct: 75 }, "Renal/Urinary": { items: 22, coverage_pct: 68 },
      "Endocrine": { items: 25, coverage_pct: 72 }, "Nervous System": { items: 20, coverage_pct: 58 },
      "Immune System": { items: 18, coverage_pct: 55 }, "Multisystem": { items: 15, coverage_pct: 62 },
      "Musculoskeletal": { items: 10, coverage_pct: 38 }, "Reproductive": { items: 8, coverage_pct: 32 },
      "Skin/Subcutaneous": { items: 4, coverage_pct: 18 }, "Behavioral Health": { items: 0, coverage_pct: 0 },
      "Biostatistics/Epi": { items: 0, coverage_pct: 0 }, "Social Sciences": { items: 0, coverage_pct: 0 },
    },
  },
  {
    id: "f4", name: "Dr. Michael Okafor", initials: "MO", title: "Assistant Professor", department: "Microbiology",
    courses: ["MEDI 541 — Host Defense & Infectious Disease"],
    total_items: 160, overall_coverage: 74, trend: "up", trend_value: "+12% this month",
    system_coverage: {
      "Immune System": { items: 45, coverage_pct: 92 }, "Blood & Lymph": { items: 22, coverage_pct: 72 },
      "General Principles": { items: 20, coverage_pct: 65 }, "Respiratory": { items: 18, coverage_pct: 60 },
      "Gastrointestinal": { items: 15, coverage_pct: 52 }, "Skin/Subcutaneous": { items: 12, coverage_pct: 55 },
      "Nervous System": { items: 10, coverage_pct: 38 }, "Renal/Urinary": { items: 8, coverage_pct: 30 },
      "Cardiovascular": { items: 5, coverage_pct: 18 }, "Reproductive": { items: 3, coverage_pct: 12 },
      "Endocrine": { items: 2, coverage_pct: 8 }, "Musculoskeletal": { items: 0, coverage_pct: 0 },
      "Behavioral Health": { items: 0, coverage_pct: 0 }, "Biostatistics/Epi": { items: 0, coverage_pct: 0 },
      "Multisystem": { items: 0, coverage_pct: 0 }, "Social Sciences": { items: 0, coverage_pct: 0 },
    },
  },
  {
    id: "f5", name: "Dr. Linda Washington", initials: "LW", title: "Professor", department: "Neurology",
    courses: ["MEDI 561 — Clinical Neuroscience"],
    total_items: 145, overall_coverage: 72, trend: "down", trend_value: "-2% this month",
    system_coverage: {
      "Nervous System": { items: 65, coverage_pct: 95 }, "Behavioral Health": { items: 28, coverage_pct: 78 },
      "General Principles": { items: 15, coverage_pct: 48 }, "Musculoskeletal": { items: 12, coverage_pct: 42 },
      "Cardiovascular": { items: 8, coverage_pct: 22 }, "Endocrine": { items: 6, coverage_pct: 18 },
      "Gastrointestinal": { items: 4, coverage_pct: 12 }, "Respiratory": { items: 3, coverage_pct: 8 },
      "Renal/Urinary": { items: 2, coverage_pct: 6 }, "Blood & Lymph": { items: 2, coverage_pct: 8 },
      "Immune System": { items: 0, coverage_pct: 0 }, "Reproductive": { items: 0, coverage_pct: 0 },
      "Skin/Subcutaneous": { items: 0, coverage_pct: 0 }, "Biostatistics/Epi": { items: 0, coverage_pct: 0 },
      "Multisystem": { items: 0, coverage_pct: 0 }, "Social Sciences": { items: 0, coverage_pct: 0 },
    },
  },
  {
    id: "f6", name: "Dr. Thomas Reed", initials: "TR", title: "Associate Professor", department: "Psychiatry",
    courses: ["MEDI 571 — Behavioral Science & Population Health"],
    total_items: 85, overall_coverage: 65, trend: "up", trend_value: "+6% this month",
    system_coverage: {
      "Behavioral Health": { items: 35, coverage_pct: 92 }, "Biostatistics/Epi": { items: 22, coverage_pct: 78 },
      "Social Sciences": { items: 12, coverage_pct: 72 }, "Multisystem": { items: 8, coverage_pct: 45 },
      "General Principles": { items: 5, coverage_pct: 18 }, "Nervous System": { items: 3, coverage_pct: 10 },
      "Cardiovascular": { items: 0, coverage_pct: 0 }, "Endocrine": { items: 0, coverage_pct: 0 },
      "Gastrointestinal": { items: 0, coverage_pct: 0 }, "Immune System": { items: 0, coverage_pct: 0 },
      "Musculoskeletal": { items: 0, coverage_pct: 0 }, "Renal/Urinary": { items: 0, coverage_pct: 0 },
      "Reproductive": { items: 0, coverage_pct: 0 }, "Respiratory": { items: 0, coverage_pct: 0 },
      "Skin/Subcutaneous": { items: 0, coverage_pct: 0 }, "Blood & Lymph": { items: 0, coverage_pct: 0 },
    },
  },
];

export default function FacultyUSMLECoverage() {
  const router = useRouter();
  const pathname = usePathname();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("faculty-cov");
  const [loading, setLoading] = useState(true);

  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "coverage" | "items">("coverage");

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
      setFaculty(MOCK_FACULTY);
      setLoading(false);
    }, 600);
  }, []);

  const departments = [...new Set(MOCK_FACULTY.map(f => f.department))];

  const filteredFaculty = faculty
    .filter(f => {
      const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "all" || f.department === departmentFilter;
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      if (sortBy === "coverage") return b.overall_coverage - a.overall_coverage;
      if (sortBy === "items") return b.total_items - a.total_items;
      return a.name.localeCompare(b.name);
    });

  // Institutional average per system
  const institutionalAvg: Record<string, number> = {};
  for (const sys of USMLE_SYSTEMS) {
    const values = faculty.map(f => f.system_coverage[sys]?.coverage_pct || 0);
    institutionalAvg[sys] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  const toggleExpand = (id: string) => {
    setExpandedFaculty(expandedFaculty === id ? null : id);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp size={14} color={C.green} />;
    if (trend === "down") return <TrendingDown size={14} color="#c9282d" />;
    return <Minus size={14} color={C.textMuted} />;
  };

  const getCoverageColor = (pct: number) => {
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

  const { data: currentUser } = useCurrentUser();
  const user = { name: currentUser?.displayName ?? "Faculty", initials: currentUser?.initials ?? "??", role: currentUser?.roleLabel ?? "Faculty", institution: "Morehouse School of Medicine" }; // TODO: replace institution with dynamic value when institution API is available
  const sidebarCollapsedWidth = 72;
  const sidebarExpandedWidth = 240;
  const sidebarWidth = isDesktop ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth) : (isTablet ? 220 : 260);

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.45s ease ${d}s, transform 0.45s ease ${d}s`,
  });

  // Sidebar (same pattern)
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: isDesktop && !sidebarExpanded ? "center" : "flex-start", gap: 8, padding: isDesktop && !sidebarExpanded ? "0" : "0 8px", marginBottom: isDesktop && !sidebarExpanded ? 20 : 8 }}>
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
            <div>
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
          <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>Faculty Coverage</span>
        </div>
      )}
      {!isDesktop && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 45 }} />}

      <div style={{ marginLeft: isDesktop ? (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth) : 0, paddingTop: isDesktop ? 0 : 56, transition: "margin-left 0.25s ease", minHeight: "100vh" }}>
        <div style={{ padding: isMobile ? "20px 16px" : "32px 32px" }}>
          {/* Header */}
          <div style={{ ...fadeIn(0.1), display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <GraduationCap size={20} color={C.navyDeep} />
                <h1 style={{ fontFamily: serif, fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.navyDeep, margin: 0 }}>Faculty USMLE Coverage</h1>
              </div>
              <p style={{ fontFamily: sans, fontSize: 14, color: C.textSecondary, margin: 0 }}>
                Per-faculty USMLE system coverage compared to Step 1 recommended distribution targets
              </p>
            </div>
            <button style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13,
              fontWeight: 500, color: C.textSecondary, cursor: "pointer",
            }}>
              <Download size={14} /> Export Report
            </button>
          </div>

          {/* Filters */}
          <div style={{ ...fadeIn(0.15), display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "0 0 240px" }}>
              <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search faculty..."
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px 8px 30px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13, color: C.ink, outline: "none" }}
              />
            </div>
            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.white, fontFamily: sans, fontSize: 13, color: C.ink, cursor: "pointer" }}>
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4 }}>
              {(["coverage", "items", "name"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)} style={{
                  padding: "6px 12px", borderRadius: 4,
                  border: `1px solid ${sortBy === s ? C.navyDeep : C.border}`,
                  background: sortBy === s ? `${C.navyDeep}08` : C.white,
                  fontFamily: sans, fontSize: 12, color: sortBy === s ? C.navyDeep : C.textMuted,
                  cursor: "pointer", fontWeight: sortBy === s ? 600 : 400,
                }}>Sort: {s === "coverage" ? "Coverage" : s === "items" ? "Items" : "Name"}</button>
              ))}
            </div>
          </div>

          {/* USMLE Target Reference */}
          <div style={{ ...fadeIn(0.2), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, padding: "16px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <h3 style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, margin: 0 }}>USMLE Step 1 Recommended Distribution (% of exam)</h3>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {USMLE_SYSTEMS.map(sys => (
                <div key={sys} style={{
                  padding: "4px 10px", borderRadius: 4, background: C.parchment,
                  border: `1px solid ${C.borderLight}`, display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ fontFamily: sans, fontSize: 11, color: C.textSecondary }}>{sys}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: C.navyDeep }}>{USMLE_TARGETS[sys]}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Faculty Cards */}
          {loading ? (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${C.borderLight}`, borderTopColor: C.navyDeep, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted }}>Loading faculty data...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredFaculty.map((fac, fi) => {
                const isExpanded = expandedFaculty === fac.id;
                const systemsCovered = USMLE_SYSTEMS.filter(s => (fac.system_coverage[s]?.coverage_pct || 0) > 0).length;
                const gapSystems = USMLE_SYSTEMS.filter(s => (fac.system_coverage[s]?.coverage_pct || 0) === 0);

                return (
                  <div key={fac.id} style={{ ...fadeIn(0.25 + fi * 0.05), background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}`, overflow: "hidden" }}>
                    {/* Faculty header row */}
                    <button onClick={() => toggleExpand(fac.id)} style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 16, padding: "16px 20px",
                      background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    }}>
                      {/* Avatar */}
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%", background: `${C.navyDeep}10`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontFamily: mono, fontSize: 14, fontWeight: 600, color: C.navyDeep, flexShrink: 0,
                      }}>{fac.initials}</div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>{fac.name}</div>
                        <div style={{ fontFamily: sans, fontSize: 12, color: C.textMuted }}>{fac.title} · {fac.department}</div>
                        <div style={{ fontFamily: sans, fontSize: 11, color: C.textMuted, marginTop: 2 }}>{fac.courses.join(" · ")}</div>
                      </div>

                      {/* Summary stats */}
                      <div style={{ display: "flex", gap: 20, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted }}>Items</div>
                          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>{fac.total_items}</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted }}>Coverage</div>
                          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: getCoverageColor(fac.overall_coverage) }}>{fac.overall_coverage}%</div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted }}>Systems</div>
                          <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: C.navyDeep }}>{systemsCovered}/16</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          {getTrendIcon(fac.trend)}
                          <span style={{ fontFamily: sans, fontSize: 11, color: fac.trend === "up" ? C.green : fac.trend === "down" ? "#c9282d" : C.textMuted }}>{fac.trend_value}</span>
                        </div>
                        {isExpanded ? <ChevronDown size={18} color={C.textMuted} /> : <ChevronRight size={18} color={C.textMuted} />}
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.borderLight}` }}>
                        {/* System-by-system bars with target comparison */}
                        <div style={{ paddingTop: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                            <h3 style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.textMuted, margin: 0 }}>USMLE System Coverage vs Target</h3>
                            <div style={{ display: "flex", gap: 12 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{ width: 12, height: 6, borderRadius: 2, background: C.blueMid }} />
                                <span style={{ fontFamily: sans, fontSize: 10, color: C.textMuted }}>Faculty actual</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <div style={{ width: 12, height: 6, borderRadius: 2, background: `${C.navyDeep}30` }} />
                                <span style={{ fontFamily: sans, fontSize: 10, color: C.textMuted }}>USMLE target</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {USMLE_SYSTEMS.map(sys => {
                              const actual = fac.system_coverage[sys]?.coverage_pct || 0;
                              const target = USMLE_TARGETS[sys] || 0;
                              // Normalize: target is % of exam weight, actual is coverage %. Scale target to 100 for comparison.
                              const targetScaled = target * (100 / 12); // max target is 12%, scale to 100%
                              const items = fac.system_coverage[sys]?.items || 0;
                              const delta = actual - targetScaled;

                              return (
                                <div key={sys} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div style={{ width: 130, fontFamily: sans, fontSize: 12, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{sys}</div>
                                  <div style={{ flex: 1, position: "relative", height: 22, background: C.parchment, borderRadius: 4, overflow: "hidden" }}>
                                    {/* Target marker */}
                                    <div style={{
                                      position: "absolute", left: `${Math.min(targetScaled, 100)}%`, top: 0, bottom: 0,
                                      width: 2, background: `${C.navyDeep}40`, zIndex: 2,
                                    }} />
                                    {/* Actual bar */}
                                    <div style={{
                                      width: `${Math.min(actual, 100)}%`, height: "100%",
                                      background: actual >= targetScaled ? C.blueMid : actual > 0 ? "#fa9d33" : "transparent",
                                      borderRadius: 4, transition: "width 0.4s ease",
                                    }} />
                                  </div>
                                  <div style={{ width: 40, fontFamily: mono, fontSize: 11, fontWeight: 600, color: getCoverageColor(actual), textAlign: "right", flexShrink: 0 }}>{actual}%</div>
                                  <div style={{ width: 35, fontFamily: mono, fontSize: 10, color: C.textMuted, textAlign: "right", flexShrink: 0 }}>{items}q</div>
                                  <div style={{
                                    width: 45, fontFamily: mono, fontSize: 10, textAlign: "right", flexShrink: 0,
                                    color: delta >= 0 ? C.green : delta > -20 ? "#fa9d33" : "#c9282d",
                                    fontWeight: 600,
                                  }}>
                                    {actual === 0 ? "—" : delta >= 0 ? `+${Math.round(delta)}` : Math.round(delta)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Gap summary */}
                        {gapSystems.length > 0 && (
                          <div style={{ marginTop: 16, padding: "12px 16px", background: "rgba(201,40,45,0.04)", borderRadius: 8, border: "1px solid rgba(201,40,45,0.1)" }}>
                            <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c9282d", marginBottom: 6 }}>
                              Uncovered Systems ({gapSystems.length})
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {gapSystems.map(sys => (
                                <span key={sys} style={{
                                  padding: "3px 10px", borderRadius: 4, fontFamily: sans, fontSize: 11,
                                  background: "rgba(201,40,45,0.08)", color: "#c9282d",
                                  border: "1px solid rgba(201,40,45,0.15)",
                                }}>{sys}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFaculty.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", background: C.white, borderRadius: 12, border: `1px solid ${C.borderLight}` }}>
                  <p style={{ fontFamily: sans, fontSize: 14, color: C.textMuted }}>No faculty match the current filters</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
