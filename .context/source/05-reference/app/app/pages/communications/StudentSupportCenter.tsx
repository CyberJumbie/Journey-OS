import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { Home, BookOpen, Target, BarChart3, Settings, Plus, HelpCircle, AlertCircle, CheckCircle, Clock, Filter } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — STUDENT SUPPORT CENTER (STORY-C-2)
// Template D: Student Shell with support ticket interface
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

interface Ticket {
  id: string;
  subject: string;
  category: "technical" | "academic" | "account" | "other";
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  created_at: string;
  last_updated: string;
}

export default function StudentSupportCenter() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("support");

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/student" || path === "/student/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/student/courses")) setActiveNav("courses");
    else if (path.startsWith("/student/practice")) setActiveNav("practice");
    else if (path.startsWith("/student/progress")) setActiveNav("progress");
    else if (path.startsWith("/student/support")) setActiveNav("support");
    else if (path.startsWith("/student/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockTickets: Ticket[] = [
      {
        id: "1",
        subject: "Unable to access practice exam",
        category: "technical",
        status: "in-progress",
        priority: "high",
        created_at: "2026-02-19T14:30:00Z",
        last_updated: "2026-02-20T09:15:00Z",
      },
      {
        id: "2",
        subject: "Question about cardiovascular exam scoring",
        category: "academic",
        status: "resolved",
        priority: "medium",
        created_at: "2026-02-18T10:20:00Z",
        last_updated: "2026-02-19T16:45:00Z",
      },
      {
        id: "3",
        subject: "Reset password request",
        category: "account",
        status: "resolved",
        priority: "low",
        created_at: "2026-02-17T08:00:00Z",
        last_updated: "2026-02-17T10:30:00Z",
      },
      {
        id: "4",
        subject: "Missing study materials for PHAR 501",
        category: "academic",
        status: "open",
        priority: "medium",
        created_at: "2026-02-20T11:00:00Z",
        last_updated: "2026-02-20T11:00:00Z",
      },
    ];

    const filtered = filterStatus === "all" ? mockTickets : mockTickets.filter((t) => t.status === filterStatus);
    setTickets(filtered);
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: Home, path: "/student/dashboard" },
    { key: "courses", label: "My Courses", Icon: BookOpen, path: "/student/courses" },
    { key: "practice", label: "Practice", Icon: Target, path: "/student/practice" },
    { key: "progress", label: "Progress", Icon: BarChart3, path: "/student/progress" },
    { key: "support", label: "Support", Icon: HelpCircle, path: "/student/support" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/student/settings" },
  ];

  const user = { name: "Jordan Smith", initials: "JS", role: "Student", year: "MS2" };

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

  const getStatusConfig = (status: Ticket["status"]) => {
    switch (status) {
      case "open":
        return { label: "Open", color: C.blueMid, icon: <AlertCircle size={16} /> };
      case "in-progress":
        return { label: "In Progress", color: "#fa9d33", icon: <Clock size={16} /> };
      case "resolved":
        return { label: "Resolved", color: C.green, icon: <CheckCircle size={16} /> };
    }
  };

  const getCategoryLabel = (category: Ticket["category"]) => {
    switch (category) {
      case "technical": return "Technical";
      case "academic": return "Academic";
      case "account": return "Account";
      case "other": return "Other";
    }
  };

  const getPriorityColor = (priority: Ticket["priority"]) => {
    switch (priority) {
      case "high": return C.red;
      case "medium": return "#fa9d33";
      case "low": return C.textMuted;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
          {user.year}
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
                  Support Center
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Get help with your questions and issues
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNewTicketModal(true)}
              style={{
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
              }}
            >
              <Plus size={16} />
              {!isMobile && "New Ticket"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1400 }}>
          {/* Summary Cards */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Open Tickets", value: tickets.filter((t) => t.status === "open").length, color: C.blueMid },
              { label: "In Progress", value: tickets.filter((t) => t.status === "in-progress").length, color: "#fa9d33" },
              { label: "Resolved", value: tickets.filter((t) => t.status === "resolved").length, color: C.green },
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
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <Filter size={18} style={{ color: C.textMuted }} />
              {[
                { key: "all", label: "All Tickets" },
                { key: "open", label: "Open" },
                { key: "in-progress", label: "In Progress" },
                { key: "resolved", label: "Resolved" },
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setFilterStatus(filter.key)}
                  style={{
                    padding: "8px 16px",
                    background: filterStatus === filter.key ? C.navyDeep : "transparent",
                    border: `1px solid ${filterStatus === filter.key ? C.navyDeep : C.border}`,
                    borderRadius: 8,
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: filterStatus === filter.key ? C.white : C.textPrimary,
                    cursor: "pointer",
                  }}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets List */}
          <div style={{
            ...fadeIn(0.15),
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
                Your Tickets
              </h2>
            </div>

            <div>
              {tickets.length === 0 ? (
                <div style={{
                  padding: 60,
                  textAlign: "center",
                }}>
                  <HelpCircle size={48} style={{ color: C.textMuted, marginBottom: 16 }} />
                  <p style={{
                    fontFamily: sans,
                    fontSize: 15,
                    color: C.textMuted,
                    margin: 0,
                  }}>
                    No tickets found. Create a new ticket to get support.
                  </p>
                </div>
              ) : (
                tickets.map((ticket, index) => {
                  const statusConfig = getStatusConfig(ticket.status);

                  return (
                    <div
                      key={ticket.id}
                      style={{
                        padding: isMobile ? "16px 20px" : "24px",
                        borderBottom: index < tickets.length - 1 ? `1px solid ${C.borderLight}` : "none",
                        cursor: "pointer",
                      }}
                      onClick={() => console.log("View ticket:", ticket.id)}
                    >
                      <div style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            fontFamily: serif,
                            fontSize: 16,
                            fontWeight: 700,
                            color: C.navyDeep,
                            margin: "0 0 8px",
                          }}>
                            {ticket.subject}
                          </h3>
                          <div style={{
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}>
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 10px",
                              background: `${statusConfig.color}15`,
                              border: `1px solid ${statusConfig.color}40`,
                              borderRadius: 6,
                              fontFamily: mono,
                              fontSize: 10,
                              fontWeight: 600,
                              color: statusConfig.color,
                            }}>
                              {statusConfig.icon}
                              {statusConfig.label}
                            </div>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 10,
                              fontWeight: 500,
                              letterSpacing: "0.05em",
                              textTransform: "uppercase",
                              color: C.textMuted,
                            }}>
                              {getCategoryLabel(ticket.category)}
                            </span>
                            <span style={{
                              fontFamily: mono,
                              fontSize: 10,
                              fontWeight: 600,
                              color: getPriorityColor(ticket.priority),
                            }}>
                              {ticket.priority.toUpperCase()} PRIORITY
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{
                        background: C.parchment,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: 12,
                        display: "flex",
                        gap: 16,
                        fontFamily: mono,
                        fontSize: 11,
                        color: C.textMuted,
                      }}>
                        <span>Created: {formatDate(ticket.created_at)}</span>
                        <span>•</span>
                        <span>Updated: {formatDate(ticket.last_updated)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
