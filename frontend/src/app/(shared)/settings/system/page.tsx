'use client';

import { useState, useEffect } from "react";
import { Server, Shield, Database, Zap, Users, CheckCircle, AlertTriangle } from "lucide-react";
import { C, sans, serif, mono } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ===============================================================
// JOURNEY OS -- SYSTEM CONFIGURATION DASHBOARD (STORY-S-1)
// Page content only -- layout provided by (shared) route group
// ===============================================================

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
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const isDesktop = bp === "desktop";

  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);

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

  return (
    <div style={{ padding: isMobile ? "20px 16px" : isTablet ? "24px 24px" : "28px 32px", maxWidth: 1600 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
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

      {/* System Metrics */}
      <div style={{
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
                  <span>-</span>
                  <span>Checked {service.last_check}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
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
  );
}
