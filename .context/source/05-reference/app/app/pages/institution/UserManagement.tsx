import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { BarChart3, Users, BookOpen, Settings, Shield, Activity, Award, Search, Download, UserPlus, Mail, X, Upload, CheckCircle2 } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — USER MANAGEMENT (STORY-IA-2 + IA-3)
// Template B: Admin Shell with table + bulk invite modal
// Surface: sidebar (white) + content (cream) → white cards → parchment
// Includes Bulk User Invite Modal (STORY-IA-3)
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
  const [filters, setFilters] = useState({
    search: "",
    role: "all",
    status: "all",
  });

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMode, setInviteMode] = useState<"single" | "bulk">("single");
  const [singleInvite, setSingleInvite] = useState({ email: "", role: "faculty", name: "" });
  const [bulkInvites, setBulkInvites] = useState<BulkInvite[]>([]);
  const [csvText, setCsvText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const mockUsers: User[] = [
        { id: "1", name: "Dr. Sarah Chen", email: "schen@msm.edu", role: "faculty", status: "active", last_login: "2026-02-20T08:30:00Z", created_at: "2024-08-20T00:00:00Z" },
        { id: "2", name: "Dr. James Anderson", email: "janderson@msm.edu", role: "faculty", status: "active", last_login: "2026-02-19T15:45:00Z", created_at: "2024-09-12T00:00:00Z" },
        { id: "3", name: "Marcus Williams", email: "mwilliams@msm.edu", role: "student", status: "active", last_login: "2026-02-20T07:12:00Z", created_at: "2025-08-25T00:00:00Z" },
        { id: "4", name: "Dr. Lisa Martinez", email: "lmartinez@msm.edu", role: "advisor", status: "active", last_login: "2026-02-18T14:20:00Z", created_at: "2024-10-05T00:00:00Z" },
        { id: "5", name: "Jennifer Thompson", email: "jthompson@msm.edu", role: "student", status: "pending", last_login: null, created_at: "2026-02-15T00:00:00Z" },
      ];

      const filtered = mockUsers.filter((user) => {
        if (filters.role !== "all" && user.role !== filters.role) return false;
        if (filters.status !== "all" && user.status !== filters.status) return false;
        if (filters.search) {
          const search = filters.search.toLowerCase();
          return user.name.toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
        }
        return true;
      });

      setUsers(filtered);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

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
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (inviteMode === "single") {
        // Send single invite
        console.log("Sending single invite", singleInvite);
      } else {
        // Send bulk invites
        console.log("Sending bulk invites", bulkInvites);
      }

      setShowInviteModal(false);
      setSingleInvite({ email: "", role: "faculty", name: "" });
      setBulkInvites([]);
      setCsvText("");
      fetchUsers();
    } catch (err) {
      alert("Failed to send invites");
    } finally {
      setIsSubmitting(false);
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
                  placeholder="user@msm.edu"
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
                  jsmith@msm.edu, faculty, Dr. Jane Smith<br />
                  mwilliams@msm.edu, student, Marcus Williams
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
                          {invite.role} {invite.name && `• ${invite.name}`}
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
      {sidebar}
      {inviteModal}
      
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
                  User Management
                </h1>
              </div>
            </div>
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
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Stats */}
          <div style={{
            ...fadeIn(0.05),
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
                      {["Name", "Email", "Role", "Status", "Last Login"].map((col) => (
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
                    {users.map((usr) => {
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
      </div>
    </>
  );
}
