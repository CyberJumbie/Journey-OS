import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { Settings, BarChart3, Users, FileText, Database, Network, FileCheck, Shield, ChevronDown, Search } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — ADMIN USER DIRECTORY
// Template B: Admin Shell with cream content area
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

interface User {
  id: string;
  display_name: string;
  email: string;
  role: "superadmin" | "institutional_admin" | "faculty" | "advisor" | "student";
  institution: { id: string; name: string } | null;
  is_active: boolean;
  is_course_director: boolean;
  last_login_at: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total_pages: number;
  total_count: number;
}

type SortColumn = "name" | "email" | "role" | "status" | "last_login";
type SortDirection = "asc" | "desc";

export default function AdminUserDirectory() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("users");

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total_pages: 1,
    total_count: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });

  const [sort, setSort] = useState<{ by: SortColumn; dir: SortDirection }>({
    by: "name",
    dir: "asc",
  });

  useEffect(() => { setMounted(true); }, []);

  // Set active nav based on current path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/admin/users")) setActiveNav("users");
    else if (path.startsWith("/admin/setup")) setActiveNav("setup");
    else if (path.startsWith("/admin/frameworks")) setActiveNav("frameworks");
    else if (path.startsWith("/admin/faculty")) setActiveNav("faculty");
    else if (path.startsWith("/admin/knowledge")) setActiveNav("knowledge");
    else if (path.startsWith("/admin/ilos")) setActiveNav("ilos");
    else if (path.startsWith("/admin/data-integrity")) setActiveNav("integrity");
    else if (path.startsWith("/admin/lcme") || path.startsWith("/admin/fulfills")) setActiveNav("compliance");
    else if (path === "/admin") setActiveNav("dashboard");
  }, [location.pathname]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sort.by,
        sort_dir: sort.dir,
      });

      if (filters.search) params.append("search", filters.search);
      if (filters.role !== "all") params.append("role", filters.role);
      if (filters.status !== "all") params.append("is_active", filters.status === "active" ? "true" : "false");

      // Mock data for now
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      const mockUsers: User[] = [
        { id: "1", display_name: "Dr. Jane Smith", email: "jane.smith@msm.edu", role: "faculty", institution: { id: "1", name: "Morehouse School of Medicine" }, is_active: true, is_course_director: true, last_login_at: "2026-02-19T10:30:00Z" },
        { id: "2", display_name: "John Doe", email: "john.doe@msm.edu", role: "student", institution: { id: "1", name: "Morehouse School of Medicine" }, is_active: true, is_course_director: false, last_login_at: "2026-02-18T14:20:00Z" },
        { id: "3", display_name: "Dr. Sarah Johnson", email: "sarah.johnson@example.edu", role: "institutional_admin", institution: { id: "2", name: "Example Medical School" }, is_active: true, is_course_director: false, last_login_at: "2026-02-17T09:15:00Z" },
        { id: "4", display_name: "Michael Chen", email: "m.chen@msm.edu", role: "advisor", institution: { id: "1", name: "Morehouse School of Medicine" }, is_active: false, is_course_director: false, last_login_at: null },
        { id: "5", display_name: "Dr. Robert Brown", email: "rbrown@example.edu", role: "faculty", institution: { id: "2", name: "Example Medical School" }, is_active: true, is_course_director: false, last_login_at: "2026-02-20T08:45:00Z" },
      ];

      setUsers(mockUsers);
      setPagination({ page: 1, limit: 25, total_pages: 1, total_count: mockUsers.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sort, filters]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: BarChart3, path: "/admin" },
    { key: "setup", label: "Setup", Icon: Settings, path: "/admin/setup" },
    { key: "frameworks", label: "Frameworks", Icon: FileText, path: "/admin/frameworks" },
    { key: "faculty", label: "Faculty", Icon: Users, path: "/admin/faculty" },
    { key: "users", label: "User Directory", Icon: Users, path: "/admin/users" },
    { key: "knowledge", label: "Knowledge", Icon: Network, path: "/admin/knowledge" },
    { key: "ilos", label: "ILOs", Icon: FileCheck, path: "/admin/ilos" },
    { key: "integrity", label: "Data Integrity", Icon: Database, path: "/admin/data-integrity" },
    { key: "compliance", label: "Compliance", Icon: Shield, path: "/admin/lcme-compliance-heatmap" },
  ];

  const user = { name: "Admin User", initials: "AU", role: "Super Admin" };

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

  const getRoleBadgeColor = (role: User["role"]) => {
    switch (role) {
      case "superadmin": return { bg: "rgba(128,0,128,0.1)", text: "#800080", border: "rgba(128,0,128,0.2)" };
      case "institutional_admin": return { bg: "rgba(43,113,185,0.1)", text: C.blueMid, border: "rgba(43,113,185,0.2)" };
      case "faculty": return { bg: "rgba(105,163,56,0.1)", text: C.greenDark, border: "rgba(105,163,56,0.2)" };
      case "advisor": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "student": return { bg: "rgba(113,128,150,0.1)", text: C.textMuted, border: "rgba(113,128,150,0.2)" };
    }
  };

  const getRoleLabel = (role: User["role"]) => {
    switch (role) {
      case "superadmin": return "Super Admin";
      case "institutional_admin": return "Inst Admin";
      case "faculty": return "Faculty";
      case "advisor": return "Advisor";
      case "student": return "Student";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  // Sidebar
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
      {/* Logo */}
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
          Morehouse School of Medicine
        </p>
      )}

      {/* Nav Items */}
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
                if (!isActive) {
                  e.currentTarget.style.background = C.parchment;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                }
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

      {/* User Card */}
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

  // Main Content
  return (
    <>
      {sidebar}
      
      {/* Overlay for mobile */}
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

      {/* Main Content */}
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
                  marginRight: 12,
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
                User Directory
              </h1>
            </div>
          </div>
        </div>

        {/* Content Padding */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Header Stats */}
          <div style={{ ...fadeIn(0.05), marginBottom: 24 }}>
            <p style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textMuted,
              margin: 0,
            }}>
              {pagination.total_count} users
            </p>
          </div>

          {/* Filter Bar */}
          <div style={{
            ...fadeIn(0.1),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            padding: isMobile ? 16 : 20,
            marginBottom: 20,
          }}>
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 12,
            }}>
              {/* Search */}
              <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 240px", minWidth: 240 }}>
                <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={{
                    width: "100%",
                    height: 40,
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "0 16px 0 40px",
                    fontFamily: sans,
                    fontSize: 15,
                    color: C.ink,
                    outline: "none",
                  }}
                />
              </div>

              {/* Role Filter */}
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                style={{
                  width: 160,
                  height: 40,
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
                <option value="all">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="institutional_admin">Inst Admin</option>
                <option value="faculty">Faculty</option>
                <option value="advisor">Advisor</option>
                <option value="student">Student</option>
              </select>

              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{
                  width: 144,
                  height: 40,
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
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <span style={{
                marginLeft: "auto",
                fontFamily: mono,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.08em",
                color: C.textMuted,
              }}>
                {pagination.total_count} users
              </span>
            </div>
          </div>

          {/* Data Table */}
          <div style={{
            ...fadeIn(0.15),
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            overflow: "hidden",
          }}>
            {loading ? (
              <div style={{ padding: 24 }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{
                    height: 48,
                    background: C.parchment,
                    borderRadius: 6,
                    marginBottom: 8,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }} />
                ))}
              </div>
            ) : error ? (
              <div style={{ padding: 48, textAlign: "center" }}>
                <p style={{ fontFamily: sans, fontSize: 15, color: C.danger, marginBottom: 16 }}>
                  {error}
                </p>
                <button
                  onClick={fetchUsers}
                  style={{
                    padding: "8px 16px",
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.navyDeep,
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center" }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(0,44,118,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}>
                  <span style={{ fontSize: 36, color: "rgba(0,44,118,0.3)" }}>◇</span>
                </div>
                <h3 style={{
                  fontFamily: serif,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 8,
                }}>
                  No users found
                </h3>
                <p style={{
                  fontFamily: sans,
                  fontSize: 15,
                  color: C.textSecondary,
                  marginBottom: 20,
                }}>
                  Try adjusting your filters
                </p>
                <button
                  onClick={() => setFilters({ search: "", role: "all", status: "all" })}
                  style={{
                    padding: "10px 20px",
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.navyDeep,
                    cursor: "pointer",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                    <tr>
                      {["Name", "Email", "Role", "Institution", "Status", "Last Login"].map((col) => (
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
                    {users.map((user) => {
                      const roleColors = getRoleBadgeColor(user.role);
                      return (
                        <tr
                          key={user.id}
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
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                fontFamily: sans,
                                fontSize: 15,
                                fontWeight: 600,
                                color: C.textPrimary,
                              }}>
                                {user.display_name}
                              </span>
                              {user.is_course_director && (
                                <span style={{
                                  fontFamily: mono,
                                  fontSize: 9,
                                  fontWeight: 500,
                                  letterSpacing: "0.08em",
                                  textTransform: "uppercase",
                                  background: "rgba(250,157,51,0.1)",
                                  color: "#fa9d33",
                                  border: "1px solid rgba(250,157,51,0.2)",
                                  padding: "1px 4px",
                                  borderRadius: 3,
                                }}>
                                  CD
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 10,
                              color: C.textSecondary,
                            }}>
                              {user.email}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 9,
                              fontWeight: 500,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              background: roleColors.bg,
                              color: roleColors.text,
                              border: `1px solid ${roleColors.border}`,
                              padding: "2px 8px",
                              borderRadius: 3,
                              display: "inline-block",
                            }}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: sans,
                              fontSize: 14,
                              color: C.textSecondary,
                            }}>
                              {user.institution?.name || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: user.is_active ? C.green : C.warmGray,
                              }} />
                              <span style={{
                                fontFamily: sans,
                                fontSize: 13,
                                color: C.textSecondary,
                              }}>
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 9,
                              color: C.textMuted,
                            }}>
                              {formatDate(user.last_login_at)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && users.length > 0 && (
              <div style={{
                background: C.parchment,
                borderTop: `1px solid ${C.borderLight}`,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: pagination.page === 1 ? C.textMuted : C.navyDeep,
                    cursor: pagination.page === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ← Previous
                </button>

                <span style={{
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  color: C.textMuted,
                }}>
                  Page {pagination.page} of {pagination.total_pages}
                </span>

                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.total_pages}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: pagination.page === pagination.total_pages ? C.textMuted : C.navyDeep,
                    cursor: pagination.page === pagination.total_pages ? "not-allowed" : "pointer",
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
