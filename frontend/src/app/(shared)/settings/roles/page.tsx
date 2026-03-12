'use client';

import { useState, useEffect } from "react";
import { Shield, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ===============================================================
// JOURNEY OS -- USER ROLE MANAGEMENT (STORY-S-2)
// Page content only -- layout provided by (shared) route group
// ===============================================================

interface Role {
  id: string;
  name: string;
  description: string;
  user_count: number;
  permissions: string[];
  color: string;
}

export default function UserRoleManagement() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

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

  const permissionsByCategory = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

  return (
    <div style={{ padding: isMobile ? "20px 16px" : "28px 32px", maxWidth: 1600 }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
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

      {/* Content Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isDesktop ? "400px 1fr" : "1fr",
        gap: 24,
      }}>
        {/* Roles List */}
        <div style={{
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
  );
}
