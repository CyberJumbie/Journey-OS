import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Building2, Users, BarChart3, Settings, Server, Shield, Database, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { C, sans, serif, mono } from "../../components/shared/DashboardComponents";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — SYSTEM CONFIGURATION DASHBOARD (STORY-S-1)
// Template C: Admin Shell with system health monitoring
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

interface SystemMetric {
  label: string;
  value: string;
  status: "healthy" | "warning" | "error";
  description: string;
}

interface ServiceStatus {
  name: string;
  status: "online" | "degraded" | "offline";
  uptime: string;
  last_check: string;
}

export default function SystemConfigurationDashboard() {
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

  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);

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
    fetchSystemMetrics();
    fetchServiceStatus();
  }, []);

  const fetchSystemMetrics = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockMetrics: SystemMetric[] = [
      { label: "CPU Usage", value: "42%", status: "healthy", description: "System processor utilization" },
      { label: "Memory", value: "6.2 GB / 16 GB", status: "healthy", description: "RAM usage" },
      { label: "Database", value: "124 GB / 500 GB", status: "healthy", description: "Storage utilization" },
      { label: "API Response", value: "145ms", status: "healthy", description: "Average response time" },
      { label: "Active Users", value: "342", status: "healthy", description: "Currently online" },
      { label: "Error Rate", value: "0.02%", status: "healthy", description: "System error percentage" },
    ];

    setMetrics(mockMetrics);
  };

  const fetchServiceStatus = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockServices: ServiceStatus[] = [
      { name: "API Gateway", status: "online", uptime: "99.98%", last_check: "2 minutes ago" },
      { name: "Authentication Service", status: "online", uptime: "99.99%", last_check: "1 minute ago" },
      { name: "Database Cluster", status: "online", uptime: "99.95%", last_check: "3 minutes ago" },
      { name: "AI Question Generator", status: "online", uptime: "99.92%", last_check: "2 minutes ago" },
      { name: "File Storage", status: "online", uptime: "99.97%", last_check: "4 minutes ago" },
      { name: "Email Service", status: "online", uptime: "99.94%", last_check: "5 minutes ago" },
    ];

    setServices(mockServices);
  };

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

  const getStatusColor = (status: "healthy" | "warning" | "error" | "online" | "degraded" | "offline") => {
    switch (status) {
      case "healthy":
      case "online":
        return C.green;
      case "warning":
      case "degraded":
        return "#fa9d33";
      case "error":
      case "offline":
        return C.red;
    }
  };

  const getStatusIcon = (status: "healthy" | "warning" | "error" | "online" | "degraded" | "offline") => {
    switch (status) {
      case "healthy":
      case "online":
        return <CheckCircle size={16} />;
      case "warning":
      case "degraded":
      case "error":
      case "offline":
        return <AlertTriangle size={16} />;
    }
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
                System Configuration
              </h1>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                margin: "4px 0 0",
              }}>
                Monitor system health and configure settings
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1600 }}>
          {/* System Metrics */}
          <div style={{
            ...fadeIn(0.05),
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}>
            {metrics.map((metric) => (
              <div key={metric.label} style={{
                background: C.white,
                border: `1px solid ${C.borderLight}`,
                borderRadius: 8,
                padding: 20,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <div style={{
                    fontFamily: mono,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                  }}>
                    {metric.label}
                  </div>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    color: getStatusColor(metric.status),
                  }}>
                    {getStatusIcon(metric.status)}
                  </div>
                </div>
                <div style={{
                  fontFamily: serif,
                  fontSize: 28,
                  fontWeight: 700,
                  color: C.navyDeep,
                  marginBottom: 4,
                }}>
                  {metric.value}
                </div>
                <div style={{
                  fontFamily: sans,
                  fontSize: 12,
                  color: C.textMuted,
                }}>
                  {metric.description}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: isDesktop ? "2fr 1fr" : "1fr",
            gap: 24,
          }}>
            {/* Service Status */}
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Server size={20} style={{ color: C.blueMid }} />
                  <h2 style={{
                    fontFamily: serif,
                    fontSize: 20,
                    fontWeight: 700,
                    color: C.navyDeep,
                    margin: 0,
                  }}>
                    Service Status
                  </h2>
                </div>
              </div>

              <div>
                {services.map((service, index) => (
                  <div
                    key={service.name}
                    style={{
                      padding: isMobile ? "16px 20px" : "20px 24px",
                      borderBottom: index < services.length - 1 ? `1px solid ${C.borderLight}` : "none",
                    }}
                  >
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}>
                      <h3 style={{
                        fontFamily: sans,
                        fontSize: 15,
                        fontWeight: 600,
                        color: C.textPrimary,
                        margin: 0,
                      }}>
                        {service.name}
                      </h3>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        background: `${getStatusColor(service.status)}15`,
                        border: `1px solid ${getStatusColor(service.status)}40`,
                        borderRadius: 6,
                        fontFamily: mono,
                        fontSize: 10,
                        fontWeight: 600,
                        color: getStatusColor(service.status),
                        textTransform: "uppercase",
                      }}>
                        {getStatusIcon(service.status)}
                        {service.status}
                      </div>
                    </div>
                    <div style={{
                      display: "flex",
                      gap: 16,
                      fontFamily: mono,
                      fontSize: 11,
                      color: C.textMuted,
                    }}>
                      <span>Uptime: {service.uptime}</span>
                      <span>•</span>
                      <span>Checked {service.last_check}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
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
                  Quick Actions
                </h2>
              </div>

              <div style={{ padding: isMobile ? 16 : 20 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { icon: <Shield size={18} />, label: "Security Settings", color: C.red },
                    { icon: <Database size={18} />, label: "Database Backup", color: C.blueMid },
                    { icon: <Zap size={18} />, label: "Performance Tuning", color: "#fa9d33" },
                    { icon: <Users size={18} />, label: "User Management", color: C.green },
                  ].map((action) => (
                    <button
                      key={action.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: 16,
                        background: C.parchment,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        fontFamily: sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color: C.textPrimary,
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = action.color;
                        e.currentTarget.style.background = `${action.color}10`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = C.border;
                        e.currentTarget.style.background = C.parchment;
                      }}
                    >
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        background: `${action.color}15`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: action.color,
                        flexShrink: 0,
                      }}>
                        {action.icon}
                      </div>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
