import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Building2, Users, BarChart3, Settings, Shield, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — USER ROLE MANAGEMENT (STORY-S-2)
// Template C: Admin Shell with role/permission management
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

interface Role {
  id: string;
  name: string;
  description: string;
  user_count: number;
  permissions: string[];
  color: string;
}

export default function UserRoleManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("settings");

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/admin/institutions")) setActiveNav("institutions");
    else if (path.startsWith("/admin/users")) setActiveNav("users");
    else if (path.startsWith("/admin/analytics")) setActiveNav("analytics");
    else if (path.startsWith("/admin/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockRoles: Role[] = [
      {
        id: "1",
        name: "Superadmin",
        description: "Full system access with all permissions",
        user_count: 3,
        permissions: ["system.manage", "institutions.manage", "users.manage", "content.manage", "analytics.view"],
        color: C.red,
      },
      {
        id: "2",
        name: "Institutional Admin",
        description: "Manage institution settings and users",
        user_count: 12,
        permissions: ["institution.manage", "users.manage", "courses.manage", "analytics.view"],
        color: C.blueMid,
      },
      {
        id: "3",
        name: "Faculty",
        description: "Create courses and generate questions",
        user_count: 245,
        permissions: ["courses.create", "questions.generate", "exams.create", "analytics.view"],
        color: C.green,
      },
      {
        id: "4",
        name: "Student",
        description: "Access courses and take exams",
        user_count: 1834,
        permissions: ["courses.view", "exams.take", "progress.view"],
        color: "#fa9d33",
      },
    ];

    setRoles(mockRoles);
    if (mockRoles.length > 0) {
      setSelectedRole(mockRoles[0]);
    }
  };

  const allPermissions = [
    { key: "system.manage", label: "Manage System", category: "System" },
    { key: "institutions.manage", label: "Manage Institutions", category: "System" },
    { key: "users.manage", label: "Manage Users", category: "Users" },
    { key: "institution.manage", label: "Manage Institution Settings", category: "Institution" },
    { key: "courses.manage", label: "Manage All Courses", category: "Content" },
    { key: "courses.create", label: "Create Courses", category: "Content" },
    { key: "courses.view", label: "View Courses", category: "Content" },
    { key: "questions.generate", label: "Generate Questions", category: "Content" },
    { key: "content.manage", label: "Manage All Content", category: "Content" },
    { key: "exams.create", label: "Create Exams", category: "Assessment" },
    { key: "exams.take", label: "Take Exams", category: "Assessment" },
    { key: "analytics.view", label: "View Analytics", category: "Analytics" },
    { key: "progress.view", label: "View Progress", category: "Analytics" },
  ];

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/admin/dashboard" },
    { key: "institutions", label: "Institutions", Icon: Building2, path: "/admin/institutions" },
    { key: "users", label: "Users", Icon: Users, path: "/admin/users" },
    { key: "analytics", label: "Analytics", Icon: BarChart3, path: "/admin/analytics" },
    { key: "settings", label: "System Settings", Icon: Settings, path: "/admin/settings" },
  ];

  const user = { name: "Admin User", initials: "AU", role: "Superadmin" };

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

  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

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
          System Admin
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
                  Role Management
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Manage user roles and permissions
                </p>
              </div>
            </div>
            <button style={{
              padding: isMobile ? "8px 16px" : "10px 20px",
              background: C.green,
              border: "none",
              borderRadius: 8,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 700,
              color: C.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <Plus size={16} />
              {!isMobile && "New Role"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1600 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "400px 1fr" : "1fr",
            gap: 24,
          }}>
            {/* Roles List */}
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
                  User Roles
                </h2>
              </div>

              <div>
                {roles.map((role, index) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRole(role)}
                    style={{
                      padding: isMobile ? "16px 20px" : "20px 24px",
                      borderBottom: index < roles.length - 1 ? `1px solid ${C.borderLight}` : "none",
                      background: selectedRole?.id === role.id ? C.parchment : "transparent",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRole?.id !== role.id) {
                        e.currentTarget.style.background = `${C.parchment}80`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRole?.id !== role.id) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 8,
                    }}>
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: `${role.color}15`,
                        border: `2px solid ${role.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <Shield size={20} style={{ color: role.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{
                          fontFamily: sans,
                          fontSize: 15,
                          fontWeight: 700,
                          color: C.navyDeep,
                          margin: "0 0 2px",
                        }}>
                          {role.name}
                        </h3>
                        <p style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: C.textMuted,
                          margin: 0,
                        }}>
                          {role.user_count} users
                        </p>
                      </div>
                    </div>
                    <p style={{
                      fontFamily: sans,
                      fontSize: 13,
                      color: C.textSecondary,
                      margin: 0,
                    }}>
                      {role.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions Panel */}
            {selectedRole && (
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
                  background: C.parchment,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <h2 style={{
                      fontFamily: serif,
                      fontSize: 20,
                      fontWeight: 700,
                      color: C.navyDeep,
                      margin: 0,
                    }}>
                      {selectedRole.name} Permissions
                    </h2>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.blueMid,
                        cursor: "pointer",
                      }}>
                        <Edit size={16} />
                      </button>
                      <button style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "transparent",
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.red,
                        cursor: "pointer",
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p style={{
                    fontFamily: sans,
                    fontSize: 14,
                    color: C.textSecondary,
                    margin: 0,
                  }}>
                    {selectedRole.description}
                  </p>
                </div>

                <div style={{ padding: isMobile ? 20 : 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    {Object.entries(permissionsByCategory).map(([category, perms]) => (
                      <div key={category}>
                        <h3 style={{
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: C.textMuted,
                          marginBottom: 12,
                        }}>
                          {category}
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {perms.map((perm) => {
                            const hasPermission = selectedRole.permissions.includes(perm.key);
                            return (
                              <div
                                key={perm.key}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: 12,
                                  background: hasPermission ? `${C.green}10` : C.parchment,
                                  border: `1px solid ${hasPermission ? `${C.green}40` : C.border}`,
                                  borderRadius: 8,
                                }}
                              >
                                <div style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  background: hasPermission ? C.green : C.white,
                                  border: `2px solid ${hasPermission ? C.green : C.border}`,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: C.white,
                                  flexShrink: 0,
                                }}>
                                  {hasPermission ? <Check size={14} /> : <X size={14} style={{ color: C.textMuted }} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontFamily: sans,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: C.textPrimary,
                                  }}>
                                    {perm.label}
                                  </div>
                                  <div style={{
                                    fontFamily: mono,
                                    fontSize: 10,
                                    color: C.textMuted,
                                  }}>
                                    {perm.key}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
