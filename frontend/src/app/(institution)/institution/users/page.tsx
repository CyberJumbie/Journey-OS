'use client';

import { useState } from "react";
import { Users, Search, UserPlus, Mail, X, Upload } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useInstitutionUsers, useInviteUser } from '@/hooks/useInstitutionUsers';

// ===============================================================
// JOURNEY OS -- USER MANAGEMENT (STORY-IA-2 + IA-3)
// Page content only -- layout provided by (institution) route group
// Includes Bulk User Invite Modal (STORY-IA-3)
// ===============================================================

interface User {
  id: string;
  name: string;
  email: string;
  role: "faculty" | "student" | "advisor" | "institutional_admin";
  status: "active" | "pending" | "suspended";
  last_login: string | null;
  created_at: string;
}

interface BulkInvite {
  email: string;
  role: string;
  name?: string;
}

export default function UserManagement() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });

  const { data: usersData, isLoading: loading } = useInstitutionUsers(filters);
  const users: User[] = (usersData?.users ?? []) as User[];
  const inviteMutation = useInviteUser();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMode, setInviteMode] = useState<"single" | "bulk">("single");
  const [singleInvite, setSingleInvite] = useState({ email: "", role: "faculty", name: "" });
  const [bulkInvites, setBulkInvites] = useState<BulkInvite[]>([]);
  const [csvText, setCsvText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortCol, setSortCol] = useState<"name" | "email" | "role" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleParseCsv = () => {
    const lines = csvText.trim().split("\n");
    const parsed: BulkInvite[] = [];

    lines.forEach((line) => {
      const [email, role, name] = line.split(",").map((s) => s.trim());
      if (email && role) {
        parsed.push({ email, role, name });
      }
    });

    setBulkInvites(parsed);
  };

  const handleSendInvites = async () => {
    setIsSubmitting(true);

    try {
      if (inviteMode === "single") {
        await inviteMutation.mutateAsync({
          email: singleInvite.email,
          primary_role: singleInvite.role,
          display_name: singleInvite.name || undefined,
        });
      } else {
        for (const invite of bulkInvites) {
          await inviteMutation.mutateAsync({
            email: invite.email,
            primary_role: invite.role,
            display_name: invite.name || undefined,
          });
        }
      }

      setShowInviteModal(false);
      setSingleInvite({ email: "", role: "faculty", name: "" });
      setBulkInvites([]);
      setCsvText("");
    } catch (_err) {
      alert("Failed to send invites");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const valA = (a[sortCol] ?? "").toString().toLowerCase();
    const valB = (b[sortCol] ?? "").toString().toLowerCase();
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (col: "name" | "email" | "role" | "status") => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const columns: { label: string; key: "name" | "email" | "role" | "status" | null }[] = [
    { label: "Name", key: "name" },
    { label: "Email", key: "email" },
    { label: "Role", key: "role" },
    { label: "Status", key: "status" },
    { label: "Last Login", key: null },
  ];

  const getRoleLabel = (role: User["role"]) => {
    switch (role) {
      case "faculty": return "Faculty";
      case "student": return "Student";
      case "advisor": return "Advisor";
      case "institutional_admin": return "Admin";
    }
  };

  const getStatusColor = (status: User["status"]) => {
    switch (status) {
      case "active": return { bg: "rgba(105,163,56,0.1)", text: C.green, border: "rgba(105,163,56,0.2)" };
      case "pending": return { bg: "rgba(250,157,51,0.1)", text: "#fa9d33", border: "rgba(250,157,51,0.2)" };
      case "suspended": return { bg: "rgba(201,40,45,0.1)", text: "#c9282d", border: "rgba(201,40,45,0.2)" };
    }
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
  };

  // Invite Modal
  const inviteModal = showInviteModal && (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 100,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(0,44,118,0.12)",
      backdropFilter: "blur(4px)",
      padding: isMobile ? 16 : 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 640,
        maxHeight: "90vh",
        background: C.white,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        boxShadow: "0 16px 64px rgba(0,44,118,0.12)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "20px 24px" : "24px 32px",
          borderBottom: `1px solid ${C.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <h2 style={{
            fontFamily: serif,
            fontSize: 22,
            fontWeight: 700,
            color: C.navyDeep,
            margin: 0,
          }}>
            Invite Users
          </h2>
          <button
            onClick={() => setShowInviteModal(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: C.textMuted,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div style={{
          padding: isMobile ? "16px 24px" : "20px 32px",
          background: C.parchment,
          borderBottom: `1px solid ${C.borderLight}`,
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setInviteMode("single")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: inviteMode === "single" ? C.navyDeep : C.white,
                border: `1px solid ${inviteMode === "single" ? C.navyDeep : C.border}`,
                borderRadius: 6,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 700,
                color: inviteMode === "single" ? C.white : C.textSecondary,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Single Invite
            </button>
            <button
              onClick={() => setInviteMode("bulk")}
              style={{
                flex: 1,
                padding: "8px 16px",
                background: inviteMode === "bulk" ? C.navyDeep : C.white,
                border: `1px solid ${inviteMode === "bulk" ? C.navyDeep : C.border}`,
                borderRadius: 6,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 700,
                color: inviteMode === "bulk" ? C.white : C.textSecondary,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              Bulk Import (CSV)
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 24px" : "24px 32px" }}>
          {inviteMode === "single" ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 6,
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={singleInvite.email}
                  onChange={(e) => setSingleInvite({ ...singleInvite, email: e.target.value })}
                  placeholder="user@institution.edu"
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.ink,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 6,
                }}>
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={singleInvite.name}
                  onChange={(e) => setSingleInvite({ ...singleInvite, name: e.target.value })}
                  placeholder="Dr. Jane Smith"
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.ink,
                    outline: "none",
                  }}
                />
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
                  marginBottom: 6,
                }}>
                  Role
                </label>
                <select
                  value={singleInvite.role}
                  onChange={(e) => setSingleInvite({ ...singleInvite, role: e.target.value })}
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.ink,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="faculty">Faculty</option>
                  <option value="student">Student</option>
                  <option value="advisor">Advisor</option>
                  <option value="institutional_admin">Institutional Admin</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{
                background: C.parchment,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
              }}>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "0 0 12px",
                }}>
                  <strong>CSV Format:</strong> email, role, name (optional)
                </p>
                <code style={{
                  fontFamily: mono,
                  fontSize: 11,
                  color: C.ink,
                  display: "block",
                  background: C.white,
                  padding: 8,
                  borderRadius: 4,
                }}>
                  jsmith@institution.edu, faculty, Dr. Jane Smith<br />
                  mwilliams@institution.edu, student, Marcus Williams
                </code>
              </div>

              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV data here..."
                rows={6}
                style={{
                  width: "100%",
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontFamily: mono,
                  fontSize: 13,
                  color: C.ink,
                  resize: "vertical",
                  outline: "none",
                  marginBottom: 12,
                }}
              />

              <button
                onClick={handleParseCsv}
                disabled={!csvText.trim()}
                style={{
                  width: "100%",
                  padding: "10px 20px",
                  background: csvText.trim() ? C.blueMid : C.textMuted,
                  border: "none",
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.white,
                  cursor: csvText.trim() ? "pointer" : "not-allowed",
                  marginBottom: 20,
                }}
              >
                <Upload size={16} style={{ verticalAlign: "middle", marginRight: 8 }} />
                Parse CSV
              </button>

              {bulkInvites.length > 0 && (
                <div>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 8,
                  }}>
                    Preview ({bulkInvites.length} users)
                  </div>
                  <div style={{
                    background: C.parchment,
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: "auto",
                  }}>
                    {bulkInvites.map((invite, index) => (
                      <div key={index} style={{
                        padding: "10px 12px",
                        borderBottom: index < bulkInvites.length - 1 ? `1px solid ${C.borderLight}` : "none",
                      }}>
                        <div style={{
                          fontFamily: sans,
                          fontSize: 14,
                          fontWeight: 600,
                          color: C.ink,
                        }}>
                          {invite.email}
                        </div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 10,
                          color: C.textMuted,
                        }}>
                          {invite.role} {invite.name && `- ${invite.name}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: isMobile ? "16px 24px" : "20px 32px",
          borderTop: `1px solid ${C.borderLight}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        }}>
          <button
            onClick={() => setShowInviteModal(false)}
            disabled={isSubmitting}
            style={{
              padding: "10px 20px",
              background: "transparent",
              border: "none",
              borderRadius: 6,
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 700,
              color: C.navyDeep,
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvites}
            disabled={isSubmitting || (inviteMode === "single" ? !singleInvite.email : bulkInvites.length === 0)}
            style={{
              padding: "12px 24px",
              background: isSubmitting ? C.textMuted : C.green,
              border: "none",
              borderRadius: 6,
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 700,
              color: C.white,
              cursor: (isSubmitting || (inviteMode === "single" ? !singleInvite.email : bulkInvites.length === 0)) ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isSubmitting ? "Sending..." : (
              <>
                <Mail size={18} />
                Send {inviteMode === "bulk" && bulkInvites.length > 0 ? `${bulkInvites.length} ` : ""}Invite{inviteMode === "bulk" && bulkInvites.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {inviteModal}

      <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{
            fontFamily: serif,
            fontSize: isMobile ? 24 : 30,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: 0,
          }}>
            User Management
          </h1>
          <button
            onClick={() => setShowInviteModal(true)}
            style={{
              padding: isMobile ? "8px 14px" : "10px 18px",
              background: C.green,
              border: "none",
              borderRadius: 6,
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 700,
              color: C.white,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = C.greenDark;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = C.green;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <UserPlus size={18} />
            {!isMobile && "Invite Users"}
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}>
          {[
            { label: "Total Users", value: users.length },
            { label: "Faculty", value: users.filter((u) => u.role === "faculty").length },
            { label: "Students", value: users.filter((u) => u.role === "student").length },
            { label: "Pending", value: users.filter((u) => u.status === "pending").length },
          ].map((stat) => (
            <div key={stat.label} style={{
              background: C.white,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 8,
              padding: 16,
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
                fontSize: 28,
                fontWeight: 700,
                color: C.navyDeep,
              }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{
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
            <div style={{ position: "relative", flex: isMobile ? "1 1 100%" : "1 1 280px", minWidth: 240 }}>
              <Search size={18} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
              <input
                type="search"
                placeholder="Search users..."
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

            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              style={{
                width: 140,
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
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
              <option value="advisor">Advisor</option>
              <option value="institutional_admin">Admin</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={{
                width: 140,
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
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* User Table */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{
                  height: 56,
                  background: C.parchment,
                  borderRadius: 6,
                  marginBottom: 8,
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
              ))}
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
                <Users size={36} color="rgba(0,44,118,0.3)" />
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
              }}>
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: C.parchment, borderBottom: `1px solid ${C.borderLight}` }}>
                  <tr>
                    {columns.map((col) => (
                      <th key={col.label}
                        onClick={col.key ? () => handleSort(col.key!) : undefined}
                        style={{
                          padding: "12px 16px",
                          textAlign: "left",
                          fontFamily: mono,
                          fontSize: 10,
                          fontWeight: 500,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: sortCol === col.key ? C.navyDeep : C.textMuted,
                          whiteSpace: "nowrap",
                          cursor: col.key ? "pointer" : "default",
                          userSelect: "none",
                          transition: "color 0.15s",
                        }}>
                        {col.label}
                        {sortCol === col.key && (
                          <span style={{ marginLeft: 4, fontSize: 9 }}>
                            {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((usr) => {
                    const statusColors = getStatusColor(usr.status);
                    return (
                      <tr
                        key={usr.id}
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
                          <span style={{
                            fontFamily: sans,
                            fontSize: 15,
                            fontWeight: 600,
                            color: C.textPrimary,
                          }}>
                            {usr.name}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: C.textSecondary,
                          }}>
                            {usr.email}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: sans,
                            fontSize: 14,
                            color: C.textSecondary,
                          }}>
                            {getRoleLabel(usr.role)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
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
                            {usr.status}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: mono,
                            fontSize: 10,
                            color: C.textMuted,
                          }}>
                            {formatRelativeTime(usr.last_login)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
