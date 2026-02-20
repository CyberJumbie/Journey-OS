import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Building2, Users, BarChart3, Settings, Plus, Megaphone, Users as UsersIcon, Calendar, Eye } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — ANNOUNCEMENT SYSTEM (STORY-C-3)
// Template C: Admin Shell with announcement broadcast interface
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

interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: "all" | "faculty" | "students" | "admins";
  priority: "low" | "normal" | "high" | "urgent";
  published_at: string;
  views: number;
  status: "draft" | "published" | "scheduled";
}

export default function AnnouncementSystem() {
  const navigate = useNavigate();
  const location = useLocation();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeNav, setActiveNav] = useState("announcements");

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/dashboard") setActiveNav("dashboard");
    else if (path.startsWith("/admin/institutions")) setActiveNav("institutions");
    else if (path.startsWith("/admin/users")) setActiveNav("users");
    else if (path.startsWith("/admin/announcements")) setActiveNav("announcements");
    else if (path.startsWith("/admin/analytics")) setActiveNav("analytics");
    else if (path.startsWith("/admin/settings")) setActiveNav("settings");
  }, [location.pathname]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockAnnouncements: Announcement[] = [
      {
        id: "1",
        title: "System Maintenance Scheduled",
        content: "The Journey-OS platform will undergo scheduled maintenance on February 25, 2026, from 2:00 AM to 6:00 AM EST. During this time, the system will be temporarily unavailable.",
        audience: "all",
        priority: "high",
        published_at: "2026-02-20T09:00:00Z",
        views: 342,
        status: "published",
      },
      {
        id: "2",
        title: "New Question Generation Features",
        content: "We're excited to announce new AI-powered features for question generation, including enhanced blueprint validation and automated difficulty assessment.",
        audience: "faculty",
        priority: "normal",
        published_at: "2026-02-18T14:30:00Z",
        views: 128,
        status: "published",
      },
      {
        id: "3",
        title: "Practice Exam Availability",
        content: "New practice exams for Cardiovascular and Respiratory systems are now available. Access them through your student dashboard.",
        audience: "students",
        priority: "normal",
        published_at: "2026-02-17T10:00:00Z",
        views: 567,
        status: "published",
      },
      {
        id: "4",
        title: "Q2 Analytics Report",
        content: "The Q2 analytics report is ready for review. Please check the analytics dashboard for detailed insights.",
        audience: "admins",
        priority: "low",
        published_at: "2026-02-15T16:00:00Z",
        views: 24,
        status: "published",
      },
    ];

    setAnnouncements(mockAnnouncements);
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard, path: "/admin/dashboard" },
    { key: "institutions", label: "Institutions", Icon: Building2, path: "/admin/institutions" },
    { key: "users", label: "Users", Icon: Users, path: "/admin/users" },
    { key: "announcements", label: "Announcements", Icon: Megaphone, path: "/admin/announcements" },
    { key: "analytics", label: "Analytics", Icon: BarChart3, path: "/admin/analytics" },
    { key: "settings", label: "Settings", Icon: Settings, path: "/admin/settings" },
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

  const getAudienceConfig = (audience: Announcement["audience"]) => {
    switch (audience) {
      case "all": return { label: "All Users", color: C.navyDeep };
      case "faculty": return { label: "Faculty", color: C.blueMid };
      case "students": return { label: "Students", color: C.green };
      case "admins": return { label: "Admins", color: "#fa9d33" };
    }
  };

  const getPriorityConfig = (priority: Announcement["priority"]) => {
    switch (priority) {
      case "urgent": return { label: "Urgent", color: C.red };
      case "high": return { label: "High", color: "#fa9d33" };
      case "normal": return { label: "Normal", color: C.blueMid };
      case "low": return { label: "Low", color: C.textMuted };
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
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
                  Announcements
                </h1>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.textSecondary,
                  margin: "4px 0 0",
                }}>
                  Broadcast messages to users
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
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
              {!isMobile && "New Announcement"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1200 }}>
          {/* Summary Cards */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {[
              { label: "Total", value: announcements.length, color: C.navyDeep },
              { label: "Published", value: announcements.filter((a) => a.status === "published").length, color: C.green },
              { label: "Total Views", value: announcements.reduce((sum, a) => sum + a.views, 0), color: C.blueMid },
              { label: "Avg Views", value: Math.round(announcements.reduce((sum, a) => sum + a.views, 0) / announcements.length), color: "#fa9d33" },
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

          {/* Announcements List */}
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
            }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: 20,
                fontWeight: 700,
                color: C.navyDeep,
                margin: 0,
              }}>
                All Announcements
              </h2>
            </div>

            <div>
              {announcements.map((announcement, index) => {
                const audienceConfig = getAudienceConfig(announcement.audience);
                const priorityConfig = getPriorityConfig(announcement.priority);

                return (
                  <div
                    key={announcement.id}
                    style={{
                      padding: isMobile ? "16px 20px" : "24px",
                      borderBottom: index < announcements.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
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
                          fontSize: 18,
                          fontWeight: 700,
                          color: C.navyDeep,
                          margin: "0 0 8px",
                        }}>
                          {announcement.title}
                        </h3>
                        <p style={{
                          fontFamily: sans,
                          fontSize: 14,
                          lineHeight: 1.6,
                          color: C.textSecondary,
                          margin: "0 0 12px",
                        }}>
                          {announcement.content}
                        </p>
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
                            background: `${audienceConfig.color}15`,
                            border: `1px solid ${audienceConfig.color}40`,
                            borderRadius: 6,
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 600,
                            color: audienceConfig.color,
                          }}>
                            <UsersIcon size={14} />
                            {audienceConfig.label}
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            background: `${priorityConfig.color}15`,
                            border: `1px solid ${priorityConfig.color}40`,
                            borderRadius: 6,
                            fontFamily: mono,
                            fontSize: 10,
                            fontWeight: 600,
                            color: priorityConfig.color,
                          }}>
                            {priorityConfig.label}
                          </div>
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
                      flexWrap: "wrap",
                      fontFamily: mono,
                      fontSize: 11,
                      color: C.textMuted,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Calendar size={14} />
                        {formatDate(announcement.published_at)}
                      </div>
                      <span>•</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Eye size={14} />
                        {announcement.views} views
                      </div>
                    </div>
                  </div>
                );
              })
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
